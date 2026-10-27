# 系统架构规范 — NewBodor 企业管理后台

**Author**: 后端架构师
**Version**: 1.0

## 1. 高层架构

**架构模式**：Monolith（单进程单体），分层清晰，便于后续拆分
**通信模式**：REST / JSON over HTTP（本地 `127.0.0.1:9889`）
**数据模式**：Traditional CRUD + SQLite 关系模型（使用 Node 内置 `node:sqlite`）
**部署模式**：随 NewBodor Electon 应用本地托管；也可独立 `node server.js` 启动

```
┌─────────────────────────────────────────────────────────────┐
│                    NewBodor (Electron)                        │
│   app.js (主进程入口)  ── 启动并挂载自研后台                    │
│         └─────────────────────────────────────────────┐       │
│                                                       ▼       │
│   BrowserWindow ──http://127.0.0.1:9889/admin──► HTTP Server  │
└─────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────▼───────────────────┐
                    │   HTTP Server (Node, no deps)     │
                    │   ┌───────────────────────────┐   │
                    │   │  routes/   (REST 路由层)   │   │
                    │   │  services/ (业务逻辑层)    │   │
                    │   │  data/db   (数据访问层)    │   │
                    │   └───────────────┬───────────┘   │
                    │                   ▼               │
                    │   SQLite (node:sqlite)             │
                    │   data/newbodor.db                 │
                    └───────────────────────────────────┘
```

## 2. 分层与职责

| 层 | 目录 | 职责 |
|----|------|------|
| 路由层 | `backend/routes/*.js` | 解析 URL、调用 service、组装响应、统一错误 |
| 业务层 | `backend/services/*.js` | 业务规则、权限校验、审计日志写入、事务 |
| 数据层 | `backend/data/db.js` | SQLite 连接、Schema 迁移、预编译语句、仓储方法 |
| 中间件 | `backend/middleware/*.js` | 鉴权、CORS、JSON 解析、静态托管、审计 |
| 入口 | `backend/server.js` | HTTP Server 组装、启动、优雅退出 |

## 3. 目录结构

```
backend/
  server.js                  # HTTP 服务入口
  config.js                  # 配置（端口/数据目录/会话）
  middleware/
    auth.js                  # session 鉴权中间件
    helpers.js               # JSON body / 响应工具
  data/
    db.js                    # node:sqlite 初始化 + 迁移 + seed
    schema.sql               # 建表语句（文档）
  routes/
    index.js                 # 路由分发
    auth.js                  # 登录/登出/会话
    enterprise.js            # 团队概况
    departments.js           # 通讯录-部门
    members.js               # 通讯录-成员
    lightapps.js             # 应用管理-轻应用
    billing.js               # 计费服务
    publicaccounts.js        # 公共号
    circle.js                # 同事圈
    security.js              # 信息安全平台
    settings.js              # 系统设置
    openapps.js              # 开放平台
    logs.js                  # 系统日志
  services/                  # 业务逻辑（按模块）
frontend/
  index.html                 # 复现的云之家企业管理后台 SPA
  css/style.css
  js/app.js
test/
  run.js                     # 测试入口
  api.test.js                # API 集成测试
docs/                        # 本套文档
```

## 4. 关键架构决策

1. **数据库**：SQLite（`node:sqlite`）。零外部依赖、单文件、ACID、关系完整。所有主键使用自增 INTEGER；企业/部门/成员关系用外键。
2. **鉴权**：登录成功后签发会话 token（`crypto.randomBytes(32)`），存内存 Session 表（引用 user），写操作要求角色 `admin`（或 `manager` 可写本部门），登录/登出/写操作写入审计日志表。
3. **审计**：所有写操作（POST/PUT/DELETE）在 `services` 层落 `audit_logs`，记录 `user, action, target, ip, created_at`。
4. **安全**：密码 `sha256(salt+password)` 存储；Secret 仅脱敏返回；上传大小限制；默认关闭外部访问（监听 127.0.0.1）。
5. **容错**：端口占用检测，已监听则复用；`node:sqlite` 不可用时降级到内存存储。
6. **错误处理统一**：`{ error: { code, message } }`，HTTP 状态码语义化。

## 5. 安全设计

- 纵深防御：监听 loopback、鉴权中间件、审计日志、参数校验。
- 最小权限：`admin` 全量；`manager` 只读写本部门；`member` 只读。
- 静态托管仅限 `frontend` 目录，禁止目录穿越。

## 6. 性能与可靠性

- 预编译语句（prepared statements）防注入并提升查询性能。
- 唯一索引：`users.email`、`departments.name`、`lightapps.name`。
- 查询全部为 `WHERE` 条件 + `ORDER BY sort/id`，本地负载下 < 20ms。
- 提供健康检查 `GET /api/health` 与数据库预热。
