import { SiteHeader } from "@/components/SiteHeader";

export default function PrivacyPage() {
  return (
    <>
      <div className="ambient" aria-hidden="true">
        <div className="ambient-orb ambient-orb--1" />
        <div className="ambient-orb ambient-orb--2" />
      </div>

      <SiteHeader
        navItems={[
          { href: "/", label: "Home" },
          { href: "/privacy", label: "Privacy", active: true },
          { href: "https://github.com/Tyrrrz/YoutubeDownloader", label: "GitHub", external: true },
        ]}
      />

      <article className="page-content">
        <h1>Privacy Policy</h1>
        <p className="page-lead">Last updated: June 16, 2026</p>
        <p>
          This Vercel-hosted version does not store user accounts. Video metadata is processed only to resolve and stream
          downloads.
        </p>
        <h2>What we process</h2>
        <p>
          The app processes the YouTube URL you provide, fetches metadata, and streams selected format bytes to your
          browser.
        </p>
        <h2>Storage</h2>
        <p>
          The Vercel version does not persist downloaded files on the server. Files are streamed directly to the browser.
        </p>
        <h2>Third-party services</h2>
        <p>The app communicates with YouTube/CDN endpoints to resolve and stream media.</p>
      </article>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-bottom">
            <p>
              © 2026 HamzaYut. <a href="/">Home</a>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

