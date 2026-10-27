// ============================================================================
// 路由分发器（轻量，无外部依赖）
// ============================================================================
const routes = [];

function compile(pattern) {
  const keys = [];
  const regex = pattern.replace(/:[^/]+/g, m => { keys.push(m.slice(1)); return '([^/]+)'; });
  return { regex: new RegExp('^' + regex + '$'), keys };
}

function register(method, pattern, handler, opts = {}) {
  const { regex, keys } = compile(pattern);
  routes.push({ method, regex, keys, handler, auth: opts.auth || false });
}

function match(req, pathname) {
  const method = req.method || 'GET';
  for (const r of routes) {
    if (r.method !== method) continue;
    const result = r.regex.exec(pathname);
    if (result) {
      const params = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(result[i + 1]); });
      return { route: r, params };
    }
  }
  return null;
}

async function dispatch(req, res, pathname) {
  const m = match(req, pathname);
  if (!m) return null; // caller handles 404
  return m;
}

module.exports = { register, dispatch, match };
