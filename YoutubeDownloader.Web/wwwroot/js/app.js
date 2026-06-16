const queryInput = document.getElementById("query-input");
const resolveBtn = document.getElementById("resolve-btn");
const globalProgress = document.getElementById("global-progress");
const emptyState = document.getElementById("empty-state");
const setupPanel = document.getElementById("setup-panel");
const setupTitle = document.getElementById("setup-title");
const setupMeta = document.getElementById("setup-meta");
const setupThumbnail = document.getElementById("setup-thumbnail");
const formatSelect = document.getElementById("format-select");
const startDownloadBtn = document.getElementById("start-download-btn");
const cancelSetupBtn = document.getElementById("cancel-setup-btn");
const queueSection = document.getElementById("queue");
const queueCount = document.getElementById("queue-count");
const downloadList = document.getElementById("download-list");
const clearCompletedBtn = document.getElementById("clear-completed-btn");
const healthStatus = document.getElementById("health-status");
const healthLabel = healthStatus?.querySelector(".health-label");
const setupThumbPlaceholder = document.getElementById("setup-thumb-placeholder");
const toastHost = document.getElementById("toast-host");
const itemTemplate = document.getElementById("download-item-template");

/** @type {{ video: object, options: object[] } | null} */
let pendingSetup = null;

/** @type {Map<string, HTMLElement>} */
const jobElements = new Map();

async function saveJobFile(jobId, fileName) {
  const response = await fetch(`/api/downloads/${jobId}/file`);
  if (!response.ok) {
    let message = "Could not download the file.";
    try {
      const body = await response.json();
      message = body.error || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName || "download";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = await response.json();
      message = body.error || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

function showToast(message, type = "info") {
  if (!toastHost) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastHost.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "toast-out 0.25s ease forwards";
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }, 4000);
}

function setBusy(busy) {
  if (resolveBtn) resolveBtn.disabled = busy;
  if (startDownloadBtn) startDownloadBtn.disabled = busy;
  if (globalProgress) globalProgress.hidden = !busy;
}

function replayPanelAnimation(element) {
  element.classList.remove("panel-enter");
  void element.offsetWidth;
  element.classList.add("panel-enter");
}

function showEmptyState() {
  if (emptyState) emptyState.hidden = false;
  if (setupPanel) setupPanel.hidden = true;
  pendingSetup = null;
}

function hideEmptyState() {
  if (emptyState) emptyState.hidden = true;
}

const STATUS_NAMES = ["Enqueued", "Started", "Completed", "Failed", "Canceled"];

function normalizeStatus(status) {
  if (typeof status === "number") return STATUS_NAMES[status] ?? String(status);
  return status;
}

function statusLabel(status) {
  switch (normalizeStatus(status)) {
    case "Enqueued":
      return "Queued…";
    case "Started":
      return "Downloading…";
    case "Completed":
      return "Completed";
    case "Failed":
      return "Failed — click to copy error";
    case "Canceled":
      return "Canceled";
    default:
      return String(status);
  }
}

function renderSetup(data) {
  hideEmptyState();
  if (setupPanel) setupPanel.hidden = false;
  replayPanelAnimation(setupPanel);
  pendingSetup = { video: data.video, options: data.options };

  if (setupTitle) setupTitle.textContent = data.video.title;
  if (setupMeta) {
    setupMeta.textContent = [data.video.author, data.video.duration].filter(Boolean).join(" · ");
  }

  if (data.video.thumbnailUrl) {
    if (setupThumbnail) {
      setupThumbnail.hidden = false;
      setupThumbnail.src = data.video.thumbnailUrl;
    }
    if (setupThumbPlaceholder) setupThumbPlaceholder.hidden = true;
  } else {
    if (setupThumbnail) setupThumbnail.hidden = true;
    if (setupThumbPlaceholder) setupThumbPlaceholder.hidden = false;
  }

  if (!formatSelect) return;

  formatSelect.innerHTML = "";
  for (const option of data.options) {
    const opt = document.createElement("option");
    opt.value = String(option.index);
    const suffix = option.isVideoUpscaled ? " · Upscaled" : "";
    opt.textContent = `${option.label} · ${option.container}${suffix}`;
    formatSelect.appendChild(opt);
  }
}

function upsertJobElement(job) {
  let card = jobElements.get(job.id);
  if (!card) {
    const fragment = itemTemplate.content.cloneNode(true);
    card = fragment.querySelector(".download-card");
    card.dataset.jobId = job.id;
    downloadList.prepend(card);
    jobElements.set(job.id, card);
  }

  const thumb = card.querySelector(".download-thumb");
  const title = card.querySelector(".download-title");
  const fill = card.querySelector(".download-progress-fill");
  const track = card.querySelector(".download-progress-track");
  const status = card.querySelector(".download-status");
  const saveBtn = card.querySelector(".btn-save-file");
  const downloadLink = card.querySelector(".btn-download-file");
  const cancelBtn = card.querySelector(".btn-cancel-job");

  title.textContent = job.fileName || job.title;
  title.title = job.fileName || job.title;

  if (job.thumbnailUrl) {
    thumb.src = job.thumbnailUrl;
    thumb.hidden = false;
  } else {
    thumb.hidden = true;
  }

  const statusName = normalizeStatus(job.status);
  const isActive = statusName === "Started";
  track.hidden = !isActive;
  fill.style.width = `${Math.round((job.progress || 0) * 100)}%`;

  status.textContent =
    statusName === "Started" && job.progressText ? job.progressText : statusLabel(statusName);
  status.className = `download-status ${statusName.toLowerCase()}`;

  if (statusName === "Failed" && job.errorMessage) {
    status.onclick = async () => {
      await navigator.clipboard.writeText(job.errorMessage);
      status.textContent = "Error copied to clipboard";
    };
  } else {
    status.onclick = null;
  }

  const canSave = statusName === "Completed" && job.canDownload;
  saveBtn.hidden = !canSave;
  downloadLink.hidden = !canSave;

  const fileName = job.fileName || job.title || "download";
  const saveHandler = async () => {
    try {
      await saveJobFile(job.id, fileName);
      showToast("File saved to your downloads folder.", "info");
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  if (canSave) {
    downloadLink.href = `/api/downloads/${job.id}/file`;
    downloadLink.download = fileName;
    downloadLink.title = `Save ${fileName}`;
    saveBtn.onclick = saveHandler;
    downloadLink.onclick = (event) => {
      event.preventDefault();
      void saveHandler();
    };
  } else {
    saveBtn.onclick = null;
    downloadLink.onclick = null;
  }

  cancelBtn.hidden = !job.canCancel;
  cancelBtn.onclick = async () => {
    await api(`/api/downloads/${job.id}`, { method: "DELETE" });
    await refreshJobs();
  };
}

async function refreshJobs() {
  try {
    const jobs = await api("/api/downloads");
    const wasHidden = queueSection.hidden;
    queueSection.hidden = jobs.length === 0;
    queueCount.textContent = jobs.length ? `(${jobs.length})` : "";

    if (wasHidden && jobs.length > 0) {
      replayPanelAnimation(queueSection);
    }

    const activeIds = new Set(jobs.map((j) => j.id));
    for (const [id, element] of jobElements) {
      if (!activeIds.has(id)) {
        element.remove();
        jobElements.delete(id);
      }
    }

    for (const job of jobs) {
      upsertJobElement(job);
    }

    if (jobs.length === 0 && !pendingSetup) {
      showEmptyState();
    } else {
      hideEmptyState();
    }
  } catch {
    // Keep the UI responsive even if polling fails briefly.
  }
}

async function resolveQuery() {
  const query = queryInput.value.trim();
  if (!query) {
    showToast("Paste a YouTube link first.", "error");
    return;
  }

  setBusy(true);
  try {
    const result = await api("/api/resolve", {
      method: "POST",
      body: JSON.stringify({ query }),
    });

    if (result.kind === "single") {
      renderSetup(result);
    } else if (result.kind === "multiple") {
      showToast(
        `Found ${result.videos.length} videos in "${result.title}". Paste a single video URL for now.`,
        "info"
      );
    }
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setBusy(false);
  }
}

async function startDownload() {
  if (!pendingSetup) {
    showToast("Resolve a video first.", "error");
    return;
  }

  const optionIndex = Number(formatSelect.value);
  if (!Number.isFinite(optionIndex)) {
    showToast("Choose a format first.", "error");
    return;
  }

  const originalLabel = startDownloadBtn.textContent;
  setBusy(true);
  startDownloadBtn.textContent = "Starting…";

  try {
    await api("/api/downloads", {
      method: "POST",
      body: JSON.stringify({
        videoId: pendingSetup.video.id,
        optionIndex,
      }),
    });

    if (setupPanel) setupPanel.hidden = true;
    pendingSetup = null;
    queryInput.value = "";
    await refreshJobs();
    showToast("Download started. Click Save file when it completes.", "info");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    startDownloadBtn.textContent = originalLabel;
    setBusy(false);
  }
}

async function checkHealth() {
  if (!healthLabel) return;

  try {
    const health = await api("/api/health");
    if (health.mode === "vercel-stream") {
      healthLabel.textContent = "Wrong host";
      healthStatus.className = "health warn";
      showToast(
        "This URL is the old Vercel version. Run the ASP.NET app locally or deploy on Render.",
        "error"
      );
      return;
    }

    if (health.ffmpeg) {
      healthLabel.textContent = "FFmpeg ready";
      healthStatus.className = "health ok";
    } else {
      healthLabel.textContent = "FFmpeg missing";
      healthStatus.className = "health warn";
      showToast("FFmpeg is missing on the server. Downloads may fail.", "error");
    }
  } catch {
    healthLabel.textContent = "Server offline";
    healthStatus.className = "health warn";
    showToast("Cannot reach the server. Run: dotnet run --project YoutubeDownloader.Web", "error");
  }
}

function initApp() {
  if (!queryInput || !resolveBtn || !startDownloadBtn || !itemTemplate) {
    showToast("Download page failed to initialize. Refresh the page.", "error");
    return;
  }

  resolveBtn.addEventListener("click", resolveQuery);
  queryInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void resolveQuery();
    }
  });

  startDownloadBtn.addEventListener("click", () => void startDownload());
  cancelSetupBtn?.addEventListener("click", showEmptyState);

  clearCompletedBtn?.addEventListener("click", () => {
    for (const [id, element] of [...jobElements]) {
      const status = element.querySelector(".download-status");
      if (status?.classList.contains("completed")) {
        element.remove();
        jobElements.delete(id);
      }
    }
    void refreshJobs();
  });

  void checkHealth();
  void refreshJobs();
  setInterval(() => void refreshJobs(), 1000);

  const params = new URLSearchParams(window.location.search);
  const initialQuery = params.get("q") ?? params.get("url");
  if (initialQuery) {
    queryInput.value = initialQuery;
    window.history.replaceState({}, "", window.location.pathname);
    void resolveQuery();
  }
}

initApp();
