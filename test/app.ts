const port = process.env.PORT;

Bun.serve({
  port: port,
  reusePort: true,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fetch(_req: Request): Response | Promise<Response> {
    return new Response('Hello World!');
  },
});

if (process.send) {
  process.send('ready');
}
