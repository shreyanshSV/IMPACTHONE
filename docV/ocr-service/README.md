# DocVerify OCR / Security micro-service (Layer 2)

This optional Python service provides **Layer 2 (invisible DWT-DCT watermark)**
plus an alternative perceptual-hash and high-accuracy OCR. The main Node app
runs fine without it — those layers simply report "not available" — but with it
running you get the full 5-layer anti-copy guarantee (watermarks survive JPEG
compression and are destroyed by screenshots/photocopies).

## 1. Install (light — watermark + pHash only)

```bash
cd docV/ocr-service
python -m venv venv
venv\Scripts\activate            # Windows
# source venv/bin/activate       # macOS / Linux
pip install -r requirements.txt
```

## 2. (Optional) enable OCR

Uncomment `paddleocr` + a `paddlepaddle*` line in `requirements.txt` and
reinstall. On an NVIDIA GPU install the CUDA-matched `paddlepaddle-gpu` wheel.

## 3. Run

```bash
uvicorn main:app --host 0.0.0.0 --port 8100
```

Open http://localhost:8100/docs to try the endpoints, or http://localhost:8100/health.

## 4. Connect it to the Node backend

Add this line to `docV/.env` and restart the Node server:

```
OCR_SERVICE_URL=http://localhost:8100
```

When set, the Issuer Portal embeds a watermark at publish time and the User
Portal's 5-layer security check verifies it. When unset (or the service is
down), the app degrades gracefully and the watermark layer is skipped.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/watermark/embed` (file, doc_id) | Embed invisible watermark → returns PNG |
| POST | `/watermark/verify` (file, expected_id) | `{ intact, extracted }` |
| POST | `/phash/compute` (file) | `{ phash }` |
| POST | `/phash/compare` (file, expected_phash) | `{ distance, similar, identical }` |
| POST | `/ocr` (file) | `{ text, lines }` (needs PaddleOCR) |
| GET | `/health` | readiness + OCR availability |
