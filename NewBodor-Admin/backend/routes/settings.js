// ============================================================================
// 路由 - 系统设置
// ============================================================================
const { register } = require('./index');
const { ok, readBody, logAudit } = require('../middleware/helpers');
const { rows, run } = require('../data/db');

function getSettings() {
  const kv = rows('SELECT key,value FROM system_config');
  const map = {};
  kv.forEach(r => { map[r.key] = r.value; });
  return {
    enterpriseName: map.enterpriseName || '', adminEmail: map.adminEmail || '', defaultLang: map.defaultLang || 'zh-CN',
    timezone: map.timezone || 'Asia/Shanghai', notification: map.notification === '1', allowRegister: map.allowRegister === '1',
    maxUploadSize: Number(map.maxUploadSize || 200)
  };
}

register('GET', '/api/settings', async (req, res) => {
  return ok(res, getSettings());
}, { auth: true });

register('PUT', '/api/settings', async (req, res, params, ctx) => {
  const b = await readBody(req);
  const map = {
    enterpriseName: b.enterpriseName, adminEmail: b.adminEmail, defaultLang: b.defaultLang, timezone: b.timezone,
    notification: b.notification ? '1' : '0', allowRegister: b.allowRegister ? '1' : '0', maxUploadSize: b.maxUploadSize
  };
  for (const [k, v] of Object.entries(map)) {
    if (v !== undefined) run('INSERT INTO system_config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', k, String(v));
  }
  logAudit(ctx.user, '更新系统设置', b.enterpriseName || '', req);
  return ok(res, getSettings());
}, { auth: true });
