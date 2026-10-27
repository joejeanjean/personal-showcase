// ============================================================================
// 路由 - 通讯录（成员）
// 权限模型：
//   admin  超级管理员（仅周镇镇）：可添加/编辑部门管理员与普通员工，不可新增管理员
//   manager部门管理员：可登录后台，可添加/管理普通员工（member）
//   member 普通员工：仅能通过用户端登录，不能登录管理后台
// ============================================================================
const { register } = require('./index');
const { ok, fail, readBody, logAudit } = require('../middleware/helpers');
const { rows, row, run, makePasswordHash } = require('../data/db');

// 当前操作者的角色
function actorRole(ctx) { return (ctx.user && ctx.user.role) || ''; }
// 超级管理员 id（只保留一名）
const SUPER_ADMIN_USER = 'u0001';

register('GET', '/api/members', async (req, res, params, ctx, query) => {
  // 仅后台登录用户可查看（admin/manager）；member 无法登录后台
  const conditions = []; const args = [];
  if (query.deptId) { conditions.push('m.dept_id=?'); args.push(query.deptId); }
  if (query.role) { conditions.push('m.role=?'); args.push(query.role); }
  if (query.status !== undefined && query.status !== '') { conditions.push('m.login_status=?'); args.push(Number(query.status)); }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const list = rows(`SELECT m.id,m.user_id,m.name,m.role,m.login_status,m.is_manager,m.phone,m.email,m.dept_id,d.name AS dept_name
    FROM members m LEFT JOIN departments d ON d.id=m.dept_id ${where} ORDER BY m.id`, ...args);
  return ok(res, list);
}, { auth: true });

register('POST', '/api/members', async (req, res, params, ctx) => {
  const actor = actorRole(ctx);
  if (actor === 'member') return fail(res, 403, 'FORBIDDEN', '无权限添加成员');
  const body = await readBody(req);
  if (!body.name) return fail(res, 400, 'INVALID', '姓名不能为空');
  const role = body.role || 'member';
  // 只保留一名超级管理员，不允许新增
  if (role === 'admin') return fail(res, 403, 'FORBIDDEN', '系统仅保留一名超级管理员，不可新增管理员');
  // 部门管理员只能添加普通员工
  if (actor === 'manager' && role !== 'member') return fail(res, 403, 'FORBIDDEN', '部门管理员只能添加普通员工');
  // 部门管理员未指定部门时，默认加入其所在部门
  let deptId = body.deptId || null;
  if (!deptId && actor === 'manager') {
    const a = row('SELECT dept_id FROM members WHERE user_id=?', ctx.user.userId);
    deptId = a ? a.dept_id : null;
  }
  const userId = body.userId || ('u' + Date.now().toString(36));
  const email = (body.email || '').toLowerCase();
  if (email && row('SELECT id FROM members WHERE email=?', email)) return fail(res, 409, 'DUPLICATE', '邮箱已存在');
  const r = run('INSERT INTO members(user_id,name,dept_id,role,login_status,is_manager,phone,email,password_hash) VALUES(?,?,?,?,?,?,?,?,?)',
    userId, body.name, deptId, role,
    body.loginStatus === false ? 0 : 1, body.isManager ? 1 : 0,
    body.phone || '', email, body.password ? makePasswordHash(body.password) : null);
  logAudit(ctx.user, '新增员工', body.name, req);
  return ok(res, row('SELECT * FROM members WHERE id=?', r.lastId), 201);
}, { auth: true });

register('PUT', '/api/members/:id', async (req, res, params, ctx) => {
  const actor = actorRole(ctx);
  if (actor === 'member') return fail(res, 403, 'FORBIDDEN', '无权限编辑成员');
  const m = row('SELECT * FROM members WHERE id=?', params.id);
  if (!m) return fail(res, 404, 'NOT_FOUND', '成员不存在');
  const body = await readBody(req);
  const role = body.role || m.role;
  // 超级管理员角色不可被改动（保持仅一名超级管理员）
  if (m.user_id === SUPER_ADMIN_USER) {
    if (role !== 'admin') return fail(res, 403, 'FORBIDDEN', '不能修改超级管理员角色');
  } else if (role === 'admin') {
    return fail(res, 403, 'FORBIDDEN', '系统仅保留一名超级管理员，不能将成员设为管理员');
  }
  // 部门管理员只能管理普通员工
  if (actor === 'manager' && (m.role !== 'member' && role !== 'member')) {
    return fail(res, 403, 'FORBIDDEN', '部门管理员只能管理普通员工');
  }
  run('UPDATE members SET name=?, dept_id=?, role=?, login_status=?, is_manager=?, phone=?, email=? WHERE id=?',
    body.name || m.name, body.deptId ?? m.dept_id, role,
    body.loginStatus === false ? 0 : (body.loginStatus === true ? 1 : m.login_status),
    body.isManager === true ? 1 : (body.isManager === false ? 0 : m.is_manager),
    body.phone ?? m.phone, (body.email ?? m.email).toLowerCase(), params.id);
  logAudit(ctx.user, '更新员工', (body.name || m.name), req);
  return ok(res, row('SELECT * FROM members WHERE id=?', params.id));
}, { auth: true });

register('DELETE', '/api/members/:id', async (req, res, params, ctx) => {
  const actor = actorRole(ctx);
  if (actor === 'member') return fail(res, 403, 'FORBIDDEN', '无权限删除成员');
  const m = row('SELECT * FROM members WHERE id=?', params.id);
  if (!m) return fail(res, 404, 'NOT_FOUND', '成员不存在');
  if (m.user_id === SUPER_ADMIN_USER) return fail(res, 403, 'FORBIDDEN', '不能删除超级管理员');
  // 部门管理员只能删除普通员工
  if (actor === 'manager' && m.role !== 'member') return fail(res, 403, 'FORBIDDEN', '部门管理员只能管理普通员工');
  run('DELETE FROM members WHERE id=?', params.id);
  logAudit(ctx.user, '删除员工', m.name, req);
  return ok(res, { ok: true });
}, { auth: true });

// 设置/取消部门负责人
register('PUT', '/api/members/:id/manager', async (req, res, params, ctx) => {
  const actor = actorRole(ctx);
  if (actor === 'member') return fail(res, 403, 'FORBIDDEN', '无权限操作');
  const m = row('SELECT * FROM members WHERE id=?', params.id);
  if (!m) return fail(res, 404, 'NOT_FOUND', '成员不存在');
  if (m.user_id === SUPER_ADMIN_USER) return fail(res, 403, 'FORBIDDEN', '不能修改超级管理员');
  const body = await readBody(req);
  run('UPDATE members SET is_manager=? WHERE id=?', body.isManager ? 1 : 0, params.id);
  logAudit(ctx.user, '设置负责人', m.name, req);
  return ok(res, row('SELECT * FROM members WHERE id=?', params.id));
}, { auth: true });

module.exports = { register };
