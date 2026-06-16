namespace YoutubeDownloader.Web.Services;

public class DownloadSettings
{
    public string RootPath { get; set; } = "Downloads";

    public int ParallelLimit { get; set; } = 2;

    public string FileNameTemplate { get; set; } = "$title";

    public string? FFmpegFilePath { get; set; }

    public bool ShouldInjectSubtitles { get; set; } = true;

    public bool ShouldInjectTags { get; set; } = true;

    public bool ShouldInjectLanguageSpecificAudioStreams { get; set; } = true;
}
