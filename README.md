# Supplier Evaluation Tool (Skeleton)

This repository provides a clean Python skeleton to evaluate material suppliers using an **Ecobalyse Score**,
plus transparency weighting and certification bonuses. Commercial metrics (price, lead time, MOQ) are shown separately.

## Key Ideas
- We **do not** compute LCA. We call (or mimic) **Ecobalyse** to obtain an **Ecobalyse Score** (0–10).
- Final CSR Score formula:
  ```
  Final CSR Score (raw) = (Ecobalyse Score × Transparency Weight) + Certification Bonus
  Final CSR Score        = min(Final CSR Score (raw), 10)
  ```
- All tunables live in YAML. No hard-coded weights in code.

## Structure
See `src/` for code, `config/` for YAML configs, `data/` for examples, and `notebooks/` for analysis/plots.


## Docker (no venv required)

Build the image:

```bash
docker build -t supplier-evaluation-tool:latest .
```

Run the CLI inside the container (mount current dir so outputs land in `out/` locally):

```bash
export ECOBALYSE_API_KEY=YOUR_KEY_HERE
docker run --rm \
  -e ECOBALYSE_API_KEY=$ECOBALYSE_API_KEY \  -v $PWD:/app \  supplier-evaluation-tool:latest data/examples/suppliers_min.yaml
```

Or with **docker compose**:

```bash
ECOBALYSE_API_KEY=YOUR_KEY_HERE docker compose up --build
```

Convenience with **Makefile**:

```bash
make build
ECOBALYSE_API_KEY=YOUR_KEY_HERE make run CSV=data/examples/suppliers_min.yaml
make shell   # get a bash shell inside the container
```

**Note:** The Ecobalyse client is a stub. Implement the real POST in `src/api/ecobalyse_client.py`.
