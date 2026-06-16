export type VideoSummary = {
  id: string;
  title: string;
  author: string;
  duration: string | null;
  thumbnailUrl: string | null;
};

export type DownloadOption = {
  index: number;
  itag: number;
  label: string;
  container: string;
  isAudioOnly: boolean;
  isVideoUpscaled: boolean;
};

export type QueryResponse =
  | {
      kind: "single";
      title: string;
      video: VideoSummary;
      options: DownloadOption[];
      videos: null;
    }
  | {
      kind: "multiple";
      title: string;
      video: null;
      options: null;
      videos: VideoSummary[];
    };

export type ResolveRequest = {
  query: string;
};

export type HealthResponse = {
  status: "ok";
  mode: "vercel-stream";
  streaming: true;
};

export type LocalDownload = {
  id: string;
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  fileName: string;
  status: "Started" | "Completed" | "Failed" | "Canceled";
  progress: number;
  progressText: string | null;
  errorMessage: string | null;
};
