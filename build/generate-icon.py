"""生成桌面应用图标：黑色圆角方块 + 白色 HIL 字标。

源文件保留在 build/icon.svg，产物为 build/icon.png（512）与 build/icon.ico（多尺寸）。
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

SIZE = 512
RADIUS = 96
FONT_PATH = r"C:\Windows\Fonts\arialbd.ttf"
OUTPUT_DIR = Path(__file__).resolve().parent

SVG = """<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#000000"/>
  <text x="256" y="262" text-anchor="middle" dominant-baseline="central"
        font-family="Arial Black, Arial, sans-serif" font-weight="900"
        font-size="196" letter-spacing="2" fill="#ffffff">HIL</text>
</svg>
"""

image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)
draw.rounded_rectangle([0, 0, SIZE - 1, SIZE - 1], radius=RADIUS, fill=(0, 0, 0, 255))

font = ImageFont.truetype(FONT_PATH, 196)
draw.text((SIZE / 2, SIZE / 2 - 4), "HIL", font=font, fill=(255, 255, 255, 255), anchor="mm")

(OUTPUT_DIR / "icon.svg").write_text(SVG, encoding="utf-8")
image.save(OUTPUT_DIR / "icon.png")
image.save(
    OUTPUT_DIR / "icon.ico",
    sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
)

print("icon.png:", (OUTPUT_DIR / "icon.png").stat().st_size, "bytes")
print("icon.ico:", (OUTPUT_DIR / "icon.ico").stat().st_size, "bytes")
