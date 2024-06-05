const port = process.env.PORT;

Bun.serve({
  port: port,
  // disable share port to raise error on one of the child
  reusePort: false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fetch(_req: Request): Response | Promise<Response> {
    return new Response('Hello World!');
  },
});

if (process.send) {
  process.send('ready');
}
