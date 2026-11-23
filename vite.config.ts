import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({command}) => {
  return {
    base: command === 'build' ? './' : '/',
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }

          // Suntikkan daftar berkas hasil build & versi cache unik ke dist/sw.js agar app shell siap offline
          const swDistPath = path.resolve(distDir, 'sw.js');
          if (fs.existsSync(swDistPath)) {
            const kumpulkanBerkas = (dir: string, prefix = ''): string[] => {
              const daftar: string[] = [];
              for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
                if (entry.name === 'sw.js') continue;
                const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
                const penuh = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                  daftar.push(...kumpulkanBerkas(penuh, rel));
                } else {
                  daftar.push(`./${rel}`);
                }
              }
              return daftar;
            };
            const daftarBerkas = kumpulkanBerkas(distDir).sort();
            const daftarAsset = ['./', ...daftarBerkas];
            const hashBuild = crypto
              .createHash('sha256')
              .update(daftarBerkas.join('|'))
              .digest('hex')
              .slice(0, 10);
            const versiCache = `duel-otak-v-${hashBuild}`;
            const swAsli = fs.readFileSync(swDistPath, 'utf-8');
            const swBaru = swAsli
              .replace(
                /\/\*__CACHE_VERSION__\*\/\s*'[^']*';/,
                `${JSON.stringify(versiCache)};`
              )
              .replace(
                /\/\*__PRECACHE_MANIFEST__\*\/[\s\S]*?\];/,
                `${JSON.stringify(daftarAsset)};`
              );
            fs.writeFileSync(swDistPath, swBaru, 'utf-8');
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
