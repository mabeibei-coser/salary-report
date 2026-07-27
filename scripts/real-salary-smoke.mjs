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
const apiKey = process.env.BANANAROUTER_API_KEY?.trim();
assert.ok(apiKey, "BANANAROUTER_API_KEY missing");
const sessionPassword = "d33-real-ata-session-password-at-least-32-characters";
const phone = "13800000000";
const query = {
  position: "薪酬专员",
  company: "民营企业",
  rank: "P4",
  education: "本科",
  city: "上海",
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
  throw new Error("A500 did not start");
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

function validateReport(report) {
  assert.equal(report.invalid, undefined);
  assert.equal(report.rank, "P4");
  assert.equal(typeof report.rankLabel, "string");
  assert.ok(Array.isArray(report.rankLadder) && report.rankLadder.length === 14);
  for (const group of ["monthly", "annual", "bonusMonths", "equity", "housingFund", "hourlyRate"]) {
    for (const percentile of ["p25", "p50", "p75"]) {
      assert.ok(Number.isFinite(report[group]?.[percentile]), `${group}.${percentile} invalid`);
    }
  }
  assert.ok(Array.isArray(report.salaryTrend) && report.salaryTrend.length === 5);
  assert.equal(report.industryAnalysis?.length, 25, "industryAnalysis count invalid");
  assert.equal(report.cityAnalysis?.length, 6, "cityAnalysis count invalid");
  assert.equal(typeof report.highEarnerTraits, "string");
  assert.ok(report.highEarnerTraits.length > 100);
  assert.equal(report.positionProfile?.coreResponsibilities?.length, 5, "coreResponsibilities count invalid");
  assert.equal(report.positionProfile?.coreCompetencies?.length, 5, "coreCompetencies count invalid");
  assert.equal(report.positionProfile?.coreKpis?.length, 5, "coreKpis count invalid");
  assert.equal(report.positionProfile?.okrDesign?.length, 2, "okrDesign count invalid");
  assert.equal(report.positionProfile?.innovationAchievements?.length, 4, "innovationAchievements count invalid");
  assert.ok(report.positionProfile?.jobPerspective?.distinctivePosition, "distinctivePosition missing");
  assert.ok(report.positionProfile?.jobPerspective?.uniqueInsight, "uniqueInsight missing");
  assert.ok(report.positionProfile?.jobPerspective?.futureOutlook, "futureOutlook missing");
  assert.deepEqual(report.positionProfile?.analysisBasis, {
    position: query.position,
    company: query.company,
    rank: query.rank,
  }, "positionProfile analysisBasis invalid");
  assert.equal(report.positionProfile?.candidateTrend?.trends?.length, 3, "candidateTrend trends invalid");
  const trendCategories = report.positionProfile.candidateTrend.trends.map((item) => item.category);
  assert.equal(new Set(trendCategories).size, 3, "candidateTrend categories must be unique");
  assert.notDeepEqual(
    trendCategories,
    ["数量与层次", "技能与证据", "来源与流动"],
    "candidateTrend categories must be generated for this query",
  );
  const trendText = report.positionProfile.candidateTrend.trends
    .map((item) => `${item.title} ${item.supplyAnalysis}`)
    .join(" ");
  assert.doesNotMatch(trendText, /需求|招聘|用人|雇主|岗位空缺|职位空缺|更受青睐|用工缺口|偏好/);
  assert.equal("years" in report.positionProfile.candidateTrend, false, "candidateTrend must not split by year");
  assert.equal(
    report.annual.p50,
    Math.round((report.monthly.p50 * (12 + report.bonusMonths.p50)) / 100) * 100,
  );
}

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "a500-d33-"));
  const dbPath = path.join(tempDir, "salary-real-test.db");
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
  centerApp.get("/api/membership/me", (_req, res) => res.json({ phone, isVip: true }));
  const center = http.createServer(centerApp);
  const logs = { stdout: "", stderr: "" };
  let child;
  try {
    const [centerPort, appPort] = await Promise.all([listen(center), reservePort()]);
    child = spawn(process.execPath, ["server.js"], {
      cwd: projectRoot,
      env: {
        ...process.env,
        NODE_ENV: "test",
        PORT: String(appPort),
        SALARY_DB_PATH: dbPath,
        BANANAROUTER_BASE_URL:
          process.env.BANANAROUTER_BASE_URL || "https://api.bananarouter.com",
        BANANAROUTER_MODEL: process.env.BANANAROUTER_MODEL || "gemini-3.1-flash-lite",
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

    const login = await fetch(`http://127.0.0.1:${centerPort}/test-login`);
    const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
    assert.ok(cookie?.startsWith("ata_member_session="));

    const startedAt = Date.now();
    const response = await fetch(`${appBase}/api/queries`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify(query),
      signal: AbortSignal.timeout(210_000),
    });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.ok, true);
    assert.equal(result.cached, undefined);
    validateReport(result.report);

    const db = new Database(dbPath, { readonly: true });
    const row = db.prepare("SELECT user_phone, report_json FROM reports WHERE id = ?").get(result.reportId);
    db.close();
    assert.equal(row.user_phone, phone);
    validateReport(JSON.parse(row.report_json));

    const combinedLogs = `${logs.stdout}\n${logs.stderr}`;
    for (const forbidden of [apiKey, query.position, query.company, "Authorization"]) {
      assert.equal(combinedLogs.includes(forbidden), false);
    }
    console.log(
      JSON.stringify({
        ok: true,
        elapsedMs: Date.now() - startedAt,
        serverDurationMs: result.durationMs,
        rankLadder: result.report.rankLadder.length,
        salaryTrend: result.report.salaryTrend.length,
        industries: result.report.industryAnalysis.length,
        cities: result.report.cityAnalysis.length,
        positionProfile: true,
        persistedReports: 1,
        logLeakMatches: 0,
      }),
    );
  } finally {
    if (child) await stopChild(child);
    await close(center);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
