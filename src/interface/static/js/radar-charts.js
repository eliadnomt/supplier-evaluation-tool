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
  
  // Check for cotton
  if (matId.includes('coton') || matId.includes('cotton')) {
    return 'cotton';
  }
  
  // Check for wool
  if (matId.includes('laine') || matId.includes('wool')) {
    return 'wool';
  }
  
  // Check for silk
  if (matId.includes('soie') || matId.includes('silk')) {
    return 'silk';
  }
  
  // If multiple materials or other, return 'composite'
  if (supplier.material_origin.length > 1) {
    return 'composite';
  }
  
  return 'composite'; // Default to composite for other materials
}

/**
 * Group suppliers by material category
 */
function groupSuppliersByMaterial(suppliers) {
  const groups = {
    cotton: [],
    wool: [],
    silk: [],
    composite: []
  };
  
  suppliers.forEach(supplier => {
    if (supplier.error) return; // Skip suppliers with errors
    
    const category = getMaterialCategory(supplier);
    groups[category].push(supplier);
  });
  
  return groups;
}

/**
 * Create or update a radar chart
 */
function createRadarChart(canvasId, suppliers) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error(`Canvas element ${canvasId} not found`);
    return;
  }
  
  // Destroy existing chart if it exists
  if (radarCharts[canvasId]) {
    radarCharts[canvasId].destroy();
  }
  
  // Get chart data
  const chartData = getRadarChartData(suppliers);
  
  if (!chartData || !chartData.datasets || chartData.datasets.length === 0) {
    // Show placeholder message
    canvas.parentElement.innerHTML = '<div class="chart-placeholder">No suppliers for this material category</div>';
    return;
  }
  
  // Create Chart.js radar chart
  radarCharts[canvasId] = new Chart(canvas, {
    type: 'radar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true,
          min: 0,
          max: 10,
          ticks: {
            stepSize: 2,
            showLabelBackdrop: false
          },
          pointLabels: {
            font: {
              size: 11,
              weight: 300
            }
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
    
    if (validSuppliers.length === 0) {
      // Show placeholders
      return;
    }
    
    // Group suppliers by material
    const groups = groupSuppliersByMaterial(validSuppliers);
    
    // Create charts for each category
    createRadarChart('cottonChart', groups.cotton);
    createRadarChart('woolChart', groups.wool);
    createRadarChart('compositeChart', groups.composite);
    
    // If silk has suppliers, create that chart too
    if (groups.silk.length > 0) {
      createRadarChart('silkChart', groups.silk);
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

