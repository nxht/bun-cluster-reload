import type { Subprocess } from 'bun';
import { cpus } from 'node:os';
import type { Logger } from 'pino';
import { LogWrapper } from './log-wrapper';

export type ClusterRunnerOptions = {
  logger?: Logger;
  numCPUs: number;
  restartOnError: boolean;
};

export class ClusterRunner {
  logger: LogWrapper;
  numCPUs: number;
  options: Omit<ClusterRunnerOptions, 'logger' | 'numCPUs'>;

  subprocessList: [string[], Subprocess][] = [];

  constructor({ logger, numCPUs, ...options }: ClusterRunnerOptions) {
    this.logger = new LogWrapper(logger);

    if (numCPUs <= 0) {
      this.numCPUs = cpus().length + numCPUs;
    } else {
      this.numCPUs = numCPUs;
    }

    this.options = options;
  }

  private getExitMessage(
    { pid, signalCode, exitCode }: {
      pid: number;
      signalCode: NodeJS.Signals | number | null;
      exitCode: number | null;
    },
  ) {
    return `Process ${pid}`
      + (signalCode
        ? ` terminated with signal ${signalCode}`
        : ` failed with exit code ${exitCode}`);
  }

  private async startSubprocess(command: string[], i: number) {
    return new Promise<Subprocess>((resolve, reject) =>
      Bun.spawn(command, {
        stdio: ['inherit', 'inherit', 'inherit'],
        env: {},
        ipc: (message, subprocess) => {
          if (message === 'ready') {
            subprocess.exited.then(async (exitCode) => {
              if (exitCode !== 0) {
                this.logger.error(
                  this.getExitMessage({
                    pid: subprocess.pid,
                    signalCode: subprocess.signalCode,
                    exitCode,
                  }),
                );

                if (this.options.restartOnError && !subprocess.signalCode) {
                  this.subprocessList[i] = [
                    command,
                    await this.startSubprocess(command, i),
                  ];
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
                this.getExitMessage({
                  pid: subprocess.pid,
                  signalCode,
                  exitCode,
                }),
                { cause: error },
              ),
            );
          }
        },
      })
    );
  }

  async start(
    { command, reloadSignal }: {
      command: string[];
      reloadSignal?: NodeJS.Signals;
    },
  ) {
    for (let i = 0; i < this.numCPUs; i++) {
      this.subprocessList.push([
        command,
        await this.startSubprocess(command, i),
      ]);
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
      const [command, p] = this.subprocessList[i];
      p.kill();
      await p.exited;

      this.subprocessList[i] = [
        command,
        await this.startSubprocess(command, i),
      ];
    }
  }
}
