# HamzaYut

**HamzaYut** is a YouTube video downloader with a modern desktop app and a browser-based web UI. Paste a link, pick your quality and format, and save videos locally — with live progress tracking and support for playlists, channels, and search.

> Built on top of [YoutubeDownloader](https://github.com/Tyrrrz/YoutubeDownloader) by [Tyrrrz](https://github.com/Tyrrrz), powered by [YoutubeExplode](https://github.com/Tyrrrz/YoutubeExplode).

## Features

### Desktop app (`YoutubeDownloader`)
- Cross-platform GUI built with Avalonia
- Download videos by URL, playlist, channel, or search query
- Choose video quality and container format
- Embed subtitles, tags, and alternative audio tracks automatically
- Sign in with a YouTube account for private content

### Web app (`YoutubeDownloader.Web`)
- Clean browser UI — paste a link and download
- REST API for resolving videos, listing formats, and managing jobs
- Live download progress in the browser
- Configurable download folder, parallel limit, and FFmpeg path
- Auto-downloads FFmpeg when not installed

## Requirements

- [.NET SDK 10](https://dotnet.microsoft.com/download) (see `global.json`)
- **FFmpeg** — required for muxing audio/video. The web app can download it automatically on first run; the desktop app will prompt you if it is missing.

## Getting started

Clone the repo:

```bash
git clone https://github.com/Hmza18/HamzaYut.git
cd HamzaYut
```

### Run the web app

```bash
dotnet run --project YoutubeDownloader.Web
```

Open [http://localhost:5280](http://localhost:5280) in your browser.

### Run the desktop app

```bash
dotnet run --project YoutubeDownloader
```

### Build for release

```bash
dotnet publish YoutubeDownloader.Web -c Release -o ./publish/web
dotnet publish YoutubeDownloader -c Release -o ./publish/desktop
```

### Deploy to Render (full web app)

1. Push this repo to GitHub.
2. In the [Render dashboard](https://dashboard.render.com), choose **New → Blueprint**.
3. Connect the repo. Render applies `render.yaml`, which creates a Docker web service with persistent storage for downloads.
4. Open the generated `.onrender.com` URL when the deploy finishes.

### Deploy to Railway (full web app)

1. Push this repo to GitHub.
2. Create a project at [railway.app](https://railway.app) and deploy from this repo.
3. Railway uses `Dockerfile` and `railway.toml`.
4. Add a volume mounted at `/data/downloads` so finished files persist.

### Run locally with Docker

```bash
docker build -t hamzayut-web .
docker run --rm -p 8080:8080 -e PORT=8080 -v hamzayut-data:/data/downloads hamzayut-web
```

Open [http://localhost:8080](http://localhost:8080).

## Configuration

Web app settings live in `YoutubeDownloader.Web/appsettings.json`:

| Setting | Default | Description |
| --- | --- | --- |
| `Download:RootPath` | `Downloads` | Folder where finished files are saved |
| `Download:ParallelLimit` | `2` | Max concurrent downloads |
| `Download:FileNameTemplate` | `$title` | Output filename template |
| `Download:FFmpegFilePath` | `null` | Path to `ffmpeg` binary; auto-detected if unset |
| `Download:ShouldInjectSubtitles` | `true` | Embed subtitles into the file |
| `Download:ShouldInjectTags` | `true` | Write metadata tags |
| `Download:ShouldInjectLanguageSpecificAudioStreams` | `true` | Include alternate audio tracks |

## Web API

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Service status and FFmpeg availability |
| `POST` | `/api/resolve` | Resolve a URL, playlist, channel, or search query |
| `GET` | `/api/videos/{videoId}/options` | List available quality/format options |
| `POST` | `/api/downloads` | Start a download job |
| `GET` | `/api/downloads` | List all jobs |
| `GET` | `/api/downloads/{id}` | Get job status and progress |
| `DELETE` | `/api/downloads/{id}` | Cancel a running job |
| `GET` | `/api/downloads/{id}/file` | Download the finished file |

**Resolve example:**

```bash
curl -X POST http://localhost:5280/api/resolve \
  -H "Content-Type: application/json" \
  -d '{"query": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

## Project structure

```
HamzaYut/
├── YoutubeDownloader/          # Avalonia desktop application
├── YoutubeDownloader.Core/     # Shared download, resolve, and tagging logic
├── YoutubeDownloader.Web/      # ASP.NET Core web app + static frontend
└── Readme.md
```

## License

This project is based on [YoutubeDownloader](https://github.com/Tyrrrz/YoutubeDownloader), which is licensed under the [MIT License](License.txt). Modifications in this fork are also released under MIT.

## Disclaimer

This tool is for personal use only. Respect copyright laws and YouTube's Terms of Service. The authors are not responsible for misuse of this software.
