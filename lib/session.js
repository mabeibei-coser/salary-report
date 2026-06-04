// A500 薪资查询：只读解析 ATA100 中心签发的 ata_member_session 共享 cookie。
// cookie 名 + password + cookieOptions 必须与 ATA100 中心逐字节一致。

import { getIronSession } from "iron-session";

export const sessionOptions = {
  password: process.env.ATA_MEMBER_SESSION_PASSWORD,
  cookieName: "ata_member_session",
  cookieOptions: {
    secure:
      process.env.ATA_COOKIE_SECURE !== "false" &&
      process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: process.env.ATA_COOKIE_PATH || "/",
    maxAge: 60 * 60 * 24 * 30,
  },
};

export async function getSession(req, res) {
  if (!sessionOptions.password) {
    throw new Error("ATA_MEMBER_SESSION_PASSWORD env 未配置");
  }
  return getIronSession(req, res, sessionOptions);
}
