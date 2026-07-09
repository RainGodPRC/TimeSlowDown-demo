// ============================================================
// TSD Demo v3 — 讲述优先（D）+ Mark 优先（B）+ 旷野优先（C）
// 灵魂：让用户"再次讲述"，而不是记录更多
// ============================================================

const USER = {
  name: '陈雨',
  birthDate: '1990-03-15',
  joinDate: '2026-04-01',
  today: '2026-07-04',
};

// 心情
const MOODS = {
  warm:     { emoji: '🌿', label: '平静',   color: '#7a9b6e' },
  bright:   { emoji: '☀️', label: '明亮',   color: '#e8a04a' },
  deep:     { emoji: '🌊', label: '深沉',   color: '#3d5a6c' },
  joy:      { emoji: '🌸', label: '欢喜',   color: '#d97a85' },
  tired:    { emoji: '🍂', label: '疲惫',   color: '#9c8870' },
  grateful: { emoji: '🕯️', label: '感激',   color: '#b07a4a' },
  curious:  { emoji: '🍃', label: '好奇',   color: '#8ba888' },
};

// ============================================================
// 瞬间（不再叫"记忆点"——更中性的原料）
//   fields:
//     id, date, text, image, mood, location, people[],
//     isFirst, note,
//     level: 0 (L0 仅 Mark) | 1 (L1 +why) | 2 (L2 +语音) | 3 (L3 完整)
//     why: L1 的"为什么重要"一句
//     toldAt: 是否已"讲过"（在讲述挑战里挑出来过）
// ============================================================
const MOMENTS = [
  // ===== 本周（2026-W27，7/1-7/4）=====
  { id: 'p-0704a', date: '2026-07-04', text: '下班路上看到夕阳把整条街染成橘色',
    image: 'https://picsum.photos/seed/tsd-sunset/600/800', mood: 'warm',
    location: '愚园路', level: 0 },
  { id: 'p-0704b', date: '2026-07-04', text: '和妈妈视频，她把新种的月季举到镜头前',
    image: 'https://picsum.photos/seed/tsd-mom/600/800', mood: 'grateful',
    location: '家中', people: ['妈妈'],
    level: 1, // L1：本周已"讲"
    why: '她那么远还想着让我看，月季是借口，想念是真的。',
    toldAt: '2026-07-04' },
  { id: 'p-0702', date: '2026-07-02', text: '老友从北京来出差，约在十年前我们常去的小馆子',
    image: 'https://picsum.photos/seed/tsd-friend/600/800', mood: 'joy',
    location: '老山东', people: ['小琳'],
    level: 0,  // L0：Mark 了但还没讲
    isFirst: true },

  // ===== 上周（W26）已讲述完整
  { id: 'p-0629', date: '2026-06-29', text: '一个人去看了一场冷门电影，整个厅只有我',
    image: 'https://picsum.photos/seed/tsd-cinema/600/800', mood: 'deep',
    location: '大光明', level: 1, toldAt: '2026-06-30',
    why: '第一次一个人包场。我以为会孤独，其实是松弛。',
    isFirst: true },
  { id: 'p-0625', date: '2026-06-25', text: '项目第一个里程碑上线，凌晨两点走出公司',
    image: 'https://picsum.photos/seed/tsd-milestone/600/800', mood: 'tired',
    location: '张江', level: 1, toldAt: '2026-06-30',
    why: '路灯记得我那晚的疲惫，也记得一件事的完成。' },

  // ===== 6 月
  { id: 'p-0612', date: '2026-06-12', text: '梅雨季结束的第一个晴朗周末',
    image: 'https://picsum.photos/seed/tsd-laundry/600/800', mood: 'bright',
    location: '家中阳台', level: 1, toldAt: '2026-06-30',
    why: '把被子晒一遍是仪式，宣告霉味和阴霾结束。' },
  { id: 'p-0603', date: '2026-06-03', text: '侄女出生了，照片里她攥着护士的手指',
    image: 'https://picsum.photos/seed/tsd-newborn/600/800', mood: 'grateful',
    location: '—', level: 2, toldAt: '2026-06-05',
    why: '我第一次以"长辈"身份被呼唤。',
    voiceUrl: 'mock', isFirst: true, people: ['侄女'] },

  // ===== 5 月
  { id: 'p-0509', date: '2026-05-09', text: '在京都的小巷迷路，遇到一只懒猫',
    image: 'https://picsum.photos/seed/tsd-cat/600/800', mood: 'curious',
    location: '京都·东山区', level: 1, toldAt: '2026-05-11',
    why: '迷路本身就是目的。第一次认真和陌生的猫对视五分钟。',
    isFirst: true },
  { id: 'p-0507', date: '2026-05-07', text: '清水寺下面的小店喝到一杯咸抹茶',
    image: 'https://picsum.photos/seed/tsd-matcha/600/800', mood: 'curious',
    location: '京都', level: 0, isFirst: true },

  // ===== 4 月
  { id: 'p-0420', date: '2026-04-20', text: '搬进新租的房子，第一顿饭是泡面，坐在地板上吃',
    image: 'https://picsum.photos/seed/tsd-newhome/600/800', mood: 'warm',
    location: '新家', level: 1, toldAt: '2026-04-22',
    why: '泡面是新生活的第一餐，地板是仪式的一部分。', isFirst: true },
  { id: 'p-0415', date: '2026-04-15', text: '36 岁生日。没告诉任何人，自己买了一块蛋糕',
    image: 'https://picsum.photos/seed/tsd-birthday/600/800', mood: 'deep',
    location: '家中', level: 1, toldAt: '2026-04-16',
    why: '第一次觉得生日不需要被看见。被看见不是生日的前提。',
    note: '没发朋友圈。' },
  { id: 'p-0405', date: '2026-04-05', text: '清明，和爸爸去给爷爷扫墓',
    image: 'https://picsum.photos/seed/tsd-tomb/600/800', mood: 'deep',
    location: '老家', level: 1, toldAt: '2026-04-07',
    why: '爸爸第一次跟我说起爷爷年轻时的事。', people: ['爸爸'] },
];

// ============================================================
// 讲述挑战状态（本周）
// ============================================================
const WEEK_CHALLENGE = {
  weekKey: '2026-W27',
  period: '2026 年 6 月 29 日 – 7 月 5 日',
  targetCount: 3,         // 邀请目标（不展示为进度条）
  // 已讲几个、待 Mark 几个，由 app.js 实时算
  aiQuestions: [
    // R3：AI 只提问，不写正文
    { forMomentId: 'p-0702', question: '周四和小琳在老山东吃饭——那天有什么让你笑了？' },
    { forMomentId: 'p-0704a', question: '夕阳把街染成橘色那刻，你在去哪里的路上？' },
  ],
  openingTemplate: '那天我和___在___，让我印象最深的是___',  // R3：填空模板
  skipped: false,         // R1：可"跳过本周"
};

// ============================================================
// 旷野语义缩放——各级的语义内容
//   R2 严格监控：所有视觉变化只反映，不奖励
// ============================================================
const MEADOW_LEVELS = {
  today: {
    label: '今日',
    semantic: '今天有什么？',
    // 当日的瞬间作为草/花
  },
  week: {
    label: '本周',
    semantic: '这周讲出了什么？',
    // 一周的草（L0）和花（L1+）
  },
  month: {
    label: '本月',
    semantic: '这个月的主线是什么？',
    // 花丛 + 月主题
    themes: {
      '2026-07': { title: '夏日开场', mainline: '老友、夕阳、妈妈——这个月被关系定义。' },
      '2026-06': { title: '一个生命的开始', mainline: '侄女出生，项目结束，独自看电影。' },
      '2026-05': { title: '在京都，时间慢了', mainline: '迷路、抹茶、和陌生的猫对视。' },
      '2026-04': { title: '新的开始', mainline: '新家、生日、和爸爸讲爷爷。' },
    }
  },
  year: {
    label: '本年',
    semantic: '今年分成了哪几段？',
    // 四季图册
    seasons: {
      '2026-Q2': {
        title: '扎根，与开花',
        opening: '4 月在地板上吃泡面时根扎进土里；5 月在京都长出新枝；6 月侄女出生那天，开了第一朵花。',
      }
    }
  },
  decade: {
    label: '这十年',
    semantic: '这十年的主题是什么？',
    // 人生阶段地貌
    stages: [
      { range: '36–40 岁', theme: '（这十年你正在书写）' },
    ]
  },
  life: {
    label: '一生',
    semantic: '我活成了什么样子？',
    // 完整人生格子作为背景
  }
};

// ============================================================
// 朴素模式（R2 应对：灵魂测试 7 的可切换实现）
//   朴素模式下，所有功能仍可用，只是没有花/草/树视觉
// ============================================================
const PLAIN_MODE = {
  available: true,
  description: '关闭旷野视觉，使用纯文字列表。所有功能仍然可用。',
};

// ============================================================
// Onboarding（四屏：共情 → 为什么 → 承诺 → 行动）
// ============================================================
const ONBOARDING = {
  steps: [
    {
      // 第 1 屏 · 共情（承认痛点，不解释）
      eyebrow: '这是常见的',
      headline: '日子嗖地就过去了。',
      sub: '一周，一月，一年——\n回头看，又想不起具体发生过什么。',
      visual: 'fast',
      cta: '是这样',
      skipText: '其实没有',
    },
    {
      // 第 2 屏 · 为什么（认知层 · 真认知）
      eyebrow: '不是你的问题',
      headline: '大脑把重复的日子\n压缩成了一团。',
      sub: '不是你活的不够，\n而是缺少"被记住的瞬间"——\n生活需要被划重点。',
      visual: 'grid',            // 90 个方块，几个被点亮
      cta: '原来如此',
      skipText: null,
    },
    {
      // 第 3 屏 · 承诺（三个月讲得出故事）+ 社会认同
      eyebrow: 'TSD 想做的事',
      headline: '三个月后，\n你能讲出 5–10 个\n鲜明的瞬间。',
      sub: '不是记日记，不是相册。\n只在某个瞬间划一下重点，\nTSD 帮你回头讲得出。',
      socialProof: '已有很多人开始用 TSD 对抗时间飞逝。\n你不会是唯一一个。',
      visual: 'story',
      cta: '想试试',
      skipText: null,
    },
    {
      // 第 4 屏 · 看见一生（人生格子，A4 冲击型）
      eyebrow: '这张纸，是你的一生',
      headline: '80 年，4160 周。\n一格一周。',
      sub: '深色的格子，是你已经走过的——\n它们大多没有留下痕迹。\n这一格，是这一周。',
      visual: 'lifegrid',
      cta: '想让这一格被记住',
      skipText: null,
    },
    {
      // 第 5 屏 · 行动 + 微承诺（承诺一致性）
      eyebrow: '现在试试',
      headline: '留一个瞬间',
      sub: '今天有什么是你想记住的？\n一张照片、一个心情、一句话，\n任何一个都算。',
      microCommit: '我愿意试试，留住一些瞬间。',
      visual: 'plus',
      cta: '好，我试试',
      skipText: '先看看示例',
    },
  ],
};

// ============================================================
// 今晚扫描（v3.6：ZCode 的"主动发现"机制）
//
// 哲学：TSD = 编辑（不是放大镜）
// 编辑等用户先有素材（L0 Mark），再从素材里发现"可讲述性"
// 触发时机：每晚（被试当晚打开 App 时看到，不推送）
// 排序规则：人 > 第一次 > 情绪转变
// 反 streak：不强制、不累计、不报数字、可关、频率自适应
// ============================================================

// ============================================================
// 周章节（用户亲自挑 + 命名 + AI 忠实编辑编译）
// ============================================================
const WEEK_CHAPTERS = {
  // 已编译的过去周（示例数据：陈雨用 TSD 三个月积累的）
  '2026-W26': {
    weekKey: '2026-W26',
    period: '2026 年 6 月 22-28 日',
    title: '一个人，和一束光',
    pickedMomentIds: ['p-0629', 'p-0625'],   // 用户从本周候选里挑的
    opening: '这周发生了两件截然不同的事——独自在空无一人的影院看了一场冷门电影，又在凌晨两点从公司走出来。两个瞬间都关于"光"：屏幕的光和路灯的光。',
    body: ['它们标记出这周两个完全不同的我——一个想要安静，一个不得不疲惫。',
           '但回头一看，居然不是矛盾。是一个人在同一周里，同时拥有的两种状态。'],
    growth: 'new_branch',  // 这周长了新枝（新体验）
  },
  '2026-W25': {
    weekKey: '2026-W25',
    period: '2026 年 6 月 15-21 日',
    title: '梅雨结束的那个周末',
    pickedMomentIds: ['p-0612'],
    opening: '梅雨季结束的第一个晴朗周末，我把所有被子晒了一遍。',
    body: ['这是仪式——宣告阴霾和潮湿结束，房间重新变得干净。',
           '我以为这周会平淡，但晒被子的那束阳光让我记了很久。'],
    growth: 'root',
  },
  '2026-W23': {
    weekKey: '2026-W23',
    period: '2026 年 6 月 1-7 日',
    title: '一个生命的开始',
    pickedMomentIds: ['p-0603'],
    opening: '侄女出生的那天，我第一次以"长辈"的身份被呼唤。',
    body: ['照片里她攥着护士的手指——比我手指小很多，但攥得很紧。',
           '这一周没什么别的能盖过这件事。一个生命的开始定义了整个六月。'],
    growth: 'bloom',  // 与重要的人共度
  },
  // 本周（W27）未编译——触发周末章节流程
};

// ============================================================
// 月度风景（系统从周章节预编译，用户命名 + 确认变化）
// ============================================================
const MONTH_LANDSCAPES = {
  '2026-06': {
    monthKey: '2026-06',
    period: '2026 年 6 月',
    title: '一个生命的开始，与一个项目的结束',
    mainline: '迎来了一个新的小生命（侄女出生），也送走了一个长期项目（里程碑上线）。一边是开始，一边是阶段性结束。你在两者之间疲惫地、温柔地移动。',
    turningPoint: '6 月 3 日，侄女出生——你第一次以"长辈"身份被呼唤。',
    keyPeople: ['侄女', '妈妈'],
    weekChapterCount: 3,  // 本月编译了 3 个周章节
    growth: 'bloom',
  },
  '2026-05': {
    monthKey: '2026-05',
    period: '2026 年 5 月',
    title: '在京都，时间慢了下来',
    mainline: '出差夹带了一次一个人的京都漫步。第一次认真迷路，第一次喝咸抹茶，第一次和一只陌生的猫对视五分钟。',
    turningPoint: '5 月 9 日那条小巷——你意识到"迷路"本身就是目的。',
    keyPeople: [],
    weekChapterCount: 1,
    growth: 'new_branch',
  },
  '2026-04': {
    monthKey: '2026-04',
    period: '2026 年 4 月',
    title: '新的开始，旧的告别',
    mainline: '这是你开始用 TSD 的第一个月。你搬了新家，过了 36 岁生日，陪爸爸给爷爷扫墓。三件事都关于"在新的位置上安顿下来"。',
    turningPoint: '4 月 15 日，36 岁生日——你选择不被看见。',
    keyPeople: ['爸爸'],
    weekChapterCount: 1,
    growth: 'root',
  },
};

// ============================================================
// 季度仪式（90 日回忆）
// ============================================================
const SEASON_RITUAL = {
  '2026-Q2': {
    period: '2026 年 4-6 月 · 用 TSD 的第一个季度',
    title: '扎根，与开花',
    opening: '如果用一棵树形容这三个月：4 月，你在新家地板上吃泡面时，根扎进了土里；5 月，你在京都的迷路里长出了新的枝；6 月，侄女出生的那天，树开了第一朵花。',
    body: [
      '这三个月，你做了三件以前不会做的事：一个人包场看电影、一个人在国外迷路、生日不告诉任何人。把它们放在一起，你才看见一条主线——你开始学会"和自己单独待在一起"。',
      '同时，你和家人的连接比想象中更深：爸爸第一次跟你讲爷爷的故事，妈妈把月季举到镜头前，侄女攥住护士的手指。这些瞬间不是事件，是关系的形状。',
      '回头看，你不会觉得这三个月"飞快地过去了"。你会觉得：它有边界，有名字，可以讲出来。',
    ],
    keyMoments: ['p-0415', 'p-0509', 'p-0603', 'p-0629'],
    weekChapterCount: 5,
    monthLandscapeCount: 3,
    shareable: true,
  },
};

// ============================================================
// 人生印记（v3.19 成就系统，不游戏化）
// 不显示锁定清单；末尾永远有"雾中印记"；只在达成时惊喜出现
// ============================================================
const LIFE_MILESTONES = [
  // === 基础印记（产品能力里程碑）===
  {
    id: 'first-moment',
    emoji: '🌱',
    title: '你开始了',
    desc: '你留住了第一个瞬间。这是旷野里的第一根草。',
    check: (state) => state.moments.filter(m=>!m.archived).length >= 1,
    type: 'basic',
  },
  {
    id: 'first-photo',
    emoji: '📸',
    title: '留住了光影',
    desc: '你 Mark 了第一张照片。它不只是图像——它是时间的锚。',
    check: (state) => state.moments.some(m => m.image),
    type: 'basic',
  },
  {
    id: 'first-tell',
    emoji: '💬',
    title: '说出了为什么',
    desc: '你第一次讲了"为什么这一刻重要"。这就是讲述的开始。',
    check: (state) => state.moments.some(m => m.why && m.why.length > 0),
    type: 'basic',
  },
  {
    id: 'first-first',
    emoji: '🌿',
    title: '记住了第一次',
    desc: '一个"第一次"被你留住——它是新枝。',
    check: (state) => state.moments.some(m => m.isFirst),
    type: 'basic',
  },
  {
    id: 'first-chapter',
    emoji: '📖',
    title: '编出了本周故事',
    desc: '你亲自挑了瞬间、起了名字，编出了第一篇周章节。',
    check: (state) => Object.keys(window.__TSD_DATA__.WEEK_CHAPTERS).some(k => k >= '2026-W27'),
    type: 'basic',
  },
  {
    id: 'first-people',
    emoji: '🌸',
    title: '让一个人出现了',
    desc: '你 Mark 了一个和"谁"有关的瞬间。关系是花。',
    check: (state) => state.moments.some(m => m.people && m.people.length > 0),
    type: 'basic',
  },
  // === 人生印记（由经历触发，借鉴 Codex 两层结构）===
  {
    id: 'life-return',
    emoji: '🏠',
    title: '归来',
    desc: '你记录了一个"回到某处"的瞬间——归来是人生最深的感受之一。',
    check: (state) => state.moments.some(m => /回|归|到家|回来/.test(m.text) || (m.location && /家|故乡|老家/.test(m.location))),
    type: 'life',
    prototype: '归来与归属',
  },
  {
    id: 'life-reunion',
    emoji: '🤝',
    title: '重逢',
    desc: '你记录了一个与故人重逢的瞬间。',
    check: (state) => state.moments.some(m => /重逢|老友|好久不见|多年/.test(m.text)),
    type: 'life',
    prototype: '相逢与重逢',
  },
  {
    id: 'life-creation',
    emoji: '✨',
    title: '亲手创造',
    desc: '你留下了"第一次做某事"的瞬间——创造让你的人生有了新形状。',
    check: (state) => state.moments.filter(m => m.isFirst).length >= 3,
    type: 'life',
    prototype: '亲手创造并留下',
  },
  {
    id: 'life-quiet',
    emoji: '🍵',
    title: '人间小满',
    desc: '你记录了一个平淡但温暖的日常——人间小满是最容易被时间吞掉的。',
    check: (state) => state.moments.filter(m => m.weather === 'plain' || m.mood === 'warm').length >= 5,
    type: 'life',
    prototype: '人间小满',
  },
  {
    id: 'life-connection',
    emoji: '💗',
    title: '被看见',
    desc: '你记录了一个关于"被理解/被记住"的瞬间。',
    check: (state) => state.moments.some(m => /记得|记住|懂我|理解|想到/.test(m.text) || (m.why && /记得|记住|想念|想到/.test(m.why))),
    type: 'life',
    prototype: '被爱与被看见',
  },
  // 永远的雾中印记
  {
    id: 'fog',
    emoji: '🌫️',
    title: '雾中印记',
    desc: '下一枚仍在生活的雾里。',
    check: () => false,
    isFog: true,
  },
];

// v3.31 复利回路文案（借鉴 Codex 四回路，ZCode 具体化）
// v3.32 每日一词（可变回报：每天打开看到不同的温柔句子）
const DAILY_WORDS = [
  '日子会走，但不必都走丢。',
  '你不需要记住每一天，只需要记住某一天。',
  '时间不是敌人，遗忘才是。',
  '一个瞬间被你看见，就不会完全消失。',
  '你留住的不是照片，是那一刻你为什么停下来。',
  '生活不需要表演，但需要被区分。',
  '回头看的时候，你会感谢现在留住的这一刻。',
  '不是每一天都重要，但重要的一天不该悄悄过去。',
  '记忆是唯一不会贬值的东西。',
  '你活过的每一周，都值得被看见。',
  '平淡不是空白——它是你站立的地面。',
  '有些事不记下来，就像没发生过。',
  '时间飞快，但你可以让某些瞬间飞慢。',
  '你不需要活得很精彩，只需要知道自己在活。',
  '今天的你，是未来的你回望时想看到的样子。',
];

// v3.32 "今天的不同"提示语（检测今天 vs 昨天的变化）
const TODAY_DIFFERENCE = {
  newMoment: '今天多了一个新的瞬间。',
  newPhoto: '今天留了一张照片。',
  newPeople: '今天和 {people} 有关。',
  newFirst: '今天有了一个"第一次"。',
  newChapter: '今天你编了一个本周故事。',
  quiet: '今天还没有留下什么。也没关系。',
};

// v3.32 "明日预告"提示（Hook 触发器：制造好奇而非焦虑）
const TOMORROW_PREVIEW = [
  '明天，TSD 会帮你看看这周的故事。',
  '明天，也许会有一个旧瞬间浮现。',
  '明天，你的人生格子又会多一格。',
  '明天的你，会感谢今天留住的这一刻。',
  '明天见。你的旷野会等着你。',
];

// v3.33 时段问候（每日仪式感——根据时间给不同问候）
const TIME_GREETINGS = {
  morning: { icon: '🌅', text: '今天有什么值得留住的？' },         // 6-12
  afternoon: { icon: '☀️', text: '下午了，有没有一个瞬间想留住？' }, // 12-18
  evening: { icon: '🌆', text: '今天过得怎么样？' },                // 18-22
  night: { icon: '🌙', text: '睡前，留一个今天的瞬间？' },          // 22-6
};

// v3.33 渐进解锁（防止首日信息过载）
const PROGRESSIVE_UNLOCK = {
  day0: ['mark'],                    // 第 1 天：只能 Mark
  day1: ['mark', 'tell'],            // 第 2 天：解锁"说点什么"
  day3: ['mark', 'tell', 'scan'],    // 第 5 天：解锁今晚扫描
  day7: ['mark', 'tell', 'scan', 'chapter'], // 第 8 天：解锁周末章节
};

// v3.33 首周里程碑欢迎语
const WELCOME_MILESTONES = {
  1: '欢迎你。第一个瞬间是旷野里的第一根草。',
  2: '第二天了。昨天留的那个瞬间还在——它没有消失。',
  3: '你已经留了 3 个瞬间了。你的旷野开始有了形状。',
  5: '5 天了。你的今晚扫描开始帮你发现值得讲的瞬间。',
  7: '一周了。你的第一周故事准备好了——想编一个吗？',
  10: '10 天了。回头看看，你会发现自己已经不像以前那样忘了。',
  14: '两周了。那些瞬间串成了一条线——你开始有自己的故事了。',
  21: '三周了。习惯开始形成——你打开 TSD 不再需要提醒。',
  30: '一个月了。你已经不像一个月前那样觉得时间飞快了——因为你留住了。',
  60: '两个月了。你的旷野已经有了花草和树。',
  90: '三个月了。你能讲出这三个月的故事吗？',
};

// v3.41 心流状态文案（Flow Theory——编故事/看仪式时的沉浸感增强）
const FLOW_PROMPTS = {
  chapterStart: '深呼吸。接下来的 5 分钟，只有你和这一周的故事。',
  chapterPicking: '选你心里真正想留的那几个——不是"应该"选的。',
  chapterNaming: '给这一周起个名字。不用正式——就像给一个日子取外号。',
  chapterDone: '你刚刚把七天，编成了一个故事。它不会消失了。',
  ritualStart: '闭上眼。让这三个月的画面在脑中浮现。',
  ritualReveal: '看——这就是你活过的证据。',
  ritualDone: '这三个月没有被时间吞掉。你能讲出来。',
  monthNaming: '给这个月起个名字——它不只是日历上的数字。',
};

// v3.41 个性化周摘要模板（AI 规则引擎——从用户数据生成"你的这周"）
const WEEKLY_DIGEST_TEMPLATES = {
  noData: '这周还没开始记录。从留一个瞬间开始？',
  oneMoment: '这周你留了 1 个瞬间："{text}"。它可能是这周最重要的事。',
  fewMoments: '这周你留了 {count} 个瞬间。{people}出现了 {peopleCount} 次。',
  rich: '这周很丰富——{count} 个瞬间，{toldCount} 个你讲过。这周的故事准备好了。',
  quiet: '这周比较安静——{count} 个瞬间。安静的一周也是完整的一周。',
};

// v3.41 社交展示个人化（分享图水印）
const SHARE_PERSONALIZATION = {
  watermarks: [
    '我的人生，我留住',
    '时间不会回来，但瞬间可以',
    '每一个瞬间都值得',
    '我在用 TSD 留住人生',
  ],
  signatures: [
    '— 来自 TSD',
    '— 让时间慢下来',
    '— 我的记忆资产',
  ],
};

// v3.37 首月回顾（30 天触发的惊喜 + 社交货币）
const FIRST_MONTH_REVIEW = {
  triggerDays: 30,  // 用满 30 天触发
  titles: [
    '你的第一个月',
    '30 天，你留住了这些',
    '一个月前，你开始了',
  ],
  intros: [
    '30 天前你留下第一个瞬间。现在回头看，这些就是你这一个月真正活过的证据。',
    '一个月不知不觉过去了。但这次不一样——你留住了其中的一些。',
    '如果不是 TSD，这 30 天可能像以前一样飞快地消失。但它没有。',
  ],
  closings: [
    '这只是开始。你的旷野会继续生长。',
    '下一个月，你会有新的故事可以讲。',
    '回头见。你的瞬间会一直在这里等你。',
  ],
};

// v3.37/v3.44 年度回顾（365 天触发的可分享回顾卡）
const YEAR_REVIEW_SEED = {
  triggerDays: 365,
  status: 'active',
  titles: ['你的一年', '365 天，你留住了什么', '这一年，没有飞快地消失'],
  intros: [
    '一年前你留下了第一个瞬间。现在回头看——这就是你这一年真正活过的。',
    '365 天。如果没有 TSD，它们可能像以前一样飞快地消失。但这次没有。',
    '这一年你做了一件事：开始留住瞬间。这是你一年的证据。',
  ],
  closings: [
    '这只是第一年。你的旷野会继续生长，年复一年。',
    '下一年，你会有新的故事——但这一年不会被忘记。',
    '回头见。你的瞬间会一直在这里等你。',
  ],
};
const UNEXPECTED_CONNECTIONS = [
  '你 {days} 天前也留过一个和 {people} 有关的瞬间。',
  '{days} 天前你在 {location} 也留过一个瞬间。',
  '上一次你在 TSD 讲故事，是 {days} 天前。',
];

const COMPOUND_LOOPS = {
  perMark: [
    '留住了。这一刻不会消失了。',
    '又一个瞬间被你留住了。',
    '你的旷野在生长。',
    '它会在你回头看时等着你。',
    '这一刻，没有被时间吞掉。',
  ],
  perChapter: [
    '这一周没有消失。它有了名字。',
    '你亲自讲出了这一周的故事。',
    '七个日子，被你编成了一个故事。',
  ],
  perMonth: [
    '这个月有了名字。它不再只是日历上的数字。',
    '你看见了这一个月的主线。',
  ],
  perSeason: [
    '这三个月没有被时间吞掉。',
    '九十天，你讲得出其中的鲜明瞬间。',
    '回头看，它有边界，有名字，可以讲出来。',
  ],
};

const NIGHT_SCAN = {
  // 讲述价值评分规则（高分在前）
  scoreRules: {
    hasPeople: 30,        // 有人物 → 关系深、可讲述性高
    isFirst: 20,          // 第一次 → 鲜明边界
    moodShift: 10,        // 强情绪（深/感激） → 转变证据
    hasPhoto: 5,          // 有照片 → 锚点强
    hasText: 3,           // 有文字 → 锚点强
  },
  // 哪些 mood 算"情绪转变"（强情绪）
  shiftMoods: ['deep', 'grateful', 'joy'],
  // 触发阈值：当日 L0 Mark ≥ 2 才扫描（无稿件编辑不出活）
  minMarksToScan: 2,
  // 推送的候选数量上限
  maxCandidates: 3,
  // 反 streak：连续 X 天没响应就降频
  silenceThreshold: 3,
};

// 暴露
window.__TSD_DATA__ = {
  USER, MOODS, MOMENTS, WEEK_CHALLENGE, MEADOW_LEVELS, PLAIN_MODE, ONBOARDING, NIGHT_SCAN,
  WEEK_CHAPTERS, MONTH_LANDSCAPES, SEASON_RITUAL, LIFE_MILESTONES, COMPOUND_LOOPS,
  DAILY_WORDS, TODAY_DIFFERENCE, TOMORROW_PREVIEW,
  TIME_GREETINGS, PROGRESSIVE_UNLOCK, WELCOME_MILESTONES, UNEXPECTED_CONNECTIONS,
  FIRST_MONTH_REVIEW, YEAR_REVIEW_SEED,
  FLOW_PROMPTS, WEEKLY_DIGEST_TEMPLATES, SHARE_PERSONALIZATION,
};
