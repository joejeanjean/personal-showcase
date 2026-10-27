// ============================================================================
// 路由 - 开放平台
// ============================================================================
const { register } = require('./index');
const { ok, fail, readBody, logAudit } = require('../middleware/helpers');
const { rows, row, run } = require('../data/db');
const crypto = require('crypto');

function maskSecret(secret) {
  if (!secret) return '********';
  return secret.slice(0, 4) + '****' + secret.slice(-2);
}

function listOpenApps() {
  return rows('SELECT id,name,app_key,secret_hash,status,calls FROM openapps ORDER BY id')
    .map(a => ({ id: a.id, name: a.name, appKey: a.app_key, secret: maskSecret(a.secret_hash), status: a.status, calls: a.calls }));
}

register('GET', '/api/openapps', async (req, res) => {
  return ok(res, listOpenApps());
}, { auth: true });

register('POST', '/api/openapps', async (req, res, params, ctx) => {
  const body = await readBody(req);
  if (!body.name) return fail(res, 400, 'INVALID', '应用名不能为空');
  const appKey = 'nb_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
  const secret = crypto.randomBytes(12).toString('hex');
  const r = run('INSERT INTO openapps(name,app_key,secret_hash,status,calls) VALUES(?,?,?,?,?)',
    body.name, appKey, secret, body.status || 'on', 0);
  logAudit(ctx.user, '新增开放应用', body.name, req);
  return ok(res, { id: r.lastId, name: body.name, appKey, secret, status: body.status || 'on', calls: 0 }, 201);
}, { auth: true });

register('PUT', '/api/openapps/:id', async (req, res, params, ctx) => {
  const body = await readBody(req);
  const app = row('SELECT * FROM openapps WHERE id=?', params.id);
  if (!app) return fail(res, 404, 'NOT_FOUND', '开放应用不存在');
  run('UPDATE openapps SET name=?, status=? WHERE id=?', body.name || app.name, body.status ?? app.status, params.id);
  logAudit(ctx.user, '更新开放应用', body.name || app.name, req);
  return ok(res, listOpenApps().find(a => a.id === Number(params.id)));
}, { auth: true });

register('DELETE', '/api/openapps/:id', async (req, res, params, ctx) => {
  const app = row('SELECT * FROM openapps WHERE id=?', params.id);
  if (!app) return fail(res, 404, 'NOT_FOUND', '开放应用不存在');
  run('DELETE FROM openapps WHERE id=?', params.id);
  logAudit(ctx.user, '删除开放应用', app.name, req);
  return ok(res, { deleted: true });
}, { auth: true });

register('POST', '/api/openapps/:id/toggle', async (req, res, params, ctx) => {
  const app = row('SELECT * FROM openapps WHERE id=?', params.id);
  if (!app) return fail(res, 404, 'NOT_FOUND', '开放应用不存在');
  const next = app.status === 'on' ? 'off' : 'on';
  run('UPDATE openapps SET status=? WHERE id=?', next, params.id);
  logAudit(ctx.user, next === 'on' ? '启用开放应用' : '停用开放应用', app.name, req);
  return ok(res, listOpenApps().find(a => a.id === Number(params.id)));
}, { auth: true });
