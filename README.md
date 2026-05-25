# salary-report（2026岗位薪资查询平台）

填岗位 / 企业性质 / 职级 / 学历 / 城市 5 项，AI 出一份结构化薪酬报告（月薪/年薪/年终奖/股权/公积金/市场对标/城市对比/高薪人群画像）。

**业务方**：永升服务 HR；**接管自**：hezw02/salary-report001（老公的仓库）。

## 技术栈

- Vite 5 + React 18 + MUI + Tailwind（纯前端单页）
- AI：通过 vite proxy → 讯飞 maas-coding-api（`astron-code-latest`）

## 本地跑

```bash
npm install
cp .env.local.example .env.local   # 填讯飞 API key
npm run dev                          # http://localhost:3000
```

`.env.local` 里需要两个变量（变量名沿用源仓库命名，实际指向讯飞）：

```
VITE_GLM_API_KEY=<讯飞 maas-coding API key>
VITE_GLM_MODEL=astron-code-latest
```

## 主要文件

- `src/App.jsx` —— 顶层壳：表单、loading、错误重试、报告展示
- `src/components/SearchForm.jsx` —— 5 项参数表单
- `src/components/SalaryReport.jsx` —— 报告聚合渲染
- `src/services/api.js` —— 讯飞调用 + JSON 校验/兜底
- `src/data/salaryDatabase.js` —— 表单选项（岗位/企业/职级/学历/城市）
- `vite.config.js` —— 端口 3000、`/api/chat` 代理到讯飞 endpoint

## 已知遗留

- `.env.local` 变量名是 `VITE_GLM_*`，但实际跑的是讯飞 astron-code，是源仓库的命名错误。本地暂不改，避免和上游冲突；后续若稳定接管可改为 `VITE_IFLYTEK_*` 与其它项目对齐。
- `src/data/salaryDatabase.js` 仍保留 mock 计算函数（`generateSalaryData` 等），新版 API 路径未使用，目前未删（属于源仓库残留）。
