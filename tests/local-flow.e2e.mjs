import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import express from "express";
import { getIronSession } from "iron-session";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localKey = "d32-local-banana-placeholder";
const oldIflytek = "old-iflytek";
const oldVite = "old-vite";
const sessionPassword = "d32-local-ata-session-password-at-least-32-characters";
const phone = "13800000000";
const fixedQuery = {
  position: "薪酬专员",
  company: "民营企业",
  rank: "P4",
  education: "本科",
  city: "上海",
};

const validReport = {
  ...fixedQuery,
  rankLabel: "P4(高级专员/技术员)",
  rankCategory: "tech",
  rankLadder: [
    ...Array.from({ length: 9 }, (_, index) => ({ rank: `P${index + 1}`, monthly: 8000 + index * 3000 })),
    ...Array.from({ length: 5 }, (_, index) => ({ rank: `M${index + 1}`, monthly: 19000 + index * 5000 })),
  ],
  monthly: { p25: 16000, p50: 20000, p75: 25000 },
  annual: { p25: 1, p50: 1, p75: 1 },
  bonusMonths: { p25: 1, p50: 2, p75: 3 },
  equity: { p25: 0, p50: 0, p75: 10000 },
  housingFund: { p25: 1600, p50: 2000, p75: 2500 },
  hourlyRate: { p25: 92, p50: 115, p75: 144 },
  marketComparison: { marketAvgMonthly: 19000, diffPct: 5 },
  salaryTrend: [2022, 2023, 2024, 2025, 2026].map((year, index) => ({
    year,
    monthly: 17000 + index * 750,
  })),
  industryAnalysis: Array.from({ length: 25 }, (_, index) => ({
      industry: "物业服务",
      description: `固定测试行业${index + 1}`,
      monthlyRange: "16000-25000",
      annualRange: "208000-375000",
      demandLevel: "中",
      salaryIncrease: "3.2%",
    })),
  cityAnalysis: ["上海", "北京", "深圳", "广州", "杭州", "成都"].map((city, index) => ({
    city,
    monthlyAvg: 20000 - index * 500,
    costIndex: 98 - index * 4,
    salaryLevel: index < 3 ? "高" : "中",
    advantage: "固定测试城市优势",
  })),
  highEarnerTraits: "① 数据口径：用年度调薪结果证明贡献\n② 项目复盘：展示薪酬项目结果\n③ 市场对标：准备行业分位数据\n④ 合规能力：说明政策落地经验\n⑤ 系统能力：展示数字化成果\n⑥ 谈薪策略：整体打包薪酬结构\n⑦ 稀缺经验：突出复杂项目经历\n⑧ 结果承诺：明确入职后目标",
  positionProfile: {
    analysisBasis: {
      position: fixedQuery.position,
      company: fixedQuery.company,
      rank: fixedQuery.rank,
    },
    jobPerspective: {
      distinctivePosition: "薪酬专员的价值不是按时算薪，而是把薪酬资源精准导向业务贡献并守住合规底线。",
      uniqueInsight: "高质量人选的分水岭不是熟悉制度条款，而是能从异常数据反推出机制问题并推动闭环。",
      futureOutlook: "未来将从报表执行者转向人机协同的薪酬运营者，用模型预警成本、公平性和人才风险。",
    },
    coreResponsibilities: Array.from({ length: 5 }, (_, index) => `薪酬核心职责 ${index + 1}`),
    coreCompetencies: Array.from({ length: 5 }, (_, index) => ({
      name: `核心能力 ${index + 1}`,
      description: `薪酬岗位能力表现 ${index + 1}`,
    })),
    coreKpis: Array.from({ length: 5 }, (_, index) => ({
      name: `核心 KPI ${index + 1}`,
      metric: `衡量口径 ${index + 1}`,
      target: `建议目标 ${index + 1}`,
    })),
    okrDesign: Array.from({ length: 2 }, (_, index) => ({
      objective: `薪酬目标 ${index + 1}`,
      keyResults: Array.from({ length: 3 }, (_, krIndex) => `关键结果 ${index + 1}-${krIndex + 1}`),
    })),
    innovationAchievements: Array.from({ length: 4 }, (_, index) => ({
      title: `创新方向 ${index + 1}`,
      evidence: `创新业绩证据 ${index + 1}`,
    })),
    candidateTrend: {
      trends: [
        { category: "复杂薪酬闭环", title: "高级实操供给偏少", supplyAnalysis: "民营体系中能以P4深度独立处理薪酬核算、异常追溯和机制闭环的候选人仍然有限。" },
        { category: "民营机制经验", title: "多口径人才更稀缺", supplyAnalysis: "薪酬专员人才供给中，兼具市场化激励、成本约束和快速规则调整经历的成熟人选分化明显。" },
        { category: "系统转型人选", title: "数字化背景正扩展", supplyAnalysis: "具备P4复杂度的人选来源正从传统薪酬执行扩展到人力系统和数据分析背景，复合路径更加多元。" },
      ],
    },
  },
};

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  if (!server.listening) return Promise.resolve();
  return new Promise((resolve) => server.close(resolve));
}

async function reservePort() {
  const server = http.createServer();
  const port = await listen(server);
  await close(server);
  return port;
}

async function waitForServer(url, child, logs) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode != null) throw new Error(`A500 exited early: ${logs.stderr}`);
    try {
      const response = await fetch(url);
      if (response.status === 401) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`A500 did not start: ${logs.stderr}`);
}

async function stopChild(child) {
  if (child.exitCode != null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill();
  await Promise.race([
    exited,
    new Promise((_, reject) => setTimeout(() => reject(new Error("A500 child did not stop")), 5_000)),
  ]);
}

function sessionOptions() {
  return {
    password: sessionPassword,
    cookieName: "ata_member_session",
    cookieOptions: { secure: false, httpOnly: true, sameSite: "lax", path: "/", maxAge: 3600 },
  };
}

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "a500-d32-"));
  const dbPath = path.join(tempDir, "salary-test.db");
  const providerRequests = [];
  let providerMode = "bad-then-valid";

  const provider = http.createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    providerRequests.push({ url: req.url, headers: req.headers, body: JSON.parse(raw) });
    if (providerMode === "http-error") {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "local provider failure" }));
    }
    const text = providerRequests.length === 1 ? "not-json" : JSON.stringify(validReport);
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }));
  });

  const centerApp = express();
  centerApp.get("/test-login", async (req, res, next) => {
    try {
      const session = await getIronSession(req, res, sessionOptions());
      session.phone = phone;
      await session.save();
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });
  centerApp.get("/api/membership/me", async (req, res, next) => {
    try {
      const session = await getIronSession(req, res, sessionOptions());
      if (!session.phone) return res.status(401).json({ error: "not logged in" });
      return res.json({ phone: session.phone, isVip: true });
    } catch (error) {
      return next(error);
    }
  });
  const center = http.createServer(centerApp);

  let child;
  let phase = "启动本地服务";
  const logs = { stdout: "", stderr: "" };
  try {
    const [providerPort, centerPort, appPort] = await Promise.all([
      listen(provider),
      listen(center),
      reservePort(),
    ]);
    child = spawn(process.execPath, ["server.js"], {
      cwd: projectRoot,
      env: {
        ...process.env,
        NODE_ENV: "test",
        PORT: String(appPort),
        SALARY_DB_PATH: dbPath,
        BANANAROUTER_API_KEY: localKey,
        BANANAROUTER_BASE_URL: `http://127.0.0.1:${providerPort}`,
        BANANAROUTER_MODEL: "gemini-json-test",
        IFLYTEK_API_KEY: oldIflytek,
        VITE_GLM_API_KEY: oldVite,
        BACKUP_API_URL: "",
        BACKUP_API_KEY: "",
        BACKUP_MODEL: "",
        ATA_MEMBER_SESSION_PASSWORD: sessionPassword,
        ATA_COOKIE_SECURE: "false",
        ATA_COOKIE_PATH: "/",
        ATA_CENTER_BASE_URL: `http://127.0.0.1:${centerPort}`,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk) => (logs.stdout += chunk));
    child.stderr.on("data", (chunk) => (logs.stderr += chunk));

    const appBase = `http://127.0.0.1:${appPort}`;
    phase = "等待 A500 就绪";
    await waitForServer(`${appBase}/api/me`, child, logs);
    phase = "验证未登录拦截";
    const noSession = await fetch(`${appBase}/api/queries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fixedQuery),
    });
    assert.equal(noSession.status, 401);
    assert.equal(providerRequests.length, 0);

    phase = "模拟会员中心登录";
    const login = await fetch(`http://127.0.0.1:${centerPort}/test-login`);
    const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
    assert.ok(cookie?.startsWith("ata_member_session="));
    const me = await fetch(`${appBase}/api/me`, { headers: { cookie } });
    assert.equal(me.status, 200);
    assert.equal((await me.json()).phone, phone);
    const vip = await fetch(`${appBase}/api/vip/status`, { headers: { cookie } });
    assert.equal(vip.status, 200);
    assert.equal((await vip.json()).isVip, true);

    phase = "首次生成完整报告";
    const first = await fetch(`${appBase}/api/queries`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify(fixedQuery),
    });
    assert.equal(first.status, 200);
    const firstResult = await first.json();
    assert.equal(firstResult.ok, true);
    assert.equal(firstResult.cached, undefined);
    assert.equal(firstResult.report.monthly.p50, 20000);
    assert.equal(firstResult.report.annual.p50, 280000);
    assert.equal(firstResult.report.rankLabel, "P4(高级专员/技术员)");
    assert.equal(firstResult.report.positionProfile.coreResponsibilities.length, 5);
    assert.equal(firstResult.report.positionProfile.candidateTrend.trends.length, 3);
    assert.deepEqual(
      firstResult.report.positionProfile.candidateTrend.trends.map((item) => item.category),
      ["复杂薪酬闭环", "民营机制经验", "系统转型人选"],
    );
    assert.deepEqual(firstResult.report.positionProfile.analysisBasis, {
      position: fixedQuery.position,
      company: fixedQuery.company,
      rank: fixedQuery.rank,
    });
    assert.equal(firstResult.report.positionProfile.jobPerspective.uniqueInsight.length > 0, true);
    assert.equal(providerRequests.length, 2);
    for (const request of providerRequests) {
      assert.equal(request.url, "/v1beta/models/gemini-json-test:generateContent");
      assert.equal(request.headers.authorization, `Bearer ${localKey}`);
      assert.notEqual(request.headers.authorization, `Bearer ${oldIflytek}`);
      assert.notEqual(request.headers.authorization, `Bearer ${oldVite}`);
      assert.match(request.body.systemInstruction.parts[0].text, /薪酬数据分析专家/);
      assert.match(request.body.systemInstruction.parts[0].text, /岗位名称 \+ 企业性质 \+ 职级/);
      assert.match(request.body.systemInstruction.parts[0].text, /不得预设固定内容/);
      assert.doesNotMatch(request.body.systemInstruction.parts[0].text, /category 必须按顺序逐字使用/);
      assert.match(request.body.contents[0].parts[0].text, /岗位名称：薪酬专员/);
      assert.match(request.body.contents[0].parts[0].text, /不得套固定三分类/);
    }

    phase = "读取历史报告";
    const history = await fetch(`${appBase}/api/me/history/salary/${firstResult.reportId}`, {
      headers: { cookie },
    });
    assert.equal(history.status, 200);
    const historyResult = await history.json();
    assert.equal(historyResult.report.annual.p50, 280000);
    assert.equal(historyResult.position, fixedQuery.position);

    phase = "验证新版报告缓存";
    const cached = await fetch(`${appBase}/api/queries`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify(fixedQuery),
    });
    assert.equal(cached.status, 200);
    const cachedResult = await cached.json();
    assert.equal(cachedResult.cached, true);
    assert.equal(cachedResult.durationMs, 0);
    assert.equal(cachedResult.report.positionProfile.okrDesign.length, 2);
    assert.notEqual(cachedResult.reportId, firstResult.reportId);
    assert.equal(providerRequests.length, 2);

    providerMode = "http-error";
    const failedQuery = { ...fixedQuery, position: "薪酬福利经理" };
    phase = "验证上游失败处理";
    const failed = await fetch(`${appBase}/api/queries`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify(failedQuery),
    });
    assert.equal(failed.status, 504);
    assert.equal(providerRequests.length, 3);

    const db = new Database(dbPath, { readonly: true });
    const reportRows = db.prepare("SELECT * FROM reports ORDER BY id").all();
    const userRows = db.prepare("SELECT * FROM users").all();
    db.close();
    assert.equal(reportRows.length, 2);
    assert.equal(userRows.length, 1);
    assert.equal(JSON.parse(reportRows[0].report_json).annual.p50, 280000);

    await new Promise((resolve) => setTimeout(resolve, 100));
    const combinedLogs = `${logs.stdout}\n${logs.stderr}`;
    for (const forbidden of [
      localKey,
      oldIflytek,
      oldVite,
      fixedQuery.position,
      validReport.highEarnerTraits,
      "Authorization",
    ]) {
      assert.equal(combinedLogs.includes(forbidden), false);
    }
    assert.match(combinedLogs, /invalid_json/);
    assert.match(combinedLogs, /provider_error/);

    const distText = fs
      .readdirSync(path.join(projectRoot, "dist", "assets"))
      .map((name) => fs.readFileSync(path.join(projectRoot, "dist", "assets", name), "utf8"))
      .join("\n");
    for (const forbidden of [localKey, oldIflytek, oldVite, fixedQuery.position]) {
      assert.equal(distText.includes(forbidden), false);
    }

    console.log(
      JSON.stringify({
        ok: true,
        primaryCalls: providerRequests.length,
        badJsonRetries: 1,
        cacheProviderCalls: 0,
        backupEnabled: false,
        reports: reportRows.length,
        users: userRows.length,
        history: true,
        vip: true,
        logLeakMatches: 0,
        distLeakMatches: 0,
      }),
    );
  } catch (error) {
    console.error(`[local-flow] 失败阶段：${phase}`);
    console.error(`[local-flow] A500 exit=${child?.exitCode ?? "running"}`);
    if (logs.stdout) console.error(`[local-flow] stdout:\n${logs.stdout}`);
    if (logs.stderr) console.error(`[local-flow] stderr:\n${logs.stderr}`);
    throw error;
  } finally {
    if (child) await stopChild(child);
    await Promise.all([close(provider), close(center)]);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
