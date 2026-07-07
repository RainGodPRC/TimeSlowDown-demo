#!/bin/bash
# TSD — iOS 构建脚本
# 用法：安装完整 Xcode 后执行 bash build-ios.sh

set -e

echo "🏗️  TSD iOS 构建脚本"
echo "===================="
echo ""

# 1. 检查 Xcode
if ! xcode-select -p | grep -q "Xcode.app"; then
  echo "❌ 未找到完整 Xcode。请先从 Mac App Store 安装："
  echo "   open 'macappstore://apps.apple.com/app/xcode/id497799835'"
  echo ""
  echo "   安装后执行："
  echo "   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
  echo "   sudo xcodebuild -license accept"
  exit 1
fi
echo "✅ Xcode 已安装"

# 2. 检查 CocoaPods
if ! command -v pod &> /dev/null; then
  echo "📦 安装 CocoaPods..."
  sudo gem install cocoapods
fi
echo "✅ CocoaPods $(pod --version)"

# 3. 同步 web 资源
echo "🔄 同步 web 资源到 iOS 工程..."
cd ~/TimeSlowDown
npx cap sync ios

# 4. 安装 iOS 依赖
echo "📦 安装 iOS 原生依赖（pod install）..."
cd ios/App
pod install
cd ../..

# 5. 打开 Xcode
echo "📂 打开 Xcode..."
npx cap open ios

echo ""
echo "✅ 全部就绪！"
echo ""
echo "在 Xcode 中："
echo "  1. 选择你的 Apple Developer Team（Signing & Capabilities）"
echo "  2. 确认 Bundle Identifier: app.tsd.timedown"
echo "  3. 连接 iPhone，选择设备"
echo "  4. Cmd+R 真机调试"
echo "  5. Product → Archive → Distribute App → App Store Connect"
echo ""
echo "🍎 祝好运。"
