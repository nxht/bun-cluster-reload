import type { SpawnOptions, Subprocess } from 'bun';
import { cpus } from 'node:os';
import { LogWrapper, type Logger } from './log-wrapper';

export type ClusterRunnerOptions = {
  logger?: Logger;
  numCPUs: number;
  autorestart?: boolean;
  waitReady?: boolean;
};

export type SubprocessOption = {
  command: string[];
} & SpawnOptions.OptionsObject;

type SubprocessList = [SubprocessOption, Subprocess | null][];

export class ClusterRunner {
  logger: LogWrapper;
  readonly numCPUs: number;
  readonly autorestart?: boolean;
  readonly waitReady?: boolean;

  subprocessList: SubprocessList = [];

  constructor({ logger, numCPUs, ...options }: ClusterRunnerOptions) {
    this.logger = new LogWrapper(logger);

    if (numCPUs <= 0) {
      this.numCPUs = cpus().length + numCPUs;
    } else {
      this.numCPUs = numCPUs;
    }

    this.autorestart = options.autorestart ?? true;
    this.waitReady = options.waitReady ?? true;
  }

  getExitMessage({
    pid,
    signalCode,
    exitCode,
  }: {
    pid: number;
    signalCode: NodeJS.Signals | number | null;
    exitCode: number | null;
  }) {
    return `Process ${pid}${
      signalCode
        ? ` terminated with signal ${signalCode}`
        : ` failed with exit code ${exitCode}`
    }`;
  }

  async startSubprocess(
    i: number,
    options: SubprocessOption,
  ): Promise<[SubprocessOption, Subprocess]> {
    const { command, stdin, stdout, stderr, ...others } = options;

    if (this.waitReady) {
      return new Promise<[SubprocessOption, Subprocess]>((resolve, reject) =>
        Bun.spawn(command, {
          stdio: [stdin ?? 'inherit', stdout ?? 'inherit', stderr ?? 'inherit'],
          ipc: (message, subprocess) => {
            if (this.waitReady) {
              if (message === 'ready') {
                subprocess.exited
                  .then(async (exitCode) => {
                    if (exitCode !== 0) {
                      this.logger.error(
                        this.getExitMessage({
                          pid: subprocess.pid,
                          signalCode: subprocess.signalCode,
                          exitCode,
                        }),
                      );

                      if (this.autorestart && !subprocess.signalCode) {
                        this.subprocessList[i] = await this.startSubprocess(
                          i,
                          options,
                        );
                      }
                    }
                  })
                  .catch(() => null);

                resolve([{ ...options }, subprocess]);
              }
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
          ...others,
        }),
      );
    }

    return new Promise<[SubprocessOption, Subprocess]>((resolve, reject) => {
      const subprocess = Bun.spawn(command, {
        stdio: [stdin ?? 'inherit', stdout ?? 'inherit', stderr ?? 'inherit'],
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
        ...others,
      });
      resolve([options, subprocess]);
    });
  }

  async start({
    reloadSignal,
    updateEnv,
    ...options
  }: {
    reloadSignal?: NodeJS.Signals;
    updateEnv?: boolean;
  } & SubprocessOption): Promise<SubprocessList> {
    if (updateEnv && !options.env) {
      options.env = {};
    }

    try {
      for (let i = 0; i < this.numCPUs; i++) {
        this.subprocessList.push(await this.startSubprocess(i, options));
      }
    } catch (e) {
      await this.terminate();
      throw e;
    }

    if (reloadSignal) {
      process.on(reloadSignal, () => {
        this.logger.debug(
          `${reloadSignal} signal received. Reloading processes...`,
        );
        this.reload().catch(() => null);
      });
    }

    return this.subprocessList;
  }

  async reload(): Promise<SubprocessList> {
    for (let i = 0; i < this.subprocessList.length; i++) {
      const [options, p] = this.subprocessList[i];
      if (p) {
        try {
          p.kill();
          await p.exited;
        } catch (e) {
          this.logger.warn(`Failed on killing process: ${p.pid}`);
        }
      }

      this.subprocessList[i] = await this.startSubprocess(i, options);
    }

    return this.subprocessList;
  }

  async terminate() {
    for (const [options, p] of this.subprocessList) {
      if (p) {
        try {
          p.kill();
          await p.exited;
        } catch (e) {
          this.logger.warn(`Failed on killing process: ${p.pid}`);
        }
      }
    }
  }
}
