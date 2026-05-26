import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // 读 .env / .env.local / .env.[mode] / .env.[mode].local，prefix '' 表示全字段都加载
  // 不能只依赖 process.env：dotenv 仅给 server.js 用，vite 配置阶段不会自动读 .env.local
  const env = loadEnv(mode, process.cwd(), '');
  const apiPort = env.PORT || '4001';

  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [react()],
    server: {
      port: 3000,
      // 端口被占时直接报错退出，不要静默 fallback 到 3001/3002——
      // 否则 launch.json / preview tool 会一直连 3000 失败，看起来像启动了其实换了口
      strictPort: true,
      open: true,
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
  };
});
