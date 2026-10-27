// ============================================================================
// 中间件 - 鉴权（Bearer token）
// ============================================================================
const { getSession } = require('./helpers');
const { fail } = require('./helpers');

function authenticate(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const session = token ? getSession(token) : null;
  if (!session) return fail(res, 401, 'UNAUTHORIZED', '未登录或会话已过期');
  req.user = session;
  req.token = token;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  return fail(res, 403, 'FORBIDDEN', '需要管理员权限');
}

// 允许 admin / manager
function requireWrite(req, res, next) {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'manager')) return next();
  return fail(res, 403, 'FORBIDDEN', '需要写权限');
}

module.exports = { authenticate, requireAdmin, requireWrite };
