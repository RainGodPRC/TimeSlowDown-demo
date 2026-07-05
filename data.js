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
// Onboarding（三屏极简，重在行动，不在教学）
// ============================================================
const ONBOARDING = {
  steps: [
    {
      // 第 1 屏：共情，不教概念
      eyebrow: '嗨',
      headline: '感觉时间过得很快吗？',
      sub: '一周，一月，一年——嗖地就过去。\n回头看又想不起具体发生过什么。',
      visual: 'fast',           // 快速飘过的日子
      cta: '是的',
      skipText: '其实没有',
    },
    {
      // 第 2 屏：承诺，不教机制
      eyebrow: 'TSD 帮你',
      headline: '把日子留住，\n回头能讲得出来。',
      sub: '不需要写日记。\n留一张照片、说一句话，都算。',
      visual: 'rest',           // 一张照片被"留住"
      cta: '好',
      skipText: null,
    },
    {
      // 第 3 屏：行动，不解释
      eyebrow: '试试',
      headline: '现在，留一个瞬间',
      sub: '今天有什么是你想记住的？\n一张照片，一个心情，都行。',
      visual: 'plus',           // 一个大加号
      cta: '开始',
      skipText: '先看看示例',
    },
  ],
};

// 暴露
window.__TSD_DATA__ = {
  USER, MOODS, MOMENTS, WEEK_CHALLENGE, MEADOW_LEVELS, PLAIN_MODE, ONBOARDING,
};
