# bun-cluster-reload

pm2-like cluster and reload for bun

## Installation

```bash
bun add bun-cluster-reload
```

## Features

- Auto-restart on error
- [PM2-like reload](https://pm2.keymetrics.io/docs/usage/cluster-mode/#reload) on signal
- [PM2-like waitReady](https://pm2.keymetrics.io/docs/usage/signals-clean-restart/#graceful-start) option

## Example

```typescript
import { ClusterRunner } from 'bun-cluster-reload';

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
```

### Using with PM2

- Set `bun` as pm2 interpreter as in [official Bun guide](https://bun.sh/guides/ecosystem/pm2)
- The target script should be the ClusterRunner file
  - Note that the clustering happens in `bun` not `pm2`. So you'll see a single process in pm2 monitoring
- To reload, send predefined signal to process using `pm2 send signal`. For example:
  ```bash
  pm2 sendSignal SIGHUP app
  ```
