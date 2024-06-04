import { expect, test } from 'bun:test';
import { ClusterRunner } from '../src/index';


async function testFetch() {
  const response = await fetch(`http://localhost:${process.env.PORT}`)
  expect(response.status).toBe(200)
  const data = await response.text()
  expect(data).toBe('Hello World!')

}

test('waitReady true', async () => {
  const clusterRunner = new ClusterRunner({
    numCPUs: 2,
    // logger: console,
    autorestart: true,
    waitReady: true,
  });
  
  const startProcessList = await clusterRunner.start({
    command: ['bun', 'test/app.ts'],
    reloadSignal: 'SIGHUP',
    updateEnv: false,
  });

  expect(startProcessList).toBeArrayOfSize(2)
  for(const p of startProcessList) {
    expect(p[1].killed).toBe(false)
  }

  await testFetch()

  const p = startProcessList[0]
  p[1].kill()
  await p[1].exited
  
  
  const reloadProcessList = await clusterRunner.reload();
  expect(reloadProcessList).toBeArrayOfSize(2)
  for(const p of reloadProcessList) {
    expect(p[1].killed).toBe(false)
  }

  await testFetch()
  
  await clusterRunner.terminate()
  
})