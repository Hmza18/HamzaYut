using System.Text.Json.Serialization;
using YoutubeDownloader.Web.Models;
using YoutubeDownloader.Web.Services;

var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

var downloadSettings =
    builder.Configuration.GetSection("Download").Get<DownloadSettings>() ?? new DownloadSettings();

builder.Services.AddSingleton(downloadSettings);
builder.Services.AddSingleton<DownloadJobService>();

var app = builder.Build();

var downloadService = app.Services.GetRequiredService<DownloadJobService>();

try
{
    await downloadService.EnsureFfmpegAsync();
}
catch (Exception ex)
{
    app.Logger.LogWarning(ex, "FFmpeg auto-download failed. Install FFmpeg or set Download:FFmpegFilePath.");
}

app.Use(
    async (context, next) =>
    {
        var path = context.Request.Path.Value;
        if (path is "/download" or "/download/")
            context.Request.Path = "/download/index.html";
        else if (path is "/privacy" or "/privacy/")
            context.Request.Path = "/privacy/index.html";

        await next();
    }
);

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/api/health", () =>
{
    var service = app.Services.GetRequiredService<DownloadJobService>();
    return Results.Ok(
        new
        {
            status = "ok",
            ffmpeg = service.IsFfmpegAvailable(),
            downloadRoot = service.DownloadRoot,
        }
    );
});

app.MapPost(
    "/api/resolve",
    async (ResolveRequestDto request, DownloadJobService service, CancellationToken cancellationToken) =>
    {
        if (string.IsNullOrWhiteSpace(request.Query))
            return Results.BadRequest(new { error = "Query is required." });

        try
        {
            var result = await service.ResolveAsync(request.Query, cancellationToken);
            return Results.Ok(result);
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
    }
);

app.MapGet(
    "/api/videos/{videoId}/options",
    async (string videoId, DownloadJobService service, CancellationToken cancellationToken) =>
    {
        try
        {
            var options = await service.GetOptionsAsync(videoId, cancellationToken);
            return Results.Ok(options);
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
    }
);

app.MapPost(
    "/api/downloads",
    async (
        StartDownloadRequestDto request,
        DownloadJobService service,
        CancellationToken cancellationToken
    ) =>
    {
        try
        {
            var job = await service.StartDownloadAsync(
                request.VideoId,
                request.OptionIndex,
                cancellationToken
            );
            return Results.Ok(job);
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
    }
);

app.MapGet("/api/downloads", (DownloadJobService service) => Results.Ok(service.ListJobs()));

app.MapGet(
    "/api/downloads/{id}",
    (string id, DownloadJobService service) =>
    {
        var job = service.GetJob(id);
        return job is null ? Results.NotFound() : Results.Ok(job);
    }
);

app.MapDelete(
    "/api/downloads/{id}",
    (string id, DownloadJobService service) =>
        service.CancelJob(id) ? Results.NoContent() : Results.NotFound()
);

app.MapGet(
    "/api/downloads/{id}/file",
    (string id, DownloadJobService service) =>
    {
        if (!service.TryGetJobFilePath(id, out var filePath))
            return Results.NotFound();

        return Results.File(
            filePath,
            "application/octet-stream",
            Path.GetFileName(filePath),
            enableRangeProcessing: true
        );
    }
);

app.MapFallbackToFile("/download/{*path}", "download/index.html");

app.Run();
