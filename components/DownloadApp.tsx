"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { DownloadOption, LocalDownload, QueryResponse } from "@/lib/types";

type ResolveData = Extract<QueryResponse, { kind: "single" }>;

function statusLabel(status: LocalDownload["status"]) {
  switch (status) {
    case "Started":
      return "Streaming…";
    case "Completed":
      return "Completed";
    case "Failed":
      return "Failed";
    case "Canceled":
      return "Canceled";
    default:
      return status;
  }
}

export function DownloadApp({ initialQuery }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [busy, setBusy] = useState(false);
  const [healthLabel, setHealthLabel] = useState("Checking…");
  const [healthClass, setHealthClass] = useState("health");
  const [toast, setToast] = useState<{ message: string; type: "info" | "error" } | null>(null);
  const [setup, setSetup] = useState<ResolveData | null>(null);
  const [selectedItag, setSelectedItag] = useState<number | null>(null);
  const [downloads, setDownloads] = useState<LocalDownload[]>([]);

  const showToast = (message: string, type: "info" | "error" = "info") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then(() => {
        setHealthLabel("Streaming mode");
        setHealthClass("health ok");
      })
      .catch(() => {
        setHealthLabel("Server offline");
        setHealthClass("health warn");
      });
  }, []);

  async function resolveQuery() {
    const trimmed = query.trim();
    if (!trimmed) return;

    setBusy(true);
    try {
      const response = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to resolve video.");
      }

      const result = body as QueryResponse;
      if (result.kind !== "single") {
        showToast("Only single-video URLs are supported in this Vercel version.", "info");
        return;
      }

      setSetup(result);
      setSelectedItag(result.options[0]?.itag ?? null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Resolve failed.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function startDownload() {
    if (!setup || selectedItag === null) return;

    const option = setup.options.find((item) => item.itag === selectedItag);
    if (!option) return;

    const id = crypto.randomUUID();
    const item: LocalDownload = {
      id,
      videoId: setup.video.id,
      title: setup.video.title,
      thumbnailUrl: setup.video.thumbnailUrl,
      fileName: `${setup.video.title}.${option.container}`,
      status: "Started",
      progress: 0,
      progressText: "Starting…",
      errorMessage: null,
    };

    setDownloads((value) => [item, ...value]);

    try {
      const url = `/api/download?videoId=${encodeURIComponent(setup.video.id)}&itag=${option.itag}`;
      const response = await fetch(url);

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Download failed.");
      }

      const blob = await response.blob();
      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(blob);
      anchor.download = item.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(anchor.href);

      setDownloads((value) =>
        value.map((download) =>
          download.id === id
            ? {
                ...download,
                status: "Completed",
                progress: 1,
                progressText: "Saved to browser downloads",
              }
            : download
        )
      );

      setSetup(null);
      setQuery("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Download failed.";
      setDownloads((value) =>
        value.map((download) =>
          download.id === id
            ? {
                ...download,
                status: "Failed",
                progress: 1,
                progressText: null,
                errorMessage: message,
              }
            : download
        )
      );
      showToast(message, "error");
    }
  }

  useEffect(() => {
    if (initialQuery) {
      void resolveQuery();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedOption = useMemo<DownloadOption | undefined>(
    () => setup?.options.find((option) => option.itag === selectedItag),
    [setup, selectedItag]
  );

  return (
    <>
      <div className="app">
        <header className="top-bar">
          <div className="app-heading">
            <h1>Download</h1>
            <p className="app-subtitle">Paste a link and pick your format</p>
          </div>
          <div className={healthClass} title="Server status">
            <span className="health-dot" aria-hidden="true" />
            <span className="health-label">{healthLabel}</span>
          </div>
        </header>

        <section className="hero">
          <div className="hero-input-shell">
            <label className="sr-only" htmlFor="query-input">
              YouTube URL
            </label>
            <textarea
              id="query-input"
              rows={1}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void resolveQuery();
                }
              }}
              placeholder="Paste a YouTube video URL…"
              spellCheck={false}
            />
            <button id="resolve-btn" type="button" aria-label="Resolve" disabled={busy} onClick={() => void resolveQuery()}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </section>

        <main className="main">
          {!setup && downloads.length === 0 ? (
            <section className="empty-state">
              <h2>Ready to download</h2>
              <p>This Vercel version streams pre-muxed formats directly to your browser.</p>
            </section>
          ) : null}

          {setup ? (
            <section className="setup-panel panel-enter">
              <div className="setup-header">
                <div className="setup-thumb-wrap">
                  {setup.video.thumbnailUrl ? (
                    <img src={setup.video.thumbnailUrl} alt="" className="setup-thumb" />
                  ) : (
                    <div className="setup-thumb-placeholder" aria-hidden="true" />
                  )}
                </div>
                <div className="setup-info">
                  <h2>{setup.video.title}</h2>
                  <p className="muted">{[setup.video.author, setup.video.duration].filter(Boolean).join(" · ")}</p>
                </div>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="format-select">
                  Format
                </label>
                <div className="select-wrap">
                  <select
                    id="format-select"
                    value={selectedItag ?? ""}
                    onChange={(event) => setSelectedItag(Number(event.target.value))}
                  >
                    {setup.options.map((option) => (
                      <option key={option.itag} value={option.itag}>
                        {option.label} · {option.container}
                        {option.isAudioOnly ? " · Audio" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedOption?.isAudioOnly ? <p className="hero-hint">Audio-only stream selected.</p> : null}
              </div>

              <div className="setup-actions">
                <button type="button" className="btn-primary" onClick={() => void startDownload()}>
                  Download
                </button>
                <button type="button" className="btn-ghost" onClick={() => setSetup(null)}>
                  Cancel
                </button>
              </div>
            </section>
          ) : null}

          {downloads.length > 0 ? (
            <section className="queue panel-enter">
              <div className="queue-header">
                <div className="queue-title">
                  <h2>Downloads</h2>
                </div>
              </div>

              <ul className="download-list">
                {downloads.map((download) => (
                  <li key={download.id} className="download-card">
                    <div className="download-thumb-wrap">
                      {download.thumbnailUrl ? <img className="download-thumb" src={download.thumbnailUrl} alt="" /> : null}
                    </div>
                    <div className="download-body">
                      <div className="download-title">{download.title}</div>
                      <div className="download-status-row">
                        <span className={`download-status ${download.status.toLowerCase()}`}>{statusLabel(download.status)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </main>
      </div>

      {toast ? (
        <div id="toast-host" className="toast-host" role="status" aria-live="polite">
          <div className={`toast ${toast.type}`}>{toast.message}</div>
        </div>
      ) : null}
    </>
  );
}

