// ============================================================
// TSD Demo v3.1 — 应用逻辑
// 论点：D 讲述优先 + B Mark 优先 + C 旷野优先
// v3.1：onboarding + 空状态 + 去概念化
// ============================================================

(() => {
  const { USER, MOODS, MOMENTS, WEEK_CHALLENGE, MEADOW_LEVELS, ONBOARDING } = window.__TSD_DATA__;

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
    upgradeTargetId: null,
    weekSkipped: false,
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
  const BIRTH = parseDate(USER.birthDate);

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
  // ============================================================
  function renderLifeGridStep(screen, step) {
    // 默认年龄 35，从 state 读（用户调整后记忆）
    if (!state.onbAge) state.onbAge = 35;
    const age = state.onbAge;
    const pastWeeks = age * 52;
    const totalWeeks = 4160;

    // 生成 4160 格
    const cells = [];
    for (let w = 0; w < totalWeeks; w++) {
      let cls = 'onb-a4-cell';
      if (w < pastWeeks) cls += ' past';
      else if (w === pastWeeks) cls += ' now';
      cells.push(`<div class="${cls}"></div>`);
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
          <div class="onb-a4-grid">${cells.join('')}</div>
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
      // 只重渲染格子部分，不重画整个屏幕（避免输入框失焦）
      const newPast = v * 52;
      const grid = screen.querySelector('.onb-a4-grid');
      const newCells = [];
      for (let w = 0; w < 4160; w++) {
        let cls = 'onb-a4-cell';
        if (w < newPast) cls += ' past';
        else if (w === newPast) cls += ' now';
        newCells.push(`<div class="${cls}"></div>`);
      }
      grid.innerHTML = newCells.join('');
      // 更新统计
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
      // 第 3 屏"看示例" → 进入 demo 模式（陈雨数据）
      enterDemoMode();
      switchView('tell');
    }
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
    html.push(`
      <div class="challenge-invite">
        <div class="invite-period">这一周</div>
        <div class="invite-title">${escapeHtml(title)}</div>
        <div class="invite-status">${escapeHtml(status)}</div>
      </div>
    `);

    // 已讲（花）
    html.push('<div class="section-label">这一周你讲过的</div>');
    if (told.length === 0) {
      html.push('<div style="font-size:12px;color:var(--ink-faint);padding:8px 0 24px">（这周还没讲过。留一张照片就算开始。）</div>');
    } else {
      html.push('<div class="told-list">');
      told.forEach(m => {
        const mood = MOODS[m.mood];
        html.push(`
          <div class="told-card">
            ${m.image ? `<img class="told-thumb" src="${m.image}" alt="" loading="lazy"/>` : ''}
            <div class="told-body">
              <div class="told-text"><span class="told-emoji">${mood.emoji}</span>${escapeHtml(m.text)}</div>
              ${m.why ? `<div class="told-why">"${escapeHtml(m.why)}"</div>` : ''}
              <div class="told-meta">
                ${m.location && m.location !== '—' ? `<span>· ${escapeHtml(m.location)}</span>` : ''}
                ${m.people && m.people.length ? `<span>· ${m.people.map(escapeHtml).join('、')}</span>` : ''}
              </div>
            </div>
          </div>
        `);
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
    closeUpgrade();
    renderTell();
    // 静默反馈
    const done = document.getElementById('compose-done');
    document.getElementById('done-sub').textContent = '这是一个 L1 故事。它会被你记住。';
    done.classList.add('show');
    setTimeout(() => done.classList.remove('show'), 1500);
  }

  // ============================================================
  // 视图 2：旷野语义缩放
  // ============================================================
  function renderMeadow() {
    const zoom = state.meadowZoom;
    const level = MEADOW_LEVELS[zoom];
    document.getElementById('meadow-title').textContent = level.label;
    document.getElementById('meadow-semantic').textContent = level.semantic;
    const canvas = document.getElementById('meadow-canvas');

    if (state.plainMode) {
      canvas.innerHTML = renderPlainMeadow(zoom);
      return;
    }

    // 旷野视觉
    if (zoom === 'today') canvas.innerHTML = renderTodayMeadow();
    else if (zoom === 'week') canvas.innerHTML = renderWeekMeadow();
    else if (zoom === 'month') canvas.innerHTML = renderMonthMeadow();
    else if (zoom === 'year') canvas.innerHTML = renderYearMeadow();
    else if (zoom === 'life') canvas.innerHTML = renderLifeMeadow();
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
    const monthsToShow = ['2026-07', '2026-06', '2026-05'];
    return monthsToShow.map(mk => {
      const ms = state.moments.filter(m => monthKey(m.date) === mk);
      const theme = MEADOW_LEVELS.month.themes[mk];
      const told = ms.filter(m => m.toldAt).length;
      return `
        <div class="chapter-card">
          <div class="chapter-period">${mk}</div>
          <div class="chapter-title">${escapeHtml(theme.title)}</div>
          <div class="chapter-mainline">${escapeHtml(theme.mainline)}</div>
          ${renderMeadowSvg({ grass: ms.length, blooms: told, height: 80, withStream: true })}
          <div class="meadow-summary" style="margin-top:10px">
            ${ms.length} 个瞬间，${told} 个讲过
          </div>
        </div>
      `;
    }).join('');
  }

  // 年地貌
  function renderYearMeadow() {
    const q2 = MEADOW_LEVELS.year.seasons['2026-Q2'];
    const q2Moments = state.moments.filter(m => {
      const d = parseDate(m.date);
      return d.getFullYear() === 2026 && d.getMonth() >= 3 && d.getMonth() <= 5;
    });
    return `
      <div class="chapter-card">
        <div class="chapter-period">2026 · 第二季度</div>
        <div class="chapter-title">${escapeHtml(q2.title)}</div>
        <div class="chapter-opening">${escapeHtml(q2.opening)}</div>
        ${renderMeadowSvg({ grass: q2Moments.length, blooms: q2Moments.filter(m=>m.toldAt).length, height: 100, withStream: true })}
      </div>
      <div class="chapter-card">
        <div class="chapter-period">2026 · 第一季度</div>
        <div class="chapter-title" style="color:var(--ink-faint)">（你来 TSD 之前的日子）</div>
        <div class="chapter-mainline" style="color:var(--ink-faint)">这段时间没留下痕迹——也没关系。</div>
      </div>
    `;
  }

  // 一生地貌
  function renderLifeMeadow() {
    const age = Math.floor((TODAY.getTime() - BIRTH.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    const nowWeek = Math.floor((TODAY.getTime() - BIRTH.getTime()) / (7 * 24 * 60 * 60 * 1000));
    // 生成 4160 格的小格子
    const weekMap = {};
    for (const m of state.moments) {
      const d = parseDate(m.date);
      const ms = d.getTime() - BIRTH.getTime();
      const w = Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
      if (w >= 0 && w < 4160) weekMap[w] = (weekMap[w] || 0) + 1;
    }
    const cells = [];
    for (let w = 0; w < 4160; w++) {
      let cls = 'life-cell';
      if (w > nowWeek) cls += ' future';
      else if (w === nowWeek) cls += ' now';
      else if (weekMap[w]) cls += weekMap[w] >= 2 ? ' filled-deep' : ' filled';
      cells.push(`<div class="${cls}"></div>`);
    }
    return `
      <div class="chapter-card">
        <div class="chapter-period">一生</div>
        <div class="chapter-title">你 ${age} 岁，活成了什么样子</div>
        <div class="chapter-mainline">
          已走过 <b>${nowWeek}</b> 周；<br/>
          其中 <b>${Object.keys(weekMap).length}</b> 周留下了痕迹。
        </div>
        <div class="life-grid-mini">${cells.join('')}</div>
        <div class="meadow-summary">
          每一格是一周。填满的格子，是你活过的证据；<br/>
          空白的格子，是还要去活的理由。
        </div>
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
    const sorted = [...state.moments].sort((a, b) => b.date.localeCompare(a.date));
    const list = document.getElementById('archive-list');
    list.innerHTML = sorted.map(m => {
      const mood = MOODS[m.mood];
      const levelBadge = m.toldAt
        ? `<span class="level-badge-mini ${m.level === 2 ? 'l2' : 'l1'}">L${m.level} · ${m.level === 2 ? '原声' : '讲过'}</span>`
        : `<span class="level-badge-mini l0">L0 · Mark</span>`;
      return `
        <div class="archive-card">
          ${m.image ? `<img class="archive-card-image" src="${m.image}" alt="" loading="lazy"/>` : ''}
          <div class="archive-card-body">
            <div class="archive-card-text">${escapeHtml(m.text)}</div>
            ${m.why ? `<div class="archive-card-why">"${escapeHtml(m.why)}"</div>` : ''}
            <div class="archive-card-meta">
              <span>${mood.emoji} ${mood.label}</span>
              ${levelBadge}
              ${m.location && m.location !== '—' ? `<span>· ${escapeHtml(m.location)}</span>` : ''}
              ${m.people && m.people.length ? `<span>· ${m.people.map(escapeHtml).join('、')}</span>` : ''}
              ${m.isFirst ? `<span class="first-badge">第一次</span>` : ''}
              <span>· ${fmtDate(m.date)}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ============================================================
  // 录入（B：Mark 优先）
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
    document.getElementById('compose-image-slot').innerHTML = '<span class="image-placeholder">＋ Mark 一张照片（推荐，5 秒就够）</span>';
    document.getElementById('compose-image-slot').style.border = '1px dashed var(--line)';
    document.getElementById('compose-image-slot').style.background = 'var(--bg-warm)';
    document.querySelectorAll('.mood-chip').forEach(c => c.classList.remove('selected'));
    state.selectedMood = null;
  }

  function saveCompose() {
    const text = document.getElementById('compose-text').value.trim();
    const people = document.getElementById('compose-people').value.trim();
    const isFirst = document.getElementById('compose-first').checked;
    const hasImage = document.querySelector('#compose-image-slot img');

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
      location: '—',
      people: people ? people.split(/[、,，]/).map(s => s.trim()).filter(Boolean) : [],
      isFirst,
      image: hasImage ? hasImage.src : null,
      level,
      toldAt: level >= 1 ? todayStr() : null,
      why: level >= 1 ? text : null,
    };
    state.moments.unshift(newM);

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
                <div class="setting-row"><span>朴素模式</span><span style="font-size:11px;color:var(--ink-soft)">${state.plainMode ? '已开启' : '未开启'}（点顶部 🌿/📜 切换）</span></div>
                <div class="setting-row"><span>分支论点</span><span style="font-size:11px;color:var(--ink-soft)">D+B+C（ZCode）</span></div>
                <div class="setting-row"><span>版本</span><span style="font-size:11px;color:var(--ink-soft)">v3.1 Demo</span></div>
                <div class="setting-row"><span>重置（回到 onboarding）</span><span style="font-size:11px;color:var(--ink-soft);cursor:pointer" id="reset-link">点这里</span></div>
              </div>
            `;
            document.querySelector('.app-views').appendChild(v);
            const rl = v.querySelector('#reset-link');
            if (rl) rl.addEventListener('click', () => {
              try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
              location.reload();
            });
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
    document.getElementById('compose-image-slot').addEventListener('click', () => {
      const slot = document.getElementById('compose-image-slot');
      slot.innerHTML = `<img src="https://picsum.photos/seed/tsd-pick-${Date.now()}/600/380" style="width:100%;height:100%;object-fit:cover"/>`;
      slot.style.border = '1px solid var(--line)';
      slot.style.background = '#fff';
    });

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
  // 启动
  // ============================================================
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
      // 已经走过 onboarding（'demo' 或 'empty'）→ 直接进 tell
      switchView('tell');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
