// ============================================================================
// NewBodor 企业管理后台 - HTTP 服务入口（零外部依赖）
// ============================================================================
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { PORT, HOST, DB_FILE, FRONTEND_DIR } = require('./config');
const { init, getDb } = require('./data/db');
const { ok, fail } = require('./middleware/helpers');
const { authenticate } = require('./middleware/auth');
const { match } = require('./routes/index');

// 加载并注册所有路由模块
require('./routes/auth');
require('./routes/enterprise');
require('./routes/departments');
require('./routes/members');
require('./routes/lightapps');
require('./routes/billing');
require('./routes/publicaccounts');
require('./routes/circle');
require('./routes/security');
require('./routes/settings');
require('./routes/openapps');
require('./routes/logs');

// ---- 静态文件（前端 SPA）----
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.jpg': 'image/jpeg', '.woff2': 'font/woff2'
};
function serveStatic(req, res, pathname) {
  let rel = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.normalize(path.join(FRONTEND_DIR, rel));
  if (!filePath.startsWith(path.normalize(FRONTEND_DIR))) { fail(res, 403, 'FORBIDDEN', '非法路径'); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA 回退到 index.html
      if (filePath.endsWith('.html')) { fail(res, 404, 'NOT_FOUND', '页面不存在'); return; }
      fs.readFile(path.join(FRONTEND_DIR, 'index.html'), (e2, d2) => {
        if (e2) { fail(res, 404, 'NOT_FOUND', '资源不存在'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(d2);
      });
      return;
    }
    const mime = MIME[path.extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

function queryObj(searchParams) {
  const q = {};
  if (!searchParams) return q;
  if (typeof URLSearchParams !== 'undefined' && searchParams instanceof URLSearchParams) {
    for (const [k, v] of searchParams) q[k] = v;
  } else if (typeof searchParams === 'object') {
    for (const [k, v] of Object.entries(searchParams)) q[k] = v;
  }
  return q;
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // 健康检查
  if (pathname === '/health' || pathname === '/api/health') {
    return ok(res, { status: 'ok', db: !!getDb() });
  }

  // API 路由
  if (pathname.startsWith('/api/')) {
    const m = match(req, pathname);
    if (!m) return fail(res, 404, 'NOT_FOUND', '接口不存在');

    const ctx = { params: m.params };
    // 鉴权
    if (m.route.auth) {
      const token = (req.headers['authorization'] || '').startsWith('Bearer ') ? req.headers['authorization'].slice(7) : null;
      const session = token ? require('./middleware/helpers').getSession(token) : null;
      if (!session) return fail(res, 401, 'UNAUTHORIZED', '未登录或会话已过期');
      ctx.user = session; ctx.token = token;
    }

    try {
      await m.route.handler(req, res, m.params, ctx, queryObj(parsed.query));
    } catch (e) {
      const status = e.status || 500;
      const code = e.code || 'SERVER_ERROR';
      fail(res, status, code, e.message || '服务器内部错误');
    }
    return;
  }

  // 静态资源 / SPA
  return serveStatic(req, res, pathname);
});

function start() {
  try {
    init();
  } catch (e) {
    console.error('[NewBodor] 数据库初始化失败：', e.message);
  }
  const addr = server.address();
  if (!server.listening) {
    server.listen(PORT, HOST, () => {
      console.log('[NewBodor] 企业管理后台已启动: http://' + HOST + ':' + PORT + '/admin');
      console.log('[NewBodor] 数据库: ' + DB_FILE);
      console.log('[NewBodor] 默认账号: admin@newbodor.local / admin123');
    });
  }
}

// 端口占用则复用
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.log('[NewBodor] 端口 ' + PORT + ' 已被占用，直接复用现有服务');
  } else {
    console.error('[NewBodor] 服务错误：', e.message);
  }
});

start();
module.exports = { server };
