import { ClusterRunner } from '../src/index';

const clusterRunner = new ClusterRunner({
  numCPUs: 2,
  logger: console,
  autorestart: true,
  waitReady: true,
});

await clusterRunner.start({
  command: ['bun', 'src/index.ts'],
  reloadSignal: 'SIGHUP',
  updateEnv: false,
});

await Bun.sleep(3000);
await clusterRunner.reload();
