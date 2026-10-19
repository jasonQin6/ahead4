import fs from 'fs';
const root = new URL('.', import.meta.url).pathname;
const tpl = fs.readFileSync(root + 'src/index.html', 'utf8');
const css = fs.readFileSync(root + 'src/style.css', 'utf8');
const js = ['engine.js', 'model.js', 'app.js'].map(f => fs.readFileSync(root + 'src/' + f, 'utf8')).join('\n\n');
const html = tpl.replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => js);
fs.writeFileSync(root + '自然选择号-全舰.html', html);
console.log('built', (html.length / 1024).toFixed(1) + 'KB');
