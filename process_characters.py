"""
Cut out backgrounds (transparent), then align all four characters to ONE shared
frame by the FACE: same canvas size, eyeline at the same Y, face centred
horizontally, faces scaled to the same size. Output -> processed/<Name>.png.

Aligning by face (not topmost pixel) keeps eyelines locked even though Felix
wears headphones and Yuna has sunglasses pushed up on her head.

Originals are never modified. Cutouts are cached in processed/_cut/.
"""
import os
import numpy as np
import cv2
from PIL import Image
from rembg import remove, new_session

SRC_DIR  = "/Users/droolmac4/Desktop/Latency"
OUT_DIR  = os.path.join(SRC_DIR, "processed")
CUT_DIR  = os.path.join(OUT_DIR, "_cut")
NAMES    = ["Sofia", "Felix", "Yuna", "Valentina"]

CANVAS_W, CANVAS_H = 1536, 2752
CANVAS_CX          = CANVAS_W // 2
TARGET_EYE_Y       = 430     # every eyeline lands here
TARGET_FACE_H      = 340     # every face scaled to this pixel height

FACE_XML = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
EYE_XML  = cv2.data.haarcascades + "haarcascade_eye.xml"
face_cascade = cv2.CascadeClassifier(FACE_XML)
eye_cascade  = cv2.CascadeClassifier(EYE_XML)

session = new_session("u2net")


def cut_out(name):
    cache = os.path.join(CUT_DIR, f"{name}.png")
    if os.path.exists(cache):
        return Image.open(cache).convert("RGBA")
    src = Image.open(os.path.join(SRC_DIR, f"{name}.png")).convert("RGBA")
    out = remove(src, session=session)
    os.makedirs(CUT_DIR, exist_ok=True)
    out.save(cache)
    return out


def detect_face(rgba):
    # Composite over white so detection sees a normal photo.
    white = Image.new("RGB", rgba.size, (255, 255, 255))
    white.paste(rgba, mask=rgba.split()[3])
    gray = cv2.cvtColor(np.array(white), cv2.COLOR_RGB2GRAY)

    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1,
                                          minNeighbors=6, minSize=(120, 120))
    if len(faces) == 0:
        raise RuntimeError("no face detected")
    fx, fy, fw, fh = max(faces, key=lambda f: f[2] * f[3])  # largest

    # Eyeline: average eye centres inside the upper face; else proportion.
    roi = gray[fy:fy + int(fh * 0.6), fx:fx + fw]
    eyes = eye_cascade.detectMultiScale(roi, scaleFactor=1.1, minNeighbors=6,
                                        minSize=(30, 30))
    if len(eyes) >= 2:
        eyes = sorted(eyes, key=lambda e: e[2] * e[3], reverse=True)[:2]
        eye_y = fy + np.mean([ey + eh / 2 for (ex, ey, ew, eh) in eyes])
        face_cx = fx + np.mean([ex + ew / 2 for (ex, ey, ew, eh) in eyes])
    else:
        eye_y = fy + 0.42 * fh
        face_cx = fx + fw / 2.0
    return fh, float(eye_y), float(face_cx)


def align(rgba):
    face_h, eye_y, face_cx = detect_face(rgba)
    scale = TARGET_FACE_H / face_h

    new_w = max(1, round(rgba.width * scale))
    new_h = max(1, round(rgba.height * scale))
    resized = rgba.resize((new_w, new_h), Image.LANCZOS)

    paste_x = round(CANVAS_CX - face_cx * scale)
    paste_y = round(TARGET_EYE_Y - eye_y * scale)

    # Flatten onto ONE matched solid background so every image is a full,
    # opaque rectangle on identical white. The lens then reveals a complete
    # photo slice (figure in true position) — no transparent silhouette merge.
    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (255, 255, 255, 255))
    canvas.paste(resized, (paste_x, paste_y), resized)
    return canvas.convert("RGB"), scale


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for name in NAMES:
        print(f"[{name}] cut out (cached if available)...", flush=True)
        cut = cut_out(name)
        print(f"[{name}] detect face + align...", flush=True)
        out, scale = align(cut)
        dst = os.path.join(OUT_DIR, f"{name}.png")
        out.save(dst)
        print(f"[{name}] scale={scale:.3f} -> {dst}", flush=True)
    print("DONE", flush=True)


if __name__ == "__main__":
    main()
