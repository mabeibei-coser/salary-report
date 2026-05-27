import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// 直接从 .env.local 文件 parse PORT（API 后端端口），避免被 process.env.PORT 覆盖
// 场景：preview wrapper / 外部脚本会注入 process.env.PORT 来指定 vite 监听端口，
// 此时 loadEnv 会把 process.env.PORT 合并进 env，导致 apiPort 跟 vite 端口同值，proxy 死循环
function readApiPortFromEnvLocal() {
  try {
    const file = path.resolve(process.cwd(), '.env.local');
    const txt = fs.readFileSync(file, 'utf8');
    const m = txt.match(/^\s*PORT\s*=\s*(\d+)\s*$/m);
    return m ? m[1] : '4001';
  } catch {
    return '4001';
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiPort = readApiPortFromEnvLocal();

  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [react()],
    server: {
      port: Number(process.env.PORT) || 3000,
      strictPort: !!process.env.PORT,
      open: !process.env.PORT,
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
  };
});
