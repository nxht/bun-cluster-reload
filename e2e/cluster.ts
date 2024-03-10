import { ClusterRunner } from '../src/index';

const clusterRunner = new ClusterRunner({ numCPUs: 2, logger: console });
await clusterRunner.start({
  command: ['bun', 'e2e/index.ts'],
  reloadSignal: 'SIGHUP',
  updateEnv: true,
});
