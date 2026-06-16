namespace YoutubeDownloader.Web.Models;

public enum DownloadJobStatus
{
    Enqueued,
    Started,
    Completed,
    Failed,
    Canceled,
}

public record VideoSummaryDto(
    string Id,
    string Title,
    string Author,
    string? Duration,
    string? ThumbnailUrl
);

public record DownloadOptionDto(
    int Index,
    string Label,
    string Container,
    bool IsAudioOnly,
    bool IsVideoUpscaled
);

public record QueryResponseDto(
    string Kind,
    string? Title,
    VideoSummaryDto? Video,
    IReadOnlyList<DownloadOptionDto>? Options,
    IReadOnlyList<VideoSummaryDto>? Videos
);

public record ResolveRequestDto(string Query);

public record StartDownloadRequestDto(string VideoId, int OptionIndex);

public record DownloadJobDto(
    string Id,
    string VideoId,
    string Title,
    string? ThumbnailUrl,
    string? FileName,
    DownloadJobStatus Status,
    double Progress,
    string? ProgressText,
    string? ErrorMessage,
    bool CanDownload,
    bool CanCancel
);
