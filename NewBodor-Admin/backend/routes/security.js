// ============================================================================
// 路由 - 信息安全平台
// ============================================================================
const { register } = require('./index');
const { ok, readBody, logAudit } = require('../middleware/helpers');
const { row, run } = require('../data/db');

function mapPolicy(p) {
  return {
    loginPolicy: p.login_policy, passwordMinLen: p.password_min_len, mfaEnabled: !!p.mfa_enabled,
    mfaType: p.mfa_type, sessionTimeout: p.session_timeout, ipWhitelist: JSON.parse(p.ip_whitelist || '[]'),
    dataEncryption: !!p.data_encryption, auditEnabled: !!p.audit_enabled, watermark: !!p.watermark
  };
}
function getPolicy() {
  let p = row('SELECT * FROM security_policy ORDER BY id LIMIT 1');
  if (!p) { run('INSERT INTO security_policy DEFAULT VALUES'); p = row('SELECT * FROM security_policy ORDER BY id LIMIT 1'); }
  return p;
}

register('GET', '/api/security', async (req, res) => {
  return ok(res, mapPolicy(getPolicy()));
}, { auth: true });

register('PUT', '/api/security', async (req, res, params, ctx) => {
  const b = await readBody(req);
  const p = getPolicy();
  run('UPDATE security_policy SET login_policy=?, password_min_len=?, mfa_enabled=?, mfa_type=?, session_timeout=?, ip_whitelist=?, data_encryption=?, audit_enabled=?, watermark=? WHERE id=?',
    b.loginPolicy ?? p.login_policy, b.passwordMinLen ?? p.password_min_len, b.mfaEnabled ? 1 : 0,
    b.mfaType ?? p.mfa_type, b.sessionTimeout ?? p.session_timeout,
    JSON.stringify(b.ipWhitelist || []), b.dataEncryption === false ? 0 : 1,
    b.auditEnabled === false ? 0 : 1, b.watermark ? 1 : 0, p.id);
  logAudit(ctx.user, '更新信息安全策略', 'security', req);
  return ok(res, mapPolicy(getPolicy()));
}, { auth: true });
