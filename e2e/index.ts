import pino from 'pino';
const port = process.env.PORT;

const logger = pino({ level: 'debug', transport: { target: 'pino-pretty' } });
logger.info(`Bun.serve at port ${port}`);

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
