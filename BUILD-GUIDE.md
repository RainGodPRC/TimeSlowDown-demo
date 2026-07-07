# TSD — 从 Demo 到 App Store 构建指南

> 本指南让有 Xcode + Apple Developer 账号的开发者，从当前项目直接构建出可提交 App Store 的 `.ipa`。

## 前提条件

| 要求 | 版本 |
|------|------|
| macOS | 14.0+（Sonoma） |
| Xcode | 16.0+（**完整版，不是 Command Line Tools**） |
| CocoaPods | 1.13+（`sudo gem install cocoapods`） |
| Node.js | 20+ |
| Apple Developer 账号 | $99/年 |

## 项目结构

```
~/TimeSlowDown/
├── www/                    ← Web 静态资源（Capacitor webDir）
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── data.js
│   ├── manifest.json
│   ├── sw.js
│   ├── icon-192.png
│   └── icon-512.png
├── ios/                    ← Capacitor 生成的 Xcode 工程
│   └── App/
│       ├── App.xcodeproj
│       ├── App.xcworkspace  ← 用这个打开
│       └── App/
│           ├── AppDelegate.swift
│           ├── Info.plist   ← 已配好权限文案
│           ├── PrivacyInfo.xcprivacy  ← iOS 17+ 隐私清单
│           └── public/      ← Capacitor 同步的 web 资源
├── capacitor.config.ts     ← Capacitor 配置（appId: app.tsd.timedown）
├── package.json            ← npm 依赖
├── app-store-submission.md ← App Store 提交素材
└── BUILD-GUIDE.md          ← 本文件
```

## 构建步骤

### 1. 安装 Xcode 完整版

```bash
# 从 Mac App Store 下载 Xcode（约 12GB）
open "macappstore://apps.apple.com/app/xcode/id497799835"

# 安装后切换 xcode-select
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer

# 接受许可
sudo xcodebuild -license accept
```

### 2. 安装 CocoaPods

```bash
sudo gem install cocoapods
pod --version  # 验证 1.13+
```

### 3. 同步 Web 资源到 iOS 工程

每次改了 `www/` 里的文件后：

```bash
cd ~/TimeSlowDown
npm run build          # 当前是静态资源，无构建步骤
npx cap sync ios       # 同步 www/ → ios/App/App/public/
```

### 4. 安装 iOS 依赖（CocoaPods）

```bash
cd ~/TimeSlowDown/ios/App
pod install
```

### 5. 打开 Xcode

```bash
cd ~/TimeSlowDown
npx cap open ios
# 或者直接：
open ios/App/App.xcworkspace
```

### 6. 在 Xcode 里配置

1. **Signing & Capabilities** → 选择你的 Apple Developer Team
2. **Bundle Identifier** → 确认为 `app.tsd.timedown`（或你的注册 ID）
3. **Version** → 设为 `1.0.0`，Build → `1`
4. **App Icons** → 拖入 1024×1024 的 App 图标（需要从 icon-512.png 放大或重新设计）
5. **Launch Screen** → 在 `Base.lproj/LaunchScreen.storyboard` 设置暖色背景 + 居中 TSD logo

### 7. 真机调试

```bash
# 连接 iPhone → 在 Xcode 选设备 → Cmd+R 运行
# 或命令行：
npx cap run ios
```

### 8. 构建 `.ipa` 提交

1. Xcode → Product → Archive（构建 Release 版本）
2. Organizer → Distribute App → App Store Connect
3. 上传到 App Store Connect
4. 在 App Store Connect 填写：
   - App 描述（见 `app-store-submission.md`）
   - 截图（6 张 6.7" iPhone）
   - 关键词
   - 隐私政策 URL
5. 提交审核

## 原生权限配置（已预置）

`ios/App/App/Info.plist` 已包含：

| 权限 | Key | 文案 |
|------|-----|------|
| 相册读取 | `NSPhotoLibraryUsageDescription` | TSD 需要访问你的照片库，让你选择要 Mark 的瞬间照片。 |
| 相机 | `NSCameraUsageDescription` | TSD 需要使用相机，让你直接拍摄要留住的瞬间。 |
| 保存到相册 | `NSPhotoLibraryAddUsageDescription` | TSD 需要保存你生成的分享故事卡到相册。 |

`ios/App/App/PrivacyInfo.xcprivacy` 已包含：
- `NSPrivacyTracking`: false（不追踪）
- `NSPrivacyCollectedDataTypes`: 空数组（不收集数据）
- `NSPrivacyAccessedAPITypes`: UserDefaults (CA92.1) + FileTimestamp (C617.1)

## Capacitor 插件已集成

| 插件 | 用途 | 状态 |
|------|------|------|
| `@capacitor/camera` | 原生相机/相册选照片 | 已安装（需替换 FileReader 逻辑） |
| `@capacitor/preferences` | 原生 KV 存储（替代 localStorage） | 已安装（可选迁移） |
| `@capacitor/share` | 原生分享面板 | 已安装 |
| `@capacitor/filesystem` | 文件系统（导出 PDF/JSON） | 已安装 |
| `@capacitor/local-notifications` | 本地通知（晚间扫描提醒） | 已安装（需接入） |

## 需要在 JS 层做的原生适配

当前 PWA 的某些 Web API 在 Capacitor WebView 里需要替换：

| Web API | Capacitor 替代 | 文件 |
|---------|---------------|------|
| `<input type="file">` + FileReader | `Camera.getPhoto()` | app.js 录入页 |
| `navigator.serviceWorker` | 不需要（Capacitor 本地加载） | index.html（移除 SW 注册） |
| `localStorage` | `Preferences` 插件（可选） | app.js（当前 localStorage 在 WebView 里可用） |
| `canvas.toBlob` + `<a download>` | `Filesystem.writeFile` + `Share.share` | app.js 分享卡 |
| Web Push | `LocalNotifications.schedule` | app.js 今晚扫描 |

## 版本管理

```bash
# 改版本号
cd ~/TimeSlowDown
# package.json
npm version 1.0.0

# iOS 工程（Xcode 里改或）
agvtool new-marketing-version 1.0.0
agvtool new-version -all 1
```

## 常见问题

### Q: `pod install` 报版本冲突
```bash
cd ios/App
pod repo update
pod install
```

### Q: Xcode 报 "No such module 'Capacitor'"
```bash
cd ~/TimeSlowDown
npx cap sync ios
cd ios/App && pod install
```

### Q: 构建时白屏
检查 `capacitor.config.ts` 的 `webDir` 是否为 `'www'`，且 `www/index.html` 存在。

### Q: 相机不弹权限
确认 Info.plist 有 `NSCameraUsageDescription`，且 Xcode → Signing & Capabilities → 添加 Camera 权限。

### Q: App Store 审核被拒 "Guideline 2.1"
检查：
- 隐私政策 URL 有效
- 截图与实际功能一致
- 权限文案精确解释为什么需要
- 无 TestFlight 专用的 debug 代码

## 时间预估

| 步骤 | 耗时 |
|------|------|
| 安装 Xcode + CocoaPods | 1-2 小时（主要是下载） |
| 配置签名 + Bundle ID | 15 分钟 |
| 真机调试 | 30 分钟 |
| 拍截图（6 张） | 30 分钟 |
| Archive + 上传 | 15 分钟 |
| 审核等待 | 1-3 天 |
| **总计** | **约 3-5 天（含审核）** |
