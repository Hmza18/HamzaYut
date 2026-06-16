using YoutubeDownloader.Core.Downloading;
using YoutubeDownloader.Web.Models;
using YoutubeExplode.Videos;

namespace YoutubeDownloader.Web.Services;

internal static class VideoMapper
{
    public static VideoSummaryDto ToSummary(IVideo video) =>
        new(
            video.Id,
            video.Title,
            video.Author.ChannelTitle,
            video.Duration?.ToString(@"hh\:mm\:ss"),
            video.Thumbnails.MinBy(t => t.Resolution.Area)?.Url
        );

    public static DownloadOptionDto ToOption(VideoDownloadOption option, int index) =>
        new(
            index,
            option.IsAudioOnly ? "Audio" : option.VideoQuality?.ToString() ?? "Video",
            option.Container.ToString(),
            option.IsAudioOnly,
            option.IsVideoUpscaled
        );
}
