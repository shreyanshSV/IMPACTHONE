"""
DocVerify — OCR / Watermark / pHash micro-service (Layer 2 + assist)
====================================================================

FastAPI service that provides the layers that aren't practical in Node:

  • /watermark/embed   — embed an invisible DWT-DCT watermark (Layer 2)
  • /watermark/verify  — verify the watermark is intact (Layer 2)
  • /phash/compute     — robust perceptual hash (Layer 3, alternative to jimp)
  • /phash/compare     — Hamming-distance comparison (Layer 3)
  • /ocr               — high-accuracy text extraction (PaddleOCR, optional)
  • /health            — readiness probe

The Node backend calls this service when OCR_SERVICE_URL is set in docV/.env
(e.g. OCR_SERVICE_URL=http://localhost:8100). If the service is down, the Node
app degrades gracefully (watermark layer reports "not available").

PaddleOCR is optional: if it (or paddlepaddle) is not installed, the /ocr
endpoint is disabled but watermark + pHash still work, so you can run a light
install for just Layer 2.

Run:
    cd docV/ocr-service
    python -m venv venv
    venv\\Scripts\\activate           # Windows  (source venv/bin/activate on *nix)
    pip install -r requirements.txt
    uvicorn main:app --host 0.0.0.0 --port 8100
"""

import io

import cv2
import imagehash
import numpy as np
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from imwatermark import WatermarkDecoder, WatermarkEncoder
from PIL import Image

app = FastAPI(title="DocVerify OCR/Security Service", version="1.0")

# Allow the Node backend (localhost) to call this service.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Optional PaddleOCR (heavy, GPU). Loaded lazily so the service still starts
#    for watermark/pHash-only installs. ────────────────────────────────────────
_ocr = None
_ocr_error = None


def get_ocr():
    global _ocr, _ocr_error
    if _ocr is None and _ocr_error is None:
        try:
            from paddleocr import PaddleOCR
            _ocr = PaddleOCR(use_angle_cls=True, lang="en")
        except Exception as exc:  # noqa: BLE001
            _ocr_error = str(exc)
    return _ocr


# ── Layer 2 — Invisible watermark (DWT-DCT) ─────────────────────────────────
@app.post("/watermark/embed")
async def embed_watermark(file: UploadFile = File(...), doc_id: str = Form(...)):
    data = np.frombuffer(await file.read(), np.uint8)
    img = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if img is None:
        return JSONResponse({"error": "Unsupported or non-image file"}, status_code=400)
    encoder = WatermarkEncoder()
    encoder.set_watermark("bytes", doc_id.encode("utf-8"))
    watermarked = encoder.encode(img, "dwtDct")
    ok, buffer = cv2.imencode(".png", watermarked)
    if not ok:
        return JSONResponse({"error": "Encode failed"}, status_code=500)
    return Response(content=buffer.tobytes(), media_type="image/png")


@app.post("/watermark/verify")
async def verify_watermark(file: UploadFile = File(...), expected_id: str = Form(...)):
    data = np.frombuffer(await file.read(), np.uint8)
    img = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if img is None:
        return JSONResponse({"intact": False, "extracted": "", "error": "non-image"}, status_code=200)
    decoder = WatermarkDecoder("bytes", len(expected_id) * 8)
    extracted = decoder.decode(img, "dwtDct")
    decoded = extracted.decode("utf-8", errors="ignore").strip("\x00")
    return {"intact": decoded == expected_id, "extracted": decoded}


# ── Layer 3 — Perceptual hash ───────────────────────────────────────────────
@app.post("/phash/compute")
async def compute_phash(file: UploadFile = File(...)):
    img = Image.open(io.BytesIO(await file.read()))
    return {"phash": str(imagehash.phash(img))}


@app.post("/phash/compare")
async def compare_phash(file: UploadFile = File(...), expected_phash: str = Form(...)):
    img = Image.open(io.BytesIO(await file.read()))
    current = imagehash.phash(img)
    expected = imagehash.hex_to_hash(expected_phash)
    distance = int(current - expected)
    return {"distance": distance, "similar": distance <= 15, "identical": distance <= 5}


# ── OCR (optional) ──────────────────────────────────────────────────────────
@app.post("/ocr")
async def extract_text(file: UploadFile = File(...)):
    ocr = get_ocr()
    if ocr is None:
        return JSONResponse(
            {"error": "PaddleOCR not installed", "detail": _ocr_error}, status_code=503
        )
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    result = ocr.ocr(np.array(image), cls=True)
    lines = []
    if result and result[0]:
        for line in result[0]:
            lines.append({"text": line[1][0], "confidence": float(line[1][1])})
    return {"text": "\n".join(l["text"] for l in lines), "lines": lines}


# ── Health ──────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "ocr_available": get_ocr() is not None,
        "endpoints": [
            "/watermark/embed",
            "/watermark/verify",
            "/phash/compute",
            "/phash/compare",
            "/ocr",
        ],
    }
