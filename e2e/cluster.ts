import { ClusterRunner } from '../src/index';

const clusterRunner = new ClusterRunner({
  numCPUs: 2,
  logger: console,
  autorestart: true,
  waitReady: true,
});

await clusterRunner.start({
  command: ['bun', 'e2e/index.ts'],
  reloadSignal: 'SIGHUP',
  updateEnv: false,
});
await Bun.sleep(100);
const { p } = clusterRunner.subprocessList[0];
p?.kill();
await p?.exited;
console.error(`process: ${p?.pid} pre-killed`);
await Bun.sleep(100);

await clusterRunner.reload();
await Bun.sleep(100);
await clusterRunner.terminate();
