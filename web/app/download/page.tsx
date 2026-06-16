import { SiteHeader } from "@/components/SiteHeader";
import { DownloadApp } from "@/components/DownloadApp";

export default async function DownloadPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; url?: string }>;
}) {
  const params = await searchParams;
  const initialQuery = params.q ?? params.url ?? "";

  return (
    <>
      <div className="ambient" aria-hidden="true">
        <div className="ambient-orb ambient-orb--1" />
        <div className="ambient-orb ambient-orb--2" />
      </div>

      <SiteHeader
        navItems={[
          { href: "/", label: "Home" },
          { href: "/privacy", label: "Privacy" },
          { href: "https://github.com/Tyrrrz/YoutubeDownloader", label: "GitHub", external: true },
        ]}
      />

      <DownloadApp initialQuery={initialQuery} />

      <footer className="site-footer site-footer--compact">
        <div className="footer-inner">
          <div className="footer-bottom">
            <p>
              <a href="/">Home</a> · <a href="/privacy">Privacy</a> ·
              <a href="https://github.com/Tyrrrz/YoutubeDownloader" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
              — Not affiliated with YouTube.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

