import type { Metadata } from "next";
import type { ReactNode } from "react";
import { HOMEPAGE, LICENSE_URL, SITE_URL } from "../../scripts/config";
import "./globals.css";

const DESCRIPTION = "ASCII-first components for React and plain HTML, served in the formats coding agents read.";

// Link previews need full URLs, so these are absolute. The page's own links stay relative.
export const metadata: Metadata = {
  title: "Picagram",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    url: `${SITE_URL}/`,
    title: "Picagram",
    description: DESCRIPTION,
    images: [{ url: `${SITE_URL}/og.png`, width: 1200, height: 630, alt: "Picagram" }],
  },
  twitter: { card: "summary_large_image", title: "Picagram", description: DESCRIPTION, images: [`${SITE_URL}/og.png`] },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="icon.svg" type="image/svg+xml" />
        <link rel="alternate" type="text/plain" href="llms.txt" title="llms.txt" />
      </head>
      <body>
        {children}
        <footer className="status">
          <span>Picagram</span>
          <span>MIT + Commons Clause</span>
          <a href={LICENSE_URL}>license</a>
          <a href="llms.txt">llms.txt</a>
          <a href={HOMEPAGE}>github</a>
        </footer>
      </body>
    </html>
  );
}
