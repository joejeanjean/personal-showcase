// ============================================================================
// 路由 - 认证
// ============================================================================
const { register } = require('./index');
const { ok, fail, readBody, createSession, destroySession, logAudit } = require('../middleware/helpers');
const { row, verifyPassword } = require('../data/db');

// 登录
register('POST', '/api/auth/login', async (req, res, params, ctx) => {
  const body = await readBody(req);
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  if (!email || !password) return fail(res, 400, 'INVALID', '请输入邮箱和密码');

  const user = row('SELECT * FROM members WHERE email=?', email);
  if (!user || !verifyPassword(user, password)) return fail(res, 401, 'BAD_CREDENTIALS', '账号或密码错误');
  // 权限模型：超级管理员(admin)与部门管理员(manager)可登录管理后台；普通员工(member)只能通过用户端登录
  if (user.role === 'member') return fail(res, 403, 'FORBIDDEN', '普通员工不能登录管理后台，请使用用户端登录');

  const token = createSession(user);
  logAudit(user, '登录管理后台', email, req);
  return ok(res, {
    token,
    user: { id: user.id, userId: user.user_id, name: user.name, email: user.email, role: user.role }
  });
}, { auth: false });

// 当前用户
register('GET', '/api/auth/me', async (req, res, params, ctx) => {
  const u = row('SELECT id,user_id,name,email,role,dept_id FROM members WHERE id=?', ctx.user.userId);
  if (!u) return fail(res, 404, 'NOT_FOUND', '用户不存在');
  return ok(res, u);
}, { auth: true });

// 登出
register('POST', '/api/auth/logout', async (req, res, params, ctx) => {
  destroySession(ctx.token);
  logAudit(ctx.user, '退出管理后台', '', req);
  return ok(res, { ok: true });
}, { auth: true });
