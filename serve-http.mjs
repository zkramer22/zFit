import { createServer } from "http";
import { request } from "http";

const PORT = 8080;

createServer((req, res) => {
  const isPocketBase = req.url.startsWith("/api/") || req.url.startsWith("/_/");
  const port = isPocketBase ? 8090 : 3000;

  const proxy = request(
    {
      host: "localhost", port, path: req.url, method: req.method,
      headers: req.headers
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  req.pipe(proxy);
}).listen(PORT, "127.0.0.1", () => {
  console.log(`HTTP proxy running on http://127.0.0.1:${PORT}`);
});
