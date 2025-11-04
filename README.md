# Supplier Evaluation Tool

This repository provides a web-based tool to evaluate material suppliers using an **Ecobalyse Score**,
transparency metrics, and certification bonuses. Commercial metrics (price, lead time, MOQ) are shown separately.

## Key Ideas
- We **do not** compute LCA. We call **Ecobalyse** to obtain an **Ecobalyse Score** (0–10).
- Scores are normalized and displayed independently on radar charts (to be integrated), allowing for direct comparison across suppliers.
- Ecobalyse, Transparency, and Certification metrics are shown as separate axes on the radar chart, each normalized to the 0-10 scale.
- All tunables live in YAML. No hard-coded weights in code.

## Structure
See `src/` for code, `config/` for YAML configs, `data/` for examples, and `notebooks/` for analysis/plots.

## Web UI

The tool provides a web-based interface for:
- Adding and editing suppliers
- Viewing supplier information
- Comparing supplier scores (Ecobalyse, Transparency, Certification)
- Understanding how Ecobalyse integration works

## Docker Setup

Build the image:

```bash
docker build -t supplier-evaluation-tool:latest .
```

Run the web UI (mount current dir so supplier data persists locally):

```bash
export ECOBALYSE_API_KEY=YOUR_KEY_HERE
docker run --rm -p 8000:5000 \
  -e ECOBALYSE_API_KEY=$ECOBALYSE_API_KEY \
  -v $PWD/data/examples:/app/data/examples \
  supplier-evaluation-tool:latest
```

Then visit [http://localhost:8000](http://localhost:8000) in your browser.

Or with **docker compose**:

```bash
ECOBALYSE_API_KEY=YOUR_KEY_HERE docker compose up --build
```

Convenience with **Makefile**:

```bash
make build
ECOBALYSE_API_KEY=YOUR_KEY_HERE make run
make shell   # get a bash shell inside the container
```
