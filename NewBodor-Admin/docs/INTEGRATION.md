# NewBodor 客户端集成指南

本后台为独立自研服务。若需让 **NewBodor Electron 客户端**直接打开此管理后台，请按以下方式替换其主进程入口。

## 背景

原 NewBodor 主进程入口 `build/main/app.js` 已被替换为自研版本，其启动的是旧版 `admin_backend.cjs`（端口 9889，JSON 持久化）。本项目提供的新后台（SQLite + REST + 前端 SPA）可直接替代。

## 方式 A：直接替换主进程入口（推荐）

1. 将本项目复制到 NewBodor 中，例如放到：
   ```
   D:\code\NewBodor\NewBodor-runtime\resources\app\admin\newbodor-admin\
   ```
2. 用以下 `app.js` 覆盖 `build/main/app.js`：

```js
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 9889;
const ADMIN_ROOT = path.join(__dirname, '..', 'admin', 'newbodor-admin');
const NODE = process.env.NB_NODE || process.execPath; // 或 Electron 内置 node

let backend = null;
function startBackend() {
  try {
    backend = spawn(process.execPath, [path.join(ADMIN_ROOT, 'backend', 'server.js')], {
      env: { ...process.env, PORT: String(PORT), NB_DATA_DIR: path.join(app.getPath('userData'), 'nb-admin') },
      stdio: 'ignore'
    });
  } catch (e) { console.error('启动后台失败', e); }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400, height: 920, title: 'NewBodor 企业管理后台',
    webPreferences: { nodeIntegration: true, contextIsolation: false, webSecurity: false }
  });
  win.setMenuBarVisibility(false);
  win.loadURL('http://127.0.0.1:' + PORT + '/');
}

app.whenReady().then(() => { startBackend(); createWindow(); });
app.on('window-all-closed', () => { if (backend) backend.kill(); app.quit(); });
```

## 方式 B：独立部署（不改客户端）

后台也可脱离 Electron 独立运行：
```bash
node backend/server.js
# 浏览器访问 http://127.0.0.1:9889/
```

## 端口与数据

- 默认端口 `9889`，用 `PORT` 环境变量覆盖。
- 数据默认在 `./data/newbodor.db`（SQLite），用 `NB_DATA_DIR` 覆盖。
- 若旧后台已占用 9889，本服务会复用并提示，请先停掉旧 `admin_backend.cjs`。

## 与云之家接口互通

本后台的"开放平台"模块用于管理 AppKey/Secret、外部调用量，作为后续接入云之家开放接口（如公共号发消息、组织同步）的凭据管理入口。业务对接逻辑可在此后台之上扩展。
