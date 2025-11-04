// Radar chart initialization and management using Chart.js

// Store chart instances
const radarCharts = {};

/**
 * Determine material category from supplier's material_origin
 * Returns 'cotton', 'wool', 'composite', or 'other'
 */
function getMaterialCategory(supplier) {
  if (!supplier.material_origin || supplier.material_origin.length === 0) {
    return 'other';
  }
  
  // Find primary material (highest share)
  let primaryMaterial = null;
  let maxShare = 0;
  for (const mat of supplier.material_origin) {
    const share = mat.share || 0;
    if (share > maxShare) {
      maxShare = share;
      primaryMaterial = mat.id || '';
    }
  }
  
  if (!primaryMaterial) {
    return 'other';
  }
  
  const matId = primaryMaterial.toLowerCase();

  // If multiple materials or other, return 'composite'
  if (supplier.material_origin.length > 1) {
    return 'composite';
  }
  
  // Check for cotton
  if (matId.includes('coton') || matId.includes('cotton')) {
    return 'cotton';
  }
  
  // Check for wool
  if (matId.includes('laine') || matId.includes('wool')) {
    return 'wool';
  }
  
  // Check for synthetic materials
  if (matId.includes('polyester') || matId.includes('nylon') || matId.includes('acrylique') || matId.includes('acrylic')) {
    return 'synthetic';
  }

  // Check for artificial materials
  if (matId.includes('viscose') || matId.includes('cupro')) {
    return 'synthetic';
  }
  
  return matId;
}

/**
 * Group suppliers by material category
 * Returns a dynamic object with categories as keys
 */
function groupSuppliersByMaterial(suppliers) {
  const groups = {};
  
  suppliers.forEach(supplier => {
    if (supplier.error) return; // Skip suppliers with errors
    
    const category = getMaterialCategory(supplier);
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(supplier);
  });
  
  return groups;
}

/**
 * Sanitize category name for use as HTML ID
 * Removes/replaces special characters that aren't valid in HTML IDs
 */
function sanitizeCategoryForId(category) {
  // Replace spaces, hyphens, and other special chars with underscores
  // Remove any characters that aren't alphanumeric or underscore
  return category.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
}

/**
 * Convert category name to chart ID format
 * e.g., "cotton" -> "cottonChart", "synthetic" -> "syntheticChart", "ei-laine-par-defaut" -> "ei_laine_par_defautChart"
 */
function categoryToChartId(category) {
  const sanitized = sanitizeCategoryForId(category);
  return sanitized + 'Chart';
}

/**
 * Convert category name to display title
 * e.g., "cotton" -> "COTTON", "synthetic" -> "SYNTHETIC", "ei-laine-par-defaut" -> "EI-LAINE-PAR-DEFAUT"
 */
function categoryToTitle(category) {
  // For material IDs, try to format them nicely
  // Replace hyphens with spaces, then uppercase
  return category.replace(/-/g, ' ').toUpperCase();
}

/**
 * Find or create chart container for a category
 * Returns the container element, or null if charts section doesn't exist
 */
function getOrCreateChartContainer(category) {
  const chartId = categoryToChartId(category);
  let canvas = document.getElementById(chartId);
  let container = canvas?.closest('.chart-container');
  
  if (container) {
    return container;
  }
  
  // Container doesn't exist, create it dynamically
  const chartsSection = document.querySelector('.charts-section');
  if (!chartsSection) {
    console.error('Charts section not found');
    return null;
  }
  
  // Create new container
  container = document.createElement('div');
  container.className = 'chart-container';
  
  const title = document.createElement('div');
  title.className = 'chart-title';
  title.textContent = categoryToTitle(category);
  
  const wrapper = document.createElement('div');
  wrapper.className = 'chart-wrapper';
  
  canvas = document.createElement('canvas');
  canvas.id = chartId;
  
  wrapper.appendChild(canvas);
  
  const legend = document.createElement('div');
  legend.className = 'chart-legend';
  
  container.appendChild(title);
  container.appendChild(wrapper);
  container.appendChild(legend);
  
  chartsSection.appendChild(container);
  return container;
}

/**
 * Create or update a radar chart
 */
function createRadarChart(canvasId, suppliers) {
  // Find or create canvas element
  let canvas = document.getElementById(canvasId);
  const container = document.querySelector(`#${canvasId}`)?.closest('.chart-container') || 
                    document.querySelector(`.chart-container .chart-title:contains("${canvasId.replace('Chart', '').toUpperCase()}")`)?.closest('.chart-container');
  
  if (!container) {
    console.error(`Chart container for ${canvasId} not found`);
    return;
  }
  
  // If canvas doesn't exist, check for placeholder or wrapper
  if (!canvas) {
    const placeholder = container.querySelector('.chart-placeholder');
    if (placeholder) {
      // Create wrapper and canvas
      const wrapper = document.createElement('div');
      wrapper.className = 'chart-wrapper';
      canvas = document.createElement('canvas');
      canvas.id = canvasId;
      wrapper.appendChild(canvas);
      container.replaceChild(wrapper, placeholder);
    } else {
      // Check if wrapper exists, create if needed
      let wrapper = container.querySelector('.chart-wrapper');
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'chart-wrapper';
        const title = container.querySelector('.chart-title');
        if (title && title.nextSibling) {
          container.insertBefore(wrapper, title.nextSibling);
        } else {
          container.appendChild(wrapper);
        }
      }
      canvas = document.createElement('canvas');
      canvas.id = canvasId;
      wrapper.appendChild(canvas);
    }
  } else {
    // Ensure canvas is in a wrapper
    if (!canvas.closest('.chart-wrapper')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'chart-wrapper';
      canvas.parentNode.insertBefore(wrapper, canvas);
      wrapper.appendChild(canvas);
    }
  }
  
  // Destroy existing chart if it exists
  if (radarCharts[canvasId]) {
    radarCharts[canvasId].destroy();
    delete radarCharts[canvasId];
  }
  
  // Get chart data
  const chartData = getRadarChartData(suppliers);
  
  if (!chartData || !chartData.datasets || chartData.datasets.length === 0) {
    // Hide the container if no suppliers
    if (container) {
      container.style.display = 'none';
    }
    // Clean up any existing canvas/placeholder
    if (canvas && container) {
      const wrapper = canvas.closest('.chart-wrapper');
      const placeholder = document.createElement('div');
      placeholder.className = 'chart-placeholder';
      placeholder.innerHTML = 'No suppliers for this material category';
      if (wrapper) {
        wrapper.replaceChild(placeholder, canvas);
      } else {
        container.replaceChild(placeholder, canvas);
      }
    }
    return;
  }
  
  // Show the container if it has suppliers
  if (container) {
    container.style.display = '';
  }
  
  // Ensure canvas exists (replace placeholder if needed)
  if (!canvas) {
    const placeholder = container.querySelector('.chart-placeholder');
    if (placeholder) {
      let wrapper = placeholder.closest('.chart-wrapper');
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'chart-wrapper';
        placeholder.parentNode.replaceChild(wrapper, placeholder);
        wrapper.appendChild(placeholder);
      }
      canvas = document.createElement('canvas');
      canvas.id = canvasId;
      wrapper.replaceChild(canvas, placeholder);
    }
  }
  
  if (!canvas) return;
  
  // Determine desired chart size based on container, not the other way around
  const wrapper = canvas.closest('.chart-wrapper');
  const chartContainer = canvas.closest('.chart-container');
  
  // Get available container width
  const containerWidth = chartContainer && chartContainer.offsetWidth > 0 ? chartContainer.offsetWidth : 350;
  
  // Calculate desired chart area size (what we want the hexagon to be)
  // Account for layout padding and label space
  const leftOffset = 40; // layout.padding.left
  const labelFontSize = 10;
  const labelPadding = 5; // pointLabels.padding
  // Estimate label width: longest label "Transparency" is ~11 chars * 6px/char + padding = ~70px
  const estimatedLabelWidth = labelFontSize * 7 + labelPadding;
  
  // Available width for chart area = container width - left offset - right label space
  const availableWidth = containerWidth - leftOffset - estimatedLabelWidth;
  // Available height should match (square chart)
  const availableHeight = containerWidth - (estimatedLabelWidth * 2); // Labels on top and bottom
  
  // Chart area size is the smaller of width/height to ensure square
  const chartAreaSize = Math.min(availableWidth, availableHeight, 280);
  
  // Canvas size needs to accommodate the chart area plus labels on all sides
  // But Chart.js will center the chart, so we need enough space
  const canvasSize = chartAreaSize + (estimatedLabelWidth * 2); // Labels on all sides
  
  // Set canvas dimensions
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvasSize * dpr;
  canvas.height = canvasSize * dpr;
  canvas.style.width = canvasSize + 'px';
  canvas.style.height = canvasSize + 'px';
  canvas.style.display = 'block';
  canvas.style.margin = '0 auto';
  
  // Set wrapper to match canvas size exactly
  if (wrapper) {
    wrapper.style.height = canvasSize + 'px';
    wrapper.style.width = '100%';
  }
  
  radarCharts[canvasId] = new Chart(canvas, {
    type: 'radar',
    data: chartData,
    options: {
      responsive: false, // Use explicit dimensions
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 0,
          bottom: 0,
          left: 40, // Keep left offset for centering hexagon under title
          right: 0
        }
      },
      scales: {
        r: {
          beginAtZero: true,
          min: 0,
          max: 10,
          ticks: {
            display: false // Hide axis labels
          },
          pointLabels: {
            font: {
              size: 10,
              weight: 300
            },
            padding: 5 // No padding - labels should be as close as possible
          },
          grid: {
            color: '#e0e0e0'
          },
          angleLines: {
            color: '#e0e0e0'
          }
        }
      },
      plugins: {
        legend: {
          display: false // We'll use custom legend
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': ' + context.parsed.r.toFixed(2);
            }
          }
        }
      }
    }
  });
  
  // Update legend
  updateChartLegend(canvasId, chartData.datasets);
}

/**
 * Update the legend for a chart
 */
function updateChartLegend(canvasId, datasets) {
  const chartContainer = document.getElementById(canvasId).closest('.chart-container');
  if (!chartContainer) return;
  
  const legendContainer = chartContainer.querySelector('.chart-legend');
  if (!legendContainer) return;
  
  legendContainer.innerHTML = '';
  
  datasets.forEach((dataset, index) => {
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    
    const dot = document.createElement('div');
    dot.className = 'legend-dot';
    dot.style.background = dataset.borderColor;
    
    const label = document.createElement('span');
    label.textContent = dataset.label;
    
    legendItem.appendChild(dot);
    legendItem.appendChild(label);
    legendContainer.appendChild(legendItem);
  });
}

/**
 * Load and render all radar charts
 */
async function loadAndRenderRadarCharts() {
  try {
    const response = await fetch('/api/suppliers/for-radar');
    const suppliers = await response.json();
    
    // Filter out suppliers with errors
    const validSuppliers = suppliers.filter(s => !s.error);
    
    const chartsSection = document.querySelector('.charts-section');
    
    if (validSuppliers.length === 0) {
      // Hide charts section if no suppliers
      if (chartsSection) {
        chartsSection.style.display = 'none';
      }
      return;
    }
    
    // Show charts section when suppliers exist
    if (chartsSection) {
      chartsSection.style.display = '';
    }
    
    // Group suppliers by material (dynamic categories)
    const groups = groupSuppliersByMaterial(validSuppliers);
    
    // Get list of all known chart containers from HTML (for hiding)
    const knownChartIds = ['cottonChart', 'woolChart', 'compositeChart', 'silkChart', 'syntheticChart'];
    
    // Hide all known containers initially
    knownChartIds.forEach(chartId => {
      const canvas = document.getElementById(chartId);
      const container = canvas?.closest('.chart-container');
      if (container) {
        container.style.display = 'none';
      }
    });
    
    // Hide any dynamically created containers from previous renders
    const allContainers = chartsSection.querySelectorAll('.chart-container');
    allContainers.forEach(container => {
      const canvas = container.querySelector('canvas');
      if (canvas && !knownChartIds.includes(canvas.id)) {
        container.style.display = 'none';
      }
    });
    
    // Create charts for each category that has suppliers
    Object.keys(groups).forEach(category => {
      const suppliers = groups[category];
      if (suppliers && suppliers.length > 0) {
        const chartId = categoryToChartId(category);
        // Ensure container exists (create if needed)
        getOrCreateChartContainer(category);
        createRadarChart(chartId, suppliers);
      }
    });
    
    // Update chart selector in weighted comparison panel if it exists
    if (typeof updateChartSelector === 'function') {
      updateChartSelector();
    }
    
  } catch (error) {
    console.error('Error loading radar charts:', error);
  }
}

/**
 * Refresh charts when suppliers are updated
 */
function refreshRadarCharts() {
  loadAndRenderRadarCharts();
}

