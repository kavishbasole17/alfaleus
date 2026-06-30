FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libxml2-dev libxslt-dev gcc g++ \
    libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgbm1 \
    libgtk-3-0 libasound2 libxrandr2 libxcomposite1 libxdamage1 \
  && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && \
    playwright install chromium --with-deps

COPY backend/ ./backend/

RUN mkdir -p /app/data/models /app/data/screenshots

ENV PORT=8000
ENV DB_PATH=/app/data/alfaleus.db
ENV EMBEDDINGS_CACHE_DIR=/app/data/models
ENV SCREENSHOT_DIR=/app/data/screenshots
ENV PYTHONUNBUFFERED=1

EXPOSE 8000
WORKDIR /app/backend
CMD ["python", "main.py"]
