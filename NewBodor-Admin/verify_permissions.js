const BASE = 'http://127.0.0.1:9889';
async function j(method, path, body, token){
  const opts = { method, headers: {} };
  if (body !== undefined){ opts.headers['Content-Type']='application/json'; opts.body=JSON.stringify(body); }
  if (token) opts.headers['Authorization']='Bearer '+token;
  const res = await fetch(BASE+path, opts);
  const txt = await res.text();
  let j; try { j=JSON.parse(txt); } catch(e){ j={raw:txt}; }
  return { status: res.status, json: j };
}
const L = (label, x) => console.log(label, '::', x.status, JSON.stringify(x.json).slice(0,220));

(async ()=>{
  // 1) 超级管理员登录
  const admin = await j('POST','/api/auth/login',{email:'admin@newbodor.local',password:'admin123'});
  L('周镇镇(admin) login', admin);
  const at = admin.json.data.token;

  // 2) 部门管理员登录
  const mgr = await j('POST','/api/auth/login',{email:'liqian@newbodor.local',password:'liqian123'});
  L('李茜(manager) login', mgr);

  // 3) 普通员工登录后台 => 应拒绝
  const mem = await j('POST','/api/auth/login',{email:'liulin@newbodor.local',password:'liulin123'});
  L('刘林(member) login后台', mem);

  // 4) 仅一名超级管理员检查
  const list1 = await j('GET','/api/members',undefined, at);
  const admins = list1.json.data.filter(m=>m.role==='admin');
  console.log('超级管理员数量=', admins.length, '->', admins.map(m=>m.name+'/'+m.user_id).join(','));

  // 5) 超级管理员添加部门管理员（经理）
  const addMgr = await j('POST','/api/members',{name:'陈晨',userId:'u0008',role:'manager',deptId:3,email:'chenchen@newbodor.local',password:'chenchen123',loginStatus:true}, at);
  L('超级管理员-新增部门管理员 陈晨', addMgr);

  // 6) 部门管理员(李茜) 添加普通员工
  const addEmp = await j('POST','/api/members',{name:'张伟',userId:'u0009',role:'member',deptId:2,email:'zhangwei@newbodor.local',password:'zhangwei123',loginStatus:true}, mgr.json.data.token);
  L('部门管理员-新增普通员工 张伟', addEmp);

  // 7) 部门管理员 尝试新增部门管理员 => 应拒绝
  const addMgrByMgr = await j('POST','/api/members',{name:'假经理',role:'manager',email:'fake@newbodor.local',password:'fake123'}, mgr.json.data.token);
  L('部门管理员-尝试新增部门管理员(应403)', addMgrByMgr);

  // 8) 部门管理员 尝试新增超级管理员 => 应拒绝
  const addAdminByMgr = await j('POST','/api/members',{name:'假超管',role:'admin',email:'fakeadm@newbodor.local',password:'fake123'}, mgr.json.data.token);
  L('部门管理员-尝试新增超级管理员(应403)', addAdminByMgr);

  // 9) 通讯录应包含张伟（新增员工在通讯录中）
  const list2 = await j('GET','/api/members',undefined, at);
  const zw = list2.json.data.find(m=>m.name==='张伟');
  console.log('通讯录是否含 张伟:', !!zw, zw ? JSON.stringify(zw) : '');
  const roles = {};
  list2.json.data.forEach(m=>{ roles[m.role]=(roles[m.role]||0)+1; });
  console.log('角色分布:', JSON.stringify(roles));
})().catch(e=>{ console.error('ERR', e); process.exit(1); });
