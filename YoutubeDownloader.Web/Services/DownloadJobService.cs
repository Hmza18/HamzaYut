using System.Collections.Concurrent;
using Gress;
using Microsoft.AspNetCore.Hosting;
using YoutubeDownloader.Core.Downloading;
using YoutubeDownloader.Core.Resolving;
using YoutubeDownloader.Core.Tagging;
using YoutubeDownloader.Web.Models;
using YoutubeExplode.Exceptions;
using YoutubeExplode.Videos;

namespace YoutubeDownloader.Web.Services;

public class DownloadJobService
{
    private readonly DownloadSettings _settings;
    private readonly string _downloadRoot;
    private readonly SemaphoreSlim _parallelGate;
    private readonly ConcurrentDictionary<string, DownloadJobState> _jobs = new();
    private readonly ConcurrentDictionary<string, VideoOptionCache> _optionCache = new();

    public DownloadJobService(DownloadSettings settings, IWebHostEnvironment environment)
    {
        _settings = settings;
        _downloadRoot = Path.GetFullPath(
            Path.Combine(environment.ContentRootPath, settings.RootPath)
        );
        Directory.CreateDirectory(_downloadRoot);
        _parallelGate = new SemaphoreSlim(Math.Max(1, settings.ParallelLimit));
    }

    public string DownloadRoot => _downloadRoot;

    public bool IsFfmpegAvailable() =>
        !string.IsNullOrWhiteSpace(_settings.FFmpegFilePath)
        || FFmpeg.TryGetCliFilePath() is not null;

    public async Task EnsureFfmpegAsync(CancellationToken cancellationToken = default)
    {
        if (IsFfmpegAvailable())
            return;

        var outputPath = Path.Combine(AppContext.BaseDirectory, FFmpeg.CliFileName);
        await FFmpeg.DownloadAsync(outputPath, null, cancellationToken);
    }

    public async Task<QueryResponseDto> ResolveAsync(
        string query,
        CancellationToken cancellationToken = default
    )
    {
        using var resolver = new QueryResolver();

        var queries = query.Split(
            '\n',
            StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries
        );

        var results = new List<QueryResult>();
        foreach (var item in queries)
        {
            try
            {
                results.Add(await resolver.ResolveAsync(item, cancellationToken));
            }
            catch (YoutubeExplodeException ex)
                when (ex is VideoUnavailableException or PlaylistUnavailableException
                    && queries.Length > 1
                )
            {
                // Skip unavailable items in multi-query input
            }
        }

        if (results.Count == 0)
            throw new InvalidOperationException("Nothing found for the provided query.");

        var aggregated = QueryResult.Aggregate(results);

        if (aggregated.Videos.Count == 1)
        {
            var video = aggregated.Videos.Single();
            using var downloader = new VideoDownloader();
            var options = await downloader.GetDownloadOptionsAsync(
                video.Id,
                _settings.ShouldInjectLanguageSpecificAudioStreams,
                cancellationToken
            );

            _optionCache[video.Id] = new VideoOptionCache(video, options);

            return new QueryResponseDto(
                "single",
                video.Title,
                VideoMapper.ToSummary(video),
                options.Select((option, index) => VideoMapper.ToOption(option, index)).ToArray(),
                null
            );
        }

        return new QueryResponseDto(
            "multiple",
            aggregated.Title,
            null,
            null,
            aggregated.Videos.Select(VideoMapper.ToSummary).ToArray()
        );
    }

    public async Task<IReadOnlyList<DownloadOptionDto>> GetOptionsAsync(
        string videoId,
        CancellationToken cancellationToken = default
    )
    {
        if (_optionCache.TryGetValue(videoId, out var cached))
            return cached.Options.Select((option, index) => VideoMapper.ToOption(option, index)).ToArray();

        using var downloader = new VideoDownloader();
        var video = await downloader.GetVideoAsync(videoId, cancellationToken);
        var options = await downloader.GetDownloadOptionsAsync(
            video.Id,
            _settings.ShouldInjectLanguageSpecificAudioStreams,
            cancellationToken
        );

        _optionCache[videoId] = new VideoOptionCache(video, options);
        return options.Select((option, index) => VideoMapper.ToOption(option, index)).ToArray();
    }

    public async Task<DownloadJobDto> StartDownloadAsync(
        string videoId,
        int optionIndex,
        CancellationToken cancellationToken = default
    )
    {
        if (!_optionCache.TryGetValue(videoId, out var cached))
        {
            using var downloader = new VideoDownloader();
            var video = await downloader.GetVideoAsync(videoId, cancellationToken);
            var options = await downloader.GetDownloadOptionsAsync(
                video.Id,
                _settings.ShouldInjectLanguageSpecificAudioStreams,
                cancellationToken
            );
            cached = new VideoOptionCache(video, options);
            _optionCache[videoId] = cached;
        }

        if (optionIndex < 0 || optionIndex >= cached.Options.Count)
            throw new ArgumentOutOfRangeException(nameof(optionIndex));

        var job = new DownloadJobState(
            Guid.NewGuid().ToString("N"),
            cached.Video,
            cached.Options[optionIndex]
        );

        if (!_jobs.TryAdd(job.Id, job))
            throw new InvalidOperationException("Failed to create download job.");

        _ = RunDownloadAsync(job);
        return ToDto(job);
    }

    public IReadOnlyList<DownloadJobDto> ListJobs() =>
        _jobs.Values.OrderByDescending(j => j.CreatedAt).Select(ToDto).ToArray();

    public DownloadJobDto? GetJob(string id) =>
        _jobs.TryGetValue(id, out var job) ? ToDto(job) : null;

    public bool TryGetJobFilePath(string id, out string filePath)
    {
        filePath = "";
        if (!_jobs.TryGetValue(id, out var job))
            return false;

        if (job.Status != DownloadJobStatus.Completed || string.IsNullOrWhiteSpace(job.FilePath))
            return false;

        filePath = job.FilePath;
        return File.Exists(filePath);
    }

    public bool CancelJob(string id)
    {
        if (!_jobs.TryGetValue(id, out var job))
            return false;

        job.CancellationTokenSource.Cancel();
        return true;
    }

    private async Task RunDownloadAsync(DownloadJobState job)
    {
        await _parallelGate.WaitAsync(job.CancellationTokenSource.Token);

        try
        {
            job.Status = DownloadJobStatus.Started;
            job.Progress = new ProgressContainer<Percentage>();

            var fileName = FileNameTemplate.Apply(
                _settings.FileNameTemplate,
                job.Video,
                job.Option.Container
            );
            var filePath = Path.Combine(_downloadRoot, fileName);
            filePath = Path.GetFullPath(filePath);

            if (!filePath.StartsWith(_downloadRoot, StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Invalid output path.");

            Directory.CreateDirectory(_downloadRoot);
            await File.WriteAllBytesAsync(filePath, [], job.CancellationTokenSource.Token);

            job.FileName = Path.GetFileName(filePath);
            job.FilePath = filePath;

            using var downloader = new VideoDownloader();
            await downloader.DownloadVideoAsync(
                filePath,
                job.Video,
                job.Option,
                _settings.ShouldInjectSubtitles,
                _settings.FFmpegFilePath,
                job.Progress,
                job.CancellationTokenSource.Token
            );

            if (_settings.ShouldInjectTags)
            {
                try
                {
                    var tagInjector = new MediaTagInjector();
                    await tagInjector.InjectTagsAsync(
                        filePath,
                        job.Video,
                        job.CancellationTokenSource.Token
                    );
                }
                catch
                {
                    // Media tagging is not critical
                }
            }

            job.Status = DownloadJobStatus.Completed;
        }
        catch (Exception ex)
        {
            try
            {
                if (!string.IsNullOrWhiteSpace(job.FilePath))
                    File.Delete(job.FilePath);
            }
            catch
            {
                // Ignore cleanup failures
            }

            job.Status =
                ex is OperationCanceledException
                    ? DownloadJobStatus.Canceled
                    : DownloadJobStatus.Failed;

            job.ErrorMessage = ex is YoutubeExplodeException ? ex.Message : ex.ToString();
        }
        finally
        {
            _parallelGate.Release();
            job.CancellationTokenSource.Dispose();
        }
    }

    private static DownloadJobDto ToDto(DownloadJobState job) =>
        new(
            job.Id,
            job.Video.Id,
            job.Video.Title,
            job.Video.Thumbnails.MinBy(t => t.Resolution.Area)?.Url,
            job.FileName,
            job.Status,
            job.Progress.Current.Fraction,
            job.Status == DownloadJobStatus.Started ? job.Progress.Current.ToString() : null,
            job.ErrorMessage,
            job.Status == DownloadJobStatus.Completed && !string.IsNullOrWhiteSpace(job.FilePath),
            job.Status is DownloadJobStatus.Enqueued or DownloadJobStatus.Started
        );

    private sealed record VideoOptionCache(IVideo Video, IReadOnlyList<VideoDownloadOption> Options);

    private sealed class DownloadJobState
    {
        public DownloadJobState(string id, IVideo video, VideoDownloadOption option)
        {
            Id = id;
            Video = video;
            Option = option;
            CreatedAt = DateTimeOffset.UtcNow;
            CancellationTokenSource = new CancellationTokenSource();
        }

        public string Id { get; }

        public IVideo Video { get; }

        public VideoDownloadOption Option { get; }

        public DateTimeOffset CreatedAt { get; }

        public CancellationTokenSource CancellationTokenSource { get; }

        public DownloadJobStatus Status { get; set; } = DownloadJobStatus.Enqueued;

        public ProgressContainer<Percentage> Progress { get; set; } = new();

        public string? FileName { get; set; }

        public string? FilePath { get; set; }

        public string? ErrorMessage { get; set; }
    }
}

internal static class VideoDownloaderExtensions
{
    public static async Task<IVideo> GetVideoAsync(
        this VideoDownloader downloader,
        string videoId,
        CancellationToken cancellationToken = default
    )
    {
        using var resolver = new QueryResolver();
        var result = await resolver.ResolveAsync(videoId, cancellationToken);
        var video = result.Videos.SingleOrDefault();
        return video ?? throw new InvalidOperationException("Video not found.");
    }
}
