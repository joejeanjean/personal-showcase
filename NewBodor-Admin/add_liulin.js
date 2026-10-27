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
  console.log('admin login status=', login.status, JSON.stringify(login.json).slice(0,200));
  const token = login.json && login.json.data && login.json.data.token;
  if(!token){ console.log('NO TOKEN'); return; }

  const newMember = await j('POST','/api/members',{
    name:'刘林', userId:'u0007', role:'member', deptId:3, loginStatus:true,
    email:'liulin@newbodor.local', password:'liulin123'
  }, token);
  console.log('create member status=', newMember.status, JSON.stringify(newMember.json).slice(0,400));

  const list = await j('GET','/api/members',null,token);
  const members = list.json && list.json.data ? list.json.data : [];
  const lin = members.find(m=>m.name==='刘林');
  console.log('--- 刘林 record ---');
  console.log(JSON.stringify(lin));

  // test login as 刘林
  const linLogin = await j('POST','/api/auth/login',{email:'liulin@newbodor.local',password:'liulin123'});
  console.log('刘林 login status=', linLogin.status, JSON.stringify(linLogin.json).slice(0,200));
})().catch(e=>{ console.error('ERR', e); process.exit(1); });
