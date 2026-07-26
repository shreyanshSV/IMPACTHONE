# ---- DocVerify invisible-watermark micro-service (FastAPI, port 8100) ----
# Internal-only container: reachable by the app container, never published.
FROM python:3.12-slim

WORKDIR /svc

# libgl/libglib: required by OpenCV at runtime on slim images.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libgl1 libglib2.0-0 \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

EXPOSE 8100
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8100"]
