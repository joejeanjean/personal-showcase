// ============================================================================
// QA - API 集成测试（零外部依赖，Node 24 内置 fetch）
// 用法: node test/api.test.js  [PORT]
// ============================================================================
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = Number(process.argv[2] || 9893);
const BASE = 'http://127.0.0.1:' + PORT;
const ROOT = path.join(__dirname, '..');
const NODE = process.env.NODE_BIN || 'node';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.log('  ✗ ' + name + (detail ? '  → ' + detail : '')); }
}
function assertEq(name, got, want) {
  check(name, JSON.stringify(got) === JSON.stringify(want), 'got=' + JSON.stringify(got) + ' want=' + JSON.stringify(want));
}

async function api(method, path, body, token) {
  const opts = { method, headers: {} };
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(BASE + path, opts);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function run() {
  console.log('=== NewBodor 企业管理后台 - API 集成测试 ===');
  console.log('Base:', BASE, '\n');

  // 登出/登录
  const login = await api('POST', '/api/auth/login', { email: 'admin@newbodor.local', password: 'admin123' });
  assertEq('登录成功', login.status, 200);
  check('登录返回 token', !!login.json.data?.token);
  const token = login.json.data?.token;

  // 未授权访问
  const noAuth = await api('GET', '/api/enterprise/overview');
  assertEq('未授权返回 401', noAuth.status, 401);

  // 团队概况
  const ov = await api('GET', '/api/enterprise/overview', null, token);
  assertEq('团队概况 200', ov.status, 200);
  check('企业ID=19141476', ov.json.data?.enterprise?.eid === '19141476', JSON.stringify(ov.json.data?.enterprise?.eid));
  check('团队总人数=4551', ov.json.data?.enterprise?.total_personnel === 4551);
  check('部门个数=880', ov.json.data?.enterprise?.dept_count === 880);

  // 部门
  const depts = await api('GET', '/api/departments', null, token);
  assertEq('部门列表 200', depts.status, 200);
  check('部门数量>=5', depts.json.data.length >= 5);
  const addDept = await api('POST', '/api/departments', { name: 'QA临时部门' }, token);
  assertEq('新增部门 201', addDept.status, 201);
  const deptId = addDept.json.data?.id;
  check('新增部门返回 id', !!deptId);
  const updDept = await api('PUT', '/api/departments/' + deptId, { name: 'QA部门改名', manager: '测试' }, token);
  assertEq('更新部门 200', updDept.status, 200);
  check('部门已改名', updDept.json.data?.name === 'QA部门改名');
  const delDept = await api('DELETE', '/api/departments/' + deptId, null, token);
  assertEq('删除部门 200', delDept.status, 200);

  // 成员
  const members = await api('GET', '/api/members', null, token);
  assertEq('成员列表 200', members.status, 200);
  check('成员数量>=6', members.json.data.length >= 6);
  const addMember = await api('POST', '/api/members', { name: 'QA成员', email: 'qa@newbodor.local', deptId: 1 }, token);
  assertEq('新增成员 201', addMember.status, 201);
  const memberId = addMember.json.data?.id;
  const delMember = await api('DELETE', '/api/members/' + memberId, null, token);
  assertEq('删除成员 200', delMember.status, 200);

  // 轻应用
  const apps = await api('GET', '/api/lightapps', null, token);
  assertEq('轻应用 200', apps.status, 200);
  check('轻应用数量=8', apps.json.data.length === 8);
  const toggle = await api('POST', '/api/lightapps/' + apps.json.data[0].id + '/toggle', null, token);
  assertEq('启停轻应用 200', toggle.status, 200);

  // 计费
  const billing = await api('GET', '/api/billing', null, token);
  assertEq('计费 200', billing.status, 200);
  check('套餐=企业标准版', billing.json.data?.current?.plan === '企业标准版');
  const putBilling = await api('PUT', '/api/billing', { plan: '企业旗舰版', fee: 19980 }, token);
  assertEq('更新计费 200', putBilling.status, 200);
  check('计费已更新', putBilling.json.data?.plan === '企业旗舰版');

  // 公共号
  const pa = await api('GET', '/api/publicaccounts', null, token);
  assertEq('公共号 200', pa.status, 200);
  check('公共号数量>=2', pa.json.data.length >= 2);

  // 同事圈
  const circle = await api('GET', '/api/circle', null, token);
  assertEq('同事圈 200', circle.status, 200);
  const addCircle = await api('POST', '/api/circle', { content: 'QA 测试动态' }, token);
  assertEq('发布同事圈 201', addCircle.status, 201);

  // 安全
  const sec = await api('GET', '/api/security', null, token);
  assertEq('信息安全 200', sec.status, 200);
  const putSec = await api('PUT', '/api/security', { mfaEnabled: true, passwordMinLen: 10 }, token);
  assertEq('更新安全 200', putSec.status, 200);
  check('密码最小长度=10', putSec.json.data?.passwordMinLen === 10);

  // 设置
  const settings = await api('GET', '/api/settings', null, token);
  assertEq('系统设置 200', settings.status, 200);
  const putSettings = await api('PUT', '/api/settings', { enterpriseName: 'NewBodor 企业' }, token);
  assertEq('更新设置 200', putSettings.status, 200);
  check('企业名已更新', putSettings.json.data?.enterpriseName === 'NewBodor 企业');

  // 开放平台
  const oa = await api('GET', '/api/openapps', null, token);
  assertEq('开放平台 200', oa.status, 200);
  const addOa = await api('POST', '/api/openapps', { name: 'QA 开放应用' }, token);
  assertEq('新增开放应用 201', addOa.status, 201);
  check('开放应用返回 secret', !!addOa.json.data?.secret);
  const oaId = addOa.json.data?.id;
  const delOa = await api('DELETE', '/api/openapps/' + oaId, null, token);
  assertEq('删除开放应用 200', delOa.status, 200);

  // 审计日志
  const logs = await api('GET', '/api/logs', null, token);
  assertEq('系统日志 200', logs.status, 200);
  check('日志有记录', logs.json.data?.total > 0);
  check('包含登录日志', logs.json.data?.list.some(l => l.action.includes('登录')));

  // 登出
  const logout = await api('POST', '/api/auth/logout', null, token);
  assertEq('登出 200', logout.status, 200);

  console.log('\n=== 结果 ===');
  console.log('通过: ' + passed + ' / ' + (passed + failed));
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('测试运行失败:', e); process.exit(1); });
