import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export default function HomePage() {
  return (
    <>
      <div className="ambient" aria-hidden="true">
        <div className="ambient-orb ambient-orb--1" />
        <div className="ambient-orb ambient-orb--2" />
      </div>

      <SiteHeader
        navItems={[
          { href: "/", label: "Home", active: true },
          { href: "#features", label: "Features" },
          { href: "#faq", label: "FAQ" },
          { href: "/privacy", label: "Privacy" },
          { href: "/download", label: "Start downloading", cta: true },
        ]}
      />

      <main>
        <section className="landing-hero">
          <h1>
            Download YouTube videos <span>in seconds</span>
          </h1>
          <p>Paste any YouTube link, pick your quality, and stream directly to your browser.</p>
          <div className="landing-form">
            <Link href="/download" className="btn-primary btn-lg">
              Start downloading
            </Link>
          </div>
          <p className="landing-hero-note">This Vercel version supports single video URLs and pre-muxed formats.</p>
        </section>

        <section className="landing-section" id="features">
          <div className="landing-section-header">
            <h2>Vercel-native mode</h2>
            <p>Built with Next.js route handlers and browser streaming.</p>
          </div>
          <div className="features-grid">
            <article className="feature-card">
              <h3>No server file storage</h3>
              <p>Files stream straight to your browser downloads folder.</p>
            </article>
            <article className="feature-card">
              <h3>Pre-muxed formats</h3>
              <p>Uses YouTube formats that already contain playable media streams.</p>
            </article>
            <article className="feature-card">
              <h3>Single deploy on Vercel</h3>
              <p>Frontend and API route handlers ship together in one project.</p>
            </article>
          </div>
        </section>

        <section className="landing-section" id="faq">
          <div className="landing-section-header">
            <h2>Tradeoffs</h2>
            <p>Large files and long streams may be less reliable than dedicated .NET hosts.</p>
          </div>
        </section>
      </main>
    </>
  );
}

