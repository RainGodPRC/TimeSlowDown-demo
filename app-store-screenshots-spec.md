# TSD App Store 截图规格

> 需要用模拟器或真机截图。Xcode → 模拟器运行 → Cmd+S 截图。
> 6.7" iPhone（iPhone 15 Pro / 16 Pro）截图尺寸：**1290 × 2796 像素**

## 6 张截图内容规划

### 截图 1：Onboarding 第 1 屏（行动入口）
- **标题**：看见你的时间
- **副标题**：80 年，4160 周——留一个瞬间
- **操作**：走完 onboarding 到第 1 屏 → 截图
- **设计叠加**：顶部加标题文字 + 底部加 TSD logo

### 截图 2：讲述首页
- **标题**：这周三个故事，你讲得出吗？
- **副标题**：Mark 一个瞬间就算讲了
- **操作**：进入 empty mode，Mark 2-3 个瞬间后截图
- **展示**：时段问候 + 每日一词 + 今晚扫描 + told/untold 卡

### 截图 3：录入页
- **标题**：5 秒留住一个瞬间
- **副标题**：照片、心情、一句话——任何一个都算
- **操作**：点 ＋ 进入录入页 → 截图
- **展示**：照片 slot + 心情 chip + 天气 + 文字输入

### 截图 4：旷野
- **标题**：你的瞬间，长成一片旷野
- **副标题**：草是日常，花是记忆，树是关系
- **操作**：切到旷野 → 时间镜头 → 月缩放 → 截图
- **展示**：SVG 旷野 + 花草 + 引导说明

### 截图 5：周末章节
- **标题**：给这一周起个名字
- **副标题**：从瞬间里挑 2-3 个，编成故事
- **操作**：点"开始本周章节" → 在挑选步骤截图
- **展示**：认领门（推荐标记）+ 心流引导

### 截图 6：人生格子
- **标题**：看见你的一生
- **副标题**：4160 格——每一格是一周
- **操作**：旷野 → 缩放到"一生" → 截图
- **展示**：A4 格子 + 三色 + 当前脉冲

## 截图设计叠加

每张截图需要在原图基础上叠加：
- **顶部标题**（28pt 衬线，暖琥珀色）
- **底部 TSD logo + slogan**

用 canvas 或 Figma 后处理。或直接用 Xcode 模拟器截图后在 Preview/Photoshop 加文字。

## 模拟器截图方法

```bash
# 启动模拟器
xcrun simctl boot "iPhone 16 Pro"
# 打开 App（需先 build 到模拟器）
xcrun simctl install booted ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch booted app.tsd.timedown
# 截图
xcrun simctl io booted screenshot screenshot-1.png
```

## App Store Connect 上传要求

- 格式：PNG 或 JPEG
- 尺寸：1290 × 2796（6.7" iPhone）
- 数量：最少 1 张，最多 10 张
- 不能含：Apple 设备图片、价格信息、URL
- 可以含：文字叠加、设计装饰

## 注意事项

- 截图必须反映**真实 App 功能**（不能是概念图）
- 首张截图最重要（App Store 搜索结果里显示）
- 暗色模式截图也建议准备（App Store 支持 light/dark 两组）
