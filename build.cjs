// build.cjs - هنگام دیپلوی روی Vercel اجرا می‌شود:
// جاوااسکریپت داخل index.html را ناخوانا (obfuscate) و HTML/CSS را فشرده می‌کند و خروجی را در dist می‌گذارد.
const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const SKIP = new Set(['node_modules', 'dist', 'api', '.git', '.vercel', 'package.json', 'package-lock.json', 'build.cjs', 'vercel.json', '.gitignore', 'README.md']);

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

// کپی بقیه فایل‌های ثابت (logo، kh.png و ...)
(function copy(src, dst) {
  for (const name of fs.readdirSync(src)) {
    if (src === ROOT && SKIP.has(name)) continue;
    const s = path.join(src, name), d = path.join(dst, name);
    if (fs.statSync(s).isDirectory()) { fs.mkdirSync(d, { recursive: true }); copy(s, d); }
    else fs.copyFileSync(s, d);
  }
})(ROOT, DIST);

function processHtml(file) {
let html = fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');

// فقط اسکریپت‌های درون‌خطی (بدون src)
let count = 0; // (در هر فایل)
html = html.replace(/<script>([\s\S]*?)<\/script>/g, (m, code) => {
  const out = JavaScriptObfuscator.obfuscate(code, {
    compact: true,
    simplify: true,
    renameGlobals: false,          // نام توابع سراسری (برای onclick و ...) حفظ شود
    identifierNamesGenerator: 'hexadecimal',
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.75,
    rotateStringArray: true,
    shuffleStringArray: true,
    splitStrings: false,
    controlFlowFlattening: false,  // سنگین و پرخطر؛ خاموش
    deadCodeInjection: false,
    selfDefending: false,          // باعث خطا می‌شود؛ خاموش
    debugProtection: false,        // مرورگر را قفل می‌کند؛ خاموش
    disableConsoleOutput: false,
    unicodeEscapeSequence: false,
    target: 'browser'
  }).getObfuscatedCode();
  count++;
  return '<script>' + out + '</script>';
});

// حذف کامنت‌های HTML و CSS (بدون دست‌زدن به متن‌ها)
html = html.replace(/<!--(?!\[if)[\s\S]*?-->/g, '');
html = html.replace(/<style>([\s\S]*?)<\/style>/g, (m, css) =>
  '<style>' + css.replace(/\/\*[\s\S]*?\*\//g, '') + '</style>');

fs.writeFileSync(path.join(DIST, file), html, 'utf8');
console.log(`build ok: ${file}: ${count} inline script(s) obfuscated (${html.length} bytes)`);
}

processHtml('sys_core_9f8a2b7c4d1e.html');
processHtml('index.html');
