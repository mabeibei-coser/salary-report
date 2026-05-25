# salary-report（2026岗位薪资查询平台）

填岗位 / 企业性质 / 职级 / 学历 / 城市 5 项，AI 出一份结构化薪酬报告（月薪/年薪/年终奖/股权/公积金/市场对标/城市对比/高薪人群画像）。

**业务方**：永升服务 HR；**接管自**：hezw02/salary-report001（老公的仓库）。

## 技术栈

- 前端：Vite 5 + React 18 + MUI + Tailwind（单页）
- 后端：Node + Express + iron-session + better-sqlite3（`server.js`）
- AI：服务端调讯飞 `astron-code-latest`（key 在 server 进程，浏览器 bundle 不含）

## 本地跑

```bash
npm install
cp .env.local.example .env.local   # 填讯飞 API key + 生成 session 密钥
npm run dev                        # 同时启 vite(:3000) + express(:4001)
```

> 第一次开服务会自动建 `data/salary-report.db`。

`.env.local` 关键变量：

```
IFLYTEK_API_KEY=<讯飞 maas-coding API key>
IFLYTEK_MODEL=astron-code-latest
SALARY_SESSION_PASSWORD=<≥32 字符 base64>
PORT=4001
SALARY_COOKIE_SECURE=false
```

生成 session 密钥：

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

## 用户流程

1. 打开 `/` 看到登录卡（手机号 + 登录按钮，V1 无验证码）
2. 输入 11 位手机号 → POST `/api/login` → 写 cookie + users 表 upsert
3. 填查询表单 → POST `/api/queries` →
   - 服务端调讯飞 → JSON 校验 → 写 reports 表 → 返回报告
4. 浏览器渲染 `SalaryReport`

## 主要文件

| 类型 | 路径 | 作用 |
|---|---|---|
| 后端 | `server.js` | Express 入口：login / logout / me / queries |
| 后端 | `lib/db.js` | better-sqlite3 setup + schema + 写库 helper |
| 后端 | `lib/session.js` | iron-session 配置 |
| 前端 | `src/App.jsx` | 顶层壳：登录 gate → 表单 → loading → 报告 |
| 前端 | `src/components/LoginForm.jsx` | 手机号登录卡 |
| 前端 | `src/components/SearchForm.jsx` | 5 项参数表单 |
| 前端 | `src/components/SalaryReport.jsx` | 报告聚合渲染 |
| 前端 | `src/services/api.js` | 浏览器 → /api/* 的 fetch 包装 |
| 前端 | `src/data/salaryDatabase.js` | 表单选项常量（岗位/企业/职级/学历/城市）|
| 配置 | `vite.config.js` | dev `/api/*` 反代到 :4001 |

## 数据库 schema（SQLite）

- `users(id, phone UNIQUE, created_at, last_login_at)`
- `reports(id, user_id, user_phone, created_at, position, company, rank, rank_label, education, city, report_json, duration_ms, ip, user_agent)`

> `data/salary-report.db` 不入 git（已在 `.gitignore`）。
> admin-hub 通过 `SALARY_DB_PATH` env + `ATTACH DATABASE` 只读访问。

## 与 admin-hub 的关系

admin-hub 在「报告管理 → 薪酬查询」入口下展示所有查询记录与详情。约束：

- admin-hub 对 salary 库 **只读**
- salary-report 项目持有 schema 所有权
- 跨项目联调时，admin-hub `.env.local` 配 `SALARY_DB_PATH=<本机绝对路径>`

## 已知遗留

- `.env.local` 兼容字段 `VITE_GLM_*` 暂保留，老 build 还在引用。新版 server.js 优先读
  `IFLYTEK_API_KEY`，fallback `VITE_GLM_API_KEY`。下次清理时可一起删除。
- `src/data/salaryDatabase.js` 仍保留源仓库的 mock 计算函数（`generateSalaryData` 等），
  新版 API 路径未使用，未删（属于源仓库残留）。
- `src/utils/salaryCalculator.js` 的 `formatSalary` 等格式化函数仍被组件使用，保留。

## 部署

V1 改造尚未部署到 `h100.jsai100.com/a500/`。当前线上仍是旧的纯前端 build。
下次部署需要：
1. server.js 在生产用 `npm run start`（pm2 接管）
2. nginx 把 `/a500/api/*` 反代到 Express :4001
3. `dist/` 由 Express 的 `express.static` 托管（`NODE_ENV=production` 自动启用）
4. 生产 `.env` 配 `SALARY_COOKIE_SECURE=true` + `SALARY_COOKIE_PATH=/a500`
