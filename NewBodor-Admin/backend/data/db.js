// ============================================================================
// NewBodor 企业管理后台 - 数据访问层（node:sqlite）
// ============================================================================
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const { DB_FILE, DATA_DIR } = require('../config');

let db = null;

// 密码哈希：sha256(salt + password)
function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(salt + ':' + password).digest('hex');
}
function randomSalt() { return crypto.randomBytes(8).toString('hex'); }

function ensureDir() { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); }

const SCHEMA = `
CREATE TABLE IF NOT EXISTS enterprise (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eid TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT,
  register_time TEXT,
  admin_name TEXT,
  total_personnel INTEGER DEFAULT 0,
  dept_count INTEGER DEFAULT 0,
  logged_in_count INTEGER DEFAULT 0,
  unlogged_count INTEGER DEFAULT 0,
  dept_with_manager INTEGER DEFAULT 0,
  dept_no_manager INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  manager TEXT,
  parent_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  member_count INTEGER DEFAULT 0,
  sort INTEGER DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dept_name ON departments(name);
CREATE INDEX IF NOT EXISTS idx_dept_parent ON departments(parent_id);
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  dept_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'member',
  login_status INTEGER DEFAULT 1,
  is_manager INTEGER DEFAULT 0,
  phone TEXT,
  email TEXT UNIQUE,
  password_hash TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_member_dept ON members(dept_id);
CREATE TABLE IF NOT EXISTS lightapps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  status TEXT DEFAULT 'on',
  description TEXT,
  installs INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS billing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan TEXT,
  fee REAL DEFAULT 0,
  paid_until TEXT,
  usage_pct INTEGER DEFAULT 0,
  seats INTEGER DEFAULT 0,
  used_seats INTEGER DEFAULT 0,
  renew_auto INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS billing_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  billing_id INTEGER REFERENCES billing(id) ON DELETE CASCADE,
  time TEXT,
  amount REAL,
  description TEXT,
  status TEXT DEFAULT 'paid'
);
CREATE TABLE IF NOT EXISTS publicaccounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  type TEXT,
  fans INTEGER DEFAULT 0,
  status TEXT DEFAULT 'on'
);
CREATE TABLE IF NOT EXISTS circle_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author TEXT,
  content TEXT,
  time TEXT,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS security_policy (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  login_policy TEXT DEFAULT 'password',
  password_min_len INTEGER DEFAULT 8,
  mfa_enabled INTEGER DEFAULT 0,
  mfa_type TEXT DEFAULT 'sms',
  session_timeout INTEGER DEFAULT 720,
  ip_whitelist TEXT DEFAULT '[]',
  data_encryption INTEGER DEFAULT 1,
  audit_enabled INTEGER DEFAULT 1,
  watermark INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT
);
CREATE TABLE IF NOT EXISTS openapps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  app_key TEXT UNIQUE,
  secret_hash TEXT,
  status TEXT DEFAULT 'on',
  calls INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  user_name TEXT,
  action TEXT,
  target TEXT,
  ip TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(created_at);
`;

function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM enterprise').get().c;
  if (count > 0) return;

  db.exec(`
    INSERT INTO enterprise(eid,name,short_name,register_time,admin_name,total_personnel,dept_count,logged_in_count,unlogged_count,dept_with_manager,dept_no_manager)
    VALUES('19141476','NewBodor 演示企业','NewBodor','2020-08-18','周镇镇',4551,880,4550,1,745,135);

    INSERT INTO departments(name,manager,parent_id,member_count,sort) VALUES
      ('总经办','周镇镇',NULL,3,1),
      ('产品部','李茜',1,12,2),
      ('研发部','王工',1,45,3),
      ('市场部','赵明',NULL,20,4),
      ('销售部','钱进',NULL,60,5);

    INSERT INTO members(user_id,name,dept_id,role,login_status,is_manager,phone,email) VALUES
      ('u0001','周镇镇',1,'admin',1,1,'138****0001','admin@newbodor.local'),
      ('u0002','李茜',2,'manager',1,1,'138****0002','liqian@newbodor.local'),
      ('u0003','王工',3,'manager',1,1,'138****0003','wanggong@newbodor.local'),
      ('u0004','赵明',4,'manager',0,1,'138****0004','zhaoming@newbodor.local'),
      ('u0005','钱进',5,'manager',0,1,'138****0005','qianjin@newbodor.local'),
      ('u0006','测试用户',3,'member',1,0,'138****0006','test@newbodor.local');

    INSERT INTO lightapps(name,icon,status,description,installs) VALUES
      ('审批','📋','on','企业审批流程',320),
      ('考勤','🕒','on','员工考勤打卡',280),
      ('会议','🎥','on','视频会议',150),
      ('云盘','☁️','off','企业云存储',90),
      ('公告','📢','on','企业公告发布',200),
      ('日报','📝','off','员工日报提交',60),
      ('知识库','📚','on','企业知识库',110),
      ('投票','🗳️','off','企业投票调查',35);

    INSERT INTO billing(plan,fee,paid_until,usage_pct,seats,used_seats,renew_auto)
      VALUES('企业标准版',9980,'2026-12-31',15,5000,4551,1);
    INSERT INTO billing_history(billing_id,time,amount,description,status)
      VALUES(1,'2025-12-31',9980,'企业标准版年费','paid');
    INSERT INTO billing_history(billing_id,time,amount,description,status)
      VALUES(1,'2025-06-30',9980,'企业标准版年费','paid');

    INSERT INTO publicaccounts(name,type,fans,status) VALUES
      ('NewBodor 官方号','service',4551,'on'),
      ('行政通知号','subscription',3200,'on');

    INSERT INTO circle_posts(author,content,time,likes,comments) VALUES
      ('周镇镇','欢迎来到 NewBodor 团队同事圈！','2026-10-01 09:00',120,18),
      ('王工','研发部本周完成 12 个需求评审。','2026-10-02 15:30',56,6);

    INSERT INTO security_policy(login_policy,password_min_len,mfa_enabled,mfa_type,session_timeout,ip_whitelist,data_encryption,audit_enabled,watermark)
      VALUES('password',8,0,'sms',720,'[]',1,1,0);

    INSERT INTO system_config(key,value) VALUES
      ('enterpriseName','NewBodor 演示企业'),
      ('adminEmail','admin@newbodor.local'),
      ('defaultLang','zh-CN'),
      ('timezone','Asia/Shanghai'),
      ('notification','1'),
      ('allowRegister','0'),
      ('maxUploadSize','200');

    INSERT INTO openapps(name,app_key,secret_hash,status,calls) VALUES
      ('NewBodor 开放接口','nb_2026_7f3a9c', 'placetextsecret','on',12034);
  `);

  // 设置默认管理员密码
  const salt = randomSalt();
  const hash = hashPassword('admin123', salt);
  db.prepare('UPDATE members SET password_hash=? WHERE email=?').run(salt + '$' + hash, 'admin@newbodor.local');
}

function init() {
  ensureDir();
  db = new DatabaseSync(DB_FILE);
  db.exec('PRAGMA journal_mode=WAL;');
  db.exec(SCHEMA);
  seedIfEmpty();
  return db;
}

function getDb() {
  if (!db) init();
  return db;
}

// 通用查询辅助（将 undefined 参数清洗为 null，避免 node:sqlite 绑定报错）
function sanitize(params) { return params.map(p => p === undefined ? null : p); }
function rows(sql, ...params) { return getDb().prepare(sql).all(...sanitize(params)); }
function row(sql, ...params) { return getDb().prepare(sql).get(...sanitize(params)); }
function run(sql, ...params) {
  const r = getDb().prepare(sql).run(...sanitize(params));
  return { changes: r.changes, lastId: Number(r.lastInsertRowid) };
}

// 密码校验
function verifyPassword(user, password) {
  if (!user || !user.password_hash) return false;
  const parts = user.password_hash.split('$');
  const salt = parts[0];
  const hash = parts[1];
  return hashPassword(password, salt) === hash;
}
function makePasswordHash(password) {
  const salt = randomSalt();
  return salt + '$' + hashPassword(password, salt);
}

module.exports = { init, getDb, rows, row, run, verifyPassword, makePasswordHash, DB_FILE };
