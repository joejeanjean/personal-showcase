// ============================================================================
// 路由 - 系统日志（审计）
// ============================================================================
const { register } = require('./index');
const { ok } = require('../middleware/helpers');
const { rows } = require('../data/db');

register('GET', '/api/logs', async (req, res, params, ctx, query) => {
  const conditions = []; const args = [];
  if (query.user) { conditions.push('user_name LIKE ?'); args.push('%' + query.user + '%'); }
  if (query.action) { conditions.push('action LIKE ?'); args.push('%' + query.action + '%'); }
  if (query.since) { conditions.push('created_at >= ?'); args.push(query.since); }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const limit = Math.min(Number(query.limit || 100), 500);
  const offset = Math.max(Number(query.offset || 0), 0);
  const list = rows(`SELECT id,user_name,action,target,ip,created_at FROM audit_logs ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, ...args, limit, offset);
  const total = rows(`SELECT COUNT(*) AS c FROM audit_logs ${where}`, ...args)[0].c;
  return ok(res, { list, total });
}, { auth: true });
