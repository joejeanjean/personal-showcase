// ============================================================================
// NewBodor 企业管理后台 - 前端 SPA（原生 JS，零构建）
// ============================================================================
const $ = s => document.querySelector(s);
const state = { token: localStorage.getItem('nb_token') || '', user: null, page: 'overview' };

// ---------- API ----------
async function api(method, path, body) {
  const opts = { method, headers: {} };
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  if (state.token) opts.headers['Authorization'] = 'Bearer ' + state.token;
  const res = await fetch('/api' + path, opts);
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) { logout(); throw new Error('登录已过期'); }
  if (res.status >= 400) throw new Error((json.error && json.error.message) || '请求失败');
  return json.data;
}

// ---------- Toast ----------
let toastTimer;
function toast(msg, err) {
  const t = $('#toast');
  t.textContent = msg; t.className = 'toast' + (err ? ' err' : ''); t.style.display = 'block';
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.style.display = 'none'; }, 2600);
}

// ---------- 模态框 ----------
let modalOkHandler = null;
function openModal(title, html, onOk) {
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = html;
  $('#modal').style.display = 'flex';
  modalOkHandler = onOk;
}
function closeModal() { $('#modal').style.display = 'none'; modalOkHandler = null; }
$('#modal-close').onclick = closeModal;
$('#modal-cancel').onclick = closeModal;
$('#modal-ok').onclick = async () => { if (modalOkHandler) { try { await modalOkHandler(); } catch (e) { toast(e.message, true); } } };

// ---------- 登录 ----------
async function login() {
  const email = $('#login-email').value.trim();
  const password = $('#login-password').value;
  try {
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const json = await res.json();
    if (!res.ok) throw new Error((json.error && json.error.message) || '登录失败');
    state.token = json.data.token; state.user = json.data.user;
    localStorage.setItem('nb_token', state.token);
    showApp();
  } catch (e) { $('#login-error').textContent = e.message; }
}
$('#login-btn').onclick = login;
$('#login-password').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });

async function logout() {
  try { await api('POST', '/auth/logout'); } catch (e) {}
  state.token = ''; state.user = null; localStorage.removeItem('nb_token');
  $('#app').style.display = 'none'; $('#login').style.display = 'flex';
}
$('#logout-btn').onclick = logout;

async function showApp() {
  $('#login').style.display = 'none';
  $('#app').style.display = 'flex';
  const me = await api('GET', '/auth/me');
  state.user = me;
  const roleLabel = { admin: '超级管理员', manager: '部门管理员', member: '普通员工' }[me.role] || me.role;
  $('#top-user').textContent = me.name + '（' + roleLabel + '）';
  // 菜单按角色控制：仅超级管理员显示平台管理类菜单，部门管理员仅保留团队概况/通讯录
  const adminOnlyPages = ['apps', 'billing', 'circle', 'security', 'settings', 'open', 'logs'];
  document.querySelectorAll('#nav a').forEach(a => {
    const page = a.dataset.page;
    a.style.display = (me.role === 'admin' || !adminOnlyPages.includes(page)) ? '' : 'none';
  });
  const ent = await api('GET', '/enterprise');
  $('#top-enterprise').textContent = ent.name;
  render('overview');
}

// ---------- 导航 ----------
$('#nav').addEventListener('click', e => {
  const a = e.target.closest('a'); if (!a) return;
  document.querySelectorAll('#nav a').forEach(x => x.classList.remove('active'));
  a.classList.add('active');
  render(a.dataset.page);
});

const TITLES = { overview: '团队概况', contacts: '通讯录', apps: '应用管理', billing: '计费服务', circle: '同事圈', security: '信息安全平台', settings: '系统设置', open: '开放平台', logs: '系统日志' };
async function render(page) {
  state.page = page;
  $('#page-title').textContent = TITLES[page] || '';
  const c = $('#content');
  const fn = { overview: renderOverview, contacts: renderContacts, apps: renderApps, billing: renderBilling, circle: renderCircle, security: renderSecurity, settings: renderSettings, open: renderOpenApps, logs: renderLogs }[page];
  if (!fn) { c.innerHTML = '<div class="empty">模块加载中</div>'; return; }
  try { await fn(c); } catch (e) { c.innerHTML = '<div class="panel"><h3>错误</h3><p class="muted">' + e.message + '</p></div>'; }
}

// ============================== 团队概况 ==============================
async function renderOverview(c) {
  const d = await api('GET', '/enterprise/overview');
  const e = d.enterprise;
  c.innerHTML = `
    <div class="cards">
      <div class="card"><div class="lbl">团队总人数</div><div class="val orange">${e.total_personnel}</div><div class="sub">已登录 ${e.logged_in_count}</div></div>
      <div class="card"><div class="lbl">已登录</div><div class="val">${e.logged_in_count}</div><div class="sub">未登录 ${e.unlogged_count}</div></div>
      <div class="card"><div class="lbl">部门个数</div><div class="val">${e.dept_count}</div><div class="sub">已设负责人 ${e.dept_with_manager}</div></div>
      <div class="card"><div class="lbl">未设负责人部门</div><div class="val">${e.dept_no_manager}</div><div class="sub">待完善</div></div>
    </div>
    <div class="panel">
      <h3>企业信息</h3>
      <table>
        <tr><th>企业ID</th><td>${e.eid}</td><th>注册日期</th><td>${e.register_time}</td></tr>
        <tr><th>企业名称</th><td>${e.name}</td><th>管理员</th><td>${e.admin_name}</td></tr>
        <tr><th>联系人个数</th><td>8</td><th>轻应用个数</th><td>8</td></tr>
      </table>
    </div>
    <div class="panel">
      <h3>部门负责人分布</h3>
      <table>
        <thead><tr><th>部门</th><th>负责人</th><th>成员数</th></tr></thead>
        <tbody id="ov-depts"></tbody>
      </table>
    </div>`;
  const depts = await api('GET', '/departments');
  $('#ov-depts').innerHTML = depts.map(dec => `<tr><td>${dec.name}</td><td>${esc(dec.manager || '—')}</td><td>${dec.member_count}</td></tr>`).join('');
}

// ============================== 通讯录 ==============================
async function renderContacts(c) {
  const [depts, members] = await Promise.all([api('GET', '/departments'), api('GET', '/members')]);
  window._depts = depts; window._members = members;
  const isSuper = state.user && state.user.role === 'admin';
  c.innerHTML = `
    <div class="panel">
      <h3>组织结构 <span class="toolbar">${isSuper ? '<button class="btn sm" onclick="openDeptModal()">+ 新增部门</button>' : '<span class="muted">部门管理仅超级管理员可用</span>'}</span></h3>
      <table>
        <thead><tr><th>部门</th><th>负责人</th><th>成员数</th><th>操作</th></tr></thead>
        <tbody>${depts.map(d2 => `
          <tr>
            <td>${d2.name}</td><td>${esc(d2.manager || '—')}</td><td>${d2.member_count}</td>
            <td>${isSuper
              ? `<button class="btn sm" onclick="editDept(${d2.id})">编辑</button><button class="btn sm danger" onclick="delDept(${d2.id})">删除</button>`
              : '<span class="muted">—</span>'}</td>
          </tr>`).join('')}</tbody>
      </table>
    </div>
    <div class="panel">
      <h3>成员列表 <span class="toolbar"><button class="btn sm" onclick="openMemberModal()">+ 新增成员</button></span></h3>
      <table>
        <thead><tr><th>用户</th><th>姓名</th><th>部门</th><th>角色</th><th>登录</th><th>负责人</th><th>操作</th></tr></thead>
        <tbody>${members.map(m => `
          <tr>
            <td>${m.user_id}</td><td>${m.name}</td><td>${esc(m.dept_name || '—')}</td>
            <td>${roleBadge(m.role)}</td><td>${m.login_status ? '<span class="badge green">已登录</span>' : '<span class="badge gray">未登录</span>'}</td>
            <td>${m.is_manager ? '✅' : '—'}</td>
            <td>
              <button class="btn sm" onclick="editMember(${m.id})">编辑</button>
              <button class="btn sm" onclick="toggleManager(${m.id},${m.is_manager})">${m.is_manager ? '取消负责人' : '设负责人'}</button>
              <button class="btn sm danger" onclick="delMember(${m.id})">删除</button>
            </td>
          </tr>`).join('')}</tbody>
      </table>
    </div>`;
}

async function openDeptModal(dept) {
  if (dept) {
    openModal('编辑部门', `
      <div class="form-grid">
        <div class="form-row"><label>部门名</label><input id="f-name" value="${esc(dept.name)}"></div>
        <div class="form-row"><label>负责人</label><input id="f-manager" value="${esc(dept.manager || '')}"></div>
        <div class="form-row"><label>排序</label><input id="f-sort" type="number" value="${dept.sort}"></div>
      </div>`,
      async () => {
        await api('PUT', '/departments/' + dept.id, { name: $('#f-name').value, manager: $('#f-manager').value, sort: Number($('#f-sort').value) });
        toast('已保存'); closeModal(); render('contacts');
      });
  } else {
    openModal('新增部门', `
      <div class="form-row"><label>部门名</label><input id="f-name"></div>
      <div class="form-row"><label>负责人</label><input id="f-manager"></div>
      <div class="form-row"><label>排序</label><input id="f-sort" type="number" value="0"></div>`,
      async () => {
        await api('POST', '/departments', { name: $('#f-name').value, manager: $('#f-manager').value, sort: Number($('#f-sort').value) });
        toast('已新增'); closeModal(); render('contacts');
      });
  }
}
function editDept(id) { const d = window._depts.find(x => x.id === id); openDeptModal(d); }
async function delDept(id) { if (!confirm('确认删除该部门？')) return; try { await api('DELETE', '/departments/' + id); toast('已删除'); render('contacts'); } catch (e) { toast(e.message, true); } }
async function openMemberModal(m) {
  const depts = await api('GET', '/departments');
  const opts = depts.map(d2 => `<option value="${d2.id}" ${m && m.dept_id === d2.id ? 'selected' : ''}>${d2.name}</option>`).join('');
  const isSuper = state.user && state.user.role === 'admin';
  // 角色选择：超级管理员可设 部门管理员/普通员工（不可再设超级管理员）；部门管理员仅可设普通员工
  const roleOpts = isSuper
    ? '<option value="manager">部门管理员</option><option value="member">普通员工</option>'
    : '<option value="member">普通员工</option>';
  if (m) {
    const isAdminUser = m.role === 'admin';
    const roleField = isAdminUser
      ? `<div class="form-row"><label>角色</label><input value="超级管理员" disabled></div>`
      : `<div class="form-row"><label>角色</label><select id="m-role">${roleOpts}</select></div>`;
    openModal('编辑成员', `
      <div class="form-grid">
        <div class="form-row"><label>姓名</label><input id="m-name" value="${esc(m.name)}"></div>
        <div class="form-row"><label>用户ID</label><input value="${m.user_id}" disabled></div>
        <div class="form-row"><label>部门</label><select id="m-dept">${opts}</select></div>
        ${roleField}
        <div class="form-row"><label>手机</label><input id="m-phone" value="${esc(m.phone || '')}"></div>
        <div class="form-row"><label>邮箱</label><input id="m-email" value="${esc(m.email || '')}"></div>
        <div class="form-row"><label>已登录</label><select id="m-status">${[['1','是'],['0','否']].map(x => `<option value="${x[0]}" ${m.login_status ? (x[0]==='1'?'selected':'') : (x[0]==='0'?'selected':'')}>${x[1]}</option>`).join('')}</select></div>
      </div>`,
      async () => {
        const payload = { name: $('#m-name').value, deptId: Number($('#m-dept').value), role: $('#m-role') ? $('#m-role').value : m.role, phone: $('#m-phone').value, email: $('#m-email').value, loginStatus: $('#m-status').value === '1' };
        await api('PUT', '/members/' + m.id, payload);
        toast('已保存'); closeModal(); render('contacts');
      });
  } else {
    openModal('新增成员', `
      <div class="form-grid">
        <div class="form-row"><label>姓名</label><input id="m-name"></div>
        <div class="form-row"><label>部门</label><select id="m-dept">${opts}</select></div>
        <div class="form-row"><label>角色</label><select id="m-role">${roleOpts}</select></div>
        <div class="form-row"><label>邮箱</label><input id="m-email"></div>
        <div class="form-row"><label>手机</label><input id="m-phone"></div>
        <div class="form-row"><label>密码(可选)</label><input id="m-pw" type="password"></div>
      </div>`,
      async () => {
        await api('POST', '/members', { name: $('#m-name').value, deptId: Number($('#m-dept').value), role: $('#m-role').value, email: $('#m-email').value, phone: $('#m-phone').value, password: $('#m-pw').value });
        toast('已新增'); closeModal(); render('contacts');
      });
  }
}
function editMember(id) { const m = window._members.find(x => x.id === id); openMemberModal(m); }
async function delMember(id) { if (!confirm('确认删除该成员？')) return; try { await api('DELETE', '/members/' + id); toast('已删除'); render('contacts'); } catch (e) { toast(e.message, true); } }
async function toggleManager(id, cur) { try { await api('PUT', '/members/' + id + '/manager', { isManager: !cur }); toast('已更新'); render('contacts'); } catch (e) { toast(e.message, true); } }

// ============================== 应用管理 ==============================
async function renderApps(c) {
  const apps = await api('GET', '/lightapps');
  window._apps = apps;
  c.innerHTML = `<div class="panel"><h3>轻应用 <span class="toolbar"><button class="btn sm" onclick="openAppModal()">+ 新增</button></span></h3>
    <table><thead><tr><th>应用</th><th>状态</th><th>描述</th><th>安装数</th><th>操作</th></tr></thead>
    <tbody>${apps.map(a => `<tr><td>${a.icon} ${esc(a.name)}</td><td>${a.status === 'on' ? '<span class="badge green">启用</span>' : '<span class="badge gray">停用</span>'}</td><td>${esc(a.description)}</td><td>${a.installs}</td>
      <td><button class="btn sm" onclick="toggleApp(${a.id})">${a.status === 'on' ? '停用' : '启用'}</button>
      <button class="btn sm" onclick="editApp(${a.id})">编辑</button>
      <button class="btn sm danger" onclick="delApp(${a.id})">删除</button></td></tr>`).join('')}</tbody></table></div>`;
}
async function openAppModal(a) {
  if (a) {
    openModal('编辑轻应用', `<div class="form-row"><label>名称</label><input id="a-name" value="${esc(a.name)}"></div>
      <div class="form-row"><label>图标</label><input id="a-icon" value="${esc(a.icon)}"></div>
      <div class="form-row"><label>描述</label><textarea id="a-desc">${esc(a.description)}</textarea></div>`,
      async () => { await api('PUT', '/lightapps/' + a.id, { name: $('#a-name').value, icon: $('#a-icon').value, description: $('#a-desc').value }); toast('已保存'); closeModal(); render('apps'); });
  } else {
    openModal('新增轻应用', `<div class="form-row"><label>名称</label><input id="a-name"></div>
      <div class="form-row"><label>图标</label><input id="a-icon" value="📦"></div>
      <div class="form-row"><label>描述</label><textarea id="a-desc"></textarea></div>`,
      async () => { await api('POST', '/lightapps', { name: $('#a-name').value, icon: $('#a-icon').value, description: $('#a-desc').value }); toast('已新增'); closeModal(); render('apps'); });
  }
}
function editApp(id) { const a = window._apps.find(x => x.id === id); openAppModal(a); }
async function toggleApp(id) { await api('POST', '/lightapps/' + id + '/toggle'); toast('已更新'); render('apps'); }
async function delApp(id) { if (!confirm('确认删除？')) return; await api('DELETE', '/lightapps/' + id); toast('已删除'); render('apps'); }

// ============================== 计费 ==============================
async function renderBilling(c) {
  const b = await api('GET', '/billing');
  const cur = b.current || {};
  c.innerHTML = `
    <div class="cards">
      <div class="card"><div class="lbl">套餐</div><div class="val orange" style="font-size:20px">${esc(cur.plan || '—')}</div></div>
      <div class="card"><div class="lbl">年度费用</div><div class="val">¥${(cur.fee || 0).toLocaleString()}</div><div class="sub">到期 ${cur.paid_until}</div></div>
      <div class="card"><div class="lbl">用量占比</div><div class="val">${cur.usage_pct || 0}%</div><div class="sub">席位 ${cur.used_seats}/${cur.seats}</div></div>
      <div class="card"><div class="lbl">自动续费</div><div class="val">${cur.renew_auto ? '开启' : '关闭'}</div></div>
    </div>
    <div class="panel"><h3>编辑计费 <span class="toolbar"><button class="btn sm" onclick="editBilling()">编辑</button></span></h3>
      <table><thead><tr><th>时间</th><th>金额</th><th>说明</th><th>状态</th></tr></thead>
      <tbody>${(b.history || []).map(h2 => `<tr><td>${h2.time}</td><td>¥${h2.amount.toLocaleString()}</td><td>${esc(h2.description)}</td><td><span class="badge green">${h2.status === 'paid' ? '已支付' : h2.status}</span></td></tr>`).join('')}</tbody></table></div>`;
}
function editBilling() {
  openModal('编辑计费', `<div class="form-grid">
    <div class="form-row"><label>套餐</label><input id="b-plan"></div>
    <div class="form-row"><label>年度费用</label><input id="b-fee" type="number"></div>
    <div class="form-row"><label>到期日</label><input id="b-until" type="date"></div>
    <div class="form-row"><label>席位</label><input id="b-seats" type="number"></div></div>`,
    async () => {
      await api('PUT', '/billing', { plan: $('#b-plan').value, fee: Number($('#b-fee').value), paidUntil: $('#b-until').value, seats: Number($('#b-seats').value) });
      toast('已保存'); closeModal(); render('billing');
    });
  // 填充当前值
  api('GET', '/billing').then(b => { $('#b-plan').value = b.current.plan; $('#b-fee').value = b.current.fee; $('#b-until').value = b.current.paid_until; $('#b-seats').value = b.current.seats; });
}

// ============================== 同事圈 ==============================
async function renderCircle(c) {
  const posts = await api('GET', '/circle');
  c.innerHTML = `<div class="panel"><h3>同事圈 <span class="toolbar"><button class="btn sm" onclick="addPost()">发布</button></span></h3>
    <div>${posts.length ? posts.map(p => `<div class="list-row"><div><b>${esc(p.author)}</b><div class="muted">${esc(p.content)}</div><div class="muted">${p.time} · 赞 ${p.likes} · 评论 ${p.comments}</div></div>
      <button class="btn sm danger" onclick="delPost(${p.id})">删除</button></div>`).join('') : '<div class="empty">暂无动态</div>'}</div></div>`;
}
function addPost() {
  openModal('发布动态', `<div class="form-row"><label>内容</label><textarea id="p-content"></textarea></div>`,
    async () => { await api('POST', '/circle', { content: $('#p-content').value }); toast('已发布'); closeModal(); render('circle'); });
}
async function delPost(id) { if (!confirm('确认删除？')) return; await api('DELETE', '/circle/' + id); toast('已删除'); render('circle'); }

// ============================== 信息安全 ==============================
async function renderSecurity(c) {
  const s = await api('GET', '/security');
  c.innerHTML = `<div class="panel"><h3>安全策略 <span class="toolbar"><button class="btn sm primary" onclick="saveSecurity()">保存</button></span></h3>
    <div class="form-grid">
      <div class="form-row"><label>登录策略</label><select id="s-login">${['password','password+mfa','sso'].map(x => `<option value="${x}" ${s.loginPolicy===x?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="form-row"><label>密码最小长度</label><input id="s-pwlen" type="number" value="${s.passwordMinLen}"></div>
      <div class="form-row"><label>MFA 启用</label><select id="s-mfa">${['0','1'].map(x => `<option value="${x}" ${s.mfaEnabled ? (x==='1'?'selected':'') : (x==='0'?'selected':'')}>${x==='1'?'是':'否'}</option>`).join('')}</select></div>
      <div class="form-row"><label>MFA 类型</label><select id="s-mfatype">${['sms','email','totp'].map(x => `<option value="${x}" ${s.mfaType===x?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="form-row"><label>会话超时(分钟)</label><input id="s-timeout" type="number" value="${s.sessionTimeout}"></div>
      <div class="form-row"><label>数据加密</label><select id="s-enc">${['1','0'].map(x => `<option value="${x}" ${s.dataEncryption ? (x==='1'?'selected':'') : (x==='0'?'selected':'')}>${x==='1'?'是':'否'}</option>`).join('')}</select></div>
      <div class="form-row"><label>审计日志</label><select id="s-audit">${['1','0'].map(x => `<option value="${x}" ${s.auditEnabled ? (x==='1'?'selected':'') : (x==='0'?'selected':'')}>${x==='1'?'是':'否'}</option>`).join('')}</select></div>
      <div class="form-row"><label>水印</label><select id="s-wm">${['0','1'].map(x => `<option value="${x}" ${s.watermark ? (x==='1'?'selected':'') : (x==='0'?'selected':'')}>${x==='1'?'是':'否'}</option>`).join('')}</select></div>
    </div></div>`;
}
async function saveSecurity() {
  await api('PUT', '/security', { loginPolicy: $('#s-login').value, passwordMinLen: Number($('#s-pwlen').value), mfaEnabled: $('#s-mfa').value === '1', mfaType: $('#s-mfatype').value, sessionTimeout: Number($('#s-timeout').value), dataEncryption: $('#s-enc').value === '1', auditEnabled: $('#s-audit').value === '1', watermark: $('#s-wm').value === '1' });
  toast('已保存'); render('security');
}

// ============================== 系统设置 ==============================
async function renderSettings(c) {
  const s = await api('GET', '/settings');
  c.innerHTML = `<div class="panel"><h3>系统设置 <span class="toolbar"><button class="btn sm primary" onclick="saveSettings()">保存</button></span></h3>
    <div class="form-grid">
      <div class="form-row"><label>企业名称</label><input id="st-name" value="${esc(s.enterpriseName)}"></div>
      <div class="form-row"><label>管理员邮箱</label><input id="st-email" value="${esc(s.adminEmail)}"></div>
      <div class="form-row"><label>默认语言</label><select id="st-lang">${['zh-CN','en-US'].map(x => `<option value="${x}" ${s.defaultLang===x?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="form-row"><label>时区</label><select id="st-tz">${['Asia/Shanghai','UTC'].map(x => `<option value="${x}" ${s.timezone===x?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="form-row"><label>通知</label><select id="st-notif">${['1','0'].map(x => `<option value="${x}" ${s.notification ? (x==='1'?'selected':'') : (x==='0'?'selected':'')}>${x==='1'?'开启':'关闭'}</option>`).join('')}</select></div>
      <div class="form-row"><label>开放注册</label><select id="st-reg">${['0','1'].map(x => `<option value="${x}" ${s.allowRegister ? (x==='1'?'selected':'') : (x==='0'?'selected':'')}>${x==='1'?'是':'否'}</option>`).join('')}</select></div>
      <div class="form-row"><label>上传大小(MB)</label><input id="st-upload" type="number" value="${s.maxUploadSize}"></div>
    </div></div>`;
}
async function saveSettings() {
  await api('PUT', '/settings', { enterpriseName: $('#st-name').value, adminEmail: $('#st-email').value, defaultLang: $('#st-lang').value, timezone: $('#st-tz').value, notification: $('#st-notif').value === '1', allowRegister: $('#st-reg').value === '1', maxUploadSize: Number($('#st-upload').value) });
  toast('已保存'); render('settings');
}

// ============================== 开放平台 ==============================
async function renderOpenApps(c) {
  const apps = await api('GET', '/openapps');
  c.innerHTML = `<div class="panel"><h3>开放应用 <span class="toolbar"><button class="btn sm" onclick="addOpenApp()">+ 新增</button></span></h3>
    <table><thead><tr><th>名称</th><th>AppKey</th><th>Secret</th><th>状态</th><th>调用量</th><th>操作</th></tr></thead>
    <tbody>${apps.map(a => `<tr><td>${esc(a.name)}</td><td><code>${a.appKey}</code></td><td><code>${a.secret}</code></td>
      <td>${a.status === 'on' ? '<span class="badge green">启用</span>' : '<span class="badge gray">停用</span>'}</td><td>${a.calls}</td>
      <td><button class="btn sm" onclick="toggleOpenApp(${a.id})">${a.status === 'on' ? '停用' : '启用'}</button>
      <button class="btn sm danger" onclick="delOpenApp(${a.id})">删除</button></td></tr>`).join('')}</tbody></table></div>`;
}
function addOpenApp() {
  openModal('新增开放应用', `<div class="form-row"><label>名称</label><input id="o-name"></div><div class="muted">系统将自动生成 AppKey 与 Secret</div>`,
    async () => { const d = await api('POST', '/openapps', { name: $('#o-name').value }); toast('已新增：secret 为 ' + d.secret); closeModal(); render('openapps'); });
}
async function toggleOpenApp(id) { await api('POST', '/openapps/' + id + '/toggle'); toast('已更新'); render('openapps'); }
async function delOpenApp(id) { if (!confirm('确认删除？')) return; await api('DELETE', '/openapps/' + id); toast('已删除'); render('openapps'); }

// ============================== 系统日志 ==============================
async function renderLogs(c) {
  const d = await api('GET', '/logs?limit=200');
  c.innerHTML = `<div class="panel"><h3>审计日志</h3>
    <table><thead><tr><th>时间</th><th>操作人</th><th>动作</th><th>对象</th><th>IP</th></tr></thead>
    <tbody>${d.list.map(l => `<tr><td>${l.created_at}</td><td>${esc(l.user_name || '—')}</td><td>${esc(l.action)}</td><td>${esc(l.target || '—')}</td><td>${l.ip}</td></tr>`).join('')}</tbody></table>
    <p class="muted">共 ${d.total} 条记录</p></div>`;
}

// ---------- 工具 ----------
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
function roleBadge(r) { const map = { admin: ['orange', '超级管理员'], manager: ['green', '部门管理员'], member: ['gray', '普通员工'] }; const x = map[r] || ['gray', r]; return `<span class="badge ${x[0]}">${x[1]}</span>`; }

// 数据缓存供编辑弹窗使用
window._depts = []; window._members = []; window._apps = [];

// 启动
(async () => {
  if (state.token) {
    try { await showApp(); } catch (e) { logout(); }
  } else { $('#app').style.display = 'none'; $('#login').style.display = 'flex'; }
})();
