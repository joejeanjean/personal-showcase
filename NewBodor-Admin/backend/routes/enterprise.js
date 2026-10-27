// ============================================================================
// 路由 - 团队概况 / 企业信息
// ============================================================================
const { register } = require('./index');
const { ok, fail, readBody, logAudit } = require('../middleware/helpers');
const { row, run } = require('../data/db');

register('GET', '/api/enterprise/overview', async (req, res) => {
  const e = row('SELECT * FROM enterprise WHERE id=1');
  const depts = row('SELECT COUNT(*) AS c FROM departments').c;
  return ok(res, {
    enterprise: e,
    deptCount: depts,
  });
}, { auth: true });

register('GET', '/api/enterprise', async (req, res) => {
  return ok(res, row('SELECT * FROM enterprise WHERE id=1'));
}, { auth: true });

register('PUT', '/api/enterprise', async (req, res, params, ctx) => {
  const body = await readBody(req);
  run('UPDATE enterprise SET name=?, short_name=?, admin_name=? WHERE id=1',
    body.name || '', body.shortName || '', body.adminName || '');
  logAudit(ctx.user, '更新企业信息', body.name || '', req);
  return ok(res, row('SELECT * FROM enterprise WHERE id=1'));
}, { auth: true });
