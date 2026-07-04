// ============================================================
// TSD Demo v3 — 应用逻辑
// 论点：D 讲述优先 + B Mark 优先 + C 旷野优先
// ============================================================

(() => {
  const { USER, MOODS, MOMENTS, WEEK_CHALLENGE, MEADOW_LEVELS } = window.__TSD_DATA__;

  const state = {
    currentView: 'tell',
    moments: [...MOMENTS],
    selectedMood: null,
    plainMode: false,        // R2：朴素模式开关
    meadowZoom: 'week',
    upgradeTargetId: null,   // 当前正在升级的瞬间 id
    weekSkipped: false,      // R1：本周是否已跳过
  };

  // ============ 工具 ============
  const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const TODAY = parseDate(USER.today);
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
    const wk = weekKey(USER.today);
    return state.moments.filter(m => weekKey(m.date) === wk);
  }

  // ============ 视图切换 ============
  function switchView(name) {
    state.currentView = name;
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.dataset.view === name));
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    document.getElementById('tab-bar').style.display = (name === 'compose') ? 'none' : 'flex';
    if (name === 'tell') renderTell();
    if (name === 'meadow') renderMeadow();
    if (name === 'archive') renderArchive();
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
  // 视图 1：讲述挑战（首页）
  // ============================================================
  function renderTell() {
    const weekMoments = getWeekMoments();
    const told = weekMoments.filter(m => m.level >= 1 && m.toldAt);
    const untold = weekMoments.filter(m => !m.toldAt);

    // 邀请文案（R1：邀请不是任务，不显示 0/3）
    const invite = document.getElementById('challenge-invite');
    let title, status;
    if (state.weekSkipped) {
      title = '这周就算了';
      status = '平淡的日子也是日子。下周再见。';
    } else if (told.length === 0) {
      title = '这周三个故事，你讲得出吗？';
      status = '这周还安静着呢。Mark 一张照片就算讲了。';
    } else if (told.length < 3) {
      title = '这周三个故事，你讲得出吗？';
      status = `你已经讲了 ${told.length} 个。${told.length === 1 ? '再讲两个？' : '再讲一个？'}或者就这样也很好。`;
    } else {
      title = '这周你讲过了';
      status = `${told.length} 个故事。够了。`;
    }
    invite.innerHTML = `
      <div class="invite-period">${WEEK_CHALLENGE.period}</div>
      <div class="invite-title">${escapeHtml(title)}</div>
      <div class="invite-status">${escapeHtml(status)}</div>
    `;

    // 已讲列表（花）
    const toldList = document.getElementById('told-list');
    if (told.length === 0) {
      toldList.innerHTML = '<div style="font-size:12px;color:var(--ink-faint);padding:8px 0">（这周还没讲过。Mark 一张照片就算开始。）</div>';
    } else {
      toldList.innerHTML = told.map(m => {
        const mood = MOODS[m.mood];
        const levelLabel = m.level === 2 ? 'L2 · 留了原声' : 'L1 · 讲过';
        const levelCls = m.level === 2 ? 'l2' : '';
        return `
          <div class="told-card">
            ${m.image ? `<img class="told-thumb" src="${m.image}" alt="" loading="lazy"/>` : ''}
            <div class="told-body">
              <div class="told-text"><span class="told-emoji">${mood.emoji}</span>${escapeHtml(m.text)}</div>
              ${m.why ? `<div class="told-why">"${escapeHtml(m.why)}"</div>` : ''}
              <div class="told-meta">
                <span class="level-badge ${levelCls}">${levelLabel}</span>
                ${m.location && m.location !== '—' ? `<span>· ${escapeHtml(m.location)}</span>` : ''}
                ${m.people && m.people.length ? `<span>· ${m.people.map(escapeHtml).join('、')}</span>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    // 未讲列表（草）—— L0 也展示，可升级
    const untoldList = document.getElementById('untold-list');
    if (untold.length === 0) {
      untoldList.innerHTML = '<div style="font-size:12px;color:var(--ink-faint);padding:8px 0">（本周所有瞬间都已讲述。）</div>';
    } else {
      untoldList.innerHTML = untold.map(m => {
        const mood = MOODS[m.mood];
        return `
          <div class="untold-card">
            ${m.image ? `<img class="untold-thumb" src="${m.image}" alt="" loading="lazy"/>` : ''}
            <div class="untold-body">
              <div class="untold-text">${mood.emoji} ${escapeHtml(m.text)}</div>
              <div class="untold-meta">${fmtDate(m.date)} · L0 已 Mark</div>
            </div>
            <button class="untold-upgrade-btn" data-upgrade="${m.id}">讲这一个</button>
          </div>
        `;
      }).join('');
      // 绑定升级按钮
      untoldList.querySelectorAll('[data-upgrade]').forEach(btn => {
        btn.addEventListener('click', () => openUpgrade(btn.dataset.upgrade));
      });
    }

    // AI 提问（R3：只提问不代写）
    const aiQuestions = document.getElementById('ai-questions');
    const relevantQs = WEEK_CHALLENGE.aiQuestions.filter(q => {
      const m = getMoment(q.forMomentId);
      return m && !m.toldAt;
    });
    if (relevantQs.length === 0) {
      document.getElementById('ai-help-section').style.display = 'none';
    } else {
      document.getElementById('ai-help-section').style.display = 'block';
      aiQuestions.innerHTML = relevantQs.map(q => {
        const m = getMoment(q.forMomentId);
        return `
          <div class="ai-question">
            <div class="ai-question-context">关于：${escapeHtml(m.text)}</div>
            ${escapeHtml(q.question)}
          </div>
        `;
      }).join('');
    }

    // 跳过按钮
    const skipBtn = document.getElementById('skip-week-btn');
    skipBtn.classList.toggle('skipped', state.weekSkipped);
    skipBtn.textContent = state.weekSkipped ? '本周已跳过' : '这周就算了';
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
    m.toldAt = USER.today;
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
    const today = state.moments.filter(m => m.date === USER.today);
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
    if (zoom === 'today') moments = state.moments.filter(m => m.date === USER.today);
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
      date: USER.today,
      text: text || '（仅 Mark）',
      mood: state.selectedMood || 'warm',
      location: '—',
      people: people ? people.split(/[、,，]/).map(s => s.trim()).filter(Boolean) : [],
      isFirst,
      image: hasImage ? hasImage.src : null,
      level,
      toldAt: level >= 1 ? USER.today : null,
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
                <div class="setting-row"><span>版本</span><span style="font-size:11px;color:var(--ink-soft)">v3 Demo</span></div>
              </div>
            `;
            document.querySelector('.app-views').appendChild(v);
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

    // 开场白模板
    document.getElementById('opening-template-btn').addEventListener('click', () => {
      document.getElementById('opening-overlay').classList.add('show');
    });
    document.getElementById('opening-close').addEventListener('click', () => {
      document.getElementById('opening-overlay').classList.remove('show');
    });

    // 跳过本周
    document.getElementById('skip-week-btn').addEventListener('click', () => {
      state.weekSkipped = !state.weekSkipped;
      renderTell();
    });
  }

  // ============================================================
  // 启动
  // ============================================================
  function init() {
    renderTell();
    renderComposeMoods();
    bindEvents();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
