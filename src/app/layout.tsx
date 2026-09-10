import type { Metadata } from "next";
import type { ReactNode } from "react";
import { HOMEPAGE, LICENSE_URL } from "../../scripts/config";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pica",
  description: "ASCII-first components for React and plain HTML, served in the formats coding agents read.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt" />
      </head>
      <body>
        {children}
        <footer className="status">
          <span>Pica</span>
          <span>MIT + Commons Clause</span>
          <a href={LICENSE_URL}>license</a>
          <a href="/llms.txt">llms.txt</a>
          <a href={HOMEPAGE}>github</a>
        </footer>
      </body>
    </html>
  );
}
