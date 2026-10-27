// ============================================================================
// 路由 - 通讯录（部门）
// ============================================================================
const { register } = require('./index');
const { ok, fail, readBody, logAudit } = require('../middleware/helpers');
const { rows, row, run } = require('../data/db');

register('GET', '/api/departments', async (req, res) => {
  return ok(res, rows('SELECT * FROM departments ORDER BY sort, id'));
}, { auth: true });

register('POST', '/api/departments', async (req, res, params, ctx) => {
  const body = await readBody(req);
  if (!body.name) return fail(res, 400, 'INVALID', '部门名不能为空');
  if (row('SELECT id FROM departments WHERE name=?', body.name)) return fail(res, 409, 'DUPLICATE', '部门名已存在');
  const r = run('INSERT INTO departments(name,manager,parent_id,member_count,sort) VALUES(?,?,?,?,?)',
    body.name, body.manager || '', body.parentId || null, body.memberCount || 0, body.sort || 0);
  logAudit(ctx.user, '新增部门', body.name, req);
  return ok(res, row('SELECT * FROM departments WHERE id=?', r.lastId), 201);
}, { auth: true });

register('PUT', '/api/departments/:id', async (req, res, params, ctx) => {
  const body = await readBody(req);
  const dept = row('SELECT * FROM departments WHERE id=?', params.id);
  if (!dept) return fail(res, 404, 'NOT_FOUND', '部门不存在');
  run('UPDATE departments SET name=?, manager=?, parent_id=?, sort=? WHERE id=?',
    body.name || dept.name, body.manager ?? dept.manager, body.parentId ?? dept.parent_id, body.sort ?? dept.sort, params.id);
  logAudit(ctx.user, '更新部门', body.name || dept.name, req);
  return ok(res, row('SELECT * FROM departments WHERE id=?', params.id));
}, { auth: true });

register('DELETE', '/api/departments/:id', async (req, res, params, ctx) => {
  const dept = row('SELECT * FROM departments WHERE id=?', params.id);
  if (!dept) return fail(res, 404, 'NOT_FOUND', '部门不存在');
  const memberCount = row('SELECT COUNT(*) AS c FROM members WHERE dept_id=?', params.id).c;
  if (memberCount > 0) return fail(res, 400, 'HAS_MEMBERS', '部门下仍有成员，无法删除');
  run('DELETE FROM departments WHERE id=?', params.id);
  logAudit(ctx.user, '删除部门', dept.name, req);
  return ok(res, { deleted: true });
}, { auth: true });
