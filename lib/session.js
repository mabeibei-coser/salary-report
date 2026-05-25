import { getIronSession } from "iron-session";

export const sessionOptions = {
  password: process.env.SALARY_SESSION_PASSWORD,
  cookieName: "salary_user_session",
  cookieOptions: {
    secure:
      process.env.SALARY_COOKIE_SECURE !== "false" &&
      process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: process.env.SALARY_COOKIE_PATH || "/",
    maxAge: 60 * 60 * 24 * 30, // 30 天
  },
};

export async function getSession(req, res) {
  if (!sessionOptions.password) {
    throw new Error("SALARY_SESSION_PASSWORD env 未配置");
  }
  return getIronSession(req, res, sessionOptions);
}
