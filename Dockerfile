FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Directory.Build.props Directory.Packages.props global.json NuGet.config ./
COPY YoutubeDownloader.Core/YoutubeDownloader.Core.csproj YoutubeDownloader.Core/
COPY YoutubeDownloader.Web/YoutubeDownloader.Web.csproj YoutubeDownloader.Web/

RUN dotnet restore YoutubeDownloader.Web/YoutubeDownloader.Web.csproj -p:CSharpier_Bypass=true

COPY YoutubeDownloader.Core/ YoutubeDownloader.Core/
COPY YoutubeDownloader.Web/ YoutubeDownloader.Web/

RUN dotnet publish YoutubeDownloader.Web/YoutubeDownloader.Web.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    -p:CSharpier_Bypass=true

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .

ENV ASPNETCORE_ENVIRONMENT=Production
ENV Download__RootPath=/data/downloads
ENV Download__FFmpegFilePath=/usr/bin/ffmpeg

RUN mkdir -p /data/downloads

EXPOSE 8080

ENTRYPOINT ["dotnet", "YoutubeDownloader.Web.dll"]
