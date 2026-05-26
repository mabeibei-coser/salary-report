# salary-report 数据契约

这里放 salary-report 项目「对外发布」的报告 JSON 字段定义。

## 谁在用

- `D:\_workspace\01_项目-Coding\admin-hub` 通过 `npm run sync-salary` 拉取这里的 `salary-report.ts`，覆盖到自己的 `lib/types-salary.ts`

## 改字段的流程

1. 改 `server.js` 的 `validateAndNormalize()`（运行时实现）
2. 同步更新本目录的 `salary-report.ts`（类型定义）
3. 通知 admin-hub 运行 `npm run sync-salary` + 重新部署
4. 两个项目都跑通了才算改完

## 为什么搞这个

之前 admin-hub 接入 salary 业务时手抄 type，抄错了一个字段名（`marketRanking` 实际不存在，真名 `salaryTrend`），结果 admin 后台点开任何薪酬报告都崩。这份契约文件就是为了下次别再发生。

详见 [2026-05-26 部署事故复盘](../../../admin-hub/.planning/postmortems/) 或 commit `538fd70`。
