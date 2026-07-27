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
const oldIflytekCanary = "d32-old-iflytek-must-not-be-read";
const oldViteCanary = "d32-old-vite-must-not-be-read";
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
        IFLYTEK_API_KEY: oldIflytekCanary,
        VITE_GLM_API_KEY: oldViteCanary,
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
    await waitForServer(`${appBase}/api/me`, child, logs);
    const noSession = await fetch(`${appBase}/api/queries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fixedQuery),
    });
    assert.equal(noSession.status, 401);
    assert.equal(providerRequests.length, 0);

    const login = await fetch(`http://127.0.0.1:${centerPort}/test-login`);
    const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
    assert.ok(cookie?.startsWith("ata_member_session="));
    const me = await fetch(`${appBase}/api/me`, { headers: { cookie } });
    assert.equal(me.status, 200);
    assert.equal((await me.json()).phone, phone);
    const vip = await fetch(`${appBase}/api/vip/status`, { headers: { cookie } });
    assert.equal(vip.status, 200);
    assert.equal((await vip.json()).isVip, true);

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
    assert.equal(providerRequests.length, 2);
    for (const request of providerRequests) {
      assert.equal(request.url, "/v1beta/models/gemini-json-test:generateContent");
      assert.equal(request.headers.authorization, `Bearer ${localKey}`);
      assert.notEqual(request.headers.authorization, `Bearer ${oldIflytekCanary}`);
      assert.notEqual(request.headers.authorization, `Bearer ${oldViteCanary}`);
      assert.match(request.body.systemInstruction.parts[0].text, /薪酬数据分析专家/);
      assert.match(request.body.contents[0].parts[0].text, /岗位名称：薪酬专员/);
    }

    const history = await fetch(`${appBase}/api/me/history/salary/${firstResult.reportId}`, {
      headers: { cookie },
    });
    assert.equal(history.status, 200);
    const historyResult = await history.json();
    assert.equal(historyResult.report.annual.p50, 280000);
    assert.equal(historyResult.position, fixedQuery.position);

    const cached = await fetch(`${appBase}/api/queries`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify(fixedQuery),
    });
    assert.equal(cached.status, 200);
    const cachedResult = await cached.json();
    assert.equal(cachedResult.cached, true);
    assert.equal(cachedResult.durationMs, 0);
    assert.notEqual(cachedResult.reportId, firstResult.reportId);
    assert.equal(providerRequests.length, 2);

    providerMode = "http-error";
    const failedQuery = { ...fixedQuery, position: "薪酬福利经理" };
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
      oldIflytekCanary,
      oldViteCanary,
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
    for (const forbidden of [localKey, oldIflytekCanary, oldViteCanary, fixedQuery.position]) {
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
