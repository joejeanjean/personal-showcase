# API 设计 — NewBodor 企业管理后台

**Author**: 后端架构师
**Base URL**: `http://127.0.0.1:9889/api`

## 1. 通用约定

- 鉴权：`Authorization: Bearer <token>`（登录签发）
- 响应成功：`200` / `201`
  ```json
  { "data": ..., "meta": { "ts": "..." } }
  ```
- 响应失败（统一结构）：
  ```json
  { "error": { "code": "NOT_FOUND", "message": "..." } }
  ```
- 写操作会写入审计日志。

## 2. 认证

| Method | Path | 说明 |
|--------|------|------|
| POST | `/api/auth/login` | body`{email,password}` → 返回 `{token,user}` |
| POST | `/api/auth/logout` | 失效当前 token |
| GET  | `/api/auth/me` | 返回当前用户信息 |

默认管理员：`admin@newbodor.local` / `admin123`（见 README）。

## 3. 团队概况

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/enterprise/overview` | 企业信息 + 统计卡片 |
| GET | `/api/enterprise` | 企业信息（可编辑） |
| PUT | `/api/enterprise` | 更新企业信息 |

## 4. 通讯录-部门

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/departments` | 部门树（含成员数） |
| POST | `/api/departments` | 新增部门 |
| PUT | `/api/departments/:id` | 更新部门 |
| DELETE | `/api/departments/:id` | 删除（有成员则 400） |

## 5. 通讯录-成员

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/members` | 成员列表（可按 deptId/role/status 过滤） |
| POST | `/api/members` | 新增成员 |
| PUT | `/api/members/:id` | 更新成员 |
| DELETE | `/api/members/:id` | 删除成员 |
| PUT | `/api/members/:id/manager` | 设置/取消负责人 |

## 6. 应用管理-轻应用

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/lightapps` | 轻应用列表 |
| POST | `/api/lightapps` | 新增 |
| PUT | `/api/lightapps/:id` | 更新 |
| DELETE | `/api/lightapps/:id` | 删除 |
| POST | `/api/lightapps/:id/toggle` | 启用/停用 |

## 7. 计费服务

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/billing` | 当前计费 + 历史 |
| PUT | `/api/billing` | 更新计费方案 |

## 8. 公共号

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/publicaccounts` | 列表 |
| POST | `/api/publicaccounts` | 新增 |
| PUT | `/api/publicaccounts/:id` | 更新 |
| DELETE | `/api/publicaccounts/:id` | 删除 |

## 9. 同事圈

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/circle` | 帖子列表 |
| POST | `/api/circle` | 发布 |
| DELETE | `/api/circle/:id` | 删除 |

## 10. 信息安全平台

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/security` | 读取安全策略 |
| PUT | `/api/security` | 更新安全策略 |

## 11. 系统设置

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/settings` | 读取系统设置 |
| PUT | `/api/settings` | 更新系统设置 |

## 12. 开放平台

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/openapps` | 开放应用列表（secret 脱敏） |
| POST | `/api/openapps` | 新增（生成 appKey/secret） |
| PUT | `/api/openapps/:id` | 更新 |
| DELETE | `/api/openapps/:id` | 删除 |
| POST | `/api/openapps/:id/toggle` | 启停 |

## 13. 系统日志

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/logs` | 审计日志，可按 `user`/`action`/`since` 过滤，分页 |

## 14. 其他

| Method | Path | 说明 |
|--------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/api/overview` | 汇总（团队概况 + 应用 + 公告等网关数据） |
