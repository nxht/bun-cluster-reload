import type { Subprocess } from 'bun';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { ClusterRunner } from '../src/index';

let clusterRunner: ClusterRunner;

beforeEach(async () => {
  clusterRunner = new ClusterRunner({
    numCPUs: 2,
    autorestart: true,
    waitReady: false,
  });
});
afterEach(async () => await clusterRunner.terminate());

describe('normal', async () => {
  let startProcessList: (Subprocess | null)[];

  beforeEach(async () => {
    const subprocessList = await clusterRunner.start({
      command: ['bun', 'test/app.ts'],
      reloadSignal: 'SIGHUP',
      updateEnv: false,
    });

    startProcessList = subprocessList.map(({ p }) => p);
  });

  afterEach(async () => await clusterRunner.terminate());

  test('start check', async () => {
    expect(startProcessList).toBeArrayOfSize(2);
    for (const p of startProcessList) {
      expect(p?.killed).toBe(false);
    }
  });

  test('reload', async () => {
    const reloadProcessList = await clusterRunner.reload();
    await Bun.sleep(50);

    for (const p of startProcessList) {
      expect(p?.killed).toBe(true);
    }

    expect(reloadProcessList).toBeArrayOfSize(2);
    for (const { p } of reloadProcessList) {
      expect(p?.killed).toBe(false);
    }
  });

  test('reload with 1 killed', async () => {
    const p = startProcessList[0];

    p?.kill();
    await p?.exited;

    const reloadProcessList = await clusterRunner.reload();
    expect(reloadProcessList).toBeArrayOfSize(2);
    for (const { p } of reloadProcessList) {
      expect(p?.killed).toBe(false);
    }
  });

  test('reload with all killed', async () => {
    for (const p of startProcessList) {
      p?.kill();
      await p?.exited;
    }

    const reloadProcessList = await clusterRunner.reload();
    expect(reloadProcessList).toBeArrayOfSize(2);
    for (const { p } of reloadProcessList) {
      expect(p?.killed).toBe(false);
    }
  });
});
