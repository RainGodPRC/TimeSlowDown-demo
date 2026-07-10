#!/usr/bin/env node
/**
 * TSD App Store 截图自动化脚本 v2
 * 用 Playwright WebKit 截取 6 张 App Store 截图
 * 通过真实 DOM 点击导航（不依赖 IIFE 内部函数）
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { webkit } = require('/Users/geralt/projects/Zcode/fengshen/node_modules/playwright');
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../screenshots/raw');
const BASE_URL = 'http://localhost:8767/index.html';

fs.mkdirSync(OUT_DIR, { recursive: true });

const CSS_WIDTH = 430;
const CSS_HEIGHT = 932;

async function main() {
  const browser = await webkit.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: CSS_WIDTH, height: CSS_HEIGHT },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`[CONSOLE ERROR] ${msg.text()}`);
  });
  page.on('pageerror', err => errors.push(`[PAGE ERROR] ${err.message}`));

  // ============================================================
  // Phase 1: 截图 1 — Onboarding 第 1 屏
  // ============================================================
  console.log('=== Phase 1: 加载 Onboarding ===');
  // 确保 onboarding 模式（用空 localStorage 全新 context）
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // 验证 onboarding 可见
  const onbVisible = await page.isVisible('.view-onboarding');
  console.log(`   Onboarding visible: ${onbVisible}`);

  console.log('📸 截图 1: Onboarding 第 1 屏');
  await page.screenshot({
    path: path.join(OUT_DIR, 'screenshot-1-onboarding.png'),
    type: 'png',
  });
  console.log('   ✓ 完成');

  // ============================================================
  // Phase 2: 切到 Demo 模式（丰富数据）
  // 用新 context + initScript 设置 demo 模式
  // ============================================================
  console.log('\n=== Phase 2: 切到 Demo 模式 ===');
  const demoContext = await browser.newContext({
    viewport: { width: CSS_WIDTH, height: CSS_HEIGHT },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const demoPage = await demoContext.newPage();
  demoPage.on('console', msg => {
    if (msg.type() === 'error') errors.push(`[DEMO CONSOLE ERROR] ${msg.text()}`);
  });
  demoPage.on('pageerror', err => errors.push(`[DEMO PAGE ERROR] ${err.message}`));

  // 用 initScript 在页面 JS 执行前设置 localStorage
  await demoContext.addInitScript(() => {
    localStorage.setItem('tsd_v31_mode', 'demo');
  });
  await demoPage.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await demoPage.waitForTimeout(5000);

  // 后续用 demoPage 代替 page
  const p = demoPage;

  // 验证进入了 tell 视图（demo 模式不经过 onboarding）
  const tellVisible = await p.isVisible('.view-tell');
  const onbStillVisible = await p.isVisible('.view-onboarding');
  console.log(`   Tell visible: ${tellVisible}, Onboarding still visible: ${onbStillVisible}`);

  // 检查 tab-bar 状态
  const activeTab = await page.textContent('.tab.active .tab-label').catch(() => 'N/A');
  console.log(`   Active tab: ${activeTab}`);

  // ============================================================
  // 截图 2：讲述首页
  // ============================================================
  console.log('\n📸 截图 2: 讲述首页');
  // 滚动到顶部
  await p.evaluate(() => {
    const scroll = document.querySelector('.tell-scroll');
    if (scroll) scroll.scrollTop = 0;
  });
  await p.waitForTimeout(2000);
  await p.screenshot({
    path: path.join(OUT_DIR, 'screenshot-2-home.png'),
    type: 'png',
  });

  // 收集首页文本验证内容
  const homeText = await p.evaluate(() => {
    const el = document.querySelector('.tell-scroll');
    return el ? el.innerText.substring(0, 200) : 'NO TELL SCROLL';
  });
  console.log(`   首页内容预览: ${homeText.substring(0, 100)}...`);
  console.log('   ✓ 完成');

  // ============================================================
  // 截图 3：录入页（点 + 按钮）
  // ============================================================
  console.log('\n📸 截图 3: 录入页');
  // 点击 tab-add 按钮（＋号）
  await p.click('#tab-add');
  await p.waitForTimeout(2000);

  const composeVisible = await p.isVisible('.view-compose');
  console.log(`   Compose visible: ${composeVisible}`);

  await p.screenshot({
    path: path.join(OUT_DIR, 'screenshot-3-compose.png'),
    type: 'png',
  });

  const composeText = await p.evaluate(() => {
    const el = document.querySelector('.compose-body');
    return el ? el.innerText.substring(0, 100) : 'NO COMPOSE';
  });
  console.log(`   录入页内容: ${composeText.substring(0, 80)}...`);
  console.log('   ✓ 完成');

  // 关闭录入页
  await p.click('#compose-close');
  await p.waitForTimeout(1000);

  // ============================================================
  // 截图 4：旷野（月缩放）
  // ============================================================
  console.log('\n📸 截图 4: 旷野（月缩放）');
  // 点击旷野 tab
  await p.click('.tab[data-tab="meadow"]');
  await p.waitForTimeout(2000);

  // 点击月缩放按钮
  const monthBtn = await p.$('.zoom-pill[data-zoom="month"]');
  if (monthBtn) {
    await monthBtn.click();
    await p.waitForTimeout(2000);
    console.log('   切到月缩放 ✓');
  } else {
    console.log('   ⚠️ 未找到月缩放按钮');
  }

  await p.screenshot({
    path: path.join(OUT_DIR, 'screenshot-4-meadow.png'),
    type: 'png',
  });

  const meadowText = await p.evaluate(() => {
    const el = document.querySelector('.meadow-scroll');
    return el ? el.innerText.substring(0, 100) : 'NO MEADOW';
  });
  console.log(`   旷野内容: ${meadowText.substring(0, 80)}...`);
  console.log('   ✓ 完成');

  // ============================================================
  // 截图 5：周末章节
  // ============================================================
  console.log('\n📸 截图 5: 周末章节');
  // 回到首页
  await p.click('.tab[data-tab="tell"]');
  await p.waitForTimeout(1500);

  // 点击"开始编故事"按钮 — 先检查是否在视口内
  let wcBtn = await p.$('#wc-start-btn');
  if (wcBtn) {
    let is_visible = await wcBtn.isVisible();
    console.log(`   周末章节按钮可见: ${is_visible}`);
    if (!is_visible) {
      // 滚动到按钮位置
      await p.evaluate(() => {
        document.querySelector('.tell-scroll').scrollTop = document.querySelector('.tell-scroll').scrollHeight;
      });
      await p.waitForTimeout(1000);
      is_visible = await wcBtn.isVisible();
      console.log(`   滚动后可见: ${is_visible}`);
    }
    if (is_visible) {
      await wcBtn.click();
      await p.waitForTimeout(2000);
    }
  } else {
    console.log('   ⚠️ 未找到 #wc-start-btn');
  }

  await p.screenshot({
    path: path.join(OUT_DIR, 'screenshot-5-weekchapter.png'),
    type: 'png',
  });

  // 检查 overlay
  const wcOverlay = await p.evaluate(() => {
    const ov = document.querySelector('.wc-overlay, [class*="week-chapter"], .chapter-overlay');
    return ov ? ov.className : 'NO OVERLAY';
  });
  console.log(`   Overlay: ${wcOverlay}`);
  console.log('   ✓ 完成');

  // 关闭所有 overlay
  await p.keyboard.press('Escape');
  await p.waitForTimeout(500);
  await p.evaluate(() => {
    document.querySelectorAll('.overlay.show, [class*="overlay"].show').forEach(el => {
      el.classList.remove('show');
    });
  });
  await p.waitForTimeout(500);

  // ============================================================
  // 截图 6：人生格子（旷野 · 一生缩放）
  // ============================================================
  console.log('\n📸 截图 6: 人生格子');
  await p.click('.tab[data-tab="meadow"]');
  await p.waitForTimeout(2000);

  // 切到一生缩放
  const lifeBtn = await p.$('.zoom-pill[data-zoom="life"]');
  if (lifeBtn) {
    await lifeBtn.click();
    await p.waitForTimeout(3000);
    console.log('   切到一生缩放 ✓');
  } else {
    console.log('   ⚠️ 未找到一生缩放按钮');
  }

  await p.screenshot({
    path: path.join(OUT_DIR, 'screenshot-6-lifegrid.png'),
    type: 'png',
  });

  const lifeText = await p.evaluate(() => {
    const el = document.querySelector('.meadow-scroll');
    return el ? el.innerText.substring(0, 150) : 'NO MEADOW';
  });
  console.log(`   格子内容: ${lifeText.substring(0, 100)}...`);
  console.log('   ✓ 完成');

  await demoContext.close();

  // ============================================================
  // 报告
  // ============================================================
  console.log('\n========== 截图完成 ==========');
  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.png'));
  for (const f of files.sort()) {
    const stat = fs.statSync(path.join(OUT_DIR, f));
    console.log(`  ${f}: ${(stat.size / 1024).toFixed(0)} KB`);
  }

  if (errors.length > 0) {
    console.log('\n=== ⚠️ JavaScript 错误 ===');
    errors.forEach(e => console.log(e));
  } else {
    console.log('\n✅ 无 JavaScript 错误');
  }

  await browser.close();
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
