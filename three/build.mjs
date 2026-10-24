import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = (p) => path.join(root, 'src', p);
const out = path.join(root, '自然选择号-全舰-three.html');

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
// keep an inline script from terminating early if the bundle ever contains "</script"
js = js.replace(/<\/script/gi, '<\\/script');

const html = tpl
  .replace('/*__CSS__*/', () => css)
  .replace('/*__JS__*/', () => js);

fs.writeFileSync(out, html);

const kb = (n) => (n / 1024).toFixed(1) + 'KB';
const gz = zlib.gzipSync(html).length;
console.log(`built ${path.basename(out)}  ${kb(html.length)}  (gzip ${kb(gz)})`);
console.log(`  css ${kb(css.length)} · js ${kb(js.length)} (minified)`);
