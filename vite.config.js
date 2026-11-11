import { defineConfig, loadEnv } from 'vite';
import path from 'node:path';
import { readFileSync } from 'node:fs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const adapter = env.VITE_SERVICE_ADAPTER || 'src/sdk.js';
  return {
    base: './',
    resolve: { alias: { '@host-service': path.resolve(adapter) } },
    plugins: [{
      name: 'host-service-assets',
      transformIndexHtml(html) {
        if (!env.VITE_SERVICE_BOOTSTRAP_FILE) return html;
        const closingTag = env.VITE_SERVICE_BOOTSTRAP_POSITION === 'head' ? '</head>' : '</body>';
        return html.replace(closingTag, `${readFileSync(env.VITE_SERVICE_BOOTSTRAP_FILE, 'utf8')}\n${closingTag}`);
      },
      generateBundle() {
        if (env.VITE_SERVICE_CONFIG_FILE && env.VITE_SERVICE_CONFIG_NAME) {
          this.emitFile({ type: 'asset', fileName: env.VITE_SERVICE_CONFIG_NAME, source: readFileSync(env.VITE_SERVICE_CONFIG_FILE) });
        }
      },
    }],
    build: { target: 'es2022', chunkSizeWarningLimit: 1500, outDir: mode === 'production' ? 'dist' : `dist-${mode}` },
  };
});
