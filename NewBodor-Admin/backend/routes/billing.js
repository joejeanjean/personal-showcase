// ============================================================================
// 路由 - 计费服务
// ============================================================================
const { register } = require('./index');
const { ok, fail, readBody, logAudit } = require('../middleware/helpers');
const { rows, row, run } = require('../data/db');

register('GET', '/api/billing', async (req, res) => {
  const b = row('SELECT * FROM billing ORDER BY id LIMIT 1');
  const history = b ? rows('SELECT * FROM billing_history WHERE billing_id=? ORDER BY id DESC', b.id) : [];
  return ok(res, { current: b || null, history });
}, { auth: true });

register('PUT', '/api/billing', async (req, res, params, ctx) => {
  const body = await readBody(req);
  const b = row('SELECT * FROM billing ORDER BY id LIMIT 1');
  if (!b) {
    const r = run('INSERT INTO billing(plan,fee,paid_until,usage_pct,seats,used_seats,renew_auto) VALUES(?,?,?,?,?,?,?)',
      body.plan || '企业标准版', body.fee || 0, body.paidUntil || '', body.usagePct || 0, body.seats || 0, body.usedSeats || 0, body.renewAuto === false ? 0 : 1);
    logAudit(ctx.user, '更新计费方案', body.plan || '', req);
    return ok(res, row('SELECT * FROM billing WHERE id=?', r.lastId));
  }
  run('UPDATE billing SET plan=?, fee=?, paid_until=?, usage_pct=?, seats=?, used_seats=?, renew_auto=? WHERE id=?',
    body.plan ?? b.plan, body.fee ?? b.fee, body.paidUntil ?? b.paid_until, body.usagePct ?? b.usage_pct,
    body.seats ?? b.seats, body.usedSeats ?? b.used_seats, body.renewAuto === false ? 0 : 1, b.id);
  logAudit(ctx.user, '更新计费方案', body.plan || b.plan, req);
  return ok(res, row('SELECT * FROM billing WHERE id=?', b.id));
}, { auth: true });
