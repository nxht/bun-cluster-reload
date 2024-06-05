import type { Subprocess } from 'bun';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { ClusterRunner } from '../src/index';

async function testFetch() {
  const response = await fetch(`http://localhost:${process.env.PORT}`);
  expect(response.status).toBe(200);
  const data = await response.text();
  expect(data).toBe('Hello World!');
}

describe('waitReady true', async () => {
  let clusterRunner: ClusterRunner;
  let startProcessList: Subprocess[];

  beforeEach(async () => {
    clusterRunner = new ClusterRunner({
      numCPUs: 2,
      autorestart: true,
      waitReady: true,
    });

    const subprocessList = await clusterRunner.start({
      command: ['bun', 'test/app.ts'],
      reloadSignal: 'SIGHUP',
      updateEnv: false,
    });

    startProcessList = subprocessList.map(([_options, p]) => p);
  });

  afterEach(async () => await clusterRunner.terminate());

  test('start check', async () => {
    expect(startProcessList).toBeArrayOfSize(2);
    for (const p of startProcessList) {
      expect(p.killed).toBe(false);
    }
    await testFetch();
  });

  test('reload', async () => {
    const reloadProcessList = await clusterRunner.reload();

    for (const p of startProcessList) {
      expect(p.killed).toBe(true);
    }

    expect(reloadProcessList).toBeArrayOfSize(2);
    for (const p of reloadProcessList) {
      expect(p[1].killed).toBe(false);
    }

    await testFetch();
  });

  test('reload with 1 killed', async () => {
    const p = startProcessList[0];

    p.kill();
    await p.exited;

    await testFetch();

    const reloadProcessList = await clusterRunner.reload();
    expect(reloadProcessList).toBeArrayOfSize(2);
    for (const p of reloadProcessList) {
      expect(p[1].killed).toBe(false);
    }

    await testFetch();
  });

  test('reload with all killed', async () => {
    for (const p of startProcessList) {
      p.kill();
      await p.exited;
    }

    expect(
      fetch(`http://localhost:${process.env.PORT}`),
    ).rejects.toThrowError();

    const reloadProcessList = await clusterRunner.reload();
    expect(reloadProcessList).toBeArrayOfSize(2);
    for (const p of reloadProcessList) {
      expect(p[1].killed).toBe(false);
    }

    await testFetch();
  });
});
