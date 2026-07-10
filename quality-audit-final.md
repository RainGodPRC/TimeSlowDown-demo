# TSD — App Store 发布就绪审计报告

> **日期**: 2026-07-11
> **版本**: v3.51 (Cache-buster v=71)
> **状态**: ✅ 模拟器验证通过 · 截图就绪 · 待 Apple Developer 注册

---

## 一、通过项（全部 ✅）

### 1.1 P0 审核阻塞项 — 已修复

| 编号 | 问题 | 状态 |
|------|------|------|
| P0-1 | PrivacyInfo.xcprivacy 未被 Xcode 引用 | ✅ 已加入工程 |
| P0-2 | Info.plist 缺 Required Reason API 声明 | ✅ UserDefaults CA92.1 + FileTimestamp C617.1 |

### 1.2 P1 质量问题 — 已修复

| 编号 | 问题 | 状态 |
|------|------|------|
| P1-3 | `isNativePlatform` 缺 `()` → SW 不注册 | ✅ 已修复 |
| P1-4 | 多余 remote-notification 后台模式 | ✅ 已删除 |
| P1-5 | 两份 Info.plist 不一致 | ✅ 统一为 ios/App/App/Info.plist |
| P1-6 | 多余 AppIcon 文件 | ✅ 已清理 |

### 1.3 真机适配

| 项目 | 状态 |
|------|------|
| Safe Area (viewport-fit=cover + env()) | ✅ |
| 底部手势条避让 (tab-bar padding-bottom) | ✅ |
| Portrait only 方向锁定 | ✅ |
| Noto Serif/Sans SC 字体加载 | ✅ |

### 1.4 审核合规

| 项目 | 状态 |
|------|------|
| ITSAppUsesNonExemptEncryption = false | ✅ |
| 0 个 alert() 调用 | ✅ |
| NSPrivacyTracking = false | ✅ |
| NSPrivacyCollectedDataTypes = 空 | ✅ |
| 3 个中文权限说明文案 | ✅ (PhotoLibrary/Add + Camera) |

### 1.5 代码质量

| 项目 | 状态 |
|------|------|
| app.js 语法检查 | ✅ `node -c` 通过 |
| data.js 语法检查 | ✅ `node -c` 通过 |
| www/ 与源码同步 | ✅ 4 个文件全部一致 |
| 运行时 JS 错误 | ✅ 0 个 (Playwright WebKit 验证) |

### 1.6 模拟器验证

| 项目 | 结果 |
|------|------|
| iPhone 17 Pro Simulator (iOS 26.5) | ✅ 启动 |
| BUILD SUCCEEDED (iphoneos Release) | ✅ |
| BUILD SUCCEEDED (iphonesimulator Debug) | ✅ |
| App 安装 + 启动 | ✅ PID 97934 |
| 6 个视图全部渲染正确 | ✅ |

### 1.7 App Store 截图

| # | 视图 | 文件 | 尺寸 |
|---|------|------|------|
| 1 | Onboarding 第1屏 | app-store-screenshot-1.png | 1290×2796 |
| 2 | 讲述首页 | app-store-screenshot-2.png | 1290×2796 |
| 3 | 录入页 | app-store-screenshot-3.png | 1290×2796 |
| 4 | 旷野(月缩放) | app-store-screenshot-4.png | 1290×2796 |
| 5 | 周末章节 | app-store-screenshot-5.png | 1290×2796 |
| 6 | 人生格子 | app-store-screenshot-6.png | 1290×2796 |

每张含：营销标题（暖琥珀色衬线）+ 副标题 + App 截图 + TSD logo slogan

---

## 二、待办项（需要用户操作）

| 项目 | 说明 | 阻塞 |
|------|------|------|
| **注册 Apple Developer** | $99/年 → [developer.apple.com](https://developer.apple.com) | Archive 上传 |
| **真机测试** | iPhone 连接 Xcode → Run → 验证无 crash | 发布前必须 |
| **TestFlight 内测** | fastlane beta 或 Xcode → Product → Archive | 需要 Developer |
| **App Store Connect 提交** | 上传 6 张截图 + 元数据 | 需要 Developer |

---

## 三、文件清单

```
~/TimeSlowDown/
├── index.html          (v=71, viewport-fit=cover)
├── app.js              (~4500行, IIFE, 0 alert)
├── data.js             (~635行, Demo + Empty 数据)
├── styles.css          (~3900行, Safe Area 适配)
├── sw.js               (条件注册, !isNative)
├── capacitor.config.ts (appId: app.tsd.timedown)
├── ios/
│   └── App/App/
│       ├── Info.plist          (合规字段齐全)
│       └── PrivacyInfo.xcprivacy
├── www/                (Capacitor 同步源)
├── fastlane/Fastfile   (beta lane: sync+archive+TestFlight)
├── scripts/
│   ├── build-www.cjs           (Web→www 构建器)
│   ├── capture-screenshots.mjs (截图自动化)
│   └── add-overlays.py         (截图标题叠加)
├── screenshots/
│   ├── raw/            (6 张原始截图)
│   └── final/          (6 张带标题的 App Store 截图)
├── app-store-submission.md     (完整 App Store 元数据)
└── app-store-screenshots-spec.md
```

---

## 四、发布步骤（Developer 注册后）

```bash
# 1. 构建 www/
node scripts/build-www.cjs

# 2. Capacitor 同步
npx cap sync ios

# 3. Xcode Archive
open ios/App.xcworkspace
# → Product → Archive

# 或用 fastlane 自动化：
cd ios && fastlane beta

# 4. App Store Connect
# → 上传构建 → 填写元数据 → 上传 6 张截图 → 提交审核
```

---

## 五、结论

**TSD v3.51 已达到 App Store 可发布质量。** 所有 P0/P1 问题已修复，模拟器验证通过，6 张 App Store 截图已就绪。唯一阻塞项是 Apple Developer 账号注册（$99/年），用户表示稍后处理。

代码零语法错误，零运行时错误，零 alert 调用，隐私合规字段齐全。随时可以 Archive + TestFlight。
