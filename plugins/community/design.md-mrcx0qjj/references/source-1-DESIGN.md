# DESIGN.md

# 招商局巡视巡察系统前端底座与 AI 辅助开发体系设计文档

> 文档版本：v1.0  
> 适用项目：招商局巡视巡察系统前端工程  
> 技术方向：Vue 3 + Vite + TypeScript + BladeX + 招商局 UI Design Token + AI Agent Engineering Harness  
> 目录标准：`AGENTS.md` + `.agents/`  
> 文档定位：按照行业常见工程设计文档标准输出，用于架构评审、开发落地、AI Agent 上下文沉淀与后续演进。

---

## 0. Executive Summary

本项目不是简单搭建一个 Vue Admin，也不是套用通用后台模板。它的目标是建设一个**可长期复用、可扩展、可审计、可被 AI Agent 持续辅助开发的招商局巡视巡察系统前端底座**。

核心不是“Vue + Vite + Element Plus”这些选型本身，而是建立以下能力：

1. **请求层完全适配 BladeX**  
   包括登录、刷新 Token、`Tenant-Id`、`Blade-Auth`、Basic Auth、响应结构、分页结构、文件上传下载、CORS Header、错误码、权限菜单、字典、部门、用户等。

2. **招商局 UI 主题可替换、可治理**  
   以招商局官方 VI 色彩为基础，建立 Design Token、Element Plus 覆盖变量、业务状态色、图表色和主题切换机制。

3. **基础组件必须二次封装**  
   不允许业务页面长期裸用 Element Plus。需要通过 `CInput`、`CTextarea`、`CTable`、`CForm`、`CDialog`、`CUpload` 等组件统一默认行为、视觉样式、权限、校验、状态与可访问性。

4. **巡视巡察业务组件可沉淀**  
   形成任务阶段、问题风险、整改状态、截止倒计时、证据上传、审批时间轴、操作日志、安全预览、水印、脱敏文本等业务组件。

5. **状态管理与本地数据边界清晰**  
   Pinia 只管理客户端状态与必要全局状态；服务端列表和详情不长期放 Pinia；敏感巡视巡察业务数据不得长期持久化到 `localStorage`。

6. **权限菜单动态化**  
   对接 BladeX 菜单、角色、按钮权限，支持动态路由、路由守卫、按钮权限指令、菜单隐藏、KeepAlive、面包屑和多页签。

7. **AI Agent 辅助开发工程化**  
   建立 `AGENTS.md` + `.agents/`，用 Rules、Specs、Skills、Wiki、CodeGraph、Roles、Workflows 支撑 OpenSpec、CodeGraph、LLM Wiki/OKF、Superpowers 与多角色 AI Agent 协同。

本设计采用四层主架构：

```text
前端框架工程化底座
        ↓
BladeX 适配层
        ↓
招商局 UI 主题层
        ↓
巡视巡察业务组件层
```

并叠加 AI 辅助开发层：

```text
AGENTS.md + .agents/
Rules + Specs + Skills + Wiki + CodeGraph + Roles + Workflows
```

最终目标是让后续新增模块时，不再是页面级重复开发，而是基于统一底座、统一规则、统一组件和统一 AI 上下文的可控扩展。

---

## 1. 设计目标

### 1.1 产品目标

建设一套支撑招商局巡视巡察业务的前端系统，包括但不限于：

- 工作台
- 巡视任务
- 问题线索
- 整改督办
- 材料档案
- 巡视报告
- 数据驾驶舱
- 通知公告
- 系统管理
- 权限与审计

### 1.2 工程目标

本前端底座需要满足：

- 可长期演进
- 可多模块复用
- 可快速接入 BladeX 后端
- 可快速生成业务页面
- 可统一主题和设计规范
- 可统一组件行为
- 可审计、可测试、可回归
- 可由 AI Agent 安全辅助开发

### 1.3 非目标

本设计文档不覆盖：

- BladeX 后端改造细节
- 数据库表结构完整设计
- 巡视巡察业务制度文本
- 具体接口 Swagger 定稿
- Figma 高保真页面设计文件
- 生产运维平台完整方案

---

## 2. 架构总览

### 2.1 总体分层

```text
┌──────────────────────────────────────────────┐
│                 业务页面层                     │
│ views: 工作台 / 任务 / 问题 / 整改 / 档案 / 报告 │
└──────────────────────────────────────────────┘
                      ↓
┌──────────────────────────────────────────────┐
│             巡视巡察业务组件层                 │
│ widgets: 阶段 / 风险 / 整改 / 时间轴 / 附件 / 水印 │
└──────────────────────────────────────────────┘
                      ↓
┌──────────────────────────────────────────────┐
│             招商局 UI 主题层                   │
│ Design Token / Element Plus Override / 图表色  │
└──────────────────────────────────────────────┘
                      ↓
┌──────────────────────────────────────────────┐
│             基础组件与框架层                   │
│ CInput / CTable / CForm / Router / Store / Layout │
└──────────────────────────────────────────────┘
                      ↓
┌──────────────────────────────────────────────┐
│              BladeX 适配层                    │
│ Request / Token / Tenant / Adapter / Dict / File │
└──────────────────────────────────────────────┘
                      ↓
┌──────────────────────────────────────────────┐
│              后端服务层                       │
│ BladeX Gateway / Auth / System / Business APIs │
└──────────────────────────────────────────────┘
```

### 2.2 AI 辅助开发层

```text
┌──────────────────────────────────────────────┐
│                  AGENTS.md                    │
│        所有 AI Coding Agents 的入口说明        │
└──────────────────────────────────────────────┘
                      ↓
┌──────────────────────────────────────────────┐
│                  .agents/                     │
│ Rules / Specs / Skills / Wiki / CodeGraph      │
│ Roles / Workflows                              │
└──────────────────────────────────────────────┘
                      ↓
┌──────────────────────────────────────────────┐
│             AI Agent 工作流                    │
│ Architect / BladeX API / UI System / Frontend  │
│ Reviewer / Tester / Documenter                 │
└──────────────────────────────────────────────┘
```

---

## 3. 推荐技术栈

| 层级 | 推荐方案 | 说明 |
|---|---|---|
| 构建工具 | Vite 最新稳定版 | 使用 Vite 8 时，Node.js 需要满足 `20.19+` 或 `22.12+`。 |
| 框架 | Vue 3 + TypeScript | 采用 Composition API、SFC、严格类型约束。 |
| 路由 | Vue Router 4 | 使用 route meta 管理权限、缓存、菜单、面包屑、页面标题。 |
| 状态管理 | Pinia | 模块化 Store，类型友好，支持 Devtools 和插件扩展。 |
| UI 组件库 | Element Plus 二次封装 | 不在业务页面长期裸用 Element Plus。 |
| 请求库 | Axios | 通过统一 BladeX Request Adapter 接入。 |
| 样式 | SCSS + CSS Variables | 支撑主题切换、Design Token 和 Element Plus 变量覆盖。 |
| 图表 | ECharts | 用于驾驶舱、整改趋势、问题分类、风险排行。 |
| 表格增强 | Element Plus Table / vxe-table 可选 | 首期优先 Element Plus Table，复杂台账再评估 vxe-table。 |
| 本地缓存 | Pinia Persist + localForage / IndexedDB | 存 UI 偏好、筛选、草稿；敏感数据慎存。 |
| 权限 | 动态路由 + 按钮权限指令 | 对接 BladeX 菜单、角色、权限标识。 |
| 代码规范 | ESLint + Prettier + Stylelint + Husky + lint-staged | 多人协作必须配置。 |
| 测试 | Vitest + Playwright | request、权限、组件默认行为、核心流程必须测试。 |
| 包管理 | pnpm | 锁定依赖版本，提升安装速度和一致性。 |

### 3.1 基础版本建议

```json
{
  "engines": {
    "node": ">=20.19.0"
  },
  "packageManager": "pnpm@latest"
}
```

### 3.2 工程原则

```text
不要让页面直接感知 BladeX。
不要让页面直接裸用 Element Plus。
不要让业务状态色散落在页面。
不要让 Input/Textarea 默认规则靠人工记忆。
不要把服务端数据都塞进 Pinia。
不要把敏感业务数据长期存在本地。
不要让 AI Agent 在没有规则和 Spec 的情况下直接改代码。
```

---

## 4. 项目目录设计

### 4.1 `src` 主目录

```text
src
├── app                 # 应用启动、插件注册、全局配置
├── assets              # 静态资源
├── components          # 通用基础组件
├── config              # 全局配置、主题配置、BladeX 配置
├── constants           # 常量、枚举
├── directives          # 权限、水印、拖拽等指令
├── hooks               # 通用组合式函数
├── layouts             # 布局
├── plugins             # Element Plus、ECharts、权限、主题等插件
├── router              # 路由
├── service             # 请求层、BladeX 适配层、API 模块
├── stores              # Pinia 状态
├── styles              # 全局样式、主题变量、设计 Token
├── types               # 全局类型
├── utils               # 工具函数
├── views               # 页面
└── widgets             # 业务级组件 / 巡视巡察专属组件
```

### 4.2 `service` 目录

```text
src/service
├── http
│   ├── create-request.ts        # 创建 axios 实例
│   ├── interceptors.ts          # 请求/响应拦截器
│   ├── token-refresh.ts         # token 刷新队列
│   ├── error-handler.ts         # 错误统一处理
│   ├── download.ts              # 文件下载
│   ├── upload.ts                # 文件上传
│   └── types.ts
├── bladex
│   ├── auth.api.ts              # 登录、刷新 token、退出
│   ├── user.api.ts              # 用户信息
│   ├── menu.api.ts              # 菜单路由
│   ├── dict.api.ts              # 字典
│   ├── dept.api.ts              # 组织部门
│   ├── file.api.ts              # 文件
│   └── adapter.ts               # BladeX 响应适配
└── modules
    ├── patrol-task              # 巡视任务
    ├── issue-clue               # 问题线索
    ├── rectification            # 整改督办
    ├── archive                  # 档案材料
    └── dashboard                # 数据驾驶舱
```

BladeX 相关内容必须集中在 `src/service/http` 和 `src/service/bladex`，不得散落在业务页面。

---

## 5. BladeX 适配层设计

### 5.1 适配范围

BladeX 前后端对接需要重点处理：

1. 登录接口怎么传；
2. token 怎么存；
3. token 怎么刷新；
4. `Tenant-Id` 怎么传；
5. `Authorization` 怎么传；
6. `Blade-Auth` 怎么传；
7. 响应结构怎么统一判断；
8. 分页结构怎么转换；
9. 文件上传下载怎么处理；
10. 字典、菜单、权限怎么拉；
11. 多租户、部门、角色怎么和前端状态绑定；
12. CORS 请求头要和后端网关配置一致。

### 5.2 BladeX 配置

```ts
// src/config/bladex.ts
export const bladexConfig = {
  baseURL: import.meta.env.VITE_API_BASE_URL,
  tenantId: import.meta.env.VITE_BLADEX_TENANT_ID || '000000',
  clientId: import.meta.env.VITE_BLADEX_CLIENT_ID || 'saber',
  clientSecret: import.meta.env.VITE_BLADEX_CLIENT_SECRET || '',
  tokenHeader: 'Blade-Auth',
  tenantHeader: 'Tenant-Id',
  authorizationHeader: 'Authorization',
  authorizationPrefix: 'Basic',
  bearerPrefix: 'bearer',
  successCode: 200,
  unauthorizedCodes: [401, 424],
  tokenExpiredCodes: [401, 424],
}
```

注意：如果后端要求 Basic client 信息，前端会暴露 `clientId/clientSecret`，它不能被视为真正机密。建议与后端确认是否采用前端专用 client、网关代理或后端配置托管。

---

## 6. Request 层设计

Request 层是本前端底座最关键的一层。目标不是封装一个 `request.get()`，而是封装一套完整的 **BladeX HTTP Client**。

### 6.1 Request 必备能力

| 能力 | 优先级 |
|---|---|
| baseURL 环境切换 | 必须 |
| Tenant-Id 自动注入 | 必须 |
| token 自动注入 | 必须 |
| Basic Auth 登录头 | 必须 |
| token 过期自动刷新 | 必须 |
| refresh 并发队列 | 必须 |
| 统一错误提示 | 必须 |
| 统一响应结构适配 | 必须 |
| 文件上传 | 必须 |
| 文件下载 Blob | 必须 |
| 取消重复请求 | 建议 |
| 请求 loading 聚合 | 建议 |
| 请求重试 | 谨慎，仅 GET |
| 接口 mock | 建议 |
| 请求日志 | 开发环境必须 |
| 接口耗时统计 | 建议 |
| 敏感参数脱敏日志 | 必须 |

### 6.2 请求实例

```ts
// src/service/http/create-request.ts
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { setupRequestInterceptors, setupResponseInterceptors } from './interceptors'

export interface RequestOptions extends AxiosRequestConfig {
  skipAuth?: boolean
  skipTenant?: boolean
  skipErrorMessage?: boolean
  skipTransform?: boolean
  retry?: number
  requestKey?: string
}

export function createRequest(): AxiosInstance {
  const instance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    timeout: 30_000,
    withCredentials: false,
  })

  setupRequestInterceptors(instance)
  setupResponseInterceptors(instance)

  return instance
}

export const request = createRequest()
```

### 6.3 请求拦截器

```ts
// src/service/http/interceptors.ts
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { bladexConfig } from '@/config/bladex'
import { useAuthStore } from '@/stores/auth'

export function setupRequestInterceptors(instance: AxiosInstance) {
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const authStore = useAuthStore()

    const skipAuth = (config as any).skipAuth
    const skipTenant = (config as any).skipTenant

    if (!skipTenant) {
      config.headers[bladexConfig.tenantHeader] = authStore.tenantId || bladexConfig.tenantId
    }

    if (!skipAuth && authStore.accessToken) {
      config.headers[bladexConfig.tokenHeader] = `${bladexConfig.bearerPrefix} ${authStore.accessToken}`
    }

    return config
  })
}
```

BladeX 项目中常见 token header 可能是 `Blade-Auth`，但不同项目可能改为 `Authorization: Bearer xxx`。因此必须配置化，不允许写死。

---

## 7. Token 刷新机制

### 7.1 需要规避的问题

- 多个接口同时 401，重复刷新 token；
- refresh token 也过期，页面死循环；
- 刷新过程中用户手动退出，旧请求又把 token 写回来；
- 登录接口、刷新接口被错误附加旧 token；
- refresh 请求携带 header 不符合 BladeX；
- CORS 不允许 `Tenant-Id` 或自定义 header；
- token 刷新失败后没有清理本地状态。

### 7.2 刷新队列

```ts
let isRefreshing = false
let pendingQueue: Array<(token: string) => void> = []

function subscribeTokenRefresh(cb: (token: string) => void) {
  pendingQueue.push(cb)
}

function onTokenRefreshed(token: string) {
  pendingQueue.forEach(cb => cb(token))
  pendingQueue = []
}
```

### 7.3 响应拦截刷新逻辑

```ts
instance.interceptors.response.use(
  response => transformBladeXResponse(response),
  async error => {
    const authStore = useAuthStore()
    const originalRequest = error.config

    if (isTokenExpired(error) && !originalRequest.__isRetryRequest) {
      if (isRefreshing) {
        return new Promise(resolve => {
          subscribeTokenRefresh((newToken) => {
            originalRequest.headers[bladexConfig.tokenHeader] = `bearer ${newToken}`
            resolve(instance(originalRequest))
          })
        })
      }

      originalRequest.__isRetryRequest = true
      isRefreshing = true

      try {
        const newToken = await authStore.refreshToken()
        onTokenRefreshed(newToken)
        originalRequest.headers[bladexConfig.tokenHeader] = `bearer ${newToken}`
        return instance(originalRequest)
      } catch (e) {
        authStore.logout()
        return Promise.reject(e)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)
```

### 7.4 登录与刷新接口

```ts
export function loginApi(data: LoginParams) {
  return request.post('/blade-auth/oauth/token', data, {
    skipAuth: true,
    headers: {
      Authorization: buildBasicAuth(),
      'Tenant-Id': data.tenantId,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  } as RequestOptions)
}

export function refreshTokenApi(refreshToken: string) {
  return request.post('/blade-auth/oauth/token', {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  }, {
    skipAuth: true,
    headers: {
      Authorization: buildBasicAuth(),
      'Tenant-Id': getTenantId(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  } as RequestOptions)
}
```

具体接口路径、字段名、Header 必须以项目实际 Swagger / BladeX 配置为准。

---

## 8. BladeX 响应适配

### 8.1 常见响应结构

```json
{
  "code": 200,
  "success": true,
  "data": {},
  "msg": "操作成功"
}
```

也可能出现 OAuth 错误结构：

```json
{
  "error_code": "...",
  "error_description": "..."
}
```

业务页面不得直接判断：

```ts
if (res.code === 200) {}
```

必须通过统一 adapter。

### 8.2 响应转换

```ts
export interface ApiResult<T = unknown> {
  code: number
  success: boolean
  data: T
  msg: string
}

export function transformBladeXResponse<T>(response: any): T {
  const res = response.data

  if (response.config?.skipTransform) {
    return res
  }

  if (res?.success || res?.code === 200) {
    return res.data
  }

  throw createApiError(res)
}
```

### 8.3 分页适配

BladeX 常见分页结构：

```json
{
  "records": [],
  "total": 100,
  "size": 10,
  "current": 1,
  "pages": 10
}
```

前端统一结构：

```ts
export interface PageResult<T> {
  list: T[]
  total: number
  pageNo: number
  pageSize: number
}
```

适配函数：

```ts
export function normalizePage<T>(data: any): PageResult<T> {
  return {
    list: data.records || [],
    total: data.total || 0,
    pageNo: data.current || 1,
    pageSize: data.size || 10,
  }
}
```

---

## 9. 状态管理设计

### 9.1 Pinia Store 划分

```text
stores
├── app.ts              # 应用级状态：侧边栏、设备、布局
├── auth.ts             # token、登录状态、租户
├── user.ts             # 用户信息、角色、权限
├── route.ts            # 动态路由、菜单
├── dict.ts             # 字典缓存
├── theme.ts            # 主题配置
├── tabs.ts             # 多页签
├── keep-alive.ts       # 页面缓存
├── settings.ts         # 用户偏好
└── draft.ts            # 本地草稿
```

### 9.2 状态边界

| 类型 | 归属 |
|---|---|
| token | auth store |
| 用户信息 | user store |
| 菜单路由 | route store |
| 字典 | dict store |
| 主题 | theme store |
| 侧边栏展开 | app/settings store |
| 查询筛选条件 | 页面内或 local cache |
| 表单草稿 | draft store + IndexedDB |
| 服务端列表数据 | 不建议长期放 Pinia |
| 台账详情数据 | 页面请求即可 |
| 附件内容 | 不放 Pinia |

### 9.3 三类数据模型

```text
客户端状态：Pinia
服务端状态：页面请求 / useRequest / Vue Query 可选
本地持久化：localStorage / sessionStorage / IndexedDB / localForage
```

巡视巡察系统敏感信息多，不得把问题线索详情、举报材料、附件内容长期存入 `localStorage`。

---

## 10. 本地数据管理

### 10.1 允许本地持久化

| 内容 | 存储方式 |
|---|---|
| 主题色 | localStorage |
| 深浅色模式 | localStorage |
| 侧边栏展开状态 | localStorage |
| 多页签 | sessionStorage |
| 最近访问菜单 | localStorage |
| 表格列显隐 | localStorage |
| 表格密度 | localStorage |
| 非敏感查询条件 | sessionStorage |
| 表单草稿 | IndexedDB |
| 字典缓存 | localStorage / IndexedDB |
| 用户偏好 | localStorage + 后端同步 |

### 10.2 不建议本地持久化

| 内容 | 原因 |
|---|---|
| 问题线索详情 | 敏感 |
| 举报人信息 | 高敏 |
| 附件原文 | 高敏 |
| 谈话记录 | 高敏 |
| 审核意见全文 | 敏感 |
| refresh token | 尽量避免长期暴露 |
| 权限完整树 | 可短时缓存，但退出清理 |

### 10.3 Token 存储原则

若后端支持，优先使用 HttpOnly Cookie。若 BladeX 固定返回 token 给 SPA，至少要做到：

- access token 短期有效；
- refresh token 尽量不要长期放在 localStorage；
- 退出登录彻底清理；
- 多标签页同步退出；
- token 日志脱敏；
- 生产环境禁止打印 token。

---

## 11. 路由与权限设计

### 11.1 Route Meta

```ts
export interface AppRouteMeta {
  title: string
  icon?: string
  requiresAuth?: boolean
  permissions?: string[]
  roles?: string[]
  keepAlive?: boolean
  hidden?: boolean
  activeMenu?: string
  affix?: boolean
  breadcrumb?: boolean
}
```

### 11.2 动态路由流程

```text
登录成功
→ 获取 token
→ 获取用户信息
→ 获取菜单权限
→ 后端菜单转换为前端路由
→ 注入动态路由
→ 生成侧边栏菜单
→ 进入首页
```

### 11.3 权限粒度

```text
菜单权限：能不能看到页面
路由权限：能不能访问页面
按钮权限：能不能操作按钮
```

按钮权限指令：

```vue
<el-button v-permission="'patrol:task:add'">
  新增巡视任务
</el-button>
```

业务页面应优先使用封装后的按钮：

```vue
<CButton permission="patrol:task:add" type="primary">
  新增巡视任务
</CButton>
```

---

## 12. 招商局 UI 主题设计

### 12.1 主题层级

```text
品牌主题：招商局蓝 / 标准黄 / 辅助色
系统主题：浅色 / 深色 / 高对比
组件主题：Element Plus 变量
业务主题：风险色 / 整改状态色 / 图表色
```

### 12.2 样式目录

```text
styles
├── tokens
│   ├── color.scss
│   ├── radius.scss
│   ├── spacing.scss
│   ├── shadow.scss
│   └── typography.scss
├── themes
│   ├── cmhk-light.scss
│   ├── cmhk-dark.scss
│   └── high-contrast.scss
├── element
│   ├── element-vars.scss
│   └── element-overrides.scss
└── index.scss
```

### 12.3 CSS Variables 示例

```scss
:root {
  --cmhk-color-primary: #004aa8;
  --cmhk-color-primary-hover: #005cc7;
  --cmhk-color-primary-light: #e8f4ff;

  --cmhk-color-warning: #ff8c47;
  --cmhk-color-danger: #d90000;
  --cmhk-color-success: #2f8f5b;

  --cmhk-bg-page: #f5f8fc;
  --cmhk-bg-card: #ffffff;

  --cmhk-text-primary: #1f2937;
  --cmhk-text-secondary: #4b5563;
  --cmhk-border-color: #d9e1ea;

  --el-color-primary: var(--cmhk-color-primary);
  --el-color-danger: var(--cmhk-color-danger);
  --el-color-warning: var(--cmhk-color-warning);
  --el-color-success: var(--cmhk-color-success);
}
```

实际色值以招商局官方 AI 色卡转换并确认后的 RGB/HEX 为准。

---

## 13. 基础组件二次封装

### 13.1 组件目录

```text
components/base
├── CInput
├── CTextarea
├── CSelect
├── CDatePicker
├── CButton
├── CTable
├── CDialog
├── CDrawer
├── CForm
├── CUpload
└── CPage
```

### 13.2 CInput 默认规则

```vue
<CInput v-model="form.title" label="标题" />
```

| 属性 | 默认值 |
|---|---|
| maxlength | 50 |
| clearable | true |
| show-word-limit | true |
| trim | blur 时自动 trim |
| placeholder | 自动生成“请输入xxx” |
| size | default |
| disabled | 继承表单状态 |

示例：

```vue
<script setup lang="ts">
interface Props {
  modelValue?: string
  label?: string
  maxlength?: number
  trim?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  maxlength: 50,
  trim: true,
})
</script>

<template>
  <el-input
    :model-value="modelValue"
    :maxlength="maxlength"
    show-word-limit
    clearable
    :placeholder="label ? `请输入${label}` : '请输入'"
    @blur="handleBlur"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
```

### 13.3 CTextarea 默认规则

```vue
<CTextarea v-model="form.description" label="问题描述" />
```

| 属性 | 默认值 |
|---|---|
| maxlength | 500 |
| rows | 4 |
| autosize | `{ minRows: 4, maxRows: 8 }` |
| show-word-limit | true |
| resize | none |
| trim | blur 时 trim |

按业务场景定义：

| 场景 | 默认 maxlength |
|---|---:|
| 标题/名称 | 50 |
| 摘要 | 100 |
| 备注 | 200 |
| 问题描述 | 500 |
| 整改措施 | 1000 |
| 审核意见 | 500 |
| 报告正文 | 不在普通 textarea 中处理 |

---

## 14. 巡视巡察业务组件

```text
widgets
├── PatrolStageSteps          # 巡视阶段步骤条
├── IssueRiskTag              # 问题风险标签
├── RectificationStatusTag    # 整改状态标签
├── DeadlineCountdown         # 截止时间倒计时
├── EvidenceUpload            # 佐证材料上传
├── AuditTimeline             # 审核时间轴
├── OperationLogDrawer        # 操作日志抽屉
├── UnitSelector              # 单位选择器
├── DeptUserSelector          # 部门人员选择器
├── DictSelect                # 字典选择器
├── SecureFilePreview         # 安全附件预览
├── WatermarkContainer        # 水印容器
└── SensitiveText             # 脱敏文本
```

示例：

```vue
<RectificationStatusTag status="OVERDUE" />
```

禁止在业务页面反复写：

```vue
<el-tag v-if="status === 'OVERDUE'" type="danger">已逾期</el-tag>
```

---

## 15. 表格框架设计

巡视巡察系统中表格数量多、字段长、状态多、权限复杂，因此必须封装 `CTable`。

### 15.1 CTable 能力

- 查询表单；
- 表格列配置；
- 列显隐；
- 表格密度；
- 序号列；
- 多选；
- 操作列；
- 分页；
- 自动请求；
- 字典转换；
- 状态标签；
- 日期格式化；
- 空状态；
- 导出；
- 权限控制。

### 15.2 使用示例

```vue
<CTable
  :columns="columns"
  :request="getIssuePage"
  row-key="id"
  show-selection
  show-index
/>
```

### 15.3 列配置示例

```ts
const columns = [
  {
    prop: 'issueCode',
    label: '问题编号',
    width: 160,
    fixed: 'left',
  },
  {
    prop: 'title',
    label: '问题摘要',
    minWidth: 240,
    ellipsis: true,
  },
  {
    prop: 'riskLevel',
    label: '风险等级',
    width: 120,
    render: 'IssueRiskTag',
  },
  {
    prop: 'status',
    label: '整改状态',
    width: 120,
    render: 'RectificationStatusTag',
  },
  {
    prop: 'deadline',
    label: '整改期限',
    width: 140,
    formatter: 'date',
  },
]
```

---

## 16. 表单框架设计

复杂表单不得直接使用裸 `el-form` 一页写到底。

### 16.1 表单组件

```text
CForm
CFormSection
CFormItem
CSearchForm
CFormActions
```

### 16.2 表单结构示例

```vue
<CForm :model="form" :rules="rules">
  <CFormSection title="基础信息">
    <CInput v-model="form.title" label="问题标题" required />
    <DictSelect v-model="form.category" dict-code="issue_category" label="问题类别" />
  </CFormSection>

  <CFormSection title="整改要求">
    <CTextarea v-model="form.requirement" label="整改要求" :maxlength="1000" />
  </CFormSection>

  <CFormActions>
    <CButton>保存草稿</CButton>
    <CButton type="primary">提交</CButton>
  </CFormActions>
</CForm>
```

表单长度、字段校验、默认 maxlength、草稿能力、离开提醒，都应由表单框架统一处理。

---

## 17. 字典体系

BladeX 类系统通常有系统字典，前端需要封装统一字典层。

```text
dict.ts store
├── loadDict(code)
├── getDictOptions(code)
├── getDictLabel(code, value)
├── refreshDict(code)
└── clearDictCache()
```

使用方式：

```vue
<DictSelect dict-code="issue_category" v-model="form.category" />
<DictTag dict-code="rectification_status" :value="row.status" />
```

禁止在页面硬编码：

```ts
const statusMap = {
  1: '待整改',
  2: '已完成'
}
```

---

## 18. 文件上传下载

巡视巡察系统对附件要求高，文件能力必须单独设计。

### 18.1 上传能力

- BladeX 文件接口路径；
- token header；
- Tenant-Id；
- 文件大小限制；
- 文件类型限制；
- 多文件；
- 秒传可选；
- 上传进度；
- 上传失败重试；
- 敏感材料水印；
- 文件分类；
- 文件版本；
- 删除确认。

### 18.2 下载示例

```ts
export async function downloadFile(url: string, params?: any, filename?: string) {
  const res = await request.get(url, {
    params,
    responseType: 'blob',
    skipTransform: true,
  })

  const blob = new Blob([res.data])
  const downloadUrl = window.URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = downloadUrl
  a.download = filename || getFilenameFromHeader(res.headers)
  a.click()

  window.URL.revokeObjectURL(downloadUrl)
}
```

必须处理：

- 后端返回 Blob；
- 后端返回 JSON 错误；
- 文件名从 header 获取；
- 权限不足提示；
- 导出耗时 loading；
- 重复点击防抖。

---

## 19. 布局系统

```text
layouts
├── BasicLayout.vue       # 标准后台
├── BlankLayout.vue       # 登录、错误页
├── DashboardLayout.vue   # 大屏驾驶舱
└── IframeLayout.vue      # 外部系统嵌入，可选
```

### 19.1 BasicLayout

```text
顶部品牌栏
左侧菜单
标签页
面包屑
内容区
全局设置抽屉
```

招商局巡视系统建议保留：

- 顶部品牌栏；
- 左侧导航；
- 面包屑；
- 多页签可选；
- 水印可选；
- 全局搜索可选；
- 通知中心。

---

## 20. 页面缓存策略

Vue `keep-alive` 不得全开。

| 页面 | 是否缓存 |
|---|---|
| 工作台 | 可以 |
| 查询列表 | 可以 |
| 台账列表 | 可以 |
| 新增表单 | 不建议 |
| 编辑表单 | 谨慎 |
| 详情页 | 可按需 |
| 报告编辑 | 单独草稿机制 |
| 数据驾驶舱 | 不建议长缓存 |

示例：

```ts
{
  path: '/issue/list',
  component: () => import('@/views/issue/list.vue'),
  meta: {
    title: '问题台账',
    keepAlive: true,
  },
}
```

---

## 21. 环境配置

```text
.env.development
.env.test
.env.staging
.env.production
```

示例：

```env
VITE_APP_TITLE=招商局巡视巡察系统
VITE_API_BASE_URL=/api
VITE_BLADEX_TENANT_ID=000000
VITE_BLADEX_CLIENT_ID=saber
VITE_BLADEX_CLIENT_SECRET=
VITE_ENABLE_MOCK=false
VITE_ENABLE_WATERMARK=true
VITE_ENABLE_DEVTOOLS=true
```

Vite 环境变量必须以 `VITE_` 开头才能暴露给客户端。不要把真正机密放入前端环境变量。

---

## 22. 构建与性能

### 22.1 性能要点

- 路由懒加载；
- ECharts 按需引入；
- Element Plus 按需引入；
- 图标按需引入；
- 大表格虚拟滚动；
- 附件预览懒加载；
- 大屏单独 chunk；
- 报告编辑器单独 chunk；
- gzip / brotli；
- CDN 静态资源策略；
- source map 生产关闭或上传平台。

### 22.2 产物治理

建议配置：

- bundle visualizer；
- chunk 命名策略；
- 大依赖预警；
- 构建时间统计；
- CI 构建缓存；
- 生产环境 console 清理。

---

## 23. 安全与审计

### 23.1 前端安全点

- XSS 防护；
- 路由权限校验；
- 按钮权限校验；
- 敏感字段脱敏；
- 页面水印；
- 附件预览水印；
- token 脱敏日志；
- 禁止生产环境 console；
- 导出前二次确认；
- 长时间无操作自动退出；
- 多标签页同步退出；
- 操作日志由后端记录，前端只辅助展示；
- 不在 localStorage 存高敏业务数据。

### 23.2 水印组件

```vue
<WatermarkContainer :content="`${user.name} ${user.deptName}`">
  <router-view />
</WatermarkContainer>
```

### 23.3 脱敏组件

```vue
<SensitiveText type="phone" :value="user.phone" />
<SensitiveText type="id-card" :value="person.idCard" />
```

---

## 24. 阶段路线图

### 24.1 第一阶段：工程底座

必须完成：

```text
Vue + Vite + TS
Element Plus
Pinia
Vue Router
Axios BladeX Request
动态路由
权限指令
主题 Token
基础布局
基础组件二次封装
```

### 24.2 第二阶段：业务底座

完成：

```text
字典组件
单位选择器
人员选择器
通用表格
通用查询表单
通用详情页
附件上传下载
操作日志抽屉
时间轴组件
状态标签组件
```

### 24.3 第三阶段：巡视巡察业务组件

完成：

```text
巡视阶段步骤条
问题风险标签
整改状态组件
整改倒计时
问题详情卡
整改督办卡
材料归档组件
报告编辑模块
数据驾驶舱组件
```

### 24.4 第四阶段：AI 辅助开发体系

完成：

```text
AGENTS.md
.agents/rules
.agents/specs
.agents/skills
.agents/wiki
.agents/codegraph
.agents/roles
.agents/workflows
AI Agent 工作流审查
```

---

## 25. AI 辅助开发体系设计

### 25.1 方案判断

本项目不应在以下两个方案中二选一：

```text
Rules + Spec + Skills
vs
OpenSpec + CodeGraph + LLM Wiki/OKF + Superpowers
```

推荐做法是：

```text
OpenSpec + CodeGraph + LLM Wiki/OKF + Superpowers
+
Rules + Skills + AI Agents
```

也就是：

```text
OpenSpec 管“该做什么”
CodeGraph 管“代码在哪里”
LLM Wiki/OKF 管“为什么这样做”
Superpowers/Skills 管“怎么做”
Rules 管“不能乱做”
AI Agent 负责“自动做并沉淀”
```

### 25.2 根目录入口

```text
AGENTS.md        # 面向 Codex、Claude、Cursor、Jules 等 Agent 的入口说明
.agents/         # 完整 AI 工程化上下文资产
```

---

## 26. AGENTS.md 设计

根目录 `AGENTS.md` 不宜过长，只做总入口和强制规则索引。

```md
# AGENTS.md

This repository uses `.agents/` as the shared context directory for AI coding agents.

Before making changes, read:

1. `.agents/rules/00-project-principles.md`
2. `.agents/rules/01-frontend-architecture.md`
3. `.agents/rules/03-bladex-request.md`
4. `.agents/rules/04-ui-design-system.md`
5. Relevant specs under `.agents/specs/`
6. Relevant workflow under `.agents/workflows/`

Core rules:

- Do not call axios directly in pages. Use `src/service/http/request`.
- Do not bypass BladeX adapter.
- Do not use raw Element Plus components in business pages when a wrapped component exists.
- Do not hardcode status colors. Use design tokens.
- Do not persist sensitive patrol data in localStorage.
- Update `.agents/wiki/` or ADR files after architectural changes.
```

---

## 27. `.agents` 目录设计

```text
.agents
├── rules
│   ├── 00-project-principles.md
│   ├── 01-frontend-architecture.md
│   ├── 02-vue-vite-typescript.md
│   ├── 03-bladex-request.md
│   ├── 04-ui-design-system.md
│   ├── 05-component-rules.md
│   ├── 06-state-management.md
│   ├── 07-local-data-security.md
│   ├── 08-code-style.md
│   └── 09-testing-quality.md
│
├── specs
│   ├── frontend-framework
│   │   ├── spec.md
│   │   ├── plan.md
│   │   ├── tasks.md
│   │   └── decisions.md
│   ├── bladex-request-adapter
│   │   ├── spec.md
│   │   ├── plan.md
│   │   ├── tasks.md
│   │   └── api-contract.md
│   ├── cmhk-ui-theme
│   │   ├── spec.md
│   │   ├── tokens.md
│   │   ├── components.md
│   │   └── figma-mapping.md
│   └── patrol-business-components
│       ├── spec.md
│       ├── plan.md
│       └── tasks.md
│
├── skills
│   ├── project-analysis
│   │   └── SKILL.md
│   ├── request-analysis
│   │   └── SKILL.md
│   ├── component-development
│   │   └── SKILL.md
│   ├── ui-token-generation
│   │   └── SKILL.md
│   ├── page-generation
│   │   └── SKILL.md
│   ├── code-review
│   │   └── SKILL.md
│   └── test-generation
│       └── SKILL.md
│
├── wiki
│   ├── index.md
│   ├── architecture
│   │   ├── frontend-framework.md
│   │   ├── bladex-integration.md
│   │   └── permission-model.md
│   ├── design-system
│   │   ├── cmhk-ui-guidelines.md
│   │   ├── color-tokens.md
│   │   └── component-patterns.md
│   ├── decisions
│   │   ├── ADR-001-use-vue-vite.md
│   │   ├── ADR-002-use-element-plus-wrapper.md
│   │   ├── ADR-003-bladex-request-adapter.md
│   │   └── ADR-004-local-data-security.md
│   └── how-to
│       ├── create-new-page.md
│       ├── create-new-api-module.md
│       ├── create-new-business-component.md
│       └── add-new-dict.md
│
├── roles
│   ├── architect.md
│   ├── frontend-engineer.md
│   ├── ui-system-engineer.md
│   ├── bladex-api-engineer.md
│   ├── reviewer.md
│   ├── tester.md
│   └── documenter.md
│
├── workflows
│   ├── 01-new-feature.md
│   ├── 02-bugfix.md
│   ├── 03-refactor.md
│   ├── 04-ui-component.md
│   ├── 05-api-integration.md
│   └── 06-release-review.md
│
└── codegraph
    ├── config.md
    ├── query-recipes.md
    └── snapshots
```

---

## 28. AI Agent 角色设计

### 28.1 Architect Agent

职责：

```text
分析需求
拆分模块
制定目录结构
判断是否需要新组件
判断是否影响 request / store / router / theme
输出 plan.md 和 tasks.md
```

输入：

```text
spec.md
现有代码结构
rules/*
wiki/architecture/*
```

输出：

```text
plan.md
tasks.md
ADR 决策
影响范围分析
```

### 28.2 BladeX API Agent

职责：

```text
读取 BladeX 接口文档
分析 token、tenant、headers
生成 api module
生成 request adapter
生成分页适配
处理文件上传下载
检查 CORS/header 风险
```

固定读取：

```text
.agents/rules/03-bladex-request.md
.agents/specs/bladex-request-adapter/api-contract.md
.agents/wiki/architecture/bladex-integration.md
```

### 28.3 UI System Agent

职责：

```text
读取招商局 UI 规范
维护 design tokens
生成 Element Plus override
生成二次封装组件
检查颜色、圆角、间距、字号是否违规
```

固定读取：

```text
.agents/rules/04-ui-design-system.md
.agents/wiki/design-system/*
.agents/specs/cmhk-ui-theme/*
```

### 28.4 Frontend Feature Agent

职责：

```text
根据 spec 和 plan 实现页面
生成 Vue SFC
接入 API
接入 store
接入路由
接入业务组件
```

固定流程：

```text
先读 spec
再查 CodeGraph
再写实现计划
再小步开发
再运行测试
再更新文档
```

### 28.5 Reviewer Agent

职责：

```text
检查是否违反 rules
检查是否裸用 el-input/el-table
检查是否绕过 request adapter
检查是否直接写死 BladeX code
检查是否本地存储敏感数据
检查是否缺少错误处理
检查是否缺少 loading/empty/error 状态
```

输出：

```text
review-report.md
必须修复项
建议优化项
风险项
```

### 28.6 Tester Agent

职责：

```text
生成 Vitest 测试
生成 Playwright 测试
检查 request adapter
检查权限路由
检查组件默认行为
检查表单校验
```

重点测试：

```text
CInput maxlength 默认 50
CTextarea maxlength 默认 500
request 自动带 Tenant-Id
token 过期刷新
分页适配
权限指令
字典加载
```

### 28.7 Documenter Agent

职责：

```text
把本次变更写入 wiki
更新 how-to
更新 ADR
更新组件使用说明
更新 API 约定
```

---

## 29. AI 工作流设计

### 29.1 总流程

```text
Spec → Plan → Tasks → Implement → Review → Test → Wiki
```

不得采用：

```text
一句话需求 → AI 直接写代码
```

### 29.2 新功能工作流

```text
1. 用户提出需求
2. Architect Agent 生成/更新 spec.md
3. OpenSpec 检查规范完整性
4. Architect Agent 生成 plan.md
5. Skills/Superpowers 执行任务拆分
6. Frontend Agent 小步实现
7. CodeGraph 检查影响范围
8. Reviewer Agent 审查
9. Tester Agent 生成/运行测试
10. Documenter Agent 写入 LLM Wiki/OKF
```

### 29.3 BladeX API 对接工作流

```text
1. 读取接口文档 / Swagger / 后端说明
2. 更新 .agents/specs/bladex-request-adapter/api-contract.md
3. BladeX API Agent 判断 header、token、tenant、响应结构
4. 生成 service/modules API
5. 编写类型定义
6. 编写分页/响应适配
7. 编写测试
8. 更新 wiki/architecture/bladex-integration.md
```

### 29.4 UI 组件工作流

```text
1. UI System Agent 读取 UI 规范和 Design Token
2. 确认组件适用场景
3. 生成组件 Props / Emits / Slots
4. 生成样式和 Token 引用
5. 生成示例
6. 生成测试
7. 更新组件文档
```

---

## 30. Rules 强约束

首批强规则：

```text
1. 页面禁止直接使用 axios，必须使用 src/service/http/request。
2. 页面禁止直接拼 BladeX 响应结构，必须使用 adapter。
3. 页面禁止直接裸用 el-input、el-textarea，必须优先使用 CInput、CTextarea。
4. 页面禁止写死状态色，必须使用 token。
5. 页面禁止长期 localStorage 存敏感业务数据。
6. 所有业务状态必须走字典或统一枚举。
7. 所有新增页面必须有 loading、empty、error 状态。
8. 所有新增 API 必须有类型定义。
9. 所有复杂组件必须有示例和文档。
10. 所有架构级变更必须更新 wiki 或 ADR。
```

---

## 31. 质量与测试标准

### 31.1 单元测试

必须覆盖：

- `transformBladeXResponse`
- `normalizePage`
- token refresh queue
- permission directive
- `CInput` 默认 maxlength
- `CTextarea` 默认 maxlength
- dict store
- sensitive text

### 31.2 E2E 测试

核心路径：

- 登录
- 动态菜单加载
- 进入工作台
- 查看问题台账
- 新增/编辑整改事项
- 上传附件
- 导出文件
- 权限按钮隐藏
- token 过期刷新

### 31.3 AI Review Gate

每次 AI Agent 生成代码后，必须检查：

- 是否违反 Rules；
- 是否有未处理异常；
- 是否直接裸用 Element Plus；
- 是否绕过 request adapter；
- 是否硬编码状态色；
- 是否本地持久化敏感数据；
- 是否补齐测试和文档。

---

## 32. 验收清单

### 32.1 工程验收

- [ ] Vite + Vue + TypeScript 工程初始化完成
- [ ] Node 版本锁定
- [ ] pnpm lock 文件提交
- [ ] ESLint / Prettier / Stylelint 配置完成
- [ ] Husky / lint-staged 配置完成
- [ ] 环境变量分层完成
- [ ] 路由懒加载完成

### 32.2 BladeX 验收

- [ ] 登录接口可用
- [ ] refresh token 可用
- [ ] Tenant-Id 自动注入
- [ ] Blade-Auth 自动注入
- [ ] Basic Auth 登录头可配置
- [ ] 响应结构统一适配
- [ ] 分页结构统一适配
- [ ] 文件上传下载可用
- [ ] CORS Header 已与后端确认
- [ ] token 过期并发刷新不重复

### 32.3 UI 主题验收

- [ ] 招商局 Design Token 建立
- [ ] Element Plus 变量覆盖完成
- [ ] 主题切换机制完成
- [ ] 状态色统一
- [ ] 图表色统一
- [ ] 禁止硬编码颜色

### 32.4 组件验收

- [ ] CInput 完成
- [ ] CTextarea 完成
- [ ] CButton 完成
- [ ] CTable 完成
- [ ] CForm 完成
- [ ] CDialog / CDrawer 完成
- [ ] DictSelect / DictTag 完成
- [ ] Upload / Download 完成
- [ ] Watermark / SensitiveText 完成

### 32.5 AI 辅助开发验收

- [ ] 根目录存在 AGENTS.md
- [ ] `.agents/rules` 完成
- [ ] `.agents/specs` 完成首批 spec
- [ ] `.agents/skills` 完成首批 SKILL.md
- [ ] `.agents/wiki` 完成架构知识库
- [ ] `.agents/roles` 完成 Agent 角色说明
- [ ] `.agents/workflows` 完成标准工作流
- [ ] CodeGraph 配置完成
- [ ] AI Review 流程可执行

---

## 33. 参考依据

本设计文档采用行业通用前端工程设计方法，并结合以下官方或高可信资料中的稳定事实：

- Vite 8 官方发布说明：Vite 8 要求 Node.js `20.19+` 或 `22.12+`，并使用 Rolldown 作为统一 Rust bundler。
- Vue Router 官方文档：导航守卫用于重定向或取消导航，适合权限路由和登录态校验。
- Pinia 官方文档：Pinia 是 Vue 状态库，支持类型推导、Devtools、插件扩展和模块化 Store。
- Element Plus 官方文档：Element Plus 支持通过样式变量和主题机制进行组件主题定制。
- Codex 官方文档：Codex 会在开始任务前读取 `AGENTS.md`，用于加载项目级指令和上下文。
- AGENTS.md 开放格式说明：AGENTS.md 可被视为面向 coding agents 的 README。
- OpenSpec 官方说明：OpenSpec 是面向 coding agents 和 CLI 的轻量 Spec-driven framework。
- Superpowers 官方仓库说明：Superpowers 是基于 composable skills 的 agentic software development methodology。

---

## 34. 最终结论

本项目最终应建设为：

```text
招商局 UI Theme
        ↓
CMHK Design Token
        ↓
Element Plus 二次封装
        ↓
BladeX Request Adapter
        ↓
动态路由 / 权限 / 字典 / 文件
        ↓
巡视巡察业务组件
        ↓
具体业务页面
        ↓
AGENTS.md + .agents AI 辅助开发体系
```

最重要的设计判断是：

```text
前端底座不是 Vue Admin。
BladeX 不能散落在页面。
Element Plus 不能裸用到底。
招商局 UI 规范必须 Token 化。
状态管理必须分层。
本地数据必须有安全边界。
AI Agent 不能无规则直接写代码。
Spec、Rules、Skills、Wiki、CodeGraph 必须成为项目资产。
```

这套设计落地后，后续新增“巡视任务、问题线索、整改督办、材料档案、巡视报告、数据驾驶舱”等模块时，将从“重复写页面”升级为“基于底座和组件体系快速组装”，并且能够通过 AI Agent 持续辅助开发、审查、测试和知识沉淀。
