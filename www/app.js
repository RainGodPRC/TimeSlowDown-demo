// ============================================================
// TSD v3.25 — 应用逻辑（Web + Capacitor 双模式）
// 论点：D 讲述优先 + B Mark 优先 + C 旷野优先
// ============================================================

// v3.25 Capacitor 检测 + 插件加载（浏览器里安全降级）
const isNative = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform;
let CapacitorCamera = null;
let CapacitorPrefs = null;
let CapacitorShare = null;
let CapacitorFS = null;
let CapacitorLN = null;

if (isNative) {
  // Capacitor 原生环境：动态加载插件
  try { CapacitorCamera = window.Capacitor.Plugins.Camera; } catch(e) {}
  try { CapacitorPrefs = window.Capacitor.Plugins.Preferences; } catch(e) {}
  try { CapacitorShare = window.Capacitor.Plugins.Share; } catch(e) {}
  try { CapacitorFS = window.Capacitor.Plugins.Filesystem; } catch(e) {}
  try { CapacitorLN = window.Capacitor.Plugins.LocalNotifications; } catch(e) {}
}

(() => {
  const { USER, MOODS, MOMENTS, WEEK_CHALLENGE, MEADOW_LEVELS, ONBOARDING, NIGHT_SCAN, WEEK_CHAPTERS, MONTH_LANDSCAPES, SEASON_RITUAL, LIFE_MILESTONES } = window.__TSD_DATA__;

  // ============ 数据模式 ============
  // 'onboarding' 首启动 | 'empty' 空状态（用户自己用）| 'demo' 示例数据（陈雨）
  const STORAGE_KEY = 'tsd_v31_mode';
  function loadMode() {
    try { return localStorage.getItem(STORAGE_KEY) || 'onboarding'; }
    catch (e) { return 'onboarding'; }
  }
  function saveMode(m) {
    try { localStorage.setItem(STORAGE_KEY, m); } catch (e) {}
  }

  const state = {
    mode: loadMode(),         // 'onboarding' | 'empty' | 'demo'
    currentView: 'onboarding',
    moments: [],              // empty/demo 切换时填充
    onbStep: 0,               // onboarding 当前屏
    selectedMood: null,
    plainMode: false,
    meadowZoom: 'week',
    meadowLens: 'time',  // v3.9: time | people | theme
    upgradeTargetId: null,
    weekSkipped: false,
    scanDisabled: false,       // v3.6 反 streak：用户关掉今晚扫描
    scanIgnoredToday: false,   // v3.6 反 streak：用户当日已忽略
    archiveQuery: '',          // v3.10 搜索
    archiveView: 'list',       // v3.14 list | wall | map
    selectedWeather: 'plain',  // v3.10 情绪天气
  };

  // 进入示例模式：填陈雨数据
  function enterDemoMode() {
    state.mode = 'demo';
    state.moments = JSON.parse(JSON.stringify(MOMENTS));
    saveMode('demo');
  }
  // 进入空模式（被试真实使用）
  function enterEmptyMode() {
    state.mode = 'empty';
    state.moments = [];
    saveMode('empty');
    loadMoments();  // 加载之前存的瞬间
    saveMoments();
    // v3.18 首次进入 empty mode 提示登记生日
    try {
      if (!localStorage.getItem('tsd_user_birth') && !localStorage.getItem('tsd_birth_skipped')) {
        setTimeout(showBirthRegistration, 500);
      }
    } catch(e) {}
  }

  // v3.13/v3.15/v3.27 数据持久化（empty mode 下用户的真实 Mark + 周章节 + 月度命名）
  function saveMoments() {
    if (state.mode !== 'empty') return;
    try {
      const userMoments = state.moments.filter(m => m.id.startsWith('new-') || m.id.startsWith('bf-'));
      localStorage.setItem('tsd_user_moments', JSON.stringify(userMoments));
      // 持久化周章节
      const userChapters = {};
      for (const [k, v] of Object.entries(WEEK_CHAPTERS)) {
        if (k >= '2026-W27') userChapters[k] = v;
      }
      localStorage.setItem('tsd_user_chapters', JSON.stringify(userChapters));
      // v3.27 修复：持久化用户命名的月度
      const userMonths = {};
      for (const [k, v] of Object.entries(MONTH_LANDSCAPES)) {
        if (v.userNamed) userMonths[k] = v;
      }
      localStorage.setItem('tsd_user_months', JSON.stringify(userMonths));
    } catch (e) {}
  }
  function loadMoments() {
    if (state.mode !== 'empty') return;
    try {
      const saved = localStorage.getItem('tsd_user_moments');
      if (saved) {
        state.moments = JSON.parse(saved);
      }
      const savedCh = localStorage.getItem('tsd_user_chapters');
      if (savedCh) {
        const userCh = JSON.parse(savedCh);
        for (const [k, v] of Object.entries(userCh)) WEEK_CHAPTERS[k] = v;
      }
      // v3.27 修复：加载用户命名的月度
      const savedMo = localStorage.getItem('tsd_user_months');
      if (savedMo) {
        const userMo = JSON.parse(savedMo);
        for (const [k, v] of Object.entries(userMo)) MONTH_LANDSCAPES[k] = v;
      }
    } catch (e) {}
  }

  // ============================================================
  // v3.22 记忆浮现（可变回报钩子）
  // ============================================================
  function getMemoryResurface() {
    if (state.mode !== 'empty') return null;
    if (state.moments.length < 3) return null;
    // 当天是否触发（30% 概率，每天最多一次）
    try {
      const today = todayStr();
      const lastShown = localStorage.getItem('tsd_resurface_date');
      if (lastShown === today) return null;
      if (Math.random() > 0.35) return null;  // 35% 概率
      // 找 N 天前的瞬间（7/14/30/90 天）
      const intervals = [7, 14, 30, 90];
      const candidates = [];
      for (const days of intervals) {
        const target = new Date(TODAY.getTime() - days * 24 * 60 * 60 * 1000);
        const targetStr = `${target.getFullYear()}-${String(target.getMonth()+1).padStart(2,'0')}-${String(target.getDate()).padStart(2,'0')}`;
        // 找 target ± 2 天内的瞬间
        const matches = state.moments.filter(m => {
          const d = parseDate(m.date);
          const diff = Math.abs(d.getTime() - target.getTime()) / (24*60*60*1000);
          return diff <= 2 && !m.archived;
        });
        if (matches.length > 0) {
          candidates.push({ days, moment: matches[Math.floor(Math.random() * matches.length)] });
        }
      }
      if (candidates.length === 0) return null;
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      localStorage.setItem('tsd_resurface_date', today);
      return pick;
    } catch(e) { return null; }
  }

  function renderResurfaceCard() {
    const r = getMemoryResurface();
    if (!r) return '';
    const m = r.moment;
    const mood = MOODS[m.mood];
    const ago = r.days === 7 ? '一周前' : r.days === 14 ? '两周前' : r.days === 30 ? '一个月前' : '三个月前';
    return `
      <div class="resurface-card" id="resurface-card">
        <div class="resurface-header">
          <span class="resurface-emoji">🕰️</span>
          <span class="resurface-label">${ago}的今天</span>
          <button class="resurface-close" id="resurface-close">×</button>
        </div>
        ${m.image ? `<img class="resurface-img" src="${m.image}" alt=""/>` : ''}
        <div class="resurface-body">
          <div class="resurface-text">${mood.emoji} ${escapeHtml(m.text)}</div>
          ${m.why ? `<div class="resurface-why">"${escapeHtml(m.why)}"</div>` : ''}
          <div class="resurface-meta">${fmtDate(m.date)}${m.people && m.people.length ? ' · ' + m.people.map(escapeHtml).join('、') : ''}</div>
        </div>
        <p class="resurface-hint">看到这个瞬间，你还记得当时的感受吗？</p>
      </div>
    `;
  }

  // v3.18 生日登记
  function showBirthRegistration() {
    const ov = document.getElementById('upgrade-overlay');
    const card = ov.querySelector('.upgrade-card');
    card.innerHTML = `
      <div class="upgrade-header">
        <span class="upgrade-title">你的生日</span>
      </div>
      <div class="upgrade-body" style="text-align:center">
        <div style="font-size:48px;margin:10px 0 14px">🎂</div>
        <p style="font-family:var(--font-serif);font-size:18px;color:var(--ink);line-height:1.6;margin-bottom:6px">为了让你看到<br/>自己在人生格子里的位置</p>
        <p style="font-size:13px;color:var(--ink-soft);margin-bottom:20px;line-height:1.6">登记生日后，TSD 会自动计算你的人生第几周——每 Mark 一个瞬间，对应的格子会被点亮。</p>
        <input type="date" id="birth-input" class="wc-title-input" style="text-align:center;font-family:var(--font-sans);font-size:18px;margin-bottom:16px" value="1990-01-01" max="${todayStr()}" />
        <div style="display:flex;gap:8px">
          <button class="upgrade-btn" id="birth-skip" style="background:var(--bg-warm);color:var(--ink-soft);flex:1">以后再说</button>
          <button class="upgrade-btn" id="birth-save" style="flex:1">登记</button>
        </div>
        <p style="font-size:11px;color:var(--ink-faint);margin-top:14px">仅存在你的设备上，不上传任何服务器。</p>
      </div>
    `;
    ov.classList.add('show');
    card.querySelector('#birth-skip').addEventListener('click', () => {
      try { localStorage.setItem('tsd_birth_skipped', '1'); } catch(e) {}
      ov.classList.remove('show');
    });
    card.querySelector('#birth-save').addEventListener('click', () => {
      const v = card.querySelector('#birth-input').value;
      if (v) {
        setUserBirth(v);
        ov.classList.remove('show');
        showToast('已登记 · 你在人生格子里有了位置');
        renderTell();
      }
    });
  }

  // 首启动根据 mode 决定 moments
  if (state.mode === 'demo') state.moments = JSON.parse(JSON.stringify(MOMENTS));
  else state.moments = [];

  // ============ 工具 ============
  const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  // 在 empty 模式下，"今天"用真实今天，便于被试 Mark
  const TODAY = (state.mode === 'empty') ? new Date() : parseDate(USER.today);
  function todayStr() {
    const d = TODAY;
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  // v3.18 生日：empty mode 从 localStorage 读用户登记的生日；demo 模式用陈雨的
  function getUserBirth() {
    if (state.mode === 'empty') {
      try {
        const saved = localStorage.getItem('tsd_user_birth');
        if (saved) return parseDate(saved);
      } catch (e) {}
      return null;  // 还没登记
    }
    return parseDate(USER.birthDate);
  }
  function setUserBirth(dateStr) {
    try { localStorage.setItem('tsd_user_birth', dateStr); } catch (e) {}
  }
  // 兼容旧代码：BIRTH 作为函数返回
  function BIRTH() { return getUserBirth() || parseDate(USER.birthDate); }

  function isoWeek(d) {
    const t = new Date(d); t.setHours(0, 0, 0, 0);
    t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
    const w1 = new Date(t.getFullYear(), 0, 4);
    return 1 + Math.round(((t - w1) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7);
  }
  function weekKey(s) {
    const d = parseDate(s);
    return `${d.getFullYear()}-W${String(isoWeek(d)).padStart(2, '0')}`;
  }
  function monthKey(s) { return s.slice(0, 7); }
  function fmtDate(s) {
    const d = parseDate(s);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function getMoment(id) { return state.moments.find(m => m.id === id); }

  // 本周的瞬间
  function getWeekMoments() {
    const wk = weekKey(todayStr());
    return state.moments.filter(m => weekKey(m.date) === wk);
  }

  // ============================================================
  // 今晚扫描（v3.6：ZCode 主动发现机制）
  // ============================================================

  // 讲述价值评分（按 NIGHT_SCAN.scoreRules）
  function scoreTellingValue(m) {
    const rules = NIGHT_SCAN.scoreRules;
    const shiftMoods = NIGHT_SCAN.shiftMoods;
    let score = 0;
    const reasons = [];

    if (m.people && m.people.length > 0) {
      score += rules.hasPeople;
      reasons.push(`和 ${m.people.join('、')}`);
    }
    if (m.isFirst) {
      score += rules.isFirst;
      reasons.push('第一次');
    }
    if (shiftMoods.includes(m.mood)) {
      score += rules.moodShift;
      reasons.push(`${MOODS[m.mood].label}的瞬间`);
    }
    if (m.image) score += rules.hasPhoto;
    if (m.text && m.text.length > 5 && m.text !== '（仅 Mark）') score += rules.hasText;

    return { score, reasons: reasons.slice(0, 2) };  // 只显示前 2 个原因
  }

  // 扫描今日所有 L0 Mark（未升级），按讲述价值排序，取前 N 个
  function runNightScan() {
    const todayMoments = state.moments.filter(m => m.date === todayStr());
    const candidates = todayMoments
      .filter(m => !m.toldAt)  // 只看 L0（未升级）
      .map(m => ({ moment: m, ...scoreTellingValue(m) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, NIGHT_SCAN.maxCandidates);
    return candidates;
  }

  // 渲染今晚扫描卡片（在讲述首页顶部，邀请卡之前）
  function renderNightScanCard() {
    // 反 streak：用户已关闭扫描 / 当日已忽略 → 不显示
    if (state.scanDisabled || state.scanIgnoredToday) return '';

    const candidates = runNightScan();
    // demo 模式下放宽阈值到 1（让用户能看到扫描效果）；真实使用时阈值是 2
    const threshold = state.mode === 'demo' ? 1 : NIGHT_SCAN.minMarksToScan;
    if (candidates.length < threshold) {
      // 今晚没素材，不刷存在感
      return '';
    }

    const items = candidates.map(c => `
      <div class="night-scan-item" data-upgrade="${c.moment.id}">
        ${c.moment.image ? `<img class="night-scan-thumb" src="${c.moment.image}" alt="" loading="lazy"/>` : ''}
        <div class="night-scan-item-body">
          <div class="night-scan-item-text">${escapeHtml(c.moment.text)}</div>
          ${c.reasons.length ? `<div class="night-scan-item-why">${c.reasons.map(escapeHtml).join(' · ')}</div>` : ''}
        </div>
        <div class="night-scan-item-action">说点什么 ›</div>
      </div>
    `).join('');

    return `
      <div class="night-scan-card">
        <div class="night-scan-header">
          <div class="night-scan-eyebrow">今晚看起来</div>
          <button class="night-scan-close" id="scan-close" title="不需要">×</button>
        </div>
        <div class="night-scan-title">今天有几个，<br/>看起来很有故事感</div>
        <div class="night-scan-sub">随便看看，不想说也行——明天就清掉，不积累。</div>
        <div class="night-scan-candidates">${items}</div>
        <button class="night-scan-skip" id="scan-skip">明天再说</button>
      </div>
    `;
  }

  // ============ 视图切换 ============
  function switchView(name) {
    state.currentView = name;
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.dataset.view === name));
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    document.getElementById('tab-bar').style.display = (name === 'compose' || name === 'onboarding') ? 'none' : 'flex';
    if (name === 'tell') renderTell();
    if (name === 'meadow') renderMeadow();
    if (name === 'archive') renderArchive();
  }

  // ============================================================
  // Onboarding（三屏极简）
  // ============================================================
  function renderOnboarding() {
    const step = ONBOARDING.steps[state.onbStep];
    const screen = document.getElementById('onboarding-screen');

    // 生成 90 格的 grid（5 个被点亮）
    const gridCells = Array.from({length: 90}, (_, i) => {
      const lit = [6, 22, 41, 57, 73].includes(i);  // 散布的 5 个亮点
      return `<div class="onb-grid-cell ${lit ? 'lit' : ''}"></div>`;
    }).join('');

    // 人生格子（4160 格 = 80 年 × 52 周）
    // 默认年龄 35，用户可调
    if (step.visual === 'lifegrid') {
      renderLifeGridStep(screen, step);
      return;  // 这一步用独立渲染逻辑
    }

    const visualHtml = {
      fast: `<div class="onb-visual-fast">
        <div class="onb-day">周一 · 开会</div>
        <div class="onb-day">周二 · 加班</div>
        <div class="onb-day">周三 · 又是开会</div>
        <div class="onb-day">周四 · ... 这是哪天？</div>
      </div>`,
      grid: `<div class="onb-visual-grid">${gridCells}</div>`,
      story: `<div class="onb-visual-story">
        <div class="onb-story-period">用 TSD 的第一个季度</div>
        <div class="onb-story-title">扎根，与开花</div>
        <div class="onb-story-opening">"如果用一棵树形容这三个月：4 月在地板上吃泡面时根扎进土里；5 月在京都长出新枝；6 月侄女出生那天，开了第一朵花。"</div>
      </div>`,
      plus: `<div class="onb-visual-plus">＋</div>`,
    }[step.visual];

    screen.innerHTML = `
      <div class="onb-progress">
        ${ONBOARDING.steps.map((_, i) => `<div class="onb-dot ${i === state.onbStep ? 'active' : ''}"></div>`).join('')}
      </div>
      <div class="onb-visual">${visualHtml}</div>
      <div class="onb-eyebrow">${escapeHtml(step.eyebrow)}</div>
      <div class="onb-headline">${escapeHtml(step.headline)}</div>
      <div class="onb-sub">${escapeHtml(step.sub)}</div>
      <button class="onb-cta" id="onb-cta">${escapeHtml(step.cta)}</button>
      ${step.skipText ? `<button class="onb-skip" id="onb-skip">${escapeHtml(step.skipText)}</button>` : ''}
    `;

    document.getElementById('onb-cta').addEventListener('click', handleOnbNext);
    const skip = document.getElementById('onb-skip');
    if (skip) skip.addEventListener('click', handleOnbSkip);
  }

  // ============================================================
  // 人生格子屏（第 4 屏）：A4 冲击型，让用户输入年龄
  // 三色：淡灰（无痕过去）/ 琥珀（被记住）/ 白（未来）/ 脉冲（当前）
  // ============================================================
  function renderLifeGridStep(screen, step) {
    if (!state.onbAge) state.onbAge = 35;
    const age = state.onbAge;
    const pastWeeks = age * 52;
    const totalWeeks = 4160;

    // 模拟"被记住"的瞬间：在 0~pastWeeks 间散布约 12 个亮点（陈雨三个月用下来的体感）
    // 用确定性 seed（不随机），让每次渲染一致
    const rememberedSet = new Set();
    const rememberedDeepSet = new Set();
    // 假设用户用 TSD 三个月（约 13 周）→ 12 个被记住的瞬间
    // 但在 onboarding 时，用户还没用过，所以模拟"如果他用了 3 个月会怎样"
    // 简化：在已度过的周里散布一些"模拟被记住"的亮点
    // 用 deterministic 散布：每 (pastWeeks/12) 周一个亮点
    if (pastWeeks > 12) {
      const step12 = Math.floor(pastWeeks / 12);
      for (let i = 0; i < 12; i++) {
        const idx = (i * step12) + Math.floor(step12 * 0.5);
        if (idx < pastWeeks) rememberedSet.add(idx);
      }
      // 其中 3 个升级为"强烈记忆"（墨绿）
      [...rememberedSet].slice(0, 3).forEach(idx => {
        rememberedSet.delete(idx);
        rememberedDeepSet.add(idx);
      });
    }

    function buildGrid(past) {
      const cells = [];
      for (let w = 0; w < totalWeeks; w++) {
        let cls = 'onb-a4-cell';
        if (w === past) cls += ' now';
        else if (w < past) {
          if (rememberedDeepSet.has(w)) cls += ' remembered-deep';
          else if (rememberedSet.has(w)) cls += ' remembered';
          else cls += ' past';
        } else {
          cls += ' future';
        }
        cells.push(`<div class="${cls}"></div>`);
      }
      return cells.join('');
    }

    screen.innerHTML = `
      <div class="onb-progress">
        ${ONBOARDING.steps.map((_, i) => `<div class="onb-dot ${i === state.onbStep ? 'active' : ''}"></div>`).join('')}
      </div>
      <div class="onb-visual">
        <div class="onb-visual-lifegrid">
          <div class="onb-age-input-row">
            <span>我今年</span>
            <input type="number" id="onb-age-input" value="${age}" min="1" max="100" />
            <span>岁</span>
          </div>
          <div class="onb-a4-grid with-decades">${buildGrid(pastWeeks)}</div>
          <div class="onb-grid-stats">
            <span><b>${pastWeeks}</b> 周已走过</span>
            <span><b>${totalWeeks - pastWeeks}</b> 周未来</span>
          </div>
        </div>
      </div>
      <div class="onb-eyebrow">${escapeHtml(step.eyebrow)}</div>
      <div class="onb-headline">${escapeHtml(step.headline)}</div>
      <div class="onb-sub">${escapeHtml(step.sub)}</div>
      <button class="onb-cta" id="onb-cta">${escapeHtml(step.cta)}</button>
      ${step.skipText ? `<button class="onb-skip" id="onb-skip">${escapeHtml(step.skipText)}</button>` : ''}
    `;

    document.getElementById('onb-cta').addEventListener('click', handleOnbNext);
    const skip = document.getElementById('onb-skip');
    if (skip) skip.addEventListener('click', handleOnbSkip);

    // 年龄输入：实时重渲染格子
    const ageInput = document.getElementById('onb-age-input');
    ageInput.addEventListener('input', e => {
      const v = parseInt(e.target.value, 10);
      if (isNaN(v) || v < 1 || v > 100) return;
      state.onbAge = v;
      const newPast = v * 52;
      // 重新计算 remembered 散布
      rememberedSet.clear();
      rememberedDeepSet.clear();
      if (newPast > 12) {
        const step12 = Math.floor(newPast / 12);
        for (let i = 0; i < 12; i++) {
          const idx = (i * step12) + Math.floor(step12 * 0.5);
          if (idx < newPast) rememberedSet.add(idx);
        }
        [...rememberedSet].slice(0, 3).forEach(idx => {
          rememberedSet.delete(idx);
          rememberedDeepSet.add(idx);
        });
      }
      const grid = screen.querySelector('.onb-a4-grid');
      grid.innerHTML = buildGrid(newPast);
      const stats = screen.querySelector('.onb-grid-stats');
      stats.innerHTML = `
        <span><b>${newPast}</b> 周已走过</span>
        <span><b>${4160 - newPast}</b> 周未来</span>
      `;
    });
  }

  function handleOnbNext() {
    if (state.onbStep < ONBOARDING.steps.length - 1) {
      state.onbStep++;
      renderOnboarding();
    } else {
      // 最后一屏的"开始" → 进入空模式 + 直接打开录入
      enterEmptyMode();
      switchView('tell');
      setTimeout(() => openCompose(), 300);  // 让 tell 视图先渲染
    }
  }

  function handleOnbSkip() {
    const step = ONBOARDING.steps[state.onbStep];
    if (step.skipText === '其实没有') {
      // 第 1 屏"其实没有" → 跳到第 2 屏（不强迫共情）
      state.onbStep = 1;
      renderOnboarding();
    } else if (step.skipText === '先看看示例') {
      // 第 5 屏"先看看示例" → 打开"三个月对比" overlay（不再直接进 demo mode）
      showCompareOverlay();
    }
  }

  // ============================================================
  // 三个月对比 overlay：之前（空旷野）vs 之后（花团锦簇）+ 陈雨真实季故事
  // ============================================================
  function showCompareOverlay() {
    let ov = document.getElementById('compare-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'compare-overlay';
      ov.className = 'compare-overlay';
      document.querySelector('.phone-screen').appendChild(ov);
    }
    ov.innerHTML = `
      <button class="compare-close" id="compare-close">×</button>
      <div class="compare-header">
        <div class="compare-title">用三个月，会发生什么</div>
        <div class="compare-sub">这是一个真实用户的例子。她叫陈雨，35 岁。</div>
      </div>

      <div class="compare-split">
        <div class="compare-half before">
          <div class="compare-label">用 TSD 之前</div>
          <div class="compare-meadow" id="meadow-before"></div>
          <div class="compare-quote">"工作、通勤、家务——<br/>三个月像 90 个相同的日子。"</div>
        </div>
        <div class="compare-half after">
          <div class="compare-label">用了三个月后</div>
          <div class="compare-meadow" id="meadow-after"></div>
          <div class="compare-quote"><b>讲得出 8 个鲜明瞬间</b>，<br/>每月都有了主线。</div>
        </div>
      </div>

      <div class="compare-story">
        <div class="compare-story-period">陈雨 · 用 TSD 第一个季度</div>
        <div class="compare-story-title">扎根，与开花</div>
        <div class="compare-story-opening">"如果用一棵树形容这三个月：4 月在地板上吃泡面时根扎进土里；5 月在京都长出新枝；6 月侄女出生那天，开了第一朵花。"</div>
        <div class="compare-story-body">
          这三个月，她做了三件以前不会做的事：一个人包场看电影、一个人在国外迷路、生日不告诉任何人。
          把它们放在一起，她才看见一条主线——开始学会和自己单独待在一起。
        </div>
        <div class="compare-story-body">
          她和家人的连接也更深了：爸爸第一次跟她讲爷爷的故事，妈妈把月季举到镜头前，侄女攥住护士的手指。
        </div>
        <div class="compare-story-body" style="color:var(--amber-deep);font-style:italic">
          回头看，她不会觉得这三个月"飞快地过去了"。它会觉得：它有边界，有名字，可以讲出来。
        </div>
      </div>

      <button class="compare-cta" id="compare-cta">我也想这样</button>
    `;
    ov.classList.add('show');

    // 渲染前后两个迷你 meadow
    document.getElementById('meadow-before').innerHTML = renderCompareMeadow({ grass: 4, blooms: 0 });
    document.getElementById('meadow-after').innerHTML = renderCompareMeadow({ grass: 24, blooms: 8, dense: true });

    document.getElementById('compare-close').addEventListener('click', () => ov.classList.remove('show'));
    document.getElementById('compare-cta').addEventListener('click', () => {
      ov.classList.remove('show');
      enterEmptyMode();
      switchView('tell');
      setTimeout(() => openCompose(), 300);
    });
  }

  // 迷你 meadow（对比 overlay 用）
  function renderCompareMeadow({ grass = 0, blooms = 0, dense = false }) {
    const w = 120, h = 100;
    let svg = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%">`;
    svg += `<rect width="${w}" height="${h}" fill="transparent"/>`;
    // 地平线
    svg += `<rect y="${h*0.7}" width="${w}" height="${h*0.3}" fill="#d9c795" opacity="0.4"/>`;
    // 草
    for (let i = 0; i < grass; i++) {
      const gx = 8 + (i / Math.max(grass, 1)) * (w - 16) + Math.sin(i * 2.7) * 3;
      const gy = h * 0.82 + Math.cos(i * 1.3) * 4;
      const gh = dense ? 10 + Math.abs(Math.sin(i * 0.9)) * 8 : 6 + Math.abs(Math.sin(i * 0.9)) * 4;
      svg += `<path d="M ${gx} ${gy} Q ${gx-1} ${gy-gh/2} ${gx} ${gy-gh}" stroke="#7a9b6e" stroke-width="1" fill="none" stroke-linecap="round"/>`;
    }
    // 花
    for (let i = 0; i < blooms; i++) {
      const fx = 12 + (i / Math.max(blooms, 1)) * (w - 24) + Math.sin(i * 3.1) * 5;
      const fy = h * 0.72 + Math.cos(i * 1.7) * 6;
      svg += `<line x1="${fx}" y1="${fy+6}" x2="${fx}" y2="${fy-3}" stroke="#5d7a5c" stroke-width="0.6"/>`;
      svg += `<circle cx="${fx}" cy="${fy-3}" r="2.2" fill="#d97a85"/>`;
      svg += `<circle cx="${fx}" cy="${fy-3}" r="0.7" fill="#fff" opacity="0.8"/>`;
    }
    svg += `</svg>`;
    return svg;
  }

  // ============ 朴素/旷野切换（R2 应对）============
  function togglePlainMode() {
    state.plainMode = !state.plainMode;
    const icons = ['plain-icon-tell', 'plain-icon-meadow', 'plain-icon-archive'];
    icons.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = state.plainMode ? '📜' : '🌿';
    });
    // 重新渲染当前视图
    if (state.currentView === 'tell') renderTell();
    if (state.currentView === 'meadow') renderMeadow();
    if (state.currentView === 'archive') renderArchive();
  }

  // ============================================================
  // 视图 1：这一周（首页，根据数据自动选空/有状态）
  // ============================================================
  function renderTell() {
    const scroll = document.getElementById('tell-scroll');
    const allMoments = state.moments;

    // 空状态：完全不同的极简首页
    if (allMoments.length === 0) {
      scroll.innerHTML = `
        <div class="tell-empty">
          <div class="empty-headline">今天，<br/>有什么是你想留住的？</div>
          <div class="empty-sub">一张照片、一个心情、一句话——<br/>任何一个都算。</div>
          <button class="empty-plus" id="empty-plus">＋</button>
          <div class="empty-hint">按这个开始</div>
        </div>
      `;
      document.getElementById('empty-plus').addEventListener('click', openCompose);
      return;
    }

    // 有数据状态：完整讲述挑战首页
    const html = [];
    const weekMoments = getWeekMoments();
    const told = weekMoments.filter(m => m.toldAt);
    const untold = weekMoments.filter(m => !m.toldAt);

    // 邀请卡（R1：邀请不是任务，不显示 0/3）
    let title, status;
    if (state.weekSkipped) {
      title = '这周就算了';
      status = '平淡的日子也是日子。下周再见。';
    } else if (told.length === 0) {
      title = '这周三个故事，你讲得出吗？';
      status = '这周还安静着呢。留一张照片就算开始。';
    } else if (told.length < 3) {
      title = '这周三个故事，你讲得出吗？';
      status = `你已经讲了 ${told.length} 个。${told.length === 1 ? '再讲两个？' : '再讲一个？'}或者就这样也很好。`;
    } else {
      title = '这周你讲过了';
      status = `${told.length} 个故事。够了。`;
    }
    // v3.6：今晚扫描卡片（顶部，反 streak：可忽略、不积累）
    const scanCard = renderNightScanCard();
    if (scanCard) html.push(scanCard);
    // v3.22：记忆浮现（可变回报，有时出现）
    const resurface = renderResurfaceCard();
    if (resurface) html.push(resurface);
    html.push(`
      <div class="challenge-invite">
        <div class="invite-period">这一周</div>
        <div class="invite-title">${escapeHtml(title)}</div>
        <div class="invite-status">${escapeHtml(status)}</div>
      </div>
    `);

    // 已讲（花）—— Bento：第一张用大图，其余用 compact
    html.push('<div class="section-label">这一周你讲过的</div>');
    if (told.length === 0) {
      html.push('<div style="font-size:12px;color:var(--ink-faint);padding:8px 0 24px">（这周还没讲过。留一张照片就算开始。）</div>');
    } else {
      html.push('<div class="told-list">');
      told.forEach((m, idx) => {
        const mood = MOODS[m.mood];
        const isHero = idx === 0 && m.image;  // 第一张有大图 → Bento 主卡
        if (isHero) {
          // Bento 主卡：大图在上 + 内容在下
          html.push(`
            <div class="told-card">
              <img class="told-hero-img" src="${m.image}" alt="" loading="lazy"/>
              <div class="told-card-body">
                <div class="told-text"><span class="told-emoji">${mood.emoji}</span>${escapeHtml(m.text)}</div>
                ${m.why ? `<div class="told-why">${escapeHtml(m.why)}</div>` : ''}
                <div class="told-meta">
                  <span class="level-badge ${m.level === 2 ? 'l2' : ''}">${m.level === 2 ? '留过原声' : '讲过'}</span>
                  ${m.location && m.location !== '—' ? `<span>· ${escapeHtml(m.location)}</span>` : ''}
                  ${m.people && m.people.length ? `<span>· ${m.people.map(escapeHtml).join('、')}</span>` : ''}
                </div>
              </div>
            </div>
          `);
        } else {
          // Compact 横排卡片
          html.push(`
            <div class="told-card compact">
              ${m.image ? `<img class="told-thumb" src="${m.image}" alt="" loading="lazy"/>` : ''}
              <div class="told-card-body">
                <div class="told-text"><span class="told-emoji">${mood.emoji}</span>${escapeHtml(m.text)}</div>
                ${m.why ? `<div class="told-why">${escapeHtml(m.why)}</div>` : ''}
                <div class="told-meta">
                  <span class="level-badge ${m.level === 2 ? 'l2' : ''}">${m.level === 2 ? '留过原声' : '讲过'}</span>
                  ${m.location && m.location !== '—' ? `<span>· ${escapeHtml(m.location)}</span>` : ''}
                  ${m.people && m.people.length ? `<span>· ${m.people.map(escapeHtml).join('、')}</span>` : ''}
                </div>
              </div>
            </div>
          `);
        }
      });
      html.push('</div>');
    }

    // 未讲（草）+ 升级按钮
    if (untold.length > 0) {
      html.push('<div class="section-label" style="margin-top:24px">这周的瞬间</div>');
      html.push('<div class="untold-list">');
      untold.forEach(m => {
        const mood = MOODS[m.mood];
        html.push(`
          <div class="untold-card">
            ${m.image ? `<img class="untold-thumb" src="${m.image}" alt="" loading="lazy"/>` : ''}
            <div class="untold-body">
              <div class="untold-text">${mood.emoji} ${escapeHtml(m.text)}</div>
              <div class="untold-meta">${fmtDate(m.date)}</div>
            </div>
            <button class="untold-upgrade-btn" data-upgrade="${m.id}">说点什么</button>
          </div>
        `);
      });
      html.push('</div>');
    }

    // AI 提问（R3：只提问不代写）
    const relevantQs = WEEK_CHALLENGE.aiQuestions.filter(q => {
      const m = getMoment(q.forMomentId);
      return m && !m.toldAt;
    });
    if (relevantQs.length > 0) {
      html.push('<div class="ai-help-section"><div class="section-label">不知道怎么开头？</div><div class="ai-questions">');
      relevantQs.forEach(q => {
        const m = getMoment(q.forMomentId);
        html.push(`
          <div class="ai-question">
            <div class="ai-question-context">关于：${escapeHtml(m.text)}</div>
            ${escapeHtml(q.question)}
          </div>
        `);
      });
      html.push('</div>');
      html.push('<button class="opening-template-btn" id="opening-template-btn">💬 给我一个开头</button>');
      html.push('</div>');
    }

    // 周末章节入口（D 论点核心：让用户亲自编译本周）
    const weekChapterKey = weekKey(todayStr());
    const hasWeekChapter = !!WEEK_CHAPTERS[weekChapterKey];
    if (!hasWeekChapter && weekMoments.length >= 1 && !state.weekSkipped) {
      html.push(`
        <div class="week-chapter-invite">
          <div class="wc-eyebrow">这一周即将过去</div>
          <div class="wc-title">要不要把它编成一个故事？</div>
          <div class="wc-sub">从本周的瞬间里挑 2-3 个，给这周起个名字——这就是这一周的故事。</div>
          <button class="wc-start-btn" id="wc-start-btn">开始本周章节</button>
          <p class="wc-hint">5 分钟之内能完成。也可以这周就算了。</p>
        </div>
      `);
    } else if (hasWeekChapter) {
      const ch = WEEK_CHAPTERS[weekChapterKey];
      html.push(`
        <div class="week-chapter-done">
          <div class="wc-eyebrow">本周章节</div>
          <div class="wc-title-done">${escapeHtml(ch.title)}</div>
          <div class="wc-sub">${escapeHtml(ch.opening.slice(0, 100))}...</div>
          <button class="wc-view-btn" id="wc-view-btn">阅读本周故事</button>
        </div>
      `);
    }

    // v3.18 人生格子入口（讲述首页底部常驻）
    const birth = getUserBirth();
    if (birth) {
      const nowWeek = Math.floor((TODAY.getTime() - birth.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const age = Math.floor((TODAY.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      const recordedWeeks = new Set();
      for (const m of state.moments) {
        const w = Math.floor((parseDate(m.date).getTime() - birth.getTime()) / (7*24*60*60*1000));
        if (w >= 0 && w < 4160) recordedWeeks.add(w);
      }
      html.push(`
        <div class="life-grid-entry" id="life-grid-entry">
          <div class="lge-header">
            <span class="lge-emoji">🗓️</span>
            <span class="lge-title">你的人生格子</span>
          </div>
          <div class="lge-stats">
            <span><b>${age}</b> 岁 · 第 <b>${nowWeek}</b> 周</span>
            <span><b>${recordedWeeks.size}</b> 周被点亮</span>
          </div>
          <div class="lge-preview" id="lge-preview"></div>
          <button class="lge-btn" id="lge-btn">展开我的一生 ›</button>
        </div>
      `);
    } else if (state.mode === 'empty') {
      // empty mode 没登记生日——提示
      html.push(`
        <div class="life-grid-entry" id="life-grid-entry">
          <div class="lge-header">
            <span class="lge-emoji">🗓️</span>
            <span class="lge-title">人生格子</span>
          </div>
          <p class="lge-sub">登记生日，看到你在人生格子里的位置——每 Mark 一个瞬间，对应的格子会被点亮。</p>
          <button class="lge-btn" id="lge-register-btn">登记生日 ›</button>
        </div>
      `);
    }

    // 跳过本周（R1）
    html.push(`
      <div class="skip-week">
        <button class="skip-week-btn ${state.weekSkipped ? 'skipped' : ''}" id="skip-week-btn">${state.weekSkipped ? '本周已跳过' : '这周就算了'}</button>
        <p class="skip-week-hint">不会失去任何东西。平淡的日子也是日子。</p>
      </div>
    `);

    scroll.innerHTML = html.join('');

    // 绑定事件
    scroll.querySelectorAll('[data-upgrade]').forEach(btn => {
      btn.addEventListener('click', () => openUpgrade(btn.dataset.upgrade));
    });
    const ot = document.getElementById('opening-template-btn');
    if (ot) ot.addEventListener('click', () => document.getElementById('opening-overlay').classList.add('show'));
    const sw = document.getElementById('skip-week-btn');
    if (sw) sw.addEventListener('click', () => { state.weekSkipped = !state.weekSkipped; renderTell(); });

    // v3.6：今晚扫描事件
    const scanClose = document.getElementById('scan-close');
    if (scanClose) scanClose.addEventListener('click', () => { state.scanDisabled = true; renderTell(); });
    const scanSkip = document.getElementById('scan-skip');
    if (scanSkip) scanSkip.addEventListener('click', () => { state.scanIgnoredToday = true; renderTell(); });
    // v3.22 记忆浮现关闭
    const resurfaceClose = document.getElementById('resurface-close');
    if (resurfaceClose) resurfaceClose.addEventListener('click', () => {
      const c = document.getElementById('resurface-card');
      if (c) { c.style.opacity = '0'; c.style.transform = 'scale(0.95)'; setTimeout(() => c.remove(), 300); }
    });
    scroll.querySelectorAll('.night-scan-item').forEach(item => {
      item.addEventListener('click', () => openUpgrade(item.dataset.upgrade));
    });

    // v3.8：周末章节编译入口
    const wcStart = document.getElementById('wc-start-btn');
    if (wcStart) wcStart.addEventListener('click', openWeekChapter);
    const wcView = document.getElementById('wc-view-btn');
    if (wcView) wcView.addEventListener('click', openWeekChapterRead);

    // v3.18 人生格子入口
    const lgeBtn = document.getElementById('lge-btn');
    if (lgeBtn) lgeBtn.addEventListener('click', () => {
      // 切到旷野 + life zoom
      document.querySelector('.lens-pill[data-lens="time"]').click();
      document.querySelector('.zoom-pill[data-zoom="life"]').click();
      document.querySelector('.tab[data-tab="meadow"]').click();
    });
    const lgeRegBtn = document.getElementById('lge-register-btn');
    if (lgeRegBtn) lgeRegBtn.addEventListener('click', showBirthRegistration);

    // 渲染预览格子（迷你版 52 列）
    const lgePreview = document.getElementById('lge-preview');
    if (lgePreview) {
      const birth = getUserBirth();
      if (birth) {
        const nowWeek = Math.floor((TODAY.getTime() - birth.getTime()) / (7*24*60*60*1000));
        const wm = {};
        for (const m of state.moments) {
          const w = Math.floor((parseDate(m.date).getTime() - birth.getTime()) / (7*24*60*60*1000));
          if (w >= 0 && w < 4160) wm[w] = (wm[w]||0)+1;
        }
        // 渲染最近 5 年的格子（260 周）
        const startWeek = Math.max(0, nowWeek - 130);
        const endWeek = Math.min(4160, nowWeek + 130);
        let cells = '';
        for (let w = startWeek; w < endWeek; w++) {
          let cls = 'lge-cell';
          if (w === nowWeek) cls += ' now';
          else if (wm[w]) cls += wm[w] >= 2 ? ' filled-deep' : ' filled';
          cells += `<div class="${cls}"></div>`;
        }
        lgePreview.innerHTML = cells;
      }
    }
  }

    // ============================================================
  // L0 → L1 升级流（讲述）
  // ============================================================
  function openUpgrade(momentId) {
    const m = getMoment(momentId);
    if (!m) return;
    state.upgradeTargetId = momentId;

    document.getElementById('upgrade-moment').innerHTML = `
      ${m.image ? `<img src="${m.image}" alt=""/>` : ''}
      <div class="upgrade-moment-text">${escapeHtml(m.text)}</div>
    `;
    document.getElementById('upgrade-why').value = m.why || '';

    // AI 帮助：找匹配的提问
    const aq = WEEK_CHALLENGE.aiQuestions.find(q => q.forMomentId === momentId);
    const aiHelp = document.getElementById('upgrade-ai-help');
    const openTpl = document.getElementById('upgrade-open-tpl');
    if (aq) {
      document.getElementById('upgrade-ai-question').textContent = aq.question;
      aiHelp.style.display = 'block';
      openTpl.style.display = 'none';
    } else {
      aiHelp.style.display = 'none';
      openTpl.style.display = 'block';
    }

    document.getElementById('upgrade-overlay').classList.add('show');
  }

  function closeUpgrade() {
    document.getElementById('upgrade-overlay').classList.remove('show');
    state.upgradeTargetId = null;
  }

  function confirmUpgrade() {
    const m = getMoment(state.upgradeTargetId);
    if (!m) return;
    const why = document.getElementById('upgrade-why').value.trim();
    if (!why) {
      const el = document.getElementById('upgrade-why');
      el.style.borderColor = 'var(--bloom)';
      el.placeholder = '哪怕一句话也行……';
      return;
    }
    m.level = 1;
    m.why = why;
    m.toldAt = todayStr();
    saveMoments();
    closeUpgrade();
    renderTell();
    setTimeout(checkMilestones, 1800);  // v3.19
    // 静默反馈
    const done = document.getElementById('compose-done');
    document.getElementById('done-sub').textContent = '这是一个 L1 故事。它会被你记住。';
    done.classList.add('show');
    setTimeout(() => done.classList.remove('show'), 1500);
  }

  // ============================================================
  // 周末章节编译流（v3.8 核心：让用户亲自编出本周故事）
  // ============================================================
  function openWeekChapter() {
    const overlay = document.getElementById('upgrade-overlay');
    const card = overlay.querySelector('.upgrade-card');
    const weekMoments = getWeekMoments();

    // 用 upgrade-overlay 容器渲染周章节编辑器
    card.innerHTML = `
      <div class="upgrade-header">
        <span class="upgrade-title">本周章节</span>
        <button class="upgrade-close" id="wc-close">×</button>
      </div>
      <div class="upgrade-body">
        <div class="wc-step" id="wc-step-1">
          <div class="compose-section-label">第 1 步 · 从本周瞬间里挑 2-3 个</div>
          <p style="font-size:13px;color:var(--ink-soft);margin-bottom:14px;line-height:1.7">这周哪些瞬间你想留住？挑出来，TSD 会帮你串成故事。</p>
          <div class="wc-pick-list" id="wc-pick-list">
            ${weekMoments.map(m => {
              const mood = MOODS[m.mood];
              return `
                <div class="wc-pick-item" data-id="${m.id}">
                  <div class="wc-pick-check"></div>
                  ${m.image ? `<img class="wc-pick-thumb" src="${m.image}" alt=""/>` : '<div class="wc-pick-thumb-empty"></div>'}
                  <div class="wc-pick-body">
                    <div class="wc-pick-text">${mood.emoji} ${escapeHtml(m.text)}</div>
                    <div class="wc-pick-meta">${fmtDate(m.date)}${m.people && m.people.length ? ' · ' + m.people.map(escapeHtml).join('、') : ''}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          <button class="upgrade-btn" id="wc-next-1" disabled>挑好了（0/2）</button>
        </div>

        <div class="wc-step" id="wc-step-2" style="display:none">
          <div class="compose-section-label">第 2 步 · 给这一周起个名字</div>
          <p style="font-size:13px;color:var(--ink-soft);margin-bottom:14px;line-height:1.7">不用正式，就一个名字。比如"一个人的电影院"、"梅雨结束的那一周"。</p>
          <input class="wc-title-input" id="wc-title-input" placeholder="比如：和一束光待了一周" maxlength="20" />
          <div class="compose-section-label" style="margin-top:18px">第 3 步 · 想补一句吗？ <span class="label-hint">（可选）</span></div>
          <textarea class="wc-note-input" id="wc-note-input" placeholder="这周讲的是什么？不补也行。" maxlength="100" rows="3"></textarea>
          <button class="upgrade-btn" id="wc-finish">编成故事</button>
        </div>

        <div class="wc-step" id="wc-step-3" style="display:none">
          <div class="wc-done-icon">📖</div>
          <div class="wc-done-title" id="wc-done-title"></div>
          <div class="wc-done-body" id="wc-done-body"></div>
          <button class="upgrade-btn" id="wc-done-close">回到这一周</button>
        </div>
      </div>
    `;
    overlay.classList.add('show');

    // 第 1 步：挑瞬间
    let picked = new Set();
    const pickItems = card.querySelectorAll('.wc-pick-item');
    pickItems.forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        if (picked.has(id)) {
          picked.delete(id);
          item.classList.remove('picked');
        } else if (picked.size < 3) {
          picked.add(id);
          item.classList.add('picked');
        }
        const next = card.querySelector('#wc-next-1');
        next.disabled = picked.size < 2;
        next.textContent = `挑好了（${picked.size}/3）`;
      });
    });

    card.querySelector('#wc-close').addEventListener('click', () => overlay.classList.remove('show'));
    card.querySelector('#wc-next-1').addEventListener('click', () => {
      card.querySelector('#wc-step-1').style.display = 'none';
      card.querySelector('#wc-step-2').style.display = 'block';
      card.querySelector('#wc-title-input').focus();
    });

    card.querySelector('#wc-finish').addEventListener('click', async () => {
      const title = card.querySelector('#wc-title-input').value.trim() || '这一周';
      const note = card.querySelector('#wc-note-input').value.trim();
      const pickedMoments = [...picked].map(id => getMoment(id)).filter(Boolean);
      const finishBtn = card.querySelector('#wc-finish');
      finishBtn.textContent = '正在编译...';
      finishBtn.disabled = true;

      // v3.28 尝试 LLM 编译，失败降级到规则引擎
      let opening, body;
      try {
        const aiResult = await compileWithAI(pickedMoments, title, note);
        opening = aiResult.opening;
        body = aiResult.body;
      } catch(e) {
        // 降级
        opening = compileWeekOpening(pickedMoments);
        body = note ? [note] : [];
      }

      // 存到 WEEK_CHAPTERS
      WEEK_CHAPTERS[weekKey(todayStr())] = {
        weekKey: weekKey(todayStr()),
        period: WEEK_CHALLENGE.period,
        title,
        pickedMomentIds: [...picked],
        opening,
        body,
        growth: 'new_branch',
      };
      saveMoments();

      // 第 3 步：展示成果
      card.querySelector('#wc-step-2').style.display = 'none';
      card.querySelector('#wc-step-3').style.display = 'block';
      card.querySelector('#wc-done-title').textContent = title;
      card.querySelector('#wc-done-body').innerHTML = `
        <p style="font-family:var(--font-serif);font-size:14px;line-height:1.85;color:var(--ink);margin:14px 0;padding-left:12px;border-left:3px solid var(--amber-soft)">${escapeHtml(opening)}</p>
        ${note ? `<p style="font-size:13px;color:var(--ink-soft);line-height:1.7">${escapeHtml(note)}</p>` : ''}
        <p style="font-size:11px;color:var(--ink-faint);margin-top:14px">这一周被编进了你的 TSD。<br/>它不会消失在"飞快的过去"里了。</p>
      `;
    });

    card.querySelector('#wc-done-close').addEventListener('click', () => {
      overlay.classList.remove('show');
      renderTell();
    });
  }

  // 编译周章节开头（忠实编辑，从用户挑的瞬间串成）
  function compileWeekOpening(picked) {
    if (picked.length === 0) return '这一周，你保留了几个瞬间。';
    if (picked.length === 1) {
      const m = picked[0];
      return `这一周留给你印象最深的，是 ${fmtDate(m.date)}：${m.text}。`;
    }
    // 多个：找时间最早的 → 最晚的，串起来
    const sorted = [...picked].sort((a, b) => a.date.localeCompare(b.date));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (sorted.length === 2) {
      return `这一周有两件事被你留住：${fmtDate(first.date)}的「${first.text.slice(0, 20)}」，和${fmtDate(last.date)}的「${last.text.slice(0, 20)}」。`;
    }
    return `这一周你留了 ${sorted.length} 个瞬间：从${fmtDate(first.date)}到${fmtDate(last.date)}，它们各自不同，但放在一起，讲出了这一周。`;
  }

  // v3.28 AI 编译（忠实编辑，保留用户原话）
  async function compileWithAI(pickedMoments, userTitle, userNote) {
    // 检查 AI 后端是否可用（Demo 阶段 API 未就绪 → 降级）
    const API_URL = (typeof TSD_CONFIG !== 'undefined' && TSD_CONFIG.aiApiUrl) || null;
    if (!API_URL) {
      // 降级到增强版规则引擎（比 v3.8 更智能）
      return compileWithSmartRules(pickedMoments, userTitle, userNote);
    }

    // 构建素材摘要
    const 素材 = pickedMoments.map(m => {
      const mood = MOODS[m.mood];
      const parts = [
        `日期：${fmtDate(m.date)}`,
        `瞬间：${m.text}`,
        m.why ? `为什么重要："${m.why}"` : '',
        m.people && m.people.length ? `人物：${m.people.join('、')}` : '',
        m.location && m.location !== '—' ? `地点：${m.location}` : '',
        `心情：${mood.label}`,
        m.isFirst ? '标记：第一次' : '',
      ].filter(Boolean);
      return parts.join('\n');
    }).join('\n---\n');

    const prompt = `你是一个忠实的记忆编辑。下面是用户这周挑出的几个瞬间。请帮他把它们串成一段开篇（opening），要求：

1. 只用用户自己的原话和事实——不补充合理细节，不猜人物内心
2. 不使用比喻和抒情——除非用户自己用了
3. 如果发现两个瞬间之间有隐含联系（比如同一个人、同一种情绪），可以点出
4. 语气要像用户自己在说话，不像 AI 在写
5. 不超过 100 字

用户给这一周起的名字："${userTitle}"
${userNote ? `用户补充：${userNote}` : ''}

素材：
${素材}

请输出 JSON 格式：{"opening": "开篇文字", "body": ["可选的正文段落，可为空数组"]}`;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model: 'lite' }),
    });
    if (!response.ok) throw new Error('AI compile failed');
    const data = await response.json();
    return {
      opening: data.opening || compileWeekOpening(pickedMoments),
      body: data.body || (userNote ? [userNote] : []),
    };
  }

  // v3.28 增强版规则引擎（比 v3.8 更智能，发现隐含联系）
  function compileWithSmartRules(picked, userTitle, userNote) {
    if (picked.length === 0) return { opening: '这一周，你保留了几个瞬间。', body: [] };

    // 找共同人物
    const allPeople = picked.flatMap(m => m.people || []);
    const peopleCounts = {};
    allPeople.forEach(p => peopleCounts[p] = (peopleCounts[p]||0)+1);
    const sharedPeople = Object.entries(peopleCounts).filter(([_,c]) => c >= 2).map(([p]) => p);

    // 找共同情绪
    const moods = picked.map(m => m.mood);
    const moodCounts = {};
    moods.forEach(mo => moodCounts[mo] = (moodCounts[mo]||0)+1);
    const dominantMood = Object.entries(moodCounts).sort((a,b) => b[1]-a[1])[0];
    const isMoodDominant = dominantMood && dominantMood[1] >= 2;
    const moodLabel = dominantMood ? MOODS[dominantMood[0]].label : '';

    // 找第一次
    const firsts = picked.filter(m => m.isFirst);

    const sorted = [...picked].sort((a, b) => a.date.localeCompare(b.date));

    // 构建开篇（根据发现选择模板）
    let opening;
    if (sharedPeople.length > 0) {
      // 共同人物为主轴
      const person = sharedPeople[0];
      const relatedMoments = sorted.filter(m => (m.people||[]).includes(person));
      opening = `和${person}有关的瞬间出现了${relatedMoments.length}次。${sorted[0].text.slice(0,15)}——${sorted[0].why ? sorted[0].why.slice(0,20) : '它留在你心里'}。`;
    } else if (isMoodDominant) {
      // 共同情绪为主轴
      opening = `这几个瞬间都是${moodLabel}的。${sorted[0].text.slice(0,20)}——从${fmtDate(sorted[0].date)}到${fmtDate(sorted[sorted.length-1].date)}，这种感受贯穿了这一周。`;
    } else if (firsts.length > 0) {
      // 第一次为主轴
      opening = `这一周有${firsts.length}个"第一次"。${firsts[0].text.slice(0,25)}——${firsts[0].why || '一个新的边界'}。`;
    } else if (sorted.length === 1) {
      opening = `${sorted[0].text}${sorted[0].why ? '——'+sorted[0].why : ''}`;
    } else {
      // 通用：时间线串联
      const excerpts = sorted.map(m => `「${m.text.slice(0, 12)}」`).join('，');
      opening = `从${fmtDate(sorted[0].date)}的${excerpts}——把它们放在一起，才能看出这一周。`;
    }

    const body = userNote ? [userNote] : [];
    return { opening, body };
  }

  function openWeekChapterRead() {
    const ch = WEEK_CHAPTERS[weekKey(todayStr())];
    if (!ch) return;
    const overlay = document.getElementById('upgrade-overlay');
    const card = overlay.querySelector('.upgrade-card');
    card.innerHTML = `
      <div class="upgrade-header">
        <span class="upgrade-title">本周故事</span>
        <button class="upgrade-close" id="wc-read-close">×</button>
      </div>
      <div class="upgrade-body">
        <div class="chapter-card season" style="margin:0;border:none;padding:0;background:transparent">
          <div class="chapter-period">${ch.period}</div>
          <div class="chapter-title">${escapeHtml(ch.title)}</div>
          <div class="chapter-opening">${escapeHtml(ch.opening)}</div>
          ${ch.body.map(p => `<p class="story-body-para">${escapeHtml(p)}</p>`).join('')}
        </div>
        <button class="story-share-btn" onclick="window.__TSD_SHARE_WEEK()">📤 分享</button>
      </div>
    `;
    overlay.classList.add('show');
    card.querySelector('#wc-read-close').addEventListener('click', () => overlay.classList.remove('show'));
  }

  // ============================================================
  // 分享卡生成（v3.9：用 canvas 生成 PNG 故事长图）
  // ============================================================
  function generateShareCard(type, data) {
    // type: 'week' | 'month' | 'season'
    const canvas = document.createElement('canvas');
    const W = 1080;
    const H = type === 'season' ? 1920 : (type === 'month' ? 1620 : 1350);
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // 背景：温暖米白渐变
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#faf6ef');
    bgGrad.addColorStop(1, '#f0e6d0');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 顶部品牌带
    ctx.fillStyle = '#c8873c';
    ctx.font = '600 32px "Noto Serif SC", serif';
    ctx.fillText('TSD · Time Slow Down', 80, 90);
    ctx.fillStyle = '#8a5a1f';
    ctx.font = '24px "Noto Serif SC", serif';
    ctx.fillText('让走过的时间，长成你的人生。', 80, 130);

    // 分隔线
    ctx.strokeStyle = '#e8c89a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, 170);
    ctx.lineTo(W - 80, 170);
    ctx.stroke();

    // 类型标签
    const typeLabel = { week: '本周故事', month: '月度风景', season: '季度仪式' }[type] || '故事';
    ctx.fillStyle = '#b07a4a';
    ctx.font = '500 22px "Noto Sans SC", sans-serif';
    ctx.fillText(typeLabel.toUpperCase() + '  ·  ' + (data.period || ''), 80, 220);

    // 标题
    ctx.fillStyle = '#2d2a26';
    ctx.font = '700 64px "Noto Serif SC", serif';
    wrapText(ctx, data.title || '这一周', 80, 310, W - 160, 80);

    // 开场（衬线斜体感）
    let y = 460;
    if (data.opening) {
      ctx.fillStyle = '#8a5a1f';
      ctx.font = 'italic 36px "Noto Serif SC", serif';
      y = wrapText(ctx, '"' + data.opening + '"', 100, y, W - 200, 56);
      y += 40;
    }

    // 正文段
    if (data.body && data.body.length) {
      ctx.fillStyle = '#2d2a26';
      ctx.font = '32px "Noto Sans SC", sans-serif';
      for (const p of data.body) {
        y = wrapText(ctx, p, 80, y, W - 160, 52);
        y += 30;
      }
    }

    // 底部装饰：旷野 SVG 风格简笔（草+花）
    y = H - 240;
    drawMiniMeadow(ctx, 80, y, W - 160, 140);

    // 底部签名
    ctx.fillStyle = '#b3aa9c';
    ctx.font = '22px "Noto Sans SC", sans-serif';
    ctx.fillText('— TSD —', W / 2 - 40, H - 60);

    return canvas;
  }

  // 简笔旷野装饰
  function drawMiniMeadow(ctx, x, y, w, h) {
    // 地面
    ctx.fillStyle = 'rgba(217, 199, 149, 0.4)';
    ctx.fillRect(x, y + h * 0.5, w, h * 0.5);
    // 草
    ctx.strokeStyle = '#7a9b6e';
    ctx.lineWidth = 2;
    for (let i = 0; i < 15; i++) {
      const gx = x + 20 + (i / 15) * (w - 40);
      const gy = y + h * 0.7;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.quadraticCurveTo(gx - 2, gy - 15, gx, gy - 25);
      ctx.stroke();
    }
    // 花
    for (let i = 0; i < 4; i++) {
      const fx = x + 60 + (i / 4) * (w - 120);
      const fy = y + h * 0.55;
      ctx.fillStyle = '#5d7a5c';
      ctx.fillRect(fx, fy, 1.5, 20);
      ctx.fillStyle = '#d97a85';
      ctx.beginPath();
      ctx.arc(fx, fy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(fx, fy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 文本换行
  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const chars = text.split('');
    let line = '';
    let lineCount = 0;
    for (let i = 0; i < chars.length; i++) {
      const testLine = line + chars[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line) {
        ctx.fillText(line, x, y + lineCount * lineHeight);
        line = chars[i];
        lineCount++;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y + lineCount * lineHeight);
    return y + (lineCount + 1) * lineHeight;
  }

  // 触发下载
  // v3.25 分享/下载 canvas（Capacitor 原生 Share + Filesystem / Web download）
  async function downloadCanvas(canvas, filename) {
    const dataUrl = canvas.toDataURL('image/png');

    if (isNative && CapacitorShare) {
      // Capacitor 原生分享
      try {
        if (CapacitorFS) {
          // 先写文件，再分享
          const base64 = dataUrl.split(',')[1];
          const fileResult = await CapacitorFS.writeFile({
            path: filename,
            data: base64,
            directory: 'CACHE',  // 临时目录
          });
          await CapacitorShare.share({
            title: 'TSD 故事',
            url: fileResult.uri,
          });
          showToast('已弹出分享');
          return;
        }
      } catch(e) { /* 降级 */ }
    }

    // Web 模式：Blob + <a download>
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('已保存到下载');
    }, 'image/png');
  }

  // 分享周章节
  function shareWeekChapter() {
    const ch = WEEK_CHAPTERS[weekKey(todayStr())];
    if (!ch) {
      // 找最近一个
      const keys = Object.keys(WEEK_CHAPTERS).sort().reverse();
      if (keys.length === 0) return;
      ch = WEEK_CHAPTERS[keys[0]];
    }
    const canvas = generateShareCard('week', {
      period: ch.period,
      title: ch.title,
      opening: ch.opening,
      body: ch.body,
    });
    downloadCanvas(canvas, `tsd-week-${ch.weekKey}.png`);
  }

  // 分享季度
  function shareSeason() {
    const s = SEASON_RITUAL['2026-Q2'];
    const canvas = generateShareCard('season', {
      period: s.period,
      title: s.title,
      opening: s.opening,
      body: s.body,
    });
    downloadCanvas(canvas, `tsd-season-2026-Q2.png`);
  }

  // ============================================================
  // 视图 2：旷野语义缩放
  // ============================================================
  function renderMeadow() {
    const zoom = state.meadowZoom;
    const lens = state.meadowLens;
    const level = MEADOW_LEVELS[zoom];
    document.getElementById('meadow-title').textContent = level.label;
    // 语义句随镜头变化
    const lensSemantic = {
      time: level.semantic,
      people: '谁与你共同走过了哪些阶段？',
      theme: '家庭、创造、工作、远方——它们如何变化？',
    }[lens];
    document.getElementById('meadow-semantic').textContent = lensSemantic;
    const canvas = document.getElementById('meadow-canvas');

    // 空状态
    if (state.moments.length === 0) {
      canvas.innerHTML = `
        <div class="meadow-empty">
          <div class="meadow-empty-title">这片旷野还是一片空白</div>
          <div class="meadow-empty-text">留下第一个瞬间，<br/>它会长出第一根草。</div>
          <button class="empty-plus" onclick="document.getElementById('fab').click()" style="margin-top:24px">＋</button>
        </div>
      `;
      return;
    }

    // 人物/主题镜头：单独渲染（不依赖时间 zoom）
    if (lens === 'people') { canvas.innerHTML = renderPeopleLens(); return; }
    if (lens === 'theme')  { canvas.innerHTML = renderThemeLens(); return; }

    if (state.plainMode) {
      canvas.innerHTML = renderPlainMeadow(zoom);
      return;
    }

    // 时间镜头
    if (zoom === 'today') canvas.innerHTML = renderTodayMeadow();
    else if (zoom === 'week') canvas.innerHTML = renderWeekMeadow();
    else if (zoom === 'month') canvas.innerHTML = renderMonthMeadow();
    else if (zoom === 'year') canvas.innerHTML = renderYearMeadow();
    else if (zoom === 'life') {
      canvas.innerHTML = renderLifeMeadow();
      // v3.23 canvas 渲染人生格子
      setTimeout(() => drawLifeGridCanvas(), 50);
    }
  }

  // v3.23 canvas 人生格子（4160 格用 1 个 canvas 节点渲染）
  function drawLifeGridCanvas() {
    const cvs = document.getElementById('life-grid-canvas');
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const birth = BIRTH();
    const nowWeek = Math.floor((TODAY.getTime() - birth.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const weekMap = {};
    for (const m of state.moments) {
      if (m.archived) continue;
      const d = parseDate(m.date);
      const w = Math.floor((d.getTime() - birth.getTime()) / (7*24*60*60*1000));
      if (w >= 0 && w < 4160) weekMap[w] = (weekMap[w]||0)+1;
    }
    const cols = 52, rows = 80;
    const cellW = cvs.width / cols;
    const cellH = cvs.height / rows;
    const gap = 1;
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    for (let w = 0; w < 4160; w++) {
      const col = w % cols;
      const row = Math.floor(w / cols);
      const x = col * cellW + gap/2;
      const y = row * cellH + gap/2;
      const cw = cellW - gap;
      const ch = cellH - gap;

      if (w === nowWeek) {
        ctx.fillStyle = '#c8873c';
        ctx.fillRect(x, y, cw, ch);
        // 脉冲光环
        ctx.shadowColor = 'rgba(200,135,60,0.6)';
        ctx.shadowBlur = 6;
        ctx.fillRect(x, y, cw, ch);
        ctx.shadowBlur = 0;
      } else if (w > nowWeek) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(x, y, cw, ch);
        ctx.strokeStyle = 'rgba(232,221,204,0.3)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, cw, ch);
      } else if (weekMap[w]) {
        ctx.fillStyle = weekMap[w] >= 2 ? '#5d7a5c' : '#c8873c';
        ctx.fillRect(x, y, cw, ch);
      } else {
        ctx.fillStyle = '#d4cab6';
        ctx.globalAlpha = 0.7;
        ctx.fillRect(x, y, cw, ch);
        ctx.globalAlpha = 1;
      }
    }

    // 点击回填：canvas 坐标 → 周序号
    cvs.onclick = e => {
      const rect = cvs.getBoundingClientRect();
      const scaleX = cvs.width / rect.width;
      const scaleY = cvs.height / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top) * scaleY;
      const col = Math.floor(cx / cellW);
      const row = Math.floor(cy / cellH);
      const week = row * cols + col;
      if (week >= 0 && week < nowWeek && !weekMap[week]) {
        openBackfill(week);
      }
    };
  }

  // 人物镜头：按出现频率 + 用户确认，列出重要的人
  function renderPeopleLens() {
    const peopleMap = {};
    for (const m of state.moments) {
      if (!m.people || !m.people.length) continue;
      for (const p of m.people) {
        if (!peopleMap[p]) peopleMap[p] = { name: p, moments: [], firstDate: m.date, lastDate: m.date };
        peopleMap[p].moments.push(m);
        if (m.date < peopleMap[p].firstDate) peopleMap[p].firstDate = m.date;
        if (m.date > peopleMap[p].lastDate) peopleMap[p].lastDate = m.date;
      }
    }
    const people = Object.values(peopleMap).sort((a, b) => b.moments.length - a.moments.length);

    if (people.length === 0) {
      return `<div class="meadow-empty"><div class="meadow-empty-title">还没有出现过具体的人</div><div class="meadow-empty-text">Mark 瞬间时加上"和谁"，<br/>这里会长出关系树。</div></div>`;
    }

    return `
      <div class="people-lens">
        <div class="lens-intro">这 ${people.length} 个人，在你的记忆里出现过。</div>
        ${people.map(p => `
          <div class="people-card">
            <div class="people-avatar">${escapeHtml(p.name[0])}</div>
            <div class="people-body">
              <div class="people-name">${escapeHtml(p.name)}</div>
              <div class="people-meta">${p.moments.length} 个瞬间 · ${fmtDate(p.firstDate)} → ${fmtDate(p.lastDate)}</div>
              <div class="people-moments">
                ${p.moments.slice(0, 3).map(m => `<div class="people-moment">${MOODS[m.mood].emoji} ${escapeHtml(m.text.slice(0, 30))}</div>`).join('')}
                ${p.moments.length > 3 ? `<div class="people-more">+${p.moments.length - 3} 个</div>` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // 主题镜头：按 location/first/mood 聚类
  function renderThemeLens() {
    // 简化：按 mood 聚类（深/感激/好奇等）
    const themeMap = {};
    for (const m of state.moments) {
      const mood = MOODS[m.mood];
      if (!themeMap[m.mood]) themeMap[m.mood] = { label: mood.label, emoji: mood.emoji, color: mood.color, moments: [] };
      themeMap[m.mood].moments.push(m);
    }
    const themes = Object.values(themeMap).sort((a, b) => b.moments.length - a.moments.length);

    // 按"第一次"/"地点"也做主题
    const firsts = state.moments.filter(m => m.isFirst);
    if (firsts.length > 0) {
      themes.unshift({ label: '第一次', emoji: '🌱', color: '#5d7a5c', moments: firsts, isSpecial: true });
    }

    return `
      <div class="theme-lens">
        <div class="lens-intro">这是你记忆里的几条主线。</div>
        ${themes.map(t => `
          <div class="theme-card" style="border-left-color: ${t.color}">
            <div class="theme-header">
              <span class="theme-emoji">${t.emoji}</span>
              <span class="theme-name">${escapeHtml(t.label)}</span>
              <span class="theme-count">${t.moments.length}</span>
            </div>
            <div class="theme-moments">
              ${t.moments.slice(0, 4).map(m => `<div class="theme-moment">${escapeHtml(m.text.slice(0, 40))}<span class="theme-date">${fmtDate(m.date)}</span></div>`).join('')}
              ${t.moments.length > 4 ? `<div class="theme-more">+${t.moments.length - 4} 个</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // 今日地貌
  function renderTodayMeadow() {
    const today = state.moments.filter(m => m.date === todayStr());
    return `
      <div class="meadow-canvas">
        ${renderMeadowSvg({ grass: today.length, blooms: today.filter(m=>m.toldAt).length })}
        <div class="meadow-summary">
          今天有 <b>${today.length}</b> 个瞬间。<br/>
          其中 <b>${today.filter(m=>m.toldAt).length}</b> 个讲过了。
        </div>
      </div>
    `;
  }

  // 本周地貌
  function renderWeekMeadow() {
    const week = getWeekMoments();
    const told = week.filter(m => m.toldAt);
    return `
      <div class="meadow-canvas">
        ${renderMeadowSvg({ grass: week.length, blooms: told.length, withStream: true })}
        <div class="meadow-summary">
          这一周你留下了 <b>${week.length}</b> 个瞬间，讲过 <b>${told.length}</b> 个。<br/>
          ${told.length === 0 ? '草也属于旷野。' : '花是你讲过的，草是 Mark 了还没讲的。'}
        </div>
      </div>
    `;
  }

  // 月地貌
  function renderMonthMeadow() {
    const monthsToShow = ['2026-07', '2026-06', '2026-05', '2026-04'];
    return monthsToShow.map(mk => {
      const ms = state.moments.filter(m => monthKey(m.date) === mk);
      // 优先用 MONTH_LANDSCAPES，没有就降级到 MEADOW_LEVELS.month.themes
      const landscape = MONTH_LANDSCAPES[mk] || MEADOW_LEVELS.month.themes[mk];
      if (!landscape) return '';
      const told = ms.filter(m => m.toldAt).length;
      const isJuly = mk === '2026-07';  // 当月，可能还未编译
      return `
        <div class="chapter-card ${isJuly ? 'uncompiled' : ''}">
          <div class="chapter-period">${landscape.period || mk}</div>
          <div class="chapter-title">${escapeHtml(landscape.title)}</div>
          ${isJuly ? '<div class="chapter-tag">进行中</div>' : ''}
          ${landscape.mainline ? `<div class="chapter-mainline">${escapeHtml(landscape.mainline)}</div>` : ''}
          ${landscape.turningPoint ? `
            <div class="story-section-label" style="margin-top:14px">转折</div>
            <div class="chapter-mainline" style="color:var(--amber-deep);font-style:italic">${escapeHtml(landscape.turningPoint)}</div>
          ` : ''}
          ${renderMeadowSvg({ grass: ms.length, blooms: told, height: 80, withStream: true })}
          <div class="meadow-summary" style="margin-top:10px">
            ${ms.length} 个瞬间 · ${told} 个讲过
            ${landscape.weekChapterCount ? ` · ${landscape.weekChapterCount} 个周章节` : ''}
            ${landscape.keyPeople && landscape.keyPeople.length ? ` · ${landscape.keyPeople.map(escapeHtml).join('、')}` : ''}
          </div>
          ${ms.length >= 3 && !landscape.userNamed ? `
            <button class="wc-view-btn month-name-btn" data-month="${mk}" style="margin-top:10px;width:100%">📅 给这个月起个名字</button>
          ` : ''}
          ${landscape.userNamed ? `<div style="margin-top:8px;font-size:11px;color:var(--moss-deep);font-style:italic">✓ 你给这个月起过名字</div>` : ''}
        </div>
      `;
    }).join('');
  }

  // 一生地貌：人生格子可点击回填
  function renderLifeMeadow() {
    const birth = BIRTH();
    const age = Math.floor((TODAY.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    const nowWeek = Math.floor((TODAY.getTime() - birth.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const weekMap = {};
    for (const m of state.moments) {
      if (m.archived) continue;
      const d = parseDate(m.date);
      const ms = d.getTime() - birth.getTime();
      const w = Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
      if (w >= 0 && w < 4160) weekMap[w] = (weekMap[w] || 0) + 1;
    }
    // v3.23 性能优化：用 canvas 渲染 4160 格（1 个 DOM 节点替代 4160 个）
    return `
      <div class="chapter-card">
        <div class="chapter-period">一生</div>
        <div class="chapter-title">你 ${age} 岁，活成了什么样子</div>
        <div class="chapter-mainline">
          已走过 <b>${nowWeek}</b> 周；<br/>
          其中 <b>${Object.keys(weekMap).length}</b> 周留下了痕迹。
        </div>
        <canvas class="life-grid-canvas" id="life-grid-canvas" width="624" height="960"></canvas>
        <div class="meadow-summary">
          每一格是一周。填满的格子，是你活过的证据；<br/>
          空白的格子，是还要去活的理由。<br/>
          <span style="color:var(--amber-deep);margin-top:6px;display:inline-block">点空白格可以回填过去的瞬间 ›</span>
        </div>
      </div>
    `;
  }

  // ============================================================
  // v3.21 月度命名仪式
  // ============================================================
  function showMonthNaming(monthKey) {
    const ms = state.moments.filter(m => monthKey === monthKey(m.date)).sort((a,b) => a.date.localeCompare(b.date));
    const told = ms.filter(m => m.toldAt);
    const landscape = MONTH_LANDSCAPES[monthKey] || {};
    const people = [...new Set(ms.flatMap(m => m.people || []))];

    // 预编译草稿
    const draftTitle = told.length >= 2
      ? `从 ${fmtDate(told[0].date)} 到 ${fmtDate(told[told.length-1].date)}`
      : `${ms.length} 个瞬间的这个月`;
    const draftMainline = told.length >= 1
      ? `这个月你留住了 ${ms.length} 个瞬间，讲出了 ${told.length} 个故事。${people.length ? `出现的最重要的人：${people.slice(0,3).join('、')}。` : ''}`
      : `这个月你留住了 ${ms.length} 个瞬间。`;

    const ov = document.getElementById('upgrade-overlay');
    const card = ov.querySelector('.upgrade-card');
    card.innerHTML = `
      <div class="upgrade-header">
        <span class="upgrade-title">给这个月起个名字</span>
        <button class="upgrade-close" id="mn-close">×</button>
      </div>
      <div class="upgrade-body">
        <div class="mn-preview">
          <div class="mn-preview-label">TSD 看到的这个月</div>
          <p style="font-size:13px;color:var(--ink-soft);line-height:1.7;margin-bottom:10px">${escapeHtml(draftMainline)}</p>
          ${told.slice(0, 3).map(m => {
            const mood = MOODS[m.mood];
            return `<div style="font-size:12px;color:var(--ink);margin-bottom:4px;padding-left:8px;border-left:2px solid var(--amber-soft)">${mood.emoji} ${escapeHtml(m.text.slice(0,30))}</div>`;
          }).join('')}
        </div>

        <div class="compose-section-label">这个月叫什么？</div>
        <input class="wc-title-input" id="mn-title" placeholder="${escapeHtml(draftTitle)}" maxlength="20" style="margin-bottom:14px" />
        <div class="compose-section-label">这个月有什么开始、结束、或悄悄改变了？ <span class="label-hint">（可选）</span></div>
        <textarea class="wc-note-input" id="mn-change" placeholder="比如：开始了新的健身习惯 / 老朋友联系变少了 / 心态更稳了" rows="3" style="margin-bottom:14px"></textarea>

        <button class="upgrade-btn" id="mn-save">命名这个月</button>
        <p class="upgrade-hint">命名后，这个月会在你的旷野里有了名字——不再只是\"${monthKey}\"。</p>
      </div>
    `;
    ov.classList.add('show');

    card.querySelector('#mn-close').addEventListener('click', () => ov.classList.remove('show'));
    card.querySelector('#mn-save').addEventListener('click', () => {
      const title = card.querySelector('#mn-title').value.trim() || draftTitle;
      const change = card.querySelector('#mn-change').value.trim();
      // 写入 MONTH_LANDSCAPES
      MONTH_LANDSCAPES[monthKey] = {
        ...landscape,
        monthKey,
        period: landscape.period || monthKey,
        title,
        mainline: change || draftMainline,
        turningPoint: change || landscape.turningPoint,
        keyPeople: people,
        weekChapterCount: Object.keys(WEEK_CHAPTERS).filter(k => k.startsWith(monthKey.slice(0,4))).length,
        userNamed: true,
      };
      saveMoments();
      ov.classList.remove('show');
      renderMeadow();
      showToast(`这个月叫"${title}"`);
      checkMilestones();
    });
  }


  function showSeasonRitual() {
    const ritual = SEASON_RITUAL['2026-Q2'];
    const qMoments = ritual.keyMoments.map(id => getMoment(id)).filter(Boolean);
    const ov = document.getElementById('upgrade-overlay');
    const card = ov.querySelector('.upgrade-card');

    // 第 1 步：自由回忆
    card.innerHTML = `
      <div class="upgrade-header">
        <span class="upgrade-title">九十日回忆仪式</span>
        <button class="upgrade-close" id="ritual-close">×</button>
      </div>
      <div class="upgrade-body ritual-body" id="ritual-body">
        <div class="ritual-step" id="ritual-step-1">
          <div style="text-align:center;padding:20px 0">
            <div style="font-size:48px;margin-bottom:14px">🕯️</div>
            <p style="font-family:var(--font-serif);font-size:20px;color:var(--ink);line-height:1.6;margin-bottom:10px">闭上眼，<br/>用 60 秒回想这三个月</p>
            <p style="font-size:13px;color:var(--ink-soft);line-height:1.7;margin-bottom:20px">不需要翻档案。<br/>最先浮现的几个经历是什么？<br/>它们就是你真正记住的。</p>
            <div class="ritual-timer" id="ritual-timer">60</div>
            <div style="display:flex;gap:8px;margin-top:20px">
              <button class="upgrade-btn" id="ritual-skip" style="background:var(--bg-warm);color:var(--ink-soft);flex:1">跳过</button>
              <button class="upgrade-btn" id="ritual-start" style="flex:1">开始回忆</button>
            </div>
          </div>
        </div>
      </div>
    `;
    ov.classList.add('show');
    card.querySelector('#ritual-close').addEventListener('click', () => ov.classList.remove('show'));
    card.querySelector('#ritual-skip').addEventListener('click', () => showSeasonRitualReveal(card, ritual, qMoments, []));
    card.querySelector('#ritual-start').addEventListener('click', () => {
      // 60 秒倒计时
      let sec = 60;
      const timer = card.querySelector('#ritual-timer');
      timer.classList.add('running');
      const interval = setInterval(() => {
        sec--;
        if (sec <= 0) {
          clearInterval(interval);
          showSeasonRitualReveal(card, ritual, qMoments, []);
        } else {
          timer.textContent = sec;
          if (sec <= 10) timer.classList.add('urgent');
        }
      }, 1000);
    });
  }

  function showSeasonRitualReveal(card, ritual, qMoments, freeRecall) {
    const toldMoments = state.moments.filter(m => m.toldAt);
    card.innerHTML = `
      <div class="upgrade-header">
        <span class="upgrade-title">九十日回忆仪式</span>
        <button class="upgrade-close" id="ritual-close2">×</button>
      </div>
      <div class="upgrade-body ritual-body">
        <div class="ritual-reveal">
          <p class="ritual-intro">这三个月，你留住了 <b>${state.moments.length}</b> 个瞬间，<br/>讲出了 <b>${toldMoments.length}</b> 个故事。</p>

          <div class="ritual-section-label">13 个周</div>
          <div class="ritual-week-grid">
            ${Array.from({length: 13}, (_, i) => {
              const has = i < 5;  // 示例：5 周有内容
              return `<div class="ritual-week-cell ${has ? 'lit' : ''}"></div>`;
            }).join('')}
          </div>

          <div class="ritual-section-label">3 幅月风景</div>
          <div class="ritual-months">
            <div class="ritual-month">4 月<br/><span>新的开始</span></div>
            <div class="ritual-month">5 月<br/><span>京都</span></div>
            <div class="ritual-month">6 月<br/><span>开花</span></div>
          </div>

          <div class="ritual-section-label">你最鲜明的那几个</div>
          <div class="ritual-key-moments">
            ${qMoments.map(m => {
              const mood = MOODS[m.mood];
              return `
                <div class="ritual-moment">
                  ${m.image ? `<img src="${m.image}" alt=""/>` : ''}
                  <div class="ritual-moment-body">
                    <div class="ritual-moment-text">${mood.emoji} ${escapeHtml(m.text)}</div>
                    ${m.why ? `<div class="ritual-moment-why">"${escapeHtml(m.why)}"</div>` : ''}
                    <div class="ritual-moment-date">${fmtDate(m.date)}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="ritual-quote">
            <p>${escapeHtml(ritual.opening)}</p>
          </div>

          <div class="ritual-self-know">
            <p>这些都是你留住并讲过的。<br/>真正的记忆，是看到线索后能<b>重新讲出来</b>的那些。</p>
            <p style="margin-top:8px;color:var(--ink-faint);font-size:12px">不显示记忆力分数，不与他人比较。<br/>这个仪式只是陪你看看——这三个月没有被时间吞掉。</p>
          </div>

          <button class="upgrade-btn" id="ritual-done">完成仪式</button>
          <button class="story-share-btn" style="margin-top:8px" onclick="window.__TSD_SHARE_SEASON()">📤 分享这一季</button>
        </div>
      </div>
    `;
    card.querySelector('#ritual-close2').addEventListener('click', () => document.getElementById('upgrade-overlay').classList.remove('show'));
    card.querySelector('#ritual-done').addEventListener('click', () => {
      document.getElementById('upgrade-overlay').classList.remove('show');
      showToast('九十日仪式完成 · 这三个月没有消失');
      checkMilestones();
    });
  }

  // 过去回填
  function openBackfill(weekIndex) {
    const ov = document.getElementById('upgrade-overlay');
    const card = ov.querySelector('.upgrade-card');
    const birthDate = new Date(BIRTH().getTime() + weekIndex * 7 * 24 * 60 * 60 * 1000);
    const endDate = new Date(birthDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const fmtD = d => `${d.getFullYear()} 年 ${d.getMonth()+1} 月 ${d.getDate()} 日`;
    const defaultDate = birthDate.toISOString().slice(0, 10);

    card.innerHTML = `
      <div class="upgrade-header">
        <span class="upgrade-title">回填一段过去</span>
        <button class="upgrade-close" id="bf-close">×</button>
      </div>
      <div class="upgrade-body">
        <div class="bf-period">这一周是 <b>${fmtD(birthDate)}</b> – <b>${fmtD(endDate)}</b></div>
        <p style="font-size:13px;color:var(--ink-soft);margin-bottom:14px;line-height:1.7">那一周发生过什么？想起什么都行——一个画面、一个人、一个感受。模糊也没关系。</p>
        <div class="compose-section-label">那天发生了什么</div>
        <textarea class="wc-note-input" id="bf-text" placeholder="比如：和大学室友在校门口吃了一顿烧烤" rows="3"></textarea>
        <div class="compose-section-label">心情</div>
        <div class="compose-mood-row" id="bf-mood-row">
          ${Object.entries(MOODS).map(([k, m]) => `<button class="mood-chip" data-mood="${k}">${m.emoji} ${m.label}</button>`).join('')}
        </div>
        <div class="compose-section-label">和谁（可选）</div>
        <input class="wc-title-input" id="bf-people" placeholder="比如：室友老王" style="font-family:var(--font-sans);font-size:14px" />
        <button class="upgrade-btn" id="bf-save">回填进我的旷野</button>
        <p class="upgrade-hint">这一周原本是空白的，现在它有了痕迹。</p>
      </div>
    `;
    ov.classList.add('show');

    let selectedMood = 'warm';
    card.querySelectorAll('#bf-mood-row .mood-chip').forEach(c => {
      c.addEventListener('click', () => {
        card.querySelectorAll('#bf-mood-row .mood-chip').forEach(x => x.classList.remove('selected'));
        c.classList.add('selected');
        selectedMood = c.dataset.mood;
      });
    });
    card.querySelector('#bf-close').addEventListener('click', () => ov.classList.remove('show'));
    card.querySelector('#bf-save').addEventListener('click', () => {
      const text = card.querySelector('#bf-text').value.trim();
      if (!text) return;
      const newM = {
        id: 'bf-' + Date.now(),
        date: defaultDate,
        text,
        mood: selectedMood,
        location: '—',
        people: card.querySelector('#bf-people').value.trim() ? card.querySelector('#bf-people').value.trim().split(/[、,，]/).map(s=>s.trim()).filter(Boolean) : [],
        isFirst: false,
        image: null,
        level: 1,
        toldAt: defaultDate,
        why: text,
      };
      state.moments.push(newM);
      saveMoments();
      ov.classList.remove('show');
      renderMeadow();
      const done = document.getElementById('compose-done');
      document.getElementById('done-sub').textContent = '这一周原本空白，现在有了痕迹。';
      done.classList.add('show');
      setTimeout(() => done.classList.remove('show'), 1500);
    });
  }

  // 一生地貌
  // 年地貌（季度仪式）
  function renderYearMeadow() {
    const q2 = SEASON_RITUAL['2026-Q2'];
    const q2Moments = state.moments.filter(m => {
      const d = parseDate(m.date);
      return d.getFullYear() === 2026 && d.getMonth() >= 3 && d.getMonth() <= 5;
    });
    return `
      <div class="chapter-card season">
        <div class="chapter-period">${q2.period}</div>
        <div class="chapter-title">${escapeHtml(q2.title)}</div>
        <div class="chapter-opening">${escapeHtml(q2.opening)}</div>
        ${q2.body.map((p, i) => `<p class="story-body-para">${escapeHtml(p)}</p>`).join('')}
        ${renderMeadowSvg({ grass: q2Moments.length, blooms: q2Moments.filter(m=>m.toldAt).length, height: 100, withStream: true })}
        <div class="meadow-summary" style="margin-top:14px">
          ${q2.weekChapterCount} 个周章节 · ${q2.monthLandscapeCount} 个月风景 · ${q2.keyMoments.length} 个核心瞬间
        </div>
        ${q2.shareable ? `
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="story-share-btn" style="flex:1" onclick="window.__TSD_SHARE_SEASON()">📤 分享</button>
            <button class="story-share-btn" style="flex:1;background:var(--moss)" id="season-ritual-btn">🎬 季度回忆仪式</button>
          </div>
        ` : ''}
      </div>
      <div class="chapter-card">
        <div class="chapter-period">2026 · 第一季度</div>
        <div class="chapter-title" style="color:var(--ink-faint)">（你来 TSD 之前的日子）</div>
        <div class="chapter-mainline" style="color:var(--ink-faint)">这段时间没留下痕迹——也没关系。你可以从人生格子点选任意一周回填。</div>
      </div>
    `;
  }

  // 朴素模式（R2：灵魂测试 7 的可切换实现）
  function renderPlainMeadow(zoom) {
    let moments;
    if (zoom === 'today') moments = state.moments.filter(m => m.date === todayStr());
    else if (zoom === 'week') moments = getWeekMoments();
    else moments = [...state.moments].sort((a, b) => b.date.localeCompare(a.date));

    return `
      <div style="padding:14px;background:#fff;border-radius:14px;border:1px solid var(--line)">
        <div style="font-size:11px;color:var(--ink-faint);margin-bottom:10px;letter-spacing:1px">
          朴素模式 · ${MEADOW_LEVELS[zoom].label} · ${moments.length} 个瞬间
        </div>
        <div class="plain-list">
          ${moments.length === 0 ? '<div style="font-size:13px;color:var(--ink-faint);padding:20px;text-align:center">（这里还没有瞬间）</div>' :
            moments.map(m => {
              const mood = MOODS[m.mood];
              const levelBadge = m.toldAt
                ? `<span class="level-badge-mini ${m.level === 2 ? 'l2' : 'l1'}">L${m.level} 讲过</span>`
                : `<span class="level-badge-mini l0">L0 已 Mark</span>`;
              return `
                <div class="plain-row">
                  ${m.image ? `<img class="plain-thumb" src="${m.image}" alt="" loading="lazy"/>` : ''}
                  <div style="flex:1;min-width:0">
                    <div class="plain-text">${escapeHtml(m.text)}</div>
                    <div class="plain-meta">
                      ${mood.emoji} ${fmtDate(m.date)}
                      ${levelBadge}
                    </div>
                  </div>
                </div>
              `;
            }).join('')
          }
        </div>
      </div>
    `;
  }

  // SVG 地貌（草/花/河，R2：只反映不奖励）
  function renderMeadowSvg({ grass = 0, blooms = 0, height = 140, withStream = false }) {
    const w = 320;
    const h = height;
    let svg = `<svg class="meadow-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">`;

    // 天空渐变
    svg += `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#faf0d8"/><stop offset="1" stop-color="#f3e3bf"/>
    </linearGradient></defs>`;
    svg += `<rect width="${w}" height="${h}" fill="url(#sky)"/>`;

    // 河流（时间导航）
    if (withStream) {
      svg += `<path d="M 0 ${h*0.55} Q ${w/2} ${h*0.5} ${w} ${h*0.55} L ${w} ${h*0.62} Q ${w/2} ${h*0.57} 0 ${h*0.62} Z" fill="#bcd4d9" opacity="0.6"/>`;
      svg += `<path d="M 0 ${h*0.55} Q ${w/2} ${h*0.5} ${w} ${h*0.55}" stroke="#8aafb8" stroke-width="0.5" fill="none" opacity="0.7"/>`;
    }

    // 远山
    svg += `<path d="M 0 ${h*0.7} L ${w*0.2} ${h*0.55} L ${w*0.4} ${h*0.65} L ${w*0.6} ${h*0.5} L ${w*0.8} ${h*0.62} L ${w} ${h*0.55} L ${w} ${h} L 0 ${h} Z" fill="#c8b88a" opacity="0.4"/>`;

    // 地面
    svg += `<rect y="${h*0.7}" width="${w}" height="${h*0.3}" fill="#d9c795" opacity="0.5"/>`;

    // 青草（每个瞬间一根草，包括 L0）
    const grassCount = Math.min(grass, 30);
    for (let i = 0; i < grassCount; i++) {
      const gx = 20 + (i / Math.max(grassCount, 1)) * (w - 40) + (Math.sin(i * 2.7) * 8);
      const gy = h * 0.85 + Math.cos(i * 1.3) * 6;
      const gh = 8 + Math.abs(Math.sin(i * 0.9)) * 6;
      svg += `<path d="M ${gx} ${gy} Q ${gx-1} ${gy-gh/2} ${gx} ${gy-gh}" stroke="#7a9b6e" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
      svg += `<path d="M ${gx} ${gy} Q ${gx+1.5} ${gy-gh/2} ${gx+2} ${gy-gh+1}" stroke="#8ba888" stroke-width="1" fill="none" stroke-linecap="round" opacity="0.7"/>`;
    }

    // 花（L1+ 才有）
    const bloomCount = Math.min(blooms, 10);
    for (let i = 0; i < bloomCount; i++) {
      const fx = 40 + (i / Math.max(bloomCount, 1)) * (w - 80) + Math.sin(i * 3.1) * 10;
      const fy = h * 0.78 + Math.cos(i * 1.7) * 8;
      // 茎
      svg += `<line x1="${fx}" y1="${fy+8}" x2="${fx}" y2="${fy-4}" stroke="#5d7a5c" stroke-width="0.8"/>`;
      // 花
      svg += `<circle cx="${fx}" cy="${fy-4}" r="2.5" fill="#d97a85"/>`;
      svg += `<circle cx="${fx}" cy="${fy-4}" r="0.8" fill="#fff" opacity="0.8"/>`;
      // 叶
      svg += `<ellipse cx="${fx-2}" cy="${fy+2}" rx="1.5" ry="0.8" fill="#7a9b6e" transform="rotate(-30 ${fx-2} ${fy+2})"/>`;
    }

    svg += `</svg>`;
    return `<div class="meadow-canvas">${svg}</div>`;
  }

  // ============================================================
  // 视图 3：原料（河流列表）
  // ============================================================
  function renderArchive() {
    const list = document.getElementById('archive-list');
    const intro = document.getElementById('archive-intro');
    const query = (state.archiveQuery || '').trim().toLowerCase();
    let sorted = [...state.moments].sort((a, b) => b.date.localeCompare(a.date));
    if (query) {
      sorted = sorted.filter(m => {
        const hay = [
          m.text, m.why || '', m.location || '',
          (m.people || []).join(' '),
          MOODS[m.mood]?.label || '',
          m.date,
        ].join(' ').toLowerCase();
        return hay.includes(query);
      });
    }

    // 更新 intro 文案
    const viewLabels = { list: '按时间倒序', wall: '照片墙', map: '地图视图' };
    if (intro) intro.textContent = sorted.length + ' 个瞬间 · ' + (viewLabels[state.archiveView] || '');

    // 空状态
    if (sorted.length === 0) {
      list.innerHTML = `
        <div class="archive-empty">
          <div style="font-size:32px;margin-bottom:12px">📜</div>
          <div>${query ? '没找到匹配"' + escapeHtml(state.archiveQuery) + '"的瞬间' : '这里还没有留下任何瞬间'}</div>
          <div style="margin-top:8px">${query ? '试试别的关键词' : '按底部 ＋ Mark 你的第一个'}</div>
        </div>
      `;
      return;
    }

    // 三种视图
    if (state.archiveView === 'wall') {
      renderArchiveWall(sorted);
    } else if (state.archiveView === 'map') {
      renderArchiveMap(sorted);
    } else {
      renderArchiveList(sorted);
    }
  }

  // 列表视图（默认）
  function renderArchiveList(sorted) {
    const list = document.getElementById('archive-list');
    // 过滤掉"收起"的瞬间（软删除）
    const visible = sorted.filter(m => !m.archived);
    if (visible.length === 0 && sorted.length > 0) {
      list.innerHTML = `<div class="archive-empty"><div style="font-size:32px;margin-bottom:12px">📦</div><div>所有瞬间都被收起了</div><div style="margin-top:8px">点底部"收起的瞬间"可以恢复</div></div>`;
      return;
    }

    list.innerHTML = visible.map((m, idx) => {
      const mood = MOODS[m.mood];
      const levelBadge = m.toldAt
        ? `<span class="level-badge-mini ${m.level === 2 ? 'l2' : 'l1'}">${m.level === 2 ? '留过原声' : '讲过'}</span>`
        : `<span class="level-badge-mini l0">已 Mark</span>`;
      const weatherEmoji = { sunny: '☀️', plain: '🌤️', foggy: '🌫️', rainy: '🌧️', night: '🌌' }[m.weather] || '';
      return `
        <div class="archive-card" style="animation: cardEnter 0.4s var(--ease-out) ${idx * 0.04}s both">
          ${m.image ? `<img class="archive-card-image" src="${m.image}" alt="" loading="lazy"/>` : ''}
          <div class="archive-card-body">
            <div class="archive-card-text">${escapeHtml(m.text)}</div>
            ${m.why ? `<div class="archive-card-why">"${escapeHtml(m.why)}"</div>` : ''}
            <div class="archive-card-meta">
              <span>${mood.emoji} ${mood.label}</span>
              ${weatherEmoji ? `<span>${weatherEmoji}</span>` : ''}
              ${levelBadge}
              ${m.location && m.location !== '—' ? `<span>· ${escapeHtml(m.location)}</span>` : ''}
              ${m.people && m.people.length ? `<span>· ${m.people.map(escapeHtml).join('、')}</span>` : ''}
              ${m.isFirst ? `<span class="first-badge">第一次</span>` : ''}
              <span>· ${fmtDate(m.date)}</span>
            </div>
            <div class="archive-card-actions">
              <button class="archive-action-btn" data-edit="${m.id}">✏️ 编辑</button>
              <button class="archive-action-btn archive-action-tuck" data-tuck="${m.id}">📦 收起</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // 绑定编辑/收起
    list.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => openEditMoment(btn.dataset.edit));
    });
    list.querySelectorAll('[data-tuck]').forEach(btn => {
      btn.addEventListener('click', () => archiveMoment(btn.dataset.tuck));
    });
  }

  // 照片墙（瀑布流，CSS columns）
  function renderArchiveWall(sorted) {
    const list = document.getElementById('archive-list');
    const withImages = sorted.filter(m => m.image);
    const withoutImages = sorted.filter(m => !m.image);

    if (withImages.length === 0) {
      list.innerHTML = `<div class="archive-empty"><div style="font-size:32px;margin-bottom:12px">📷</div><div>还没有留过照片</div><div style="margin-top:8px">Mark 一张照片后，这里会出现照片墙</div></div>`;
      return;
    }

    list.innerHTML = `
      <div class="photo-wall">
        ${withImages.map((m, idx) => {
          const mood = MOODS[m.mood];
          const isTall = idx % 3 === 0;  // 错落感
          return `
            <div class="photo-wall-item" style="animation: wallEnter 0.5s var(--ease-out) ${idx * 0.05}s both">
              <img class="photo-wall-img ${isTall ? 'tall' : ''}" src="${m.image}" alt="" loading="lazy"/>
              <div class="photo-wall-overlay">
                <div class="photo-wall-emoji">${mood.emoji}</div>
                <div class="photo-wall-text">${escapeHtml(m.text.slice(0, 40))}</div>
                <div class="photo-wall-date">${fmtDate(m.date)}${m.people && m.people.length ? ' · ' + m.people.map(escapeHtml).join('、') : ''}</div>
              </div>
              ${m.toldAt ? '<div class="photo-wall-badge">🌸</div>' : ''}
              ${m.isFirst ? '<div class="photo-wall-first">第一次</div>' : ''}
            </div>
          `;
        }).join('')}
      </div>
      ${withoutImages.length > 0 ? `
        <div class="section-label" style="margin-top:24px">没有照片的瞬间 (${withoutImages.length})</div>
        <div class="photo-wall-text-only">
          ${withoutImages.map(m => {
            const mood = MOODS[m.mood];
            return `<div class="pw-text-item">${mood.emoji} ${escapeHtml(m.text.slice(0, 50))} <span class="pw-date">${fmtDate(m.date)}</span></div>`;
          }).join('')}
        </div>
      ` : ''}
    `;
  }

  // 地图视图（抽象网格——按 location 聚类，无真实地图依赖）
  function renderArchiveMap(sorted) {
    const list = document.getElementById('archive-list');
    const located = sorted.filter(m => m.location && m.location !== '—');
    if (located.length === 0) {
      list.innerHTML = `<div class="archive-empty"><div style="font-size:32px;margin-bottom:12px">📍</div><div>还没有标记地点的瞬间</div><div style="margin-top:8px">Mark 时加上地点，这里会显示地图</div></div>`;
      return;
    }

    // 按 location 聚类
    const locMap = {};
    for (const m of located) {
      if (!locMap[m.location]) locMap[m.location] = [];
      locMap[m.location].push(m);
    }
    const locs = Object.entries(locMap).sort((a, b) => b[1].length - a[1].length);

    list.innerHTML = `
      <div class="map-view">
        <div class="map-canvas">
          ${locs.map(([loc, ms], idx) => {
            const angle = (idx * 137.5) % 360;  // 黄金角分布
            const radius = 20 + (idx % 3) * 18;
            const x = 50 + Math.cos(angle * Math.PI / 180) * radius;
            const y = 50 + Math.sin(angle * Math.PI / 180) * radius;
            const size = Math.min(80, 30 + ms.length * 8);
            return `
              <div class="map-pin" style="
                left: ${x}%; top: ${y}%;
                width: ${size}px; height: ${size}px;
                animation: pinDrop 0.6s var(--ease-spring) ${idx * 0.1}s both;
              " data-loc="${escapeHtml(loc)}">
                <div class="map-pin-inner">${ms.length}</div>
                <div class="map-pin-label">${escapeHtml(loc)}</div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="map-legend">
          ${locs.map(([loc, ms]) => `
            <div class="map-legend-item">
              <span class="map-legend-emoji">📍</span>
              <span class="map-legend-loc">${escapeHtml(loc)}</span>
              <span class="map-legend-count">${ms.length} 个瞬间</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // ============================================================
  // v3.17 编辑 + 软删除（收起）+ 恢复
  // ============================================================

  // 编辑瞬间
  function openEditMoment(id) {
    const m = getMoment(id);
    if (!m) return;
    const ov = document.getElementById('upgrade-overlay');
    const card = ov.querySelector('.upgrade-card');
    const mood = MOODS[m.mood];

    card.innerHTML = `
      <div class="upgrade-header">
        <span class="upgrade-title">编辑这个瞬间</span>
        <button class="upgrade-close" id="edit-close">×</button>
      </div>
      <div class="upgrade-body">
        ${m.image ? `<img src="${m.image}" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:var(--r-sm);margin-bottom:14px"/>` : ''}
        <div class="compose-section-label">这一刻发生了什么</div>
        <textarea class="wc-note-input" id="edit-text" rows="2">${escapeHtml(m.text)}</textarea>
        <div class="compose-section-label">为什么重要（"为什么"是讲述的核心）</div>
        <textarea class="wc-note-input" id="edit-why" rows="2" placeholder="补充一句话">${escapeHtml(m.why || '')}</textarea>
        <div class="compose-section-label">心情</div>
        <div class="compose-mood-row" id="edit-mood-row">
          ${Object.entries(MOODS).map(([k, mm]) => `<button class="mood-chip ${k === m.mood ? 'selected' : ''}" data-mood="${k}">${mm.emoji} ${mm.label}</button>`).join('')}
        </div>
        <div class="compose-section-label">和谁（可选）</div>
        <input class="wc-title-input" id="edit-people" value="${escapeHtml((m.people || []).join('、'))}" style="font-family:var(--font-sans);font-size:14px" />
        <div class="compose-section-label">地点（可选）</div>
        <input class="wc-title-input" id="edit-location" value="${m.location && m.location !== '—' ? escapeHtml(m.location) : ''}" style="font-family:var(--font-sans);font-size:14px" />
        <label class="compose-first-check">
          <input type="checkbox" id="edit-first" ${m.isFirst ? 'checked' : ''} />
          <span>这是我的一个「第一次」</span>
        </label>
        <button class="upgrade-btn" id="edit-save">保存修改</button>
        <p class="upgrade-hint">改完不影响它已经讲过的故事——那部分是你的。</p>
      </div>
    `;
    ov.classList.add('show');

    let editMood = m.mood;
    card.querySelectorAll('#edit-mood-row .mood-chip').forEach(c => {
      c.addEventListener('click', () => {
        card.querySelectorAll('#edit-mood-row .mood-chip').forEach(x => x.classList.remove('selected'));
        c.classList.add('selected');
        editMood = c.dataset.mood;
      });
    });
    card.querySelector('#edit-close').addEventListener('click', () => ov.classList.remove('show'));
    card.querySelector('#edit-save').addEventListener('click', () => {
      m.text = card.querySelector('#edit-text').value.trim() || m.text;
      m.why = card.querySelector('#edit-why').value.trim();
      m.mood = editMood;
      m.people = card.querySelector('#edit-people').value.trim() ? card.querySelector('#edit-people').value.trim().split(/[、,，]/).map(s=>s.trim()).filter(Boolean) : [];
      m.location = card.querySelector('#edit-location').value.trim() || '—';
      m.isFirst = card.querySelector('#edit-first').checked;
      saveMoments();
      ov.classList.remove('show');
      renderArchive();
      showToast('已更新');
    });
  }

  // 软删除（收起）
  function archiveMoment(id) {
    const m = getMoment(id);
    if (!m) return;
    m.archived = true;
    m.archivedAt = new Date().toISOString();
    saveMoments();
    renderArchive();
    showToast('已收起 · 可在"收起的瞬间"恢复');
  }

  // 恢复页（收起的瞬间）
  function showArchivedMoments() {
    const ov = document.getElementById('upgrade-overlay');
    const card = ov.querySelector('.upgrade-card');
    const archived = state.moments.filter(m => m.archived);

    card.innerHTML = `
      <div class="upgrade-header">
        <span class="upgrade-title">收起的瞬间</span>
        <button class="upgrade-close" id="arch-close">×</button>
      </div>
      <div class="upgrade-body">
        ${archived.length === 0 ? `
          <div class="archive-empty">
            <div style="font-size:32px;margin-bottom:12px">📦</div>
            <div>没有收起的瞬间</div>
            <div style="margin-top:8px">收起的瞬间可以随时恢复——不会真正删除。</div>
          </div>
        ` : `
          <p style="font-size:13px;color:var(--ink-soft);margin-bottom:16px;line-height:1.7">这些瞬间被你收起了，不在原料列表显示。可以随时恢复，也可以彻底删除。</p>
          <div class="archived-list">
            ${archived.map(m => {
              const mood = MOODS[m.mood];
              return `
                <div class="archived-item">
                  <div class="archived-body">
                    <div class="archived-text">${mood.emoji} ${escapeHtml(m.text)}</div>
                    <div class="archived-meta">${fmtDate(m.date)}</div>
                  </div>
                  <div class="archived-actions">
                    <button class="archive-action-btn" data-restore="${m.id}">恢复</button>
                    <button class="archive-action-btn archive-action-delete" data-destroy="${m.id}">彻底删除</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
    ov.classList.add('show');

    card.querySelector('#arch-close').addEventListener('click', () => ov.classList.remove('show'));
    card.querySelectorAll('[data-restore]').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = getMoment(btn.dataset.restore);
        if (m) { delete m.archived; delete m.archivedAt; saveMoments(); showArchivedMoments(); renderArchive(); }
      });
    });
    card.querySelectorAll('[data-destroy]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.destroy;
        state.moments = state.moments.filter(m => m.id !== id);
        saveMoments();
        showArchivedMoments();
        renderArchive();
        showToast('已彻底删除');
      });
    });
  }


  // ============================================================
  function renderComposeMoods() {
    document.getElementById('compose-mood-row').innerHTML = Object.entries(MOODS).map(([k, m]) =>
      `<button class="mood-chip" data-mood="${k}">${m.emoji} ${m.label}</button>`
    ).join('');
  }

  function openCompose() {
    switchView('compose');
    document.getElementById('compose-text').value = '';
    document.getElementById('compose-people').value = '';
    document.getElementById('compose-first').checked = false;
    // v3.16 重置图片 slot（保留隐藏的 file input）
    const slot = document.getElementById('compose-image-slot');
    const existingInput = slot.querySelector('input[type="file"]');
    slot.innerHTML = '<span class="image-placeholder">＋ Mark 一张照片（推荐，5 秒就够）</span>';
    slot.style.border = '1px dashed var(--line)';
    slot.style.background = 'var(--bg-warm)';
    slot._tsdImage = null;
    if (existingInput) slot.appendChild(existingInput);  // 挂回 input
    document.querySelectorAll('.mood-chip').forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('.weather-chip').forEach(c => c.classList.remove('selected'));
    document.querySelector('.weather-chip[data-weather="plain"]')?.classList.add('active');
    state.selectedMood = null;
    state.selectedWeather = 'plain';
  }

  // v3.16 图片压缩（canvas resize + JPEG quality）
  function compressImage(dataUrl, maxW, quality) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxW) { h = h * (maxW / w); w = maxW; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);  // 压缩失败用原图
      img.src = dataUrl;
    });
  }

  function saveCompose() {
    const text = document.getElementById('compose-text').value.trim();
    const people = document.getElementById('compose-people').value.trim();
    const isFirst = document.getElementById('compose-first').checked;
    const slot = document.getElementById('compose-image-slot');
    const imgSrc = slot._tsdImage || null;  // v3.16 真实上传的 data URL
    const hasImage = !!imgSrc;

    // R3 应对：L0 Mark 也算——只要有照片或心情或文字任意一个
    if (!text && !state.selectedMood && !hasImage) {
      const p = document.querySelector('.compose-prompt');
      p.style.color = 'var(--amber-deep)';
      p.textContent = '哪怕只是一个心情，也行。';
      return;
    }

    // 判断层级
    let level = 0;
    if (text && text.length >= 5) level = 1;  // 有"为什么"算 L1
    const newM = {
      id: 'new-' + Date.now(),
      date: todayStr(),
      text: text || '（仅 Mark）',
      mood: state.selectedMood || 'warm',
      weather: state.selectedWeather || 'plain',
      location: '—',
      people: people ? people.split(/[、,，]/).map(s => s.trim()).filter(Boolean) : [],
      isFirst,
      image: imgSrc,
      level,
      toldAt: level >= 1 ? todayStr() : null,
      why: level >= 1 ? text : null,
    };
    state.moments.unshift(newM);
    saveMoments();

    // 反馈（R2：静默，不发奖励）
    const done = document.getElementById('compose-done');
    let sub;
    if (level === 0) {
      sub = '这是一个 L0 Mark。Mark 了就算讲过。';
    } else {
      sub = '这是一个 L1 故事。它会被你记住。';
    }
    document.getElementById('done-sub').textContent = sub;
    done.classList.add('show');
    setTimeout(() => {
      done.classList.remove('show');
      switchView('tell');
      checkMilestones();  // v3.19 检查是否获得新印记
    }, 1500);
  }

  // ============================================================
  // 事件绑定
  // ============================================================
  function bindEvents() {
    // tab
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        if (target === 'settings') {
          let v = document.querySelector('.view-settings');
          if (!v) {
            v = document.createElement('section');
            v.className = 'view view-settings';
            v.dataset.view = 'settings';
            v.innerHTML = `
              <header class="view-header"><div class="view-title">设置</div></header>
              <div class="setting-group">
                <div class="setting-row"><span>今晚扫描</span><span style="font-size:11px;color:var(--ink-soft);cursor:pointer" id="scan-toggle">${state.scanDisabled ? '已关闭 · 点此开启' : '已开启 · 点此关闭'}</span></div>
                <div class="setting-row"><span>朴素模式</span><span style="font-size:11px;color:var(--ink-soft)">${state.plainMode ? '已开启' : '未开启'}（点顶部 🌿/📜 切换）</span></div>
              </div>
              <div class="setting-group">
                <div class="setting-row"><span>导出我的记忆数据</span><span style="font-size:11px;color:var(--ink-soft);cursor:pointer" id="export-link">JSON ›</span></div>
                <div class="setting-row"><span>收起的瞬间</span><span style="font-size:11px;color:var(--ink-soft);cursor:pointer" id="archived-link">恢复 / 删除 ›</span></div>
                <div class="setting-row"><span>反馈 / 建议</span><span style="font-size:11px;color:var(--ink-soft);cursor:pointer" id="feedback-link">写一句 ›</span></div>
                <div class="setting-row"><span>隐私政策</span><span style="font-size:11px;color:var(--ink-soft);cursor:pointer" id="privacy-link">查看 ›</span></div>
                <div class="setting-row"><span style="color:#c54455">彻底清除所有数据</span><span style="font-size:11px;color:var(--ink-faint);cursor:pointer" id="wipe-link">不可恢复 ›</span></div>
              </div>
              <div class="setting-group">
                <div class="setting-row"><span>人生印记</span><span style="font-size:11px;color:var(--ink-soft);cursor:pointer" id="milestones-link">查看 ›</span></div>
                <div class="setting-row"><span>关于 TSD</span><span style="font-size:11px;color:var(--ink-soft);cursor:pointer" id="about-link">查看 ›</span></div>
                <div class="setting-row"><span>版本</span><span style="font-size:11px;color:var(--ink-soft)">v3.19 Demo</span></div>
              </div>
              <div class="setting-group">
                <div class="setting-row"><span>设计者：看示例数据</span><span style="font-size:11px;color:var(--ink-soft);cursor:pointer" id="demo-link">陈雨三个月 ›</span></div>
                <div class="setting-row"><span>设计者：重置 onboarding</span><span style="font-size:11px;color:var(--ink-soft);cursor:pointer" id="reset-link">点这里</span></div>
              </div>
            `;
            document.querySelector('.app-views').appendChild(v);
            const rl = v.querySelector('#reset-link');
            if (rl) rl.addEventListener('click', () => {
              try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
              location.reload();
            });
            const st = v.querySelector('#scan-toggle');
            if (st) st.addEventListener('click', () => {
              state.scanDisabled = !state.scanDisabled;
              st.textContent = state.scanDisabled ? '已关闭 · 点此开启' : '已开启 · 点此关闭';
            });
            const dl = v.querySelector('#demo-link');
            if (dl) dl.addEventListener('click', () => {
              enterDemoMode();
              switchView('tell');
              renderTell();
            });
            // v3.8 合规项
            const el = v.querySelector('#export-link');
            if (el) el.addEventListener('click', exportMyData);
            const fl = v.querySelector('#feedback-link');
            if (fl) fl.addEventListener('click', () => showInfoOverlay('feedback'));
            const pl = v.querySelector('#privacy-link');
            if (pl) pl.addEventListener('click', () => showInfoOverlay('privacy'));
            const al = v.querySelector('#about-link');
            if (al) al.addEventListener('click', () => showInfoOverlay('about'));
            const ml = v.querySelector('#milestones-link');
            if (ml) ml.addEventListener('click', showMilestonesCollection);
            // v3.12 彻底清除
            const wl = v.querySelector('#wipe-link');
            if (wl) wl.addEventListener('click', wipeAllData);
            // v3.17 收起的瞬间
            const al2 = v.querySelector('#archived-link');
            if (al2) al2.addEventListener('click', showArchivedMoments);
          }
          switchView('settings');
        } else if (target) {
          switchView(target);
        }
      });
    });

    // 朴素切换
    ['plain-toggle-tell', 'plain-toggle-meadow', 'plain-toggle-archive'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', togglePlainMode);
    });

    // 缩放
    document.querySelectorAll('.zoom-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.zoom-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.meadowZoom = btn.dataset.zoom;
        renderMeadow();
      });
    });

    // 镜头切换（v3.9）
    document.querySelectorAll('.lens-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.lens-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.meadowLens = btn.dataset.lens;
        // 人物/主题镜头下隐藏 zoom 控件（它们不分时间粒度）
        const zc = document.getElementById('zoom-controls');
        if (zc) zc.style.display = (state.meadowLens === 'time') ? '' : 'none';
        renderMeadow();
      });
    });

    // 过去回填：人生格子点击（事件委托）
    document.getElementById('meadow-canvas').addEventListener('click', e => {
      const cell = e.target.closest('[data-week]');
      if (cell) openBackfill(parseInt(cell.dataset.week, 10));
      // v3.20 季度仪式入口
      const ritualBtn = e.target.closest('#season-ritual-btn');
      if (ritualBtn) showSeasonRitual();
      // v3.21 月度命名入口
      const monthBtn = e.target.closest('.month-name-btn');
      if (monthBtn) showMonthNaming(monthBtn.dataset.month);
    });

    // 搜索（v3.10）
    const searchInput = document.getElementById('archive-search');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        state.archiveQuery = e.target.value;
        renderArchive();
      });
    }

    // 视图切换（v3.14）
    document.querySelectorAll('.archive-view-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.archive-view-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.archiveView = btn.dataset.aview;
        renderArchive();
      });
    });

    // 天气选择（v3.10 情绪语法）
    document.getElementById('weather-row')?.addEventListener('click', e => {
      const chip = e.target.closest('.weather-chip');
      if (!chip) return;
      document.querySelectorAll('.weather-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('selected');
      state.selectedWeather = chip.dataset.weather;
    });

    // 录入
    document.getElementById('tab-add').addEventListener('click', openCompose);
    document.getElementById('fab').addEventListener('click', openCompose);
    document.getElementById('compose-close').addEventListener('click', () => switchView('tell'));
    document.getElementById('compose-save').addEventListener('click', saveCompose);
    document.getElementById('compose-mood-row').addEventListener('click', e => {
      const chip = e.target.closest('.mood-chip');
      if (!chip) return;
      document.querySelectorAll('.mood-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      state.selectedMood = chip.dataset.mood;
    });
    // v3.25 照片上传（Capacitor Camera 原生 + FileReader Web 双模式）
    const imgSlot = document.getElementById('compose-image-slot');
    if (imgSlot && !imgSlot._tsdFileBound) {
      imgSlot._tsdFileBound = true;

      // 统一的"选照片"入口
      imgSlot.addEventListener('click', async e => {
        if (e.target.tagName === 'INPUT') return;
        let dataUrl = null;

        if (isNative && CapacitorCamera) {
          // === Capacitor 原生模式 ===
          try {
            const photo = await CapacitorCamera.getPhoto({
              quality: 70,
              allowEditing: false,
              resultType: 'Base64',     // 直接拿 base64
              source: 'PROMPT',          // 弹"拍照/相册"选择
              correctOrientation: true,
            });
            dataUrl = `data:image/${photo.format || 'jpeg'};base64,${photo.base64String}`;
          } catch(err) {
            // 用户取消，静默
          }
        } else {
          // === Web FileReader 模式（PWA/浏览器）===
          // 用隐藏 input 触发
          if (!imgSlot._fileInput) {
            const fi = document.createElement('input');
            fi.type = 'file';
            fi.accept = 'image/*';
            fi.capture = 'environment';
            fi.style.display = 'none';
            imgSlot.appendChild(fi);
            imgSlot._fileInput = fi;
          }
          return new Promise(resolve => {
            const fi = imgSlot._fileInput;
            fi.value = '';  // 重置，允许重选同一文件
            fi.onchange = ev => {
              const file = ev.target.files[0];
              if (!file) { resolve(); return; }
              const reader = new FileReader();
              reader.onload = evt => {
                compressImage(evt.target.result, 800, 0.7).then(compressed => {
                  dataUrl = compressed;
                  resolve();
                });
              };
              reader.readAsDataURL(file);
            };
            fi.click();
          });
        }

        // 有图 → 显示
        if (dataUrl) {
          // Capacitor 返回的 base64 可能很大，先压缩
          if (isNative) {
            dataUrl = await compressImage(dataUrl, 800, 0.7);
          }
          imgSlot.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover"/>`;
          if (imgSlot._fileInput) imgSlot.appendChild(imgSlot._fileInput);
          imgSlot.style.border = '1px solid var(--line)';
          imgSlot.style.background = '#fff';
          imgSlot._tsdImage = dataUrl;
        }
      });
    }

    // L1 升级
    document.getElementById('upgrade-close').addEventListener('click', closeUpgrade);
    document.getElementById('upgrade-confirm').addEventListener('click', confirmUpgrade);

    // 开场白模板（关闭按钮；opening-template-btn 在 renderTell 里动态绑定）
    document.getElementById('opening-close').addEventListener('click', () => {
      document.getElementById('opening-overlay').classList.remove('show');
    });

    // 注：skip-week-btn 和 opening-template-btn 现在都在 renderTell 里动态绑定
  }

  // ============================================================
  // v3.8：合规 - 数据导出 + 关于/隐私/反馈 overlay
  // ============================================================
  async function exportMyData() {
    const data = {
      exportedAt: new Date().toISOString(),
      appVersion: 'TSD v3.25',
      userMoments: state.moments,
      weekChapters: WEEK_CHAPTERS,
      monthLandscapes: MONTH_LANDSCAPES,
    };
    const jsonStr = JSON.stringify(data, null, 2);

    if (isNative && CapacitorFS && CapacitorShare) {
      // 原生：Filesystem + Share
      try {
        const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
        const result = await CapacitorFS.writeFile({
          path: `tsd-export-${todayStr()}.json`,
          data: base64,
          directory: 'DOCUMENTS',
        });
        await CapacitorShare.share({
          title: 'TSD 记忆备份',
          text: '你的 TSD 记忆数据已导出',
          url: result.uri,
        });
        showToast('已导出 JSON 备份');
        return;
      } catch(e) { /* 降级到 Web */ }
    }

    // Web：Blob + <a download>
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tsd-my-memories-${todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('已导出 JSON 备份');
  }

  // v3.12 彻底清除（带二次确认）
  function wipeAllData() {
    const ov = document.getElementById('upgrade-overlay');
    const card = ov.querySelector('.upgrade-card');
    card.innerHTML = `
      <div class="upgrade-header">
        <span class="upgrade-title" style="color:#c54455">彻底清除所有数据</span>
        <button class="upgrade-close" id="wipe-close">×</button>
      </div>
      <div class="upgrade-body">
        <p style="font-size:14px;line-height:1.7;color:var(--ink);margin-bottom:14px">这将<b style="color:#c54455">永久删除</b>你在 TSD 里的：</p>
        <ul style="font-size:13px;line-height:1.9;color:var(--ink-soft);margin-bottom:18px;padding-left:20px">
          <li>所有 Mark 的瞬间</li>
          <li>所有周章节、月风景</li>
          <li>所有反馈记录</li>
          <li>onboarding 状态（下次会重新走引导）</li>
        </ul>
        <p style="font-size:13px;line-height:1.7;color:var(--ink-soft);margin-bottom:18px"><b>不可恢复</b>。建议先点\"导出\"做一份备份。</p>
        <div style="display:flex;gap:8px">
          <button class="upgrade-btn" id="wipe-cancel" style="background:var(--bg-warm);color:var(--ink-soft);flex:1">取消</button>
          <button class="upgrade-btn" id="wipe-confirm" style="background:#c54455;flex:1">确认清除</button>
        </div>
      </div>
    `;
    ov.classList.add('show');
    card.querySelector('#wipe-close').addEventListener('click', () => ov.classList.remove('show'));
    card.querySelector('#wipe-cancel').addEventListener('click', () => ov.classList.remove('show'));
    card.querySelector('#wipe-confirm').addEventListener('click', () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('tsd_feedback');
        localStorage.removeItem('tsd_user_moments');
        localStorage.removeItem('tsd_user_chapters');
        localStorage.removeItem('tsd_user_months');  // v3.27
      } catch (e) {}
      location.reload();
    });
  }

  function showInfoOverlay(type) {
    let ov = document.getElementById('info-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'info-overlay';
      ov.className = 'upgrade-overlay';
      ov.innerHTML = '<div class="upgrade-card" id="info-card"></div>';
      document.querySelector('.phone-screen').appendChild(ov);
      ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('show'); });
    }
    const card = document.getElementById('info-card');
    const contents = {
      about: {
        title: '关于 TSD',
        body: `
          <p class="info-para">TSD（Time Slow Down）帮助感觉时间飞逝的人，把模糊经过的日子重新长成可回忆、可讲述、可分享的人生。</p>
          <p class="info-para"><b>三个月承诺</b>：连续使用三个月后，你能不费力地讲出 5-10 个鲜明瞬间——发生了什么、和谁有关、为什么重要。</p>
          <p class="info-para"><b>核心信念</b>：记录只是原料，故事和回忆才是交付物。每周一次亲自编译，让一周不再消失。</p>
          <p class="info-para" style="color:var(--ink-faint);font-size:12px">v3.8 Demo · ZCode 分支 · 2026-07-05<br/>遵循 Product Soul v1</p>
        `,
      },
      privacy: {
        title: '隐私政策',
        body: `
          <p class="info-para"><b>你的记忆，归你所有。</b></p>
          <p class="info-para">本 Demo 所有数据存储在你的浏览器（localStorage），不上传任何服务器。点击"导出"可随时下载 JSON 备份；点击"重置"会永久清除所有数据。</p>
          <p class="info-para"><b>未来生产版本将遵循</b>：</p>
          <ul class="info-list">
            <li>本地优先，设备内加密为第一落点</li>
            <li>可选端到端加密备份，服务端无法读取内容</li>
            <li>用户拥有恢复密钥</li>
            <li>完整导出与彻底删除，包括生成故事和云端副本</li>
            <li>AI 处理明确展示发送内容，敏感记忆可强制仅设备处理</li>
          </ul>
          <p class="info-para" style="color:var(--ink-faint);font-size:12px">无广告、不出售数据、人生印记不可付费解锁。</p>
          <hr style="border:none;border-top:1px solid var(--line);margin:18px 0" />
          <p class="info-para"><b>如果你正经历困难</b></p>
          <p class="info-para" style="font-size:12px;color:var(--ink-soft)">TSD 不是心理健康工具。如果你正经历悲伤、失去或抑郁，请联系专业帮助：</p>
          <ul class="info-list" style="font-size:12px">
            <li>全国心理援助热线：400-161-9995（24 小时）</li>
            <li>北京心理危机研究与干预中心：010-82951332</li>
            <li>或拨打你所在城市的心理援助热线</li>
          </ul>
          <p class="info-para" style="font-size:12px;color:var(--ink-faint);font-style:italic">你的感受是真实的，值得被专业地承接。</p>
        `,
      },
      feedback: {
        title: '反馈 / 建议',
        body: `
          <p class="info-para">谢谢你愿意帮 TSD 变得更好。</p>
          <textarea class="feedback-input" id="feedback-input" placeholder="一句话也行：哪里好用？哪里别扭？最想要什么？" rows="5"></textarea>
          <button class="upgrade-btn" id="feedback-submit">提交反馈</button>
          <p class="info-para" style="color:var(--ink-faint);font-size:11px;margin-top:14px">Demo 阶段：反馈仅本地保存，不会发送到任何服务器。</p>
        `,
      },
    };
    const c = contents[type];
    card.innerHTML = `
      <div class="upgrade-header">
        <span class="upgrade-title">${c.title}</span>
        <button class="upgrade-close" id="info-close">×</button>
      </div>
      <div class="upgrade-body info-body">${c.body}</div>
    `;
    ov.classList.add('show');
    card.querySelector('#info-close').addEventListener('click', () => ov.classList.remove('show'));
    const fb = card.querySelector('#feedback-submit');
    if (fb) fb.addEventListener('click', () => {
      const txt = card.querySelector('#feedback-input').value.trim();
      if (!txt) return;
      // 保存到 localStorage（Demo 阶段）
      try {
        const all = JSON.parse(localStorage.getItem('tsd_feedback') || '[]');
        all.push({ at: new Date().toISOString(), text: txt });
        localStorage.setItem('tsd_feedback', JSON.stringify(all));
      } catch (e) {}
      ov.classList.remove('show');
      const done = document.getElementById('compose-done');
      document.getElementById('done-sub').textContent = '谢谢。你帮 TSD 变得更好了。';
      done.classList.add('show');
      setTimeout(() => done.classList.remove('show'), 1500);
    });
  }

  // ============================================================
  // 启动
  // ============================================================
  // 轻提示 toast
  function showToast(text, duration = 2000) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = text;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), duration);
  }

  // ============================================================
  // v3.19 人生印记（成就系统，不游戏化）
  // ============================================================
  function getEarnedMilestones() {
    try {
      return JSON.parse(localStorage.getItem('tsd_milestones') || '[]');
    } catch(e) { return []; }
  }
  function checkMilestones() {
    if (state.mode !== 'empty') return;  // 只在 empty mode（用户真实使用）检测
    const earned = new Set(getEarnedMilestones());
    const newlyEarned = [];
    for (const ms of LIFE_MILESTONES) {
      if (!earned.has(ms.id) && !ms.isFog && ms.check(state)) {
        earned.add(ms.id);
        newlyEarned.push(ms);
      }
    }
    if (newlyEarned.length > 0) {
      try { localStorage.setItem('tsd_milestones', JSON.stringify([...earned])); } catch(e) {}
      // 延迟弹出（避免和 compose-done 冲突）
      setTimeout(() => showMilestonePopup(newlyEarned[0]), 1800);
    }
  }
  function showMilestonePopup(ms) {
    const ov = document.getElementById('upgrade-overlay');
    const card = ov.querySelector('.upgrade-card');
    card.innerHTML = `
      <div class="milestone-popup">
        <div class="milestone-glow"></div>
        <div class="milestone-emoji">${ms.emoji}</div>
        <div class="milestone-label">一枚人生印记</div>
        <div class="milestone-title">${escapeHtml(ms.title)}</div>
        <div class="milestone-desc">${escapeHtml(ms.desc)}</div>
        <button class="upgrade-btn" id="ms-close">收下</button>
        <p class="milestone-hint">它已嵌入你的旷野。<br/>下一枚仍在生活的雾里。</p>
      </div>
    `;
    ov.classList.add('show');
    card.querySelector('#ms-close').addEventListener('click', () => ov.classList.remove('show'));
  }
  function showMilestonesCollection() {
    const ov = document.getElementById('upgrade-overlay');
    const card = ov.querySelector('.upgrade-card');
    const earned = new Set(getEarnedMilestones());
    const all = LIFE_MILESTONES;
    card.innerHTML = `
      <div class="upgrade-header">
        <span class="upgrade-title">人生印记</span>
        <button class="upgrade-close" id="ms-collect-close">×</button>
      </div>
      <div class="upgrade-body">
        <p style="font-size:13px;color:var(--ink-soft);margin-bottom:16px;line-height:1.7">印记不奖励你记录了多少——它们标记你活过的真实时刻。</p>
        <div class="milestone-collection">
          ${all.map(ms => {
            const has = earned.has(ms.id) || ms.isFog;
            return `
              <div class="milestone-row ${has ? 'earned' : 'locked'} ${ms.isFog ? 'fog' : ''}">
                <div class="milestone-row-emoji">${has ? ms.emoji : '🔒'}</div>
                <div class="milestone-row-body">
                  <div class="milestone-row-title">${escapeHtml(ms.title)}</div>
                  <div class="milestone-row-desc">${has ? escapeHtml(ms.desc) : '尚未获得'}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <p style="font-size:11px;color:var(--ink-faint);margin-top:14px;text-align:center;font-style:italic">不显示锁定清单中尚未获得的具体条件——<br/>每一枚都在生活里自然到来。</p>
      </div>
    `;
    ov.classList.add('show');
    card.querySelector('#ms-collect-close').addEventListener('click', () => ov.classList.remove('show'));
  }

  function init() {
    renderComposeMoods();
    bindEvents();
    // 设计者侧栏"看示例"按钮
    const rdb = document.getElementById('reset-demo-btn');
    if (rdb) rdb.addEventListener('click', () => { enterDemoMode(); switchView('tell'); renderTell(); });

    // 首启动按 mode 决定入口
    if (state.mode === 'onboarding') {
      renderOnboarding();
      switchView('onboarding');
    } else {
      switchView('tell');
    }

    // v3.11 splash 移除
    setTimeout(() => {
      const sp = document.getElementById('splash');
      if (sp) sp.remove();
    }, 1800);

    // v3.25 原生通知注册（Capacitor 环境下，用户已不关闭扫描时）
    if (isNative && CapacitorLN && state.mode === 'empty') {
      setupNativeNotifications();
    }
  }

  // v3.25 原生本地通知（今晚扫描提醒）
  async function setupNativeNotifications() {
    try {
      // 检查权限
      const perm = await CapacitorLN.checkPermissions();
      if (perm.display !== 'granted') {
        // 不强制请求——等用户主动开启扫描时再请求
        return;
      }
      await scheduleNightScan();
    } catch(e) {}
  }

  async function scheduleNightScan() {
    if (!CapacitorLN) return;
    try {
      // 每晚 21:00 的扫描提醒（仅在用户没关掉扫描时）
      const pending = await CapacitorLN.getPending();
      // 避免重复调度
      if (pending.notifications && pending.notifications.length > 0) return;

      const now = new Date();
      const tonight9pm = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 21, 0, 0);
      if (tonight9pm < now) tonight9pm.setDate(tonight9pm.getDate() + 1);

      await CapacitorLN.schedule({
        notifications: [{
          id: 1,
          title: 'TSD',
          body: '今天看起来有几个瞬间值得留一下',
          schedule: {
            at: tonight9pm,
            repeats: true,
            every: 'day',
          },
          smallIcon: 'ic_notification',
          iconColor: '#c8873c',
        }],
      });
    } catch(e) {}
  }

  // 暴露分享函数给 onclick
  window.__TSD_SHARE_WEEK = shareWeekChapter;
  window.__TSD_SHARE_SEASON = shareSeason;

  document.addEventListener('DOMContentLoaded', init);
})();

// v3.25 Service Worker：仅 Web 模式注册（Capacitor 原生不需要）
if (!isNative && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
