import type { Metadata } from "next";
import type { ReactNode } from "react";
import { THEME_SCRIPT } from "@/lib/theme";
import { HOMEPAGE, LICENSE_URL, SITE_URL } from "../../scripts/config";
import "./globals.css";

const DESCRIPTION = "ASCII-first components for React and plain HTML, served in the formats coding agents read.";

/** The site is one static export, so this runs once, when the page is built. */
const BUILD_YEAR = new Date().getUTCFullYear();

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
    // The theme script writes data-theme on this element, so React must not own that attribute: it is never
    // rendered here, and suppressHydrationWarning keeps React from taking the difference for an error.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* First in the head, so the theme is in force before the browser paints anything. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="icon" href="favicon-32.png" sizes="32x32" type="image/png" />
        <link rel="icon" href="icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="apple-touch-icon.png" />
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
          <span className="status-copy">© {BUILD_YEAR} Picagram</span>
        </footer>
      </body>
    </html>
  );
}
