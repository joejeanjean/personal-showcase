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
(async ()=>{
  const login = await j('POST','/api/auth/login',{email:'admin@newbodor.local',password:'admin123'});
  const token = login.json.data.token;

  const list = await j('GET','/api/members',undefined, token);
  const members = list.json.data || [];
  const lin = members.find(m=>m.name==='刘林');
  console.log('--- 刘林 成员记录 ---');
  console.log('员工编号(user_id):', lin && lin.user_id);
  console.log('姓名:', lin && lin.name);
  console.log('部门id:', lin && lin.dept_id, '| 角色:', lin && lin.role, '| 状态:', lin && lin.login_status);
  console.log('邮箱:', lin && lin.email);

  const linLogin = await j('POST','/api/auth/login',{email:'liulin@newbodor.local',password:'liulin123'});
  console.log('--- 刘林 登录测试 ---');
  console.log('status=', linLogin.status);
  console.log(JSON.stringify(linLogin.json).slice(0,200));
})().catch(e=>{ console.error('ERR', e.message); process.exit(1); });
