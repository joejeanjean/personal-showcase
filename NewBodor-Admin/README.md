# NewBodor 企业管理后台（Enterprise Management Console）

> 复现云之家(yunzhijia)「企业管理后台/管理中心」界面与功能，并基于 NewBodor 接口能力，完成**完全自研**的 NewBodor 系统管理后台 + 底层后端程序。
>
> 技术栈：原生 Node.js（内置 `node:sqlite`，零外部依赖） + 原生 HTML/CSS/JS 单页前端。

---

## 1. 功能模块

左侧管理中心导航（复现云之家后台）：

| 模块 | 说明 |
|------|------|
| 团队概况 | 企业ID、注册日期、管理员、总人数/已登录/未登录、部门数、负责人统计 |
| 通讯录 | 部门树 + 成员表；部门/成员增删改、设负责人 |
| 应用管理 | 轻应用启停/编辑/删除（审批、考勤、会议、云盘、公告、日报、知识库、投票） |
| 计费服务 | 套餐、年度费用、到期日、用量占比、历史账单 |
| 同事圈 | 帖子流发布/删除 |
| 信息安全平台 | 登录策略、密码长度、MFA、会话超时、IP白名单、数据加密、审计开关、水印 |
| 系统设置 | 企业名、管理员邮箱、语言、时区、通知、开放注册、上传限制 |
| 开放平台 | 开放应用 AppKey/Secret（脱敏）、调用量、启停 |
| 系统日志 | 操作审计日志（时间/操作人/动作/对象/IP），可筛选 |

## 2. 快速开始

> 需要 Node.js ≥ 22（本机验证 Node v24，内置 `node:sqlite`）。

```bash
# 启动后台（默认 http://127.0.0.1:9889/）
node backend/server.js

# 运行 API 集成测试（自启动临时服务器 + 隔离数据目录）
node test/run.js
```

**默认账号**：`admin@newbodor.local` / `admin123`

**可配置环境变量**：
- `PORT` 端口（默认 `9889`）
- `HOST` 监听地址（默认 `127.0.0.1`）
- `NB_DATA_DIR` 数据目录（默认 `./data`）
- `NB_SECRET` 会话密钥（默认内置）

## 3. 目录结构

```
NewBodor-Admin/
├── backend/            # 底层后端（Node + node:sqlite）
│   ├── server.js       # HTTP 服务入口
│   ├── config.js       # 配置
│   ├── data/db.js      # 数据访问层（Schema + 种子 + SQLite）
│   ├── middleware/     # 鉴权 / 响应 / 审计
│   └── routes/         # REST 路由（auth/enterprise/departments/members/...）
├── frontend/           # 复现的云之家企业管理后台 SPA
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── test/               # QA 测试
│   ├── run.js          # 测试入口
│   └── api.test.js     # API 集成测试
├── docs/               # 工作流交付物
│   ├── PRD.md          # 产品需求（PM）
│   ├── ARCHITECTURE.md # 系统架构（后端架构师）
│   ├── API.md          # API 设计
│   ├── DB_SCHEMA.md    # 数据库设计
│   ├── UI_DESIGN.md    # 界面设计（前端）
│   └── TEST_PLAN.md    # 测试计划与报告（QA）
└── package.json
```

## 4. 与 NewBodor/云之家 的集成

- 本后台为**独立自研服务**，不依赖云之家外部服务。
- 若需挂载到 NewBodor Electron 客户端，可将主进程入口替换为：
  ```js
  // 在 NewBodor 主进程 app.js 中启动本后台
  require('<本目录>/backend/server.js');
  // 并打开窗口: mainWindow.loadURL('http://127.0.0.1:9889/');
  ```
- 参考现有 `app_dev_bak/build/main/app.js` 的挂载方式（其指向旧版 `admin_backend.cjs`；可用本项目的 `backend/server.js` 替代）。

## 5. 文档

工作流按 agency-agents 拆分为：产品经理(PM) → 前端设计 → 后端开发与数据库 → 测试闭环。交付物见 `docs/`。

## 6. 测试结果

```
43 / 43 全部通过（API 集成测试）
```
