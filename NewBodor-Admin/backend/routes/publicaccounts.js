// ============================================================================
// 路由 - 公共号
// ============================================================================
const { register } = require('./index');
const { ok, fail, readBody, logAudit } = require('../middleware/helpers');
const { rows, row, run } = require('../data/db');

register('GET', '/api/publicaccounts', async (req, res) => {
  return ok(res, rows('SELECT * FROM publicaccounts ORDER BY id'));
}, { auth: true });

register('POST', '/api/publicaccounts', async (req, res, params, ctx) => {
  const body = await readBody(req);
  if (!body.name) return fail(res, 400, 'INVALID', '名称不能为空');
  const r = run('INSERT INTO publicaccounts(name,type,fans,status) VALUES(?,?,?,?)',
    body.name, body.type || 'service', body.fans || 0, body.status || 'on');
  logAudit(ctx.user, '新增公共号', body.name, req);
  return ok(res, row('SELECT * FROM publicaccounts WHERE id=?', r.lastId), 201);
}, { auth: true });

register('PUT', '/api/publicaccounts/:id', async (req, res, params, ctx) => {
  const body = await readBody(req);
  const pa = row('SELECT * FROM publicaccounts WHERE id=?', params.id);
  if (!pa) return fail(res, 404, 'NOT_FOUND', '公共号不存在');
  run('UPDATE publicaccounts SET name=?, type=?, fans=?, status=? WHERE id=?',
    body.name || pa.name, body.type ?? pa.type, body.fans ?? pa.fans, body.status ?? pa.status, params.id);
  logAudit(ctx.user, '更新公共号', body.name || pa.name, req);
  return ok(res, row('SELECT * FROM publicaccounts WHERE id=?', params.id));
}, { auth: true });

register('DELETE', '/api/publicaccounts/:id', async (req, res, params, ctx) => {
  const pa = row('SELECT * FROM publicaccounts WHERE id=?', params.id);
  if (!pa) return fail(res, 404, 'NOT_FOUND', '公共号不存在');
  run('DELETE FROM publicaccounts WHERE id=?', params.id);
  logAudit(ctx.user, '删除公共号', pa.name, req);
  return ok(res, { deleted: true });
}, { auth: true });
