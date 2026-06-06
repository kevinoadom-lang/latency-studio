"""
Re-export the four product flat-lays as TRANSPARENT cutouts (alpha preserved),
so a card background / reticle grid shows through the negative space.
Reads from the pristine originals in product-src/ and overwrites the root
.webp filenames (webp supports alpha, so index.html needs no change).
"""
import os
from PIL import Image
from rembg import remove, new_session

SRC_DIR = "/Users/droolmac4/Desktop/Latency"
BAK_DIR = os.path.join(SRC_DIR, "product-src")
FILES = ["sacai-jacket.webp", "issey-top.webp", "issey-pants.webp", "margiela-tabis.webp"]

session = new_session("isnet-general-use")


def process(fname):
    src = Image.open(os.path.join(BAK_DIR, fname)).convert("RGBA")
    cut = remove(src, session=session, post_process_mask=True)  # RGBA w/ alpha
    cut.save(os.path.join(SRC_DIR, fname), lossless=True)
    print(f"[{fname}] transparent cutout  ({cut.size[0]}x{cut.size[1]})", flush=True)


def main():
    for f in FILES:
        process(f)
    print("DONE", flush=True)


if __name__ == "__main__":
    main()
