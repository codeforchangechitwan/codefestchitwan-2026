#!/usr/bin/env python3
"""Generate PWA icons from the Chitwan brand palette.

Run: python3 scripts/gen-icons.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

BROWN = (139, 69, 19)
BROWN_DARK = (94, 46, 12)
CORAL = (242, 112, 91)
WHITE = (255, 255, 255)

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
os.makedirs(OUT, exist_ok=True)

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
]


def font(size):
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def vertical_gradient(size, top, bottom):
    grad = Image.new("RGB", (1, size), top)
    for y in range(size):
        t = y / max(size - 1, 1)
        grad.putpixel(
            (0, y),
            tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)),
        )
    return grad.resize((size, size))


def draw_icon(size, padding_ratio=0.0):
    """Brown gradient tile with a white </> bracket mark and a coral underline."""
    img = vertical_gradient(size, BROWN, BROWN_DARK).convert("RGBA")

    if padding_ratio:
        # Maskable icons need the artwork inside the safe zone.
        inner = int(size * (1 - padding_ratio * 2))
        art = draw_icon(inner)
        canvas = vertical_gradient(size, BROWN, BROWN_DARK).convert("RGBA")
        canvas.paste(art, (int(size * padding_ratio), int(size * padding_ratio)), art)
        return canvas

    d = ImageDraw.Draw(img)
    mark = "</>"
    f = font(int(size * 0.40))
    box = d.textbbox((0, 0), mark, font=f)
    d.text(
        ((size - (box[2] - box[0])) / 2 - box[0], size * 0.24 - box[1]),
        mark,
        font=f,
        fill=WHITE,
    )

    label = "CF26"
    lf = font(int(size * 0.19))
    lbox = d.textbbox((0, 0), label, font=lf)
    d.text(
        ((size - (lbox[2] - lbox[0])) / 2 - lbox[0], size * 0.66 - lbox[1]),
        label,
        font=lf,
        fill=CORAL,
    )
    return img


for s in (192, 512):
    draw_icon(s).save(os.path.join(OUT, f"icon-{s}.png"))
    draw_icon(s, padding_ratio=0.12).save(os.path.join(OUT, f"maskable-{s}.png"))

draw_icon(180).save(os.path.join(OUT, "apple-touch-icon.png"))
draw_icon(32).save(os.path.join(OUT, "favicon-32.png"))
draw_icon(64).resize((32, 32)).save(
    os.path.join(os.path.dirname(__file__), "..", "src", "app", "favicon.ico"),
    sizes=[(32, 32)],
)

print("icons written to public/icons/")
