"""
Cut out the four product flat-lays and composite each onto pure white so every
card in the How-It-Works grid sits on a consistent #ffffff background.

Originals are backed up to product-src/ before being overwritten in place
(filenames are kept so index.html needs no change).
"""
import os
from PIL import Image
from rembg import remove, new_session

SRC_DIR = "/Users/droolmac4/Desktop/Latency"
BAK_DIR = os.path.join(SRC_DIR, "product-src")
FILES = ["sacai-jacket.webp", "issey-top.webp", "issey-pants.webp", "margiela-tabis.webp"]

# isnet-general-use gives cleaner edges on general objects than u2net.
session = new_session("isnet-general-use")


def process(fname):
    src_path = os.path.join(SRC_DIR, fname)
    bak_path = os.path.join(BAK_DIR, fname)
    if not os.path.exists(bak_path):
        Image.open(src_path).save(bak_path)

    src = Image.open(bak_path).convert("RGBA")
    cut = remove(src, session=session, post_process_mask=True)

    white = Image.new("RGBA", cut.size, (255, 255, 255, 255))
    white.paste(cut, mask=cut.split()[3])
    out = white.convert("RGB")
    out.save(src_path, quality=92)
    print(f"[{fname}] cut out -> white  ({out.size[0]}x{out.size[1]})", flush=True)


def main():
    os.makedirs(BAK_DIR, exist_ok=True)
    for f in FILES:
        process(f)
    print("DONE", flush=True)


if __name__ == "__main__":
    main()
