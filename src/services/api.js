/**
 * salary-report API 客户端
 * 改造后：浏览器 → /api/queries → Express → 讯飞 → 入库 → 返回报告
 * （原来的 BASE_URL/api/chat 直连讯飞 + 浏览器持 API key 的写法已废弃）
 */

const API_BASE = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api`;

async function http(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error || `请求失败 (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function fetchMe() {
  try {
    return await http('GET', '/me');
  } catch (err) {
    if (err.status === 401) return null;
    throw err;
  }
}

export async function loginByPhone(phone) {
  return http('POST', '/login', { phone });
}

export async function logout() {
  return http('POST', '/logout');
}

/**
 * 调用一次薪酬查询（服务端会同步入库）。
 * 兼容旧签名：`fetchSalaryData(position, company, rank, education, city)`
 */
export async function fetchSalaryData(position, company, rank, education, city) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 65_000);
  try {
    const res = await fetch(`${API_BASE}/queries`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position, company, rank, education, city }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data?.error || `API 请求失败 (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return data.report;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('请求超时（60秒），请稍后重试');
    }
    throw err;
  }
}
