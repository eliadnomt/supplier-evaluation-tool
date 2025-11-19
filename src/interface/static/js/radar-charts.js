// Radar chart initialization and management using Chart.js

// Store chart instances
const radarCharts = {};

/**
 * Check if a supplier has multiple materials (composite fabric)
 */
function isCompositeFabric(supplier) {
  return supplier && supplier.material_origin && supplier.material_origin.length > 1;
}

/**
 * Determine material category from supplier's material_origin
 * Returns the category based on majority fiber (>50%) if composite, or 'composite' if no single fiber >50%
 * For single-material fabrics, returns the appropriate category
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

  // If multiple materials, check if primary material has >50% share
  // If yes, categorize by that majority fiber; otherwise return 'composite'
  if (supplier.material_origin.length > 1) {
    // If majority fiber has >50% share, categorize by that fiber
    if (maxShare > 0.5) {
      // Continue to categorize by the majority fiber
    } else {
      // No single fiber has >50%, so it's a true composite
      return 'composite';
    }
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
  
  const titleWrapper = document.createElement('div');
  titleWrapper.className = 'chart-title-wrapper';
  
  const title = document.createElement('div');
  title.className = 'chart-title';
  title.textContent = categoryToTitle(category);
  titleWrapper.appendChild(title);
  
  // Add info icon tooltip under the title
  const infoIcon = document.createElement('span');
  infoIcon.className = 'info-icon chart-info-icon';
  infoIcon.setAttribute('tabindex', '0');
  infoIcon.textContent = 'ⓘ';
  infoIcon.setAttribute('data-tooltip', 'All axes show percentage difference from the best supplier (except Traceability). Best value = 0% = score 5 (center). Higher percentages = worse performance = lower scores. Traceability shows absolute steps (X/5 traceable). Hover over chart points to see exact percentages.');
  titleWrapper.appendChild(infoIcon);
  
  const wrapper = document.createElement('div');
  wrapper.className = 'chart-wrapper';
  
  canvas = document.createElement('canvas');
  canvas.id = chartId;
  
  wrapper.appendChild(canvas);
  
  const legend = document.createElement('div');
  legend.className = 'chart-legend';
  
  container.appendChild(titleWrapper);
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
  
  // Ensure container has title wrapper with info icon (for existing containers)
  let titleWrapper = container.querySelector('.chart-title-wrapper');
  if (!titleWrapper) {
    const existingTitle = container.querySelector('.chart-title');
    if (existingTitle) {
      titleWrapper = document.createElement('div');
      titleWrapper.className = 'chart-title-wrapper';
      existingTitle.parentNode.insertBefore(titleWrapper, existingTitle);
      titleWrapper.appendChild(existingTitle);
      
      // Add info icon if it doesn't exist
      if (!container.querySelector('.chart-info-icon')) {
        const infoIcon = document.createElement('span');
        infoIcon.className = 'info-icon chart-info-icon';
        infoIcon.setAttribute('tabindex', '0');
        infoIcon.textContent = 'ⓘ';
        infoIcon.setAttribute('data-tooltip', 'All axes show percentage difference from the best supplier (except Traceability). Best value = 0% = score 5 (center). Higher percentages = worse performance = lower scores. Traceability shows absolute steps (X/5 traceable). Hover over chart points to see exact percentages.');
        titleWrapper.appendChild(infoIcon);
      }
    }
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
  
  // Fixed chart size: 500x500px (CSS display size)
  const fixedChartSize = 500;
  const wrapper = canvas.closest('.chart-wrapper');
  
  // Get device pixel ratio for high-DPI displays (retina, etc.)
  const dpr = window.devicePixelRatio || 1;
  
  // Set wrapper dimensions first to ensure proper layout
  if (wrapper) {
    wrapper.style.height = fixedChartSize + 'px';
    wrapper.style.width = fixedChartSize + 'px';
    wrapper.style.display = 'block';
  }
  
  // Reset canvas internal dimensions to clear any previous Chart.js state
  // This prevents stretching issues when charts are recreated
  // Remove width/height attributes to let Chart.js set them fresh
  canvas.removeAttribute('width');
  canvas.removeAttribute('height');
  
  // Set canvas CSS size for layout
  canvas.style.width = fixedChartSize + 'px';
  canvas.style.height = fixedChartSize + 'px';
  canvas.style.display = 'block';
  canvas.style.margin = '0 auto';
  
  // Force a reflow to ensure dimensions are applied before Chart.js initializes
  void canvas.offsetHeight;
  
  radarCharts[canvasId] = new Chart(canvas, {
    type: 'radar',
    data: chartData,
    options: {
      responsive: false, // Use explicit dimensions
      maintainAspectRatio: false,
      devicePixelRatio: dpr, // Enable high-DPI rendering (Chart.js handles font scaling automatically)
      animation: false, // Disable animation for better performance with high resolution
      layout: {
        padding: {
          top: 0,
          bottom: 0,
          left: 35, // Keep left offset for centering hexagon under title
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
              size: 14, // Font size in logical pixels - Chart.js scales this correctly with devicePixelRatio
              weight: 300,
              family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif"
            },
            padding: 8
          },
          grid: {
            color: '#f0f0f0' // Pale grey grid lines
          },
          angleLines: {
            color: '#f0f0f0' // Pale grey angle lines
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
              const label = context.dataset.label || '';
              const axisIndex = context.dataIndex;
              // Get axis label from chart data
              const axisLabel = context.chart.data.labels[axisIndex];
              
              // Ecobalyse: percentage difference from best
              if (axisLabel === 'Ecobalyse' && context.dataset.ecobalyseDiffPercent !== undefined) {
                const diff = context.dataset.ecobalyseDiffPercent;
                if (diff === 0) {
                  return `${label}: best`;
                } else {
                  return `${label}: ${diff.toFixed(1)}% worse`;
                }
              }
              
              // Traceability: absolute steps
              if (axisLabel === 'Traceability' && context.dataset.traceabilitySteps !== undefined) {
                const steps = context.dataset.traceabilitySteps;
                return `${label}: ${steps}/5 steps traceable`;
              }
              
              // Price: percentage difference from best
              if (axisLabel === 'Price' && context.dataset.priceDiffPercent !== undefined) {
                const diff = context.dataset.priceDiffPercent;
                if (diff === 0) {
                  return `${label}: best`;
                } else {
                  return `${label}: ${diff.toFixed(1)}% more expensive`;
                }
              }
              
              // Lead Time: percentage difference from best
              if (axisLabel === 'Lead Time' && context.dataset.leadTimeDiffPercent !== undefined) {
                const diff = context.dataset.leadTimeDiffPercent;
                if (diff === 0) {
                  return `${label}: best`;
                } else {
                  return `${label}: ${diff.toFixed(1)}% longer`;
                }
              }
              
              // MOQ: percentage difference from best
              if (axisLabel === 'MOQ' && context.dataset.moqDiffPercent !== undefined) {
                const diff = context.dataset.moqDiffPercent;
                if (diff === 0) {
                  return `${label}: best`;
                } else {
                  return `${label}: ${diff.toFixed(1)}% higher`;
                }
              }
              
              // Fallback: show the score value
              return `${label}: ${context.parsed.r.toFixed(2)}`;
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

