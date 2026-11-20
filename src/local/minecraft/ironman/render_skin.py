#!/usr/bin/env python3
"""Render the exact classic 64x64 server texture on a wide Minecraft model (Pillow)."""
import argparse
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


def render(texture, output):
    skin = Image.open(texture).convert('RGBA')
    if skin.size != (64, 64):
        raise ValueError('Expected the bundled 64x64 UV texture')
    scale = 2
    canvas = Image.new('RGB', (1024 * scale, 1024 * scale), '#101925')
    draw = ImageDraw.Draw(canvas)
    def font(size):
        return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', size * scale)
    draw.text((64 * scale, 48 * scale), 'IRON MAN', font=font(36), fill='#f1bb46')
    draw.text((66 * scale, 102 * scale), 'Exact bundled Minecraft skin', font=font(19), fill='#b5c4d7')
    # Bounds: x/y/z; then UV origins of front (+z), side (+x), top (+y).
    parts = [
        ((-4, 4, 24, 32, -4, 4), (8, 8), (16, 8), (8, 0)),
        ((-4, 4, 12, 24, -2, 2), (20, 20), (28, 20), (20, 16)),
        ((-8.4, -4.4, 12, 24, -2, 2), (44, 20), (48, 20), (44, 16)),
        ((4.4, 8.4, 12, 24, -2, 2), (36, 52), (40, 52), (36, 48)),
        ((-4.15, -.15, 0, 12, -2, 2), (4, 20), (8, 20), (4, 16)),
        ((.15, 4.15, 0, 12, -2, 2), (20, 52), (24, 52), (20, 48)),
    ]
    for center, angle, tilt, label in ((270, 0, 0, 'FRONT'), (760, 29, 14, 'THREE-QUARTER')):
        yaw, pitch = math.radians(angle), math.radians(tilt)
        unit = 19 * scale
        origin = (center * scale, 870 * scale)
        def project(x, y, z):
            horizontal = x * math.cos(yaw) - z * math.sin(yaw)
            depth = x * math.sin(yaw) + z * math.cos(yaw)
            return (origin[0] + unit * horizontal, origin[1] + unit * (-y * math.cos(pitch) + depth * math.sin(pitch)))
        faces = []
        for bounds, front, side, top in parts:
            x0, x1, y0, y1, z0, z1 = bounds
            width, height, depth = round(x1-x0), round(y1-y0), round(z1-z0)
            # One polygon per actual skin pixel; do not repaint or synthesize texture details.
            for kind, uv, w, h, shade in [('front', front, width, height, 1.0), ('side', side, depth, height, .72), ('top', top, width, depth, 1.08)]:
                if (kind == 'side' and angle == 0) or (kind == 'top' and tilt == 0):
                    continue
                for v in range(h):
                    for u in range(w):
                        rgba = skin.getpixel((uv[0]+u, uv[1]+v))
                        if rgba[3] == 0:
                            continue
                        if kind == 'front':
                            corners = [(x0+u,y1-v,z1),(x0+u+1,y1-v,z1),(x0+u+1,y1-v-1,z1),(x0+u,y1-v-1,z1)]
                        elif kind == 'side':
                            corners = [(x1,y1-v,z1-u),(x1,y1-v,z1-u-1),(x1,y1-v-1,z1-u-1),(x1,y1-v-1,z1-u)]
                        else:
                            corners = [(x0+u,y1,z0+v),(x0+u+1,y1,z0+v),(x0+u+1,y1,z0+v+1),(x0+u,y1,z0+v+1)]
                        distance = sum(x*math.sin(yaw)*math.cos(pitch)+z*math.cos(yaw)*math.cos(pitch)+y*math.sin(pitch) for x,y,z in corners)/4
                        color = tuple(min(255, round(c*shade)) for c in rgba[:3])
                        faces.append((distance, [project(*p) for p in corners], color))
        draw.ellipse(((center-140)*scale, 850*scale, (center+140)*scale, 900*scale), fill='#0b111a')
        for _, polygon, color in sorted(faces, key=lambda f: f[0]):
            draw.polygon(polygon, fill=color)
        draw.text(((center-90)*scale, 934*scale), label, font=font(17), fill='#91a8bf')
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.resize((1024, 1024), Image.Resampling.LANCZOS).save(output)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('texture', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    render(args.texture, args.output)
