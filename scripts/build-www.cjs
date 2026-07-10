// TSD web→www 构建：拷贝 web 资产到 www/，剥离 Service Worker
// 原生构建不需要 SW——WKWebView 无需离线缓存，且 SW 会导致 app 更新后内容陈旧
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const www = path.join(root, 'www');
if (!fs.existsSync(www)) fs.mkdirSync(www, { recursive: true });

const assets = ['index.html', 'app.js', 'data.js', 'styles.css', 'manifest.json', 'icon-192.png', 'icon-512.png', 'privacy.html'];
// SW 注册块的 regex（匹配 v3.25 条件化注册）
const SW_BLOCK = /if\s*\(!isNative\s*&&\s*'serviceWorker'\s*in\s*navigator\)\s*\{[\s\S]*?\}\s*\/\/\s*v3\.25.*/;

let copied = 0;
for (const f of assets) {
  const src = path.join(root, f);
  if (!fs.existsSync(src)) { console.warn('  [跳过] 缺失：' + f); continue; }
  let content = fs.readFileSync(src, 'utf8');
  if (f === 'app.js') {
    // 剥离 SW 注册块
    const before = content.length;
    content = content.replace(SW_BLOCK, '// [原生构建] Service Worker 已剥离');
    if (content.length !== before) console.log('  [剥离] SW 注册块从 app.js 移除');
  }
  fs.writeFileSync(path.join(www, f), content);
  copied++;
}
console.log(`✅ ${copied} 个资产已拷贝到 www/（SW 已${SW_BLOCK.test(fs.readFileSync(path.join(root,'app.js'),'utf8')) ? '剥离' : '无（可能已手动移除）'}）`);
