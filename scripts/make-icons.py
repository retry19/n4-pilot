from PIL import Image, ImageDraw, ImageFont
import os

OUT = "public/icons"
INDIGO = (29, 53, 87)
PAPER = (250, 247, 240)

def font(size):
    for path in [r"C:\Windows\Fonts\segoeuib.ttf", r"C:\Windows\Fonts\arialbd.ttf"]:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()

def make(size, path, maskable=False):
    scale = 4
    S = size * scale
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if maskable:
        d.rectangle([0, 0, S, S], fill=INDIGO)
    else:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=INDIGO)

    # Route waypoints in the upper third, away from the wordmark.
    w = max(2, int(S * 0.016))
    pts = [
        (int(S * 0.20), int(S * 0.36)),
        (int(S * 0.36), int(S * 0.28)),
        (int(S * 0.52), int(S * 0.32)),
        (int(S * 0.66), int(S * 0.24)),
        (int(S * 0.80), int(S * 0.30)),
    ]
    d.line(pts, fill=PAPER, width=w, joint="curve")
    r = int(S * 0.032)
    for (cx, cy) in [pts[0], pts[-1]]:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=PAPER)
    # Mid waypoint ring
    mx, my = pts[2]
    d.ellipse([mx - r * 0.7, my - r * 0.7, mx + r * 0.7, my + r * 0.7], outline=PAPER, width=max(2, int(S * 0.012)))

    text = "N4"
    f = font(int(S * 0.34))
    bbox = d.textbbox((0, 0), text, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((S - tw) / 2 - bbox[0], int(S * 0.66) - th / 2 - bbox[1]), text, font=f, fill=PAPER)

    img = img.resize((size, size), Image.LANCZOS)
    img.save(path)
    print("wrote", path, size)

make(192, os.path.join(OUT, "icon-192.png"))
make(512, os.path.join(OUT, "icon-512.png"))
make(512, os.path.join(OUT, "maskable-512.png"), maskable=True)
make(180, os.path.join(OUT, "apple-touch-icon.png"))
