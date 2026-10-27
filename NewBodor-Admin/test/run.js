// ============================================================================
// QA - 测试入口：启动临时服务器（独立端口 + 独立数据目录）并运行 API 测试
// 用法: node test/run.js
// ============================================================================
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 9894;
const ROOT = path.join(__dirname, '..');
const NODE = process.env.NODE_BIN || process.execPath;
const TEST_DATA_DIR = path.join(ROOT, 'data-test');

// 清空隔离测试数据目录
fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
fs.mkdirSync(TEST_DATA_DIR, { recursive: true });

const server = spawn(NODE, ['backend/server.js'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT), NB_DATA_DIR: TEST_DATA_DIR },
  stdio: 'ignore'
});

function waitForServer(tries = 40) {
  return new Promise((resolve, reject) => {
    let i = 0;
    const tick = async () => {
      i++;
      try {
        const res = await fetch('http://127.0.0.1:' + PORT + '/health');
        if (res.ok) return resolve();
      } catch (e) {}
      if (i > tries) return reject(new Error('server did not start'));
      setTimeout(tick, 200);
    };
    tick();
  });
}

(async () => {
  try {
    await waitForServer();
    console.log('临时服务器已启动（端口 ' + PORT + '）');
  } catch (e) {
    console.error(e.message);
    server.kill();
    process.exit(1);
  }

  const child = spawn(NODE, ['test/api.test.js', String(PORT)], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, NODE_BIN: NODE }
  });
  child.on('exit', code => {
    server.kill();
    process.exit(code);
  });
})();
