// Dev tool for performance work: forwards to the local Supabase stack and delays every
// request, to imitate a hosted project a few network hops away.
//   pnpm exec tsx e2e/support/latency-proxy.ts   (listens on 54399, delay 80 ms)
import http from 'node:http';

const LISTEN_PORT = Number(process.env.PROXY_PORT ?? 54399);
const TARGET_PORT = Number(process.env.TARGET_PORT ?? 54321);
const DELAY_MS = Number(process.env.PROXY_DELAY_MS ?? 80);

http
  .createServer((request, response) => {
    setTimeout(() => {
      const upstream = http.request(
        {
          host: '127.0.0.1',
          port: TARGET_PORT,
          path: request.url,
          method: request.method,
          headers: { ...request.headers, host: `127.0.0.1:${TARGET_PORT}` },
        },
        (upstreamResponse) => {
          response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
          upstreamResponse.pipe(response);
        },
      );
      upstream.on('error', () => {
        response.writeHead(502);
        response.end();
      });
      request.pipe(upstream);
    }, DELAY_MS);
  })
  .listen(LISTEN_PORT, () => {
    console.warn(`latency proxy :${LISTEN_PORT} -> :${TARGET_PORT}, +${DELAY_MS} ms`);
  });
