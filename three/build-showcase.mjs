import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = (p) => path.join(root, 'src', 'showcase', p);
const outDir = path.resolve(root, '..', 'web');
const out = path.join(outDir, 'index.html');

fs.mkdirSync(outDir, { recursive: true });

const tpl = fs.readFileSync(src('index.html'), 'utf8');
const css = fs.readFileSync(src('style.css'), 'utf8');

const result = await esbuild.build({
  entryPoints: [src('main.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome110', 'safari16', 'firefox110'],
  legalComments: 'none',
  charset: 'utf8',
  write: false,
  logLevel: 'warning',
  define: { 'process.env.NODE_ENV': '"production"' },
});

let js = result.outputFiles[0].text;
js = js.replace(/<\/script/gi, '<\\/script');

const html = tpl
  .replace('/*__CSS__*/', () => css)
  .replace('/*__JS__*/', () => js);

fs.writeFileSync(out, html);

const atlasSrc = path.join(root, '自然选择号-全舰-three.html');
const atlasOut = path.join(outDir, 'atlas.html');
if (fs.existsSync(atlasSrc)) fs.copyFileSync(atlasSrc, atlasOut);

const kb = (n) => (n / 1024).toFixed(1) + 'KB';
const gz = zlib.gzipSync(html).length;
console.log(`built web/index.html  ${kb(html.length)}  (gzip ${kb(gz)})`);
console.log(`  css ${kb(css.length)} · js ${kb(js.length)}`);
if (fs.existsSync(atlasOut)) console.log(`  atlas.html ${kb(fs.statSync(atlasOut).size)}`);
