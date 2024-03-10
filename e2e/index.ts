const port = 3000;

console.log(`[${process.pid}] Bun.serve at port ${port}`);

Bun.serve({
  port: port,
  reusePort: true,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fetch(req: Request): Response | Promise<Response> {
    return new Response('Hello World!');
  },
});

if (process.send) {
  process.send('ready');
}
