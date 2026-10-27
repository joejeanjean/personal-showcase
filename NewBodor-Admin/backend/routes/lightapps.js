// ============================================================================
// 路由 - 应用管理（轻应用）
// ============================================================================
const { register } = require('./index');
const { ok, fail, readBody, logAudit } = require('../middleware/helpers');
const { rows, row, run } = require('../data/db');

register('GET', '/api/lightapps', async (req, res) => {
  return ok(res, rows('SELECT * FROM lightapps ORDER BY id'));
}, { auth: true });

register('POST', '/api/lightapps', async (req, res, params, ctx) => {
  const body = await readBody(req);
  if (!body.name) return fail(res, 400, 'INVALID', '应用名不能为空');
  if (row('SELECT id FROM lightapps WHERE name=?', body.name)) return fail(res, 409, 'DUPLICATE', '应用已存在');
  const r = run('INSERT INTO lightapps(name,icon,status,description,installs) VALUES(?,?,?,?,?)',
    body.name, body.icon || '📦', body.status || 'on', body.description || '', body.installs || 0);
  logAudit(ctx.user, '新增轻应用', body.name, req);
  return ok(res, row('SELECT * FROM lightapps WHERE id=?', r.lastId), 201);
}, { auth: true });

register('PUT', '/api/lightapps/:id', async (req, res, params, ctx) => {
  const body = await readBody(req);
  const app = row('SELECT * FROM lightapps WHERE id=?', params.id);
  if (!app) return fail(res, 404, 'NOT_FOUND', '应用不存在');
  run('UPDATE lightapps SET name=?, icon=?, status=?, description=?, installs=? WHERE id=?',
    body.name || app.name, body.icon ?? app.icon, body.status ?? app.status,
    body.description ?? app.description, body.installs ?? app.installs, params.id);
  logAudit(ctx.user, '更新轻应用', body.name || app.name, req);
  return ok(res, row('SELECT * FROM lightapps WHERE id=?', params.id));
}, { auth: true });

register('DELETE', '/api/lightapps/:id', async (req, res, params, ctx) => {
  const app = row('SELECT * FROM lightapps WHERE id=?', params.id);
  if (!app) return fail(res, 404, 'NOT_FOUND', '应用不存在');
  run('DELETE FROM lightapps WHERE id=?', params.id);
  logAudit(ctx.user, '删除轻应用', app.name, req);
  return ok(res, { deleted: true });
}, { auth: true });

register('POST', '/api/lightapps/:id/toggle', async (req, res, params, ctx) => {
  const app = row('SELECT * FROM lightapps WHERE id=?', params.id);
  if (!app) return fail(res, 404, 'NOT_FOUND', '应用不存在');
  const next = app.status === 'on' ? 'off' : 'on';
  run('UPDATE lightapps SET status=? WHERE id=?', next, params.id);
  logAudit(ctx.user, next === 'on' ? '启用轻应用' : '停用轻应用', app.name, req);
  return ok(res, row('SELECT * FROM lightapps WHERE id=?', params.id));
}, { auth: true });
