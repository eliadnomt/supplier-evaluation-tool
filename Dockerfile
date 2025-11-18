# syntax=docker/dockerfile:1
FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1     PIP_NO_CACHE_DIR=1     POETRY_VIRTUALENVS_CREATE=false

WORKDIR /app

# System deps (if any heavy libs needed later, add here)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Install Python deps first (leverage Docker layer cache)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest
COPY . .

# Expose port for Flask web UI
EXPOSE 5000

# Run Flask web UI with gunicorn
ENTRYPOINT ["gunicorn", "-b", "0.0.0.0:5000", "src.interface.supplier_entry_ui:app"]
