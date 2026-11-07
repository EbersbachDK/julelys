#!/usr/bin/env python3
"""Genererer app-ikoner til Julelys-beregner (kræver Pillow).
Kør: py tools/make_icons.py  ->  icons/
Motiv: mørkegrøn flade med en guld lyskæde (zigzag med lysende pærer)."""
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "icons")
os.makedirs(OUT, exist_ok=True)

GREEN     = (31, 81, 55)      # #1f5137
GOLD      = (230, 178, 77)    # #e6b24d
GOLD_GLOW = (255, 216, 122)   # #ffd87a


def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def draw_icon(size, maskable=False, rounded=True):
    SS = 4
    S = size * SS
    img = Image.new("RGBA", (S, S), GREEN + (255,))
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)

    pad = S * 0.26 if maskable else S * 0.15
    left, right = pad, S - pad
    n = 4
    top, bot = S * 0.36, S * 0.63
    pts = [(left + (right - left) * i / n, top if i % 2 == 0 else bot) for i in range(n + 1)]

    # ledning
    d = ImageDraw.Draw(img)
    d.line(pts, fill=GOLD + (255,), width=max(2, int(S * 0.016)), joint="curve")

    # glød bag pærerne (på eget lag, så det blender pænt)
    r = int(S * 0.05)
    for (x, y) in pts:
        gd.ellipse([x - r * 2.3, y - r * 2.3, x + r * 2.3, y + r * 2.3], fill=GOLD_GLOW + (90,))
    img = Image.alpha_composite(img, glow)

    # pærer
    d = ImageDraw.Draw(img)
    for (x, y) in pts:
        d.ellipse([x - r, y - r, x + r, y + r], fill=GOLD_GLOW + (255,))
        d.ellipse([x - r * 0.4, y - r * 0.4, x + r * 0.4, y + r * 0.4], fill=(255, 255, 255, 235))

    out = img.resize((size, size), Image.LANCZOS)
    if rounded and not maskable:
        mask = rounded_mask(size, int(size * 0.22))
        base = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        base.paste(out, (0, 0), mask)
        out = base
    return out


def save(img, name):
    p = os.path.join(OUT, name)
    img.save(p)
    print("skrev", os.path.relpath(p))


save(draw_icon(192), "icon-192.png")
save(draw_icon(512), "icon-512.png")
save(draw_icon(512, maskable=True), "icon-512-maskable.png")

# apple-touch: fuld flade uden gennemsigtighed (iOS maskerer selv)
at = draw_icon(180, rounded=False)
flat = Image.new("RGBA", at.size, GREEN + (255,))
flat.alpha_composite(at)
save(flat.convert("RGB"), "apple-touch-icon.png")

print("Færdig.")
