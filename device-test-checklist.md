# TSD 真机测试检查清单

> 当你连上 iPhone + 配好 Apple ID 后，按此清单逐项验证。
> 预计耗时：15-20 分钟

## 前置准备

- [ ] iPhone 用数据线连接 Mac
- [ ] iPhone 点击「信任此电脑」
- [ ] Xcode → Settings → Accounts → 已添加 Apple ID
- [ ] App target → Signing & Releases → Team 已选 Personal Team
- [ ] Xcode 顶部设备选择器选了你的 iPhone

## 部署

```bash
cd ~/TimeSlowDown
bash scripts/device-test.sh
# 或直接在 Xcode 按 Cmd+R
```

- [ ] BUILD SUCCEEDED（无 error）
- [ ] App 安装到 iPhone（图标出现在桌面）
- [ ] iPhone: 设置 → 通用 → VPN与设备管理 → 信任开发者证书

## 核心功能验证

### 1. 首次启动 + Onboarding
- [ ] App 启动无 crash
- [ ] 显示 Onboarding 第 1 屏（"日子嗖地就过去了"）
- [ ] 点击 CTA 进入第 2 屏
- [ ] 走完全部 3 步 onboarding
- [ ] 进入空状态首页（显示「留一个瞬间」引导）

### 2. Mark 一个瞬间（文字）
- [ ] 点击底部 ＋ 按钮
- [ ] 录入页正常打开
- [ ] 选择一个心情（如 🌿 平静）
- [ ] 输入文字"测试"
- [ ] 点击保存
- [ ] 显示成功动画（✓ + 鼓励语）
- [ ] 返回首页，新 Mark 出现在「这一周」区域
- [ ] 弹出「说点什么」升级引导

### 3. Mark 一个瞬间（拍照）⭐ 关键路径
- [ ] 再次点击 ＋
- [ ] 点击照片 slot（＋ Mark 一张照片）
- [ ] **弹出拍照/相册选择**（Capacitor Camera 插件）
- [ ] 选择「拍照」
- [ ] **相机正常打开**（无黑屏/无 crash）
- [ ] 拍一张照片
- [ ] 照片显示在录入页 slot 中（已压缩为 800px）
- [ ] 输入文字 + 保存
- [ ] 首页显示带照片的 Mark

### 4. 旷野视图
- [ ] 点击底部「旷野」tab
- [ ] **SVG 旷野正常渲染**（草、花、树）
- [ ] 切换到「月」缩放
- [ ] 显示当月景观卡片
- [ ] 切换到「一生」缩放
- [ ] **人生格子 Canvas 正常渲染**（4160 格 + 三色 + 脉冲）

### 5. 周末章节
- [ ] 回到首页
- [ ] 滚动到「周末章节」区域
- [ ] 点击「开始编故事」
- [ ] **认领门 overlay 正常弹出**
- [ ] 可选择 2-3 个瞬间
- [ ] 输入章节标题
- [ ] AI 编译（或降级规则引擎）生成故事开篇

### 6. 分享卡
- [ ] 在章节页点分享
- [ ] **Canvas 生成分享卡**（无 crash）
- [ ] 弹出系统分享面板

### 7. 视觉质量
- [ ] 字体渲染正确（Noto Serif SC 或降级到 Songti SC）
- [ ] **Safe Area 正确**（刘海不被遮挡，底部手势条不挡 tab bar）
- [ ] 暖色纸感背景 (#fffdf8) 一致
- [ ] 无横线/错位/溢出

### 8. 性能
- [ ] 页面切换流畅（无明显卡顿）
- [ ] 拍照后无长时间冻结（< 2s）
- [ ] 旷野 SVG 动画流畅
- [ ] 人生格子 Canvas 渲染 < 3s

## Crash 检查

- [ ] 打开 Xcode 控制台（Cmd+Shift+Y）
- [ ] 全程操作无红色 error 日志
- [ ] 无 `EXC_BAD_ACCESS` / `SIGABRT` / `NSException`

## 完成后

将 Xcode 控制台日志复制发给 Geralt 分析：
```bash
# 导出日志
xcrun devicectl device info dumpstate --device <UDID> > /tmp/tsd-device-state.txt
```

或在 Xcode → Window → Devices and Simulators → 选你的 iPhone → View Device Logs
