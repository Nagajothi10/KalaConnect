#!/usr/bin/env python3
"""
KalaConnect Phase 4 — OpenCV Image Analysis Script
Called by Node.js via child_process.execFile

Usage:
    python analyze_image.py <image_path>

Output:
    JSON to stdout with image quality metrics and suggestions.

Requires:
    pip install opencv-python numpy
"""

import sys
import json
import os

try:
    import cv2
    import numpy as np
except ImportError:
    print(json.dumps({
        "error": "OpenCV not installed. Run: pip install opencv-python numpy",
        "opencv_available": False
    }))
    sys.exit(1)


def analyze_image(image_path: str) -> dict:
    """Analyze an uploaded product image using OpenCV."""
    
    if not os.path.exists(image_path):
        return {"error": f"Image not found: {image_path}"}

    img = cv2.imread(image_path)
    if img is None:
        return {"error": "Could not decode image. Ensure the file is a valid JPEG/PNG."}

    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # ── 1. Resolution check ──────────────────────────────────────────────────
    resolution_ok = w >= 400 and h >= 400
    resolution_warning = None if resolution_ok else (
        f"Image is {w}×{h}px. For best listings, use at least 400×400px."
    )

    # ── 2. Blur detection (Laplacian variance) ────────────────────────────────
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    blur_threshold = 80.0
    is_blurry = laplacian_var < blur_threshold
    blur_score = min(100.0, (laplacian_var / blur_threshold) * 100.0)

    # ── 3. Brightness analysis ────────────────────────────────────────────────
    mean_brightness = float(np.mean(gray))
    # Ideal brightness 60-190 (0=black, 255=white)
    if mean_brightness < 40:
        brightness_label = "too_dark"
        brightness_warning = "Image is very dark. Try photographing in brighter lighting."
    elif mean_brightness > 220:
        brightness_label = "too_bright"
        brightness_warning = "Image is overexposed. Move away from direct light or reduce exposure."
    else:
        brightness_label = "good"
        brightness_warning = None

    # ── 4. Contrast / exposure range ─────────────────────────────────────────
    min_val, max_val = int(gray.min()), int(gray.max())
    contrast_range = max_val - min_val
    low_contrast = contrast_range < 50
    exposure_warning = "Low contrast detected. The product may blend into the background." if low_contrast else None

    # ── 5. Dominant colours (top-3 palette) ─────────────────────────────────
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    pixels = img_rgb.reshape(-1, 3).astype(np.float32)
    k = 3
    _, labels, centers = cv2.kmeans(
        pixels, k, None,
        (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0),
        3, cv2.KMEANS_RANDOM_CENTERS
    )
    counts = np.bincount(labels.flatten())
    total = len(labels)
    palette = []
    for i in np.argsort(-counts):
        r, g, b = [int(c) for c in centers[i]]
        pct = round(float(counts[i]) / total * 100, 1)
        palette.append({"r": r, "g": g, "b": b, "hex": f"#{r:02x}{g:02x}{b:02x}", "pct": pct})

    # ── 6. Background uniformity (helps category detection) ──────────────────
    border_strip = np.concatenate([
        gray[:10, :].flatten(),
        gray[-10:, :].flatten(),
        gray[:, :10].flatten(),
        gray[:, -10:].flatten()
    ])
    bg_std = float(np.std(border_strip))
    clean_background = bg_std < 25

    # ── 7. Overall quality score (0–100) ──────────────────────────────────────
    score = 100.0
    if is_blurry:
        score -= 30
    if brightness_label != "good":
        score -= 20
    if low_contrast:
        score -= 15
    if not resolution_ok:
        score -= 10
    score = max(0.0, score)

    warnings = [w for w in [
        "Image is blurry — try holding the camera steady or use a tripod." if is_blurry else None,
        brightness_warning,
        exposure_warning,
        resolution_warning,
    ] if w]

    return {
        "opencv_available": True,
        "width": w,
        "height": h,
        "quality_score": round(score, 1),
        "blur": {
            "laplacian_variance": round(laplacian_var, 2),
            "is_blurry": is_blurry,
            "score": round(blur_score, 1)
        },
        "brightness": {
            "mean": round(mean_brightness, 1),
            "label": brightness_label
        },
        "contrast": {
            "range": contrast_range,
            "low_contrast": low_contrast
        },
        "resolution": {
            "ok": resolution_ok
        },
        "palette": palette,
        "clean_background": clean_background,
        "warnings": warnings
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python analyze_image.py <image_path>"}))
        sys.exit(1)

    result = analyze_image(sys.argv[1])
    print(json.dumps(result))
