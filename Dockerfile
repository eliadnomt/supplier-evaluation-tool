# syntax=docker/dockerfile:1
FROM python:3.11-slim

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

# Default entrypoint runs the CLI; pass CSV path as CMD arg
ENTRYPOINT ["python", "-m", "src.interface.cli"]
# Example default argument (can be overridden in `docker run`)
CMD ["data/examples/suppliers_min.yaml"]

# For UI mode, expose 5000 and run Flask app
EXPOSE 5000
# To run UI: docker build -t ui . && docker run -p 5000:5000 ui
# ENTRYPOINT ["gunicorn", "-b", "0.0.0.0:5000", "src.interface.supplier_entry_ui:app"]
