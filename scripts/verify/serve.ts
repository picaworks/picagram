/** A static file server over .pica/, so verify's pages load over http from localhost. That is a secure
 *  context, as a real site is, which the camera and other gated APIs need; file:// pages are not. */
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
};

export interface Served {
  /** Such as http://127.0.0.1:53412 */
  readonly origin: string;
  close(): Promise<void>;
}

export async function serve(root: string): Promise<Served> {
  const server = createServer((request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname)).replace(/^[/\\]+/, "");
    if (path.startsWith("..")) {
      response.writeHead(403).end();
      return;
    }
    readFile(join(root, path)).then(
      (body) => {
        response.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream", "cache-control": "no-store" });
        response.end(body);
      },
      () => response.writeHead(404).end(),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    origin: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
