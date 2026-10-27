// ============================================================================
// 中间件 - 通用响应与请求辅助
// ============================================================================
const { rows, run } = require('../data/db');
const { SESSION_TTL } = require('../config');

// 会话表（内存）
const sessions = new Map(); // token -> { userId, email, name, role, createdAt, expires }

function createSession(user) {
  const token = require('crypto').randomBytes(32).toString('hex');
  sessions.set(token, {
    userId: user.id, email: user.email, name: user.name, role: user.role,
    createdAt: Date.now(), expires: Date.now() + SESSION_TTL
  });
  return token;
}
function getSession(token) {
  const s = sessions.get(token);
  if (!s) return null;
  if (Date.now() > s.expires) { sessions.delete(token); return null; }
  return s;
}
function destroySession(token) { sessions.delete(token); }

// 响应辅助
function ok(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ data, meta: { ts: new Date().toISOString() } }));
}
function fail(res, status, code, message) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: { code, message } }));
}

// 解析请求体 JSON
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); } catch (e) { reject(Object.assign(new Error('Bad JSON'), { status: 400, code: 'BAD_JSON' })); }
    });
    req.on('error', reject);
  });
}

// 记录审计日志
function logAudit(user, action, target, req) {
  if (!user) return;
  const uid = user.userId != null ? user.userId : (user.id != null ? user.id : null);
  const ip = (req && req.socket && req.socket.remoteAddress) || '';
  run('INSERT INTO audit_logs(user_id,user_name,action,target,ip) VALUES(?,?,?,?,?)',
    uid, user.name || '', action, target || '', ip);
}

module.exports = { ok, fail, readBody, createSession, getSession, destroySession, logAudit, sessions };
