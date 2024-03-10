import pino from 'pino';
import { ClusterRunner } from '../src/index';

const clusterRunner = new ClusterRunner({
  numCPUs: 2,
  logger: pino({ level: 'debug', transport: { target: 'pino-pretty' } }),
});

await clusterRunner.start({
  command: ['bun', 'e2e/index.ts'],
  reloadSignal: 'SIGHUP',
  updateEnv: true,
});

await Bun.sleep(3000);
await clusterRunner.reload();
