"""Generate TaskManager brand icons (white rounded square + black layers glyph).

Renders with PIL at 4x supersampling and downsamples with LANCZOS, emulating the
Lucide `layers` icon (24x24 grid, stroke 2, round caps/joins).
"""
from pathlib import Path
from PIL import Image, ImageDraw

INK = (9, 9, 11, 255)
PAPER = (255, 255, 255, 255)
OUT = Path(__file__).resolve().parents[1] / "public"
SS = 4

# Geometry in the 24x24 Lucide grid.
TOP = [(12.0, 2.2), (21.5, 6.1), (12.0, 9.95), (2.5, 6.1)]
CHEV_1 = [(2.5, 12.6), (12.0, 16.6), (21.5, 12.6)]
CHEV_2 = [(2.5, 17.6), (12.0, 21.6), (21.5, 17.6)]
STROKE = 2.0


def draw_glyph(draw: ImageDraw.ImageDraw, size: int) -> None:
    """Brush-stamp the path so joins and caps are perfectly round (Lucide look)."""
    scale = size / 24.0
    radius = max(1.0, (STROKE * scale) / 2.0)
    step = max(0.6, radius / 3.0)

    def stamp(x: float, y: float) -> None:
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=INK)

    def stroke(points, closed: bool) -> None:
        pts = [(x * scale, y * scale) for x, y in points]
        path = pts + [pts[0]] if closed else pts
        for (x1, y1), (x2, y2) in zip(path, path[1:]):
            length = ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5
            steps = max(1, int(length / step))
            for i in range(steps + 1):
                t = i / steps
                stamp(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)

    stroke(TOP, closed=True)
    stroke(CHEV_1, closed=False)
    stroke(CHEV_2, closed=False)


def render(size: int, rounded: bool) -> Image.Image:
    hi = size * SS
    img = Image.new("RGBA", (hi, hi), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    radius = round(hi * 16 / 64) if rounded else 0
    draw.rounded_rectangle((0, 0, hi - 1, hi - 1), radius=radius, fill=PAPER)
    draw_glyph(draw, hi)
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    # Browser tab icon: PNG for modern browsers.
    render(32, rounded=True).save(OUT / "favicon-32.png")

    # Apple touch icon: iOS applies its own mask, so keep the artwork full bleed.
    render(180, rounded=False).save(OUT / "apple-touch-icon.png")

    # PWA / manifest icons.
    render(192, rounded=True).save(OUT / "icon-192.png")
    render(512, rounded=True).save(OUT / "icon-512.png")

    # Classic .ico with the standard sizes.
    ico = render(256, rounded=True)
    ico.save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

    print("generated:", sorted(p.name for p in OUT.glob("*.png")) + ["favicon.ico"])


if __name__ == "__main__":
    main()
