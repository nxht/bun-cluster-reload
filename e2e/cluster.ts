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
await Bun.sleep(1000);
const process = clusterRunner.subprocessList[0]
process[1].kill()
await process[1].exited
console.log(`process: ${process[1].pid} pre-killed`)
await Bun.sleep(1000);

await clusterRunner.reload();
await Bun.sleep(1000);
await clusterRunner.terminate()
