  import { createServer } from "https";
  import { readFileSync } from "fs";
  import { request } from "http";

  const cert = readFileSync("certs/freshmacs-macbook-pro.tail4ac32b.ts.net.crt");
  const key = readFileSync("certs/freshmacs-macbook-pro.tail4ac32b.ts.net.key");

  createServer({ cert, key }, (req, res) => {
    const proxy = request(
      { 
        host: "localhost", port: 3000, path: req.url, method: req.method,
        headers: req.headers 
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );

    req.pipe(proxy);
  }).listen(8443, "0.0.0.0", () => {
    console.log("HTTPS proxy running at https://freshmacs-macbook-pro.tail4ac32b.ts.net");
  });