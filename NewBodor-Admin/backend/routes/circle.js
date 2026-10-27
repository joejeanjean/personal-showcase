// ============================================================================
// 路由 - 同事圈
// ============================================================================
const { register } = require('./index');
const { ok, fail, readBody, logAudit } = require('../middleware/helpers');
const { rows, row, run } = require('../data/db');

register('GET', '/api/circle', async (req, res) => {
  return ok(res, rows('SELECT * FROM circle_posts ORDER BY id DESC'));
}, { auth: true });

register('POST', '/api/circle', async (req, res, params, ctx) => {
  const body = await readBody(req);
  if (!body.content) return fail(res, 400, 'INVALID', '内容不能为空');
  const r = run('INSERT INTO circle_posts(author,content,time,likes,comments) VALUES(?,?,?,?,?)',
    body.author || ctx.user.name, body.content, body.time || new Date().toLocaleString('zh-CN', { hour12: false }), body.likes || 0, body.comments || 0);
  logAudit(ctx.user, '发布同事圈', body.content.slice(0, 30), req);
  return ok(res, row('SELECT * FROM circle_posts WHERE id=?', r.lastId), 201);
}, { auth: true });

register('DELETE', '/api/circle/:id', async (req, res, params, ctx) => {
  const post = row('SELECT * FROM circle_posts WHERE id=?', params.id);
  if (!post) return fail(res, 404, 'NOT_FOUND', '动态不存在');
  run('DELETE FROM circle_posts WHERE id=?', params.id);
  logAudit(ctx.user, '删除同事圈动态', post.content.slice(0, 30), req);
  return ok(res, { deleted: true });
}, { auth: true });
