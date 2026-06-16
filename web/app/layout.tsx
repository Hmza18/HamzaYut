import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HamzaYut",
  description:
    "Download YouTube videos in your browser. Pick quality and format, then stream directly.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="page-site">{children}</body>
    </html>
  );
}

