# Supplier Evaluation Tool

A web-based tool to evaluate material suppliers using an **Ecobalyse Score**, traceability metrics, and commercial factors. The tool provides interactive radar charts for visual comparison and weighted scoring for supplier recommendations.

## Key Features

- **Ecobalyse Integration**: Calls the Ecobalyse API to obtain environmental impact scores for sample garments that would be made with the supplier fabrics
- **Radar Chart Visualization**: Interactive radar charts showing supplier performance across 5 axes:
  - **Ecobalyse**: Environmental impact score (percentage difference from best)
  - **Traceability**: Based on traceable production steps (1-5 scale corresponding to known origins of fibre, spinning, dyeing, weaving and fabric production)
  - **Price**: Percentage difference from best price
  - **Lead Time**: Percentage difference from best lead time
  - **MOQ**: Percentage difference from best minimum order quantity
- **Weighted Comparison**: Customizable weight sliders to prioritize different factors and get supplier recommendations
- **Supplier Management**: Add, edit, and delete suppliers through a web interface
- **Configuration-Driven**: All scoring weights and tunables live in YAML config files

## Structure

- `src/` - Application code
  - `api/` - Ecobalyse API client
  - `interface/` - Flask web application and templates
  - `models/` - Data models
  - `scoring/` - Scoring algorithms (Ecobalyse, traceability, certifications)
  - `utils/` - Utility functions
- `config/` - YAML configuration files
- `data/` - Example supplier data and lookup tables
- `notebooks/` - Analysis notebooks and plots

## Web UI

The tool provides a web-based dashboard for:
- Adding and editing suppliers with material specifications
- Viewing supplier information in a table
- Comparing suppliers using interactive radar charts (grouped by product category)
- Using weighted comparison to get supplier recommendations based on custom priorities
- Understanding Ecobalyse integration and scoring methodology

## Docker Setup

### Build the image:

```bash
docker build -t supplier-evaluation-tool:latest .
```

### Run the web UI:

```bash
export ECOBALYSE_API_KEY=YOUR_KEY_HERE
docker run --rm -p 8000:5000 \
  -e ECOBALYSE_API_KEY=$ECOBALYSE_API_KEY \
  -v $PWD/data/examples:/app/data/examples \
  -v $PWD/src/interface/static:/app/src/interface/static \
  supplier-evaluation-tool:latest
```

Then visit [http://localhost:8000](http://localhost:8000) in your browser.

## Requirements

- Python 3.11+
- Flask web framework
- Ecobalyse API key (set via `ECOBALYSE_API_KEY` environment variable)
- Docker (optional, for containerized deployment)

## Configuration

Configuration files are located in `config/`:
- `app.yaml` - Application settings
- `scoring.yaml` - Scoring weights and thresholds
- `country_weights.yaml` - Country-specific scoring weights
- `ecobalyse.yaml` - Ecobalyse API configuration

## Data Format

Suppliers are stored in YAML format. See `data/examples/suppliers_min.yaml` for an example structure.
