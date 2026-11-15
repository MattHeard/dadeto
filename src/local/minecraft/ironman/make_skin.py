#!/usr/bin/env python3
"""Compile a pixel-exact classic Minecraft UV skin from editable face grids (64x64 RGBA)."""
import argparse
from pathlib import Path
import struct
import zlib

PALETTE = {".": (0, 0, 0, 0), "R": (169, 22, 32, 255), "r": (107, 17, 27, 255), "G": (239, 184, 66, 255), "g": (160, 110, 36, 255), "C": (117, 245, 255, 255), "W": (228, 255, 255, 255), "K": (57, 38, 36, 255)}
HEAD = ["RRRRRRRR", "RGGGGGGR", "GGGGGGGG", "GCCGGCCG", "GGGGGGGG", "RGGGGGGR", "RRGGGGRR", "RRRGGRRR"]
CHEST = ["GGRRRRGG", "GRrrrrRG", "RRrCCrRR", "RRCCCCRR", "RRrWWrRR", "RRrrrrRR", "RGrRRrGR", "GGrRRrGG", "RRrrrrRR", "RRrGGrRR", "RRGGGGRR", "RRRRRRRR"]
ARM = ["GGRR", "GGRR", "GRRR", "RRRR", "rrrr", "GGRR", "GGRR", "RRRR", "RRRR", "RRRR", "RCCR", "RRRR"]
LEG = ["GGRR", "GGRR", "GRRR", "RRRR", "RRRR", "GGRR", "GGRR", "rrrr", "RRRR", "RRRR", "GGGR", "RRRR"]


def png_bytes():
    pixels = [[PALETTE["."] for _ in range(64)] for _ in range(64)]
    def rect(x, y, w, h, color):
        for row in range(y, y + h):
            for col in range(x, x + w):
                pixels[row][col] = PALETTE[color]
    def grid(x, y, rows):
        for dy, row in enumerate(rows):
            for dx, c in enumerate(row):
                pixels[y + dy][x + dx] = PALETTE[c]
    # Every base UV cube is opaque; unused/overlay UV areas remain transparent.
    for x, y, w, h in ((0, 8, 32, 8), (8, 0, 16, 8), (16, 20, 24, 12), (20, 16, 16, 4), (40, 20, 16, 12), (44, 16, 8, 4), (0, 20, 16, 12), (4, 16, 8, 4), (16, 52, 16, 12), (20, 48, 8, 4), (32, 52, 16, 12), (36, 48, 8, 4)):
        rect(x, y, w, h, "R")
    grid(8, 8, HEAD)
    grid(20, 20, CHEST)
    grid(44, 20, ARM)
    grid(36, 52, ARM)
    grid(4, 20, LEG)
    grid(20, 52, LEG)
    rect(32, 22, 8, 2, "G")
    rect(35, 25, 2, 5, "r")
    def chunk(kind, body):
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body) & 0xffffffff)
    raw = b"".join(b"\0" + bytes(c for p in row for c in p) for row in pixels)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 64, 64, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(png_bytes())
    print("Compiled custom Iron Man UV skin: " + str(args.output))
