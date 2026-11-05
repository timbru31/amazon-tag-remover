import { existsSync, readFileSync } from "node:fs";
import { createServer, type Server } from "node:https";
import { fileURLToPath } from "node:url";

// The fixture server must run on a fixed port: the browser is launched with
// `--host-rules=MAP www.amazon.de 127.0.0.1:<port>` (a launch argument, so the
// port cannot be chosen at runtime). The amazon.* hosts are in Chromium's HSTS
// preload list and force HTTPS, so the fixture speaks TLS with a committed
// self-signed cert; the browser accepts it via --ignore-certificate-errors.
export const PORT = 18081;

const distDir = fileURLToPath(new URL("../../dist", import.meta.url));
const fixtureBody = readFileSync(fileURLToPath(new URL("./fixtures/amazon.html", import.meta.url)));
const tlsOptions = {
  key: readFileSync(fileURLToPath(new URL("./fixtures/tls/key.pem", import.meta.url))),
  cert: readFileSync(fileURLToPath(new URL("./fixtures/tls/cert.pem", import.meta.url))),
};

export default async function globalSetup(): Promise<() => Promise<void>> {
  if (!existsSync(`${distDir}/manifest.json`)) {
    throw new Error("dist/ is missing — run `pnpm build` first (or `pnpm test:e2e`, which builds for you)");
  }

  const server: Server = createServer(tlsOptions, (request, response) => {
    if (request.method === "HEAD") {
      response.writeHead(200, { "content-type": "text/html" });
      response.end();
      return;
    }
    response.writeHead(200, { "content-type": "text/html" });
    response.end(fixtureBody);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, "127.0.0.1", () => resolve());
  });

  return async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  };
}
