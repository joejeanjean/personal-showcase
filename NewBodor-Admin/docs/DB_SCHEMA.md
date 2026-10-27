# 数据库设计 — NewBodor 企业管理后台

**Author**: 后端架构师
**DB**: SQLite（Node 内置 `node:sqlite`）
**File**: `data/newbodor.db`

## 1. ER 概览

```
enterprise (1) ── (1) billing
enterprise (1) ── (0..n) department
department (1) ── (0..n) member     (member.dept_id -> department.id)
member (1) ── (0..n) audit_log      (audit_log.user_id -> member.id)
enterprise (1) ── (0..n) lightapp / publicaccount / circle_post / openapp
lightapp / publicaccount / openapp / circle_post ── 独立实体
system_config (1) 键值对              (单企业配置)
```

## 2. 建表语句

```sql
-- 企业信息（单行表）
CREATE TABLE enterprise (
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

-- 部门
CREATE TABLE departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  manager TEXT,
  parent_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  member_count INTEGER DEFAULT 0,
  sort INTEGER DEFAULT 0
);
CREATE UNIQUE INDEX idx_dept_name ON departments(name);
CREATE INDEX idx_dept_parent ON departments(parent_id);

-- 成员
CREATE TABLE members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  dept_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'member',      -- admin / manager / member
  login_status INTEGER DEFAULT 1,           -- 1 已登录 / 0 未登录
  is_manager INTEGER DEFAULT 0,
  phone TEXT,
  email TEXT UNIQUE,
  password_hash TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE UNIQUE INDEX idx_member_email ON members(email);
CREATE INDEX idx_member_dept ON members(dept_id);

-- 轻应用
CREATE TABLE lightapps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  status TEXT DEFAULT 'on',               -- on / off
  description TEXT,
  installs INTEGER DEFAULT 0
);

-- 计费
CREATE TABLE billing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan TEXT,
  fee REAL DEFAULT 0,
  paid_until TEXT,
  usage_pct INTEGER DEFAULT 0,
  seats INTEGER DEFAULT 0,
  used_seats INTEGER DEFAULT 0,
  renew_auto INTEGER DEFAULT 1
);

-- 计费历史
CREATE TABLE billing_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  billing_id INTEGER REFERENCES billing(id) ON DELETE CASCADE,
  time TEXT,
  amount REAL,
  description TEXT,
  status TEXT DEFAULT 'paid'
);

-- 公共号
CREATE TABLE publicaccounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  type TEXT,                              -- service / subscription
  fans INTEGER DEFAULT 0,
  status TEXT DEFAULT 'on'
);

-- 同事圈帖子
CREATE TABLE circle_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author TEXT,
  content TEXT,
  time TEXT,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0
);

-- 信息安全策略
CREATE TABLE security_policy (
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

-- 系统设置（键值对）
CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- 开放应用
CREATE TABLE openapps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  app_key TEXT UNIQUE,
  secret_hash TEXT,
  status TEXT DEFAULT 'on',
  calls INTEGER DEFAULT 0
);

-- 审计日志
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  user_name TEXT,
  action TEXT,
  target TEXT,
  ip TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_time ON audit_logs(created_at);
```

## 3. 索引策略

- `members.email` / `members.user_id` / `departments.name` / `lightapps.name` / `openapps.app_key` 唯一索引。
- 外键与常用 `WHERE` 建立普通索引。

## 4. 关联口径（团队概况）

`enterprise` 表冗余保存统计字段，避免每次联表聚合。启动 seed 时给出截图一致的数值：
- 总人数 4551、已登录 4550、未登录 1
- 部门个数 880、已设负责人 745、未设负责人 135
- eid `19141476`、注册 `2020-08-18`、管理员 `许振`

## 5. 种子数据

`data/db.js` 在首次初始化时写入默认企业、5 个部门、6 名成员、8 个轻应用、计费方案、公共号、同事圈、安全策略、系统设置、开放应用、若干审计日志。
