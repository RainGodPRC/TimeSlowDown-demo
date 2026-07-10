# TSD — Time Slow Down | 交接文档

> 最后更新：2026-07-11 | 版本：v3.58 | Git: `main` → `origin/main` ✅ 已推送

---

## 📱 项目简介

TSD 帮助 30-50 岁感到时间飞快的人捕捉有意义的瞬间，编成故事，让生活有实感。

核心论点：**D 讲述优先 + B Mark 优先 + C 旷野优先**——价值不在于"记录了多少"，而在于"能再讲一遍"。

## 🚀 当前进状态

### ✅ 已完成

| 维度 | 详情 |
|------|------|
| **代码** | v3.58，零 JS 运行时错误，7 核心路径验证通过 |
| **编译** | arm64 Release (iphoneos) + x86_64 Debug (iphonesimulator) BUILD SUCCEEDED |
| **原生插件** | 6 个：Camera / Haptics / Filesystem / LocalNotifications / Preferences / Share |
| **UX** | Dark Mode 暖夜主题、全局触控反馈、Haptics 触感、品牌化 Splash |
| **合规** | PrivacyInfo.xcprivacy、UIRequiresFullScreen、3 权限文案、加密声明 |
| **截图** | 6 张 1290×2796 App Store 截图（含标题叠加） |
| **健壮性** | 全局错误捕获器、OOM 防护、null 引用防护、存储满降级 |
| **无障碍** | ARIA role/label/selected、VoiceOver 支持 |
| **部署** | GitHub + GitHub Pages 已上线 |

### ⏳ 待完成

| 项目 | 条件 |
|------|------|
| **真机测试** | 需要 iPhone + 数据线 + Apple ID |
| **Apple Developer 注册** | $99/年（TestFlight + App Store 发布需要） |
| **TestFlight 内测** | 需要 Developer 账号 |
| **M2 用户测试** | 招募 3 人 × 7 天 |

## 📂 关键文件

```
~/TimeSlowDown/
├── app.js                    # 主逻辑 (~4600行, IIFE)
├── data.js                   # 数据常量 + Demo 数据
├── styles.css                # 样式 (~3900行, 含 Dark Mode)
├── index.html                # App Shell
├── capacitor.config.ts       # Capacitor 配置
├── ios/                      # Xcode 工程
│   └── App/App/
│       ├── Info.plist        # 合规字段齐全
│       └── PrivacyInfo.xcprivacy
├── scripts/
│   ├── build-www.cjs         # Web→www 构建
│   ├── capture-screenshots.mjs # 截图自动化
│   ├── add-overlays.py       # 截图标题叠加
│   └── device-test.sh        # 真机一键测试
├── screenshots/
│   ├── raw/                  # 6 张原始截图
│   └── final/                # 6 张带标题的 App Store 截图
├── device-test-checklist.md  # 25 项真机测试清单
├── quality-audit-final.md    # 质量审计报告
└── app-store-submission.md   # 完整 App Store 元数据
```

## 🛠 真机测试步骤

```bash
# 1. 连接 iPhone
# 2. Xcode → Settings → Accounts → 添加 Apple ID
# 3. App target → Signing & Releases → 选 Personal Team
# 4. 运行
bash ~/TimeSlowDown/scripts/device-test.sh
# 5. 照 device-test-checklist.md 逐项验证
```

## 📦 发布步骤（Developer 注册后）

```bash
# 1. 同步
cd ~/TimeSlowDown && node scripts/build-www.cjs && npx cap sync ios

# 2. Archive
open ios/App.xcworkspace
# → Product → Archive

# 3. 或用 fastlane
cd ios && fastlane beta

# 4. App Store Connect 上传 + 截图 + 元数据 → 提交审核
```

## 🌐 在线体验

**GitHub Pages**: `https://raingodprc.github.io/TimeSlowDown-demo/`
- 手机 Safari 打开 → 分享 → 添加到主屏幕
- 支持 Dark Mode 自动切换
- Camera/Haptics 插件在 PWA 模式下自动降级

## 📋 版本历史

| 版本 | 日期 | 内容 |
|------|------|------|
| v3.52 | 07-11 | 通知图标 + 方向锁定 + 截图工具 + 质量审计 |
| v3.53 | 07-11 | 录入页暖色照片卡片 + 文案精简 + 芯片弹跳 |
| v3.54 | 07-11 | 旷野 5 色花瓣 + 蝴蝶 + 太阳光晕 + 全局触控反馈 |
| v3.55 | 07-11 | Dark Mode 暖夜主题 + VoiceOver 无障碍 |
| v3.56 | 07-11 | 拍照 loading + OOM 防护 + 存储满降级 |
| v3.57 | 07-11 | Haptics 触感反馈 + 品牌化 Splash |
| v3.58 | 07-11 | null 引用防护（openCompose + saveCompose） |
