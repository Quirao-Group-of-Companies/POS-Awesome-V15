#!/usr/bin/env python3
"""Generate square PWA icons from a source PNG (e.g. ERP private file)."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

DEFAULT_SIZES = (512, 192, 144)
DEFAULT_OUT = Path(__file__).resolve().parents[1] / "posawesome" / "public" / "icons"


def main() -> None:
	parser = argparse.ArgumentParser(description=__doc__)
	parser.add_argument("source", type=Path, help="Source logo PNG")
	parser.add_argument(
		"--out-dir",
		type=Path,
		default=DEFAULT_OUT,
		help=f"Output directory (default: {DEFAULT_OUT})",
	)
	parser.add_argument(
		"--prefix",
		default="paluto-logo",
		help="Output filename prefix (default: paluto-logo)",
	)
	args = parser.parse_args()

	img = Image.open(args.source).convert("RGBA")
	width, height = img.size
	side = min(width, height)
	left = (width - side) // 2
	top = (height - side) // 2
	img = img.crop((left, top, left + side, top + side))

	args.out_dir.mkdir(parents=True, exist_ok=True)
	for size in DEFAULT_SIZES:
		out_path = args.out_dir / f"{args.prefix}-{size}.png"
		img.resize((size, size), Image.Resampling.LANCZOS).save(out_path)
		print(f"Wrote {out_path}")


if __name__ == "__main__":
	main()
