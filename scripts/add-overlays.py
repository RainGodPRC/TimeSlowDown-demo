#!/usr/bin/env python3
"""
TSD App Store 截图后处理
在每张截图顶部加营销标题 + 底部加 TSD logo
输出到 screenshots/final/ 目录

输出尺寸：1290 × 2796（6.7" iPhone App Store 要求）
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

RAW_DIR = '/Users/geralt/TimeSlowDown/screenshots/raw'
FINAL_DIR = '/Users/geralt/TimeSlowDown/screenshots/final'
os.makedirs(FINAL_DIR, exist_ok=True)

# 设计 Token（与 App 保持一致）
BG_PAPER = (255, 253, 248)      # #fffdf8
INK_DARK = (62, 50, 39)          # 深墨色
INK_SOFT = (139, 125, 107)       # 柔和墨色
AMBER = (200, 135, 60)           # 暖琥珀色 #c8873c
AMBER_LIGHT = (230, 190, 130)

# 字体路径（macOS 系统字体）
def get_font(size, bold=False):
    candidates = [
        '/System/Library/Fonts/STHeiti Light.ttc',
        '/System/Library/Fonts/PingFang.ttc',
        '/System/Library/Fonts/Hiragino Sans GB.ttc',
        '/Library/Fonts/Arial Unicode.ttf',
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except:
                continue
    return ImageFont.load_default()

# 每张截图的营销文案
SPECS = [
    {
        'file': 'screenshot-1-onboarding.png',
        'title': '看见你的时间',
        'subtitle': '80 年，4160 周——留一个瞬间',
    },
    {
        'file': 'screenshot-2-home.png',
        'title': '这周三个故事，你讲得出吗？',
        'subtitle': 'Mark 一个瞬间，就算讲了',
    },
    {
        'file': 'screenshot-3-compose.png',
        'title': '5 秒留住一个瞬间',
        'subtitle': '照片、心情、一句话——任何一个都算',
    },
    {
        'file': 'screenshot-4-meadow.png',
        'title': '你的瞬间，长成一片旷野',
        'subtitle': '草是日常，花是记忆，树是关系',
    },
    {
        'file': 'screenshot-5-weekchapter.png',
        'title': '给这一周起个名字',
        'subtitle': '从瞬间里挑 2-3 个，编成故事',
    },
    {
        'file': 'screenshot-6-lifegrid.png',
        'title': '看见你的一生',
        'subtitle': '4160 格——每一格是一周',
    },
]

# 顶部覆盖层高度（状态栏 + 标题区域）
TOP_OVERLAY_H = 320
# 底部覆盖层高度（logo + slogan）
BOTTOM_OVERLAY_H = 160

def draw_rounded_rect(draw, xy, radius, fill):
    draw.rounded_rectangle(xy, radius=radius, fill=fill)

def process_screenshot(spec, index):
    raw_path = os.path.join(RAW_DIR, spec['file'])
    if not os.path.exists(raw_path):
        print(f'  ⚠️ 跳过 {spec["file"]}（文件不存在）')
        return

    img = Image.open(raw_path).convert('RGBA')
    W, H = img.size
    print(f'  处理 {spec["file"]}: {W}×{H}')

    # 创建顶部渐变覆盖层（从纸色到透明）
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)

    # 顶部渐变（纸色 → 透明，覆盖前 350px）
    for y in range(TOP_OVERLAY_H):
        alpha = int(235 * (1 - y / TOP_OVERLAY_H * 0.7))
        overlay_draw.rectangle([(0, y), (W, y + 1)], fill=(*BG_PAPER, alpha))

    # 底部渐变（透明 → 纸色，最后 160px）
    for y in range(BOTTOM_OVERLAY_H):
        alpha = int(235 * (y / BOTTOM_OVERLAY_H * 0.8))
        real_y = H - BOTTOM_OVERLAY_H + y
        overlay_draw.rectangle([(0, real_y), (W, real_y + 1)], fill=(*BG_PAPER, alpha))

    # 合并覆盖层到原图
    result = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(result)

    # ============ 顶部标题区域 ============
    # 标题（大号衬线，暖琥珀色）
    title_font = get_font(72, bold=True)
    subtitle_font = get_font(40)

    title = spec['title']
    subtitle = spec['subtitle']

    # 计算文字宽度居中
    bbox = draw.textbbox((0, 0), title, font=title_font)
    title_w = bbox[2] - bbox[0]
    title_x = (W - title_w) // 2
    title_y = 100

    # 标题阴影（微妙的深色）
    draw.text((title_x + 2, title_y + 2), title, font=title_font, fill=(0, 0, 0, 30))
    # 主标题
    draw.text((title_x, title_y), title, font=title_font, fill=(*AMBER, 255))

    # 副标题
    bbox2 = draw.textbbox((0, 0), subtitle, font=subtitle_font)
    sub_w = bbox2[2] - bbox2[0]
    sub_x = (W - sub_w) // 2
    sub_y = title_y + 90
    draw.text((sub_x, sub_y), subtitle, font=subtitle_font, fill=(*INK_SOFT, 220))

    # ============ 底部 Logo 区域 ============
    logo_font = get_font(36, bold=True)
    slogan_font = get_font(28)

    logo_text = 'TSD'
    slogan = 'Time Slow Down · 让时间慢下来'

    # Logo
    bbox3 = draw.textbbox((0, 0), logo_text, font=logo_font)
    logo_w = bbox3[2] - bbox3[0]
    logo_x = (W - logo_w) // 2
    logo_y = H - BOTTOM_OVERLAY_H + 50

    # Logo 装饰圆点
    dot_r = 8
    dot_y = logo_y + 20
    draw.ellipse([(logo_x - 35, dot_y - dot_r), (logo_x - 35 + dot_r * 2, dot_y + dot_r)],
                 fill=(*AMBER, 200))
    draw.text((logo_x, logo_y), logo_text, font=logo_font, fill=(*INK_DARK, 230))

    # Slogan
    bbox4 = draw.textbbox((0, 0), slogan, font=slogan_font)
    slogan_w = bbox4[2] - bbox4[0]
    slogan_x = (W - slogan_w) // 2
    slogan_y = logo_y + 50
    draw.text((slogan_x, slogan_y), slogan, font=slogan_font, fill=(*INK_SOFT, 180))

    # ============ 保存 ============
    out_name = f'app-store-screenshot-{index + 1}.png'
    out_path = os.path.join(FINAL_DIR, out_name)
    result.convert('RGB').save(out_path, 'PNG')
    print(f'  ✓ 保存 {out_name}')

# ============ 主流程 ============
print('========== TSD App Store 截图后处理 ==========\n')
for i, spec in enumerate(SPECS):
    process_screenshot(spec, i)

print('\n========== 完成 ==========')
print(f'输出目录: {FINAL_DIR}')
for f in sorted(os.listdir(FINAL_DIR)):
    if f.endswith('.png'):
        size = os.path.getsize(os.path.join(FINAL_DIR, f))
        print(f'  {f}: {size / 1024:.0f} KB')
