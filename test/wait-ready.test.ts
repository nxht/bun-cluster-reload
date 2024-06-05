import type { Subprocess } from 'bun';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { ClusterRunner } from '../src/index';

async function testFetch() {
  const response = await fetch(`http://localhost:${process.env.PORT}`);
  expect(response.status).toBe(200);
  const data = await response.text();
  expect(data).toBe('Hello World!');
}

let clusterRunner: ClusterRunner;

beforeEach(async () => {
  clusterRunner = new ClusterRunner({
    numCPUs: 2,
    autorestart: true,
    waitReady: true,
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

    startProcessList = subprocessList.map(([_options, p]) => p);
  });

  test('start check', async () => {
    expect(startProcessList).toBeArrayOfSize(2);
    for (const p of startProcessList) {
      expect(p?.killed).toBe(false);
    }
    await testFetch();
  });

  test('reload', async () => {
    const reloadProcessList = await clusterRunner.reload();

    for (const p of startProcessList) {
      expect(p?.killed).toBe(true);
    }

    expect(reloadProcessList).toBeArrayOfSize(2);
    for (const p of reloadProcessList) {
      expect(p?.[1]?.killed).toBe(false);
    }

    await testFetch();
  });

  test('reload with 1 killed', async () => {
    const p = startProcessList[0];
    expect(p).not.toBeNull();

    if (p) {
      p.kill();
      await p.exited;
    }

    await testFetch();

    const reloadProcessList = await clusterRunner.reload();
    expect(reloadProcessList).toBeArrayOfSize(2);
    for (const p of reloadProcessList) {
      expect(p?.[1]?.killed).toBe(false);
    }

    await testFetch();
  });

  test('reload with all killed', async () => {
    for (const p of startProcessList) {
      if (p) {
        p.kill();
        await p.exited;
      }
    }

    expect(
      fetch(`http://localhost:${process.env.PORT}`),
    ).rejects.toThrowError();

    const reloadProcessList = await clusterRunner.reload();
    expect(reloadProcessList).toBeArrayOfSize(2);
    for (const p of reloadProcessList) {
      expect(p?.[1]?.killed).toBe(false);
    }

    await testFetch();
  });
});

test('error', async () => {
  expect(
    clusterRunner.start({
      command: ['bun', 'test/app-error.ts'],
      reloadSignal: 'SIGHUP',
      stdout: 'ignore',
      stderr: 'ignore',
      updateEnv: false,
    }),
  ).rejects.toThrowError();

  expect(clusterRunner.subprocessList).toBeArrayOfSize(1);
  for (const [options, p] of clusterRunner.subprocessList) {
    expect(p?.killed).toBe(true);
  }
});
