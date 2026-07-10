#!/bin/bash
# TSD 真机一键测试脚本
# 前提：已在 Xcode → Settings → Accounts 添加 Apple ID
#       已连接 iPhone 到 Mac
# 用法：bash scripts/device-test.sh

set -e

echo "========== TSD 真机测试自动化 =========="
echo ""

# 1. 检查设备
echo "📡 检查连接的设备..."
DEVICES=$(xcrun devicectl list devices --json-output /tmp/tsd-devices.json 2>&1 || true)
DEVICE_COUNT=$(python3 -c "
import json
try:
    with open('/tmp/tsd-devices.json') as f:
        data = json.load(f)
    result = data.get('result', {})
    devices = result.get('devices', [])
    physical = [d for d in devices if d.get('hardwareProperties', {}).get('deviceType', '') != 'computer']
    print(len(physical))
except:
    print(0)
" 2>&1)

if [ "$DEVICE_COUNT" = "0" ]; then
    echo "❌ 没有检测到连接的 iPhone"
    echo ""
    echo "请完成以下步骤："
    echo "  1. 用数据线连接 iPhone 到 Mac"
    echo "  2. iPhone 上点「信任此电脑」"
    echo "  3. 确认 Xcode → Settings → Accounts 已添加 Apple ID"
    echo "  4. 重新运行此脚本"
    exit 1
fi

echo "✅ 检测到 $DEVICE_COUNT 台设备"
python3 -c "
import json
with open('/tmp/tsd-devices.json') as f:
    data = json.load(f)
for d in data.get('result', {}).get('devices', []):
    if d.get('hardwareProperties', {}).get('deviceType', '') != 'computer':
        print(f'  📱 {d[\"hardwareProperties\"][\"name\"]} ({d[\"hardwareProperties\"][\"modelNumber\"]}) - {d[\"identifier\"]}')
" 2>&1

# 2. 获取第一个设备的 UDID
DEVICE_UDID=$(python3 -c "
import json
with open('/tmp/tsd-devices.json') as f:
    data = json.load(f)
for d in data.get('result', {}).get('devices', []):
    if d.get('hardwareProperties', {}).get('deviceType', '') != 'computer':
        print(d['identifier'])
        break
" 2>&1)

echo ""
echo "📦 构建并安装到 $DEVICE_UDID..."

# 3. 同步最新 web 资产
echo "  → 同步 web 资产..."
cd ~/TimeSlowDown
npx cap sync ios 2>&1 | grep -E "Sync finished|Copying|error"

# 4. Xcode 构建 + 安装 + 启动（通过 xcodebuild）
echo "  → 构建 + 安装..."
cd ~/TimeSlowDown/ios/App

# 自动检测 Team ID
TEAM_ID=$(grep -r "DEVELOPMENT_TEAM" App.xcodeproj/project.pbxproj 2>/dev/null | head -1 | grep -oE '[A-Z0-9]{10}' || echo "")

xcodebuild \
  -workspace App.xcworkspace \
  -scheme App \
  -configuration Debug \
  -destination "id=$DEVICE_UDID" \
  -quiet \
  build 2>&1 | tail -5

echo ""
echo "✅ 如果构建成功，App 已安装到真机"
echo ""
echo "📱 在 iPhone 上："
echo "  1. 打开 TSD App"
echo "  2. 如果提示「不受信任的开发者」→ 设置 → 通用 → VPN与设备管理 → 信任"
echo "  3. 走完 Onboarding"
echo "  4. Mark 一个瞬间（含拍照）"
echo "  5. 翻看旷野、周末章节、人生格子"
echo ""
echo "🔍 如有 crash，将 Xcode 控制台日志发给 Geralt 分析"
