import type { Subprocess } from 'bun';
import type { Logger } from 'pino';
import { LogWrapper } from './log-wrapper';

export class ClusterRunner {
  numCPUs: number;
  command: string[];
  logger: LogWrapper;

  subprocessList: Subprocess[] = [];

  constructor({ numCPUs, logger }: { numCPUs: number; logger?: Logger }) {
    this.numCPUs = numCPUs;
    this.logger = new LogWrapper(logger);

    this.command = ['bun', 'src/index.ts'];
  }

  private async startSubprocess(i: number) {
    return new Promise<Subprocess>((resolve, reject) =>
      Bun.spawn(this.command, {
        stdio: ['inherit', 'inherit', 'inherit'],
        env: {},
        ipc: (message, subprocess) => {
          if (message === 'ready') {
            subprocess.exited.then(async (exitCode) => {
              if (exitCode !== 0) {
                this.logger.error(
                  `Process ${subprocess.pid}` + (subprocess.signalCode
                    ? ` terminated with signal ${subprocess.signalCode}`
                    : ` failed with exit code ${exitCode}`),
                );
                // Auto-restart on error
                if (!subprocess.signalCode) {
                  this.subprocessList[i] = await this.startSubprocess(
                    i,
                  );
                }
              }
            }).catch(() => null);

            resolve(subprocess);
          }
        },
        onExit: (subprocess, exitCode, signalCode, error) => {
          if (exitCode !== 0) {
            reject(
              new Error(
                `Process ${subprocess.pid}` + (signalCode
                  ? ` terminated with signal ${signalCode}`
                  : ` failed with exit code ${exitCode}`),
                { cause: error },
              ),
            );
          }
        },
      })
    );
  }

  async start({ reloadSignal }: { reloadSignal?: NodeJS.Signals }) {
    for (let i = 0; i < this.numCPUs; i++) {
      this.subprocessList.push(
        await this.startSubprocess(i),
      );
    }

    if (reloadSignal) {
      process.on(reloadSignal, () => {
        this.logger.debug(
          `${reloadSignal} signal received. Reloading processes...`,
        );
        this.reload().catch(() => null);
      });
    }
  }

  async reload() {
    for (let i = 0; i < this.subprocessList.length; i++) {
      const p = this.subprocessList[i];
      p.kill();
      await p.exited;

      this.subprocessList[i] = await this.startSubprocess(i);
    }
  }
}
