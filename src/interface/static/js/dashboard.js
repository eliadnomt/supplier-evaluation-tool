// Dashboard-specific JavaScript

// Modal control
const modal = document.getElementById('addSupplierModal');
const addBtn = document.getElementById('addSupplierBtn');
const closeBtn = document.getElementById('closeModal');
const viewBtn = document.getElementById('viewSuppliersBtn');
const ecobalyseLogoBtn = document.getElementById('ecobalyseLogoBtn');
const ecobalyseModal = document.getElementById('ecobalyseModal');
const closeEcobalyseBtn = document.getElementById('closeEcobalyseModal');
const suppliersSection = document.getElementById('suppliersSection');
const suppliersList = document.getElementById('suppliersList');
const weightedComparisonBtn = document.getElementById('weightedComparisonBtn');
const weightedComparisonPanel = document.getElementById('weightedComparisonPanel');
const closeWeightedPanel = document.getElementById('closeWeightedPanel');
const chartSelector = document.getElementById('chartSelector');
const getRecommendationBtn = document.getElementById('getRecommendationBtn');
const recommendationResults = document.getElementById('recommendationResults');
const recommendationContent = document.getElementById('recommendationContent');
const certificationSelect = document.getElementById('certificationSelect');
const certificationChipsContainer = document.getElementById('selectedCertifications');
const countryDisplayLookup = {};
fetch('/api/enums/countries').then(r=>r.json()).then(arr => {
  (arr || []).forEach(entry => {
    if (typeof entry === 'string') {
      countryDisplayLookup[entry] = entry;
    } else if (entry && typeof entry === 'object') {
      const key = entry.code || entry.id || entry.name;
      const label = entry.name || entry.label || key;
      if (key) countryDisplayLookup[key] = label;
      if (entry.name) countryDisplayLookup[entry.name] = entry.name;
    }
  });
}).catch(()=>{});
let isSupplierFormDirty = false;
let certificationOptions = [];
let selectedCertifications = [];

function fetchCertificationOptions() {
  if (!certificationSelect) return;
  fetch('/api/enums/certifications')
    .then(r => r.json())
    .then(arr => {
      certificationOptions = Array.isArray(arr) ? arr : [];
      renderCertificationSelect();
    })
    .catch(() => {
      certificationOptions = [];
      renderCertificationSelect();
    });
}

function renderCertificationSelect() {
  if (!certificationSelect) return;
  const currentValue = certificationSelect.value;
  certificationSelect.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select certification';
  certificationSelect.appendChild(placeholder);
  
  certificationOptions.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option;
    opt.textContent = option;
    if (selectedCertifications.includes(option)) {
      opt.disabled = true;
    }
    certificationSelect.appendChild(opt);
  });
  
  if (currentValue && certificationSelect.querySelector(`option[value="${currentValue}"]:not([disabled])`)) {
    certificationSelect.value = currentValue;
  } else {
    certificationSelect.value = '';
  }
}

function renderCertificationChips() {
  if (!certificationChipsContainer) return;
  certificationChipsContainer.innerHTML = '';
  if (!selectedCertifications.length) {
    const emptyState = document.createElement('div');
    emptyState.className = 'certification-empty';
    emptyState.textContent = 'No certifications selected yet.';
    certificationChipsContainer.appendChild(emptyState);
    return;
  }
  
  selectedCertifications.forEach(cert => {
    const chip = document.createElement('span');
    chip.className = 'certification-chip';
    chip.textContent = cert;
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'certification-chip-remove';
    removeBtn.setAttribute('aria-label', `Remove ${cert}`);
    removeBtn.textContent = '×';
    removeBtn.onclick = () => removeCertification(cert);
    
    chip.appendChild(removeBtn);
    certificationChipsContainer.appendChild(chip);
  });
}

function setSelectedCertifications(list) {
  if (Array.isArray(list)) {
    const cleaned = list
      .map(item => typeof item === 'string' ? item.trim() : item)
      .filter(item => item);
    selectedCertifications = Array.from(new Set(cleaned));
  } else {
    selectedCertifications = [];
  }
  renderCertificationChips();
  renderCertificationSelect();
}

function addCertification(cert) {
  const normalized = typeof cert === 'string' ? cert.trim() : cert;
  if (!normalized || selectedCertifications.includes(normalized)) {
    return;
  }
  selectedCertifications.push(normalized);
  isSupplierFormDirty = true;
  renderCertificationChips();
  renderCertificationSelect();
  if (certificationSelect) {
    certificationSelect.value = '';
  }
}

function removeCertification(cert) {
  const normalized = typeof cert === 'string' ? cert.trim() : cert;
  selectedCertifications = selectedCertifications.filter(item => item !== normalized);
  isSupplierFormDirty = true;
  renderCertificationChips();
  renderCertificationSelect();
}

function getSelectedCertifications() {
  return [...selectedCertifications];
}

if (certificationSelect) {
  certificationSelect.addEventListener('change', (e) => {
    if (e.target.value) {
      addCertification(e.target.value);
    }
  });
  renderCertificationSelect();
  fetchCertificationOptions();
}

if (certificationChipsContainer) {
  renderCertificationChips();
}

function resetSupplierFormState() {
  isSupplierFormDirty = false;
}

function attemptCloseSupplierModal() {
  if (isSupplierFormDirty) {
    const confirmClose = confirm('You have unsaved supplier details. Close without saving?');
    if (!confirmClose) {
      return false;
    }
  }
  modal.classList.remove('active');
  resetSupplierFormState();
  return true;
}

addBtn.onclick = () => {
  // Reset form and remove edit mode
  document.getElementById('supplierForm').reset();
  document.getElementById('supplierForm').dataset.editIndex = '';
  document.getElementById('materialsSection').innerHTML = '';
  document.querySelector('.modal-content h2').textContent = 'Supplier information';
  document.getElementById('status').innerText = '';
  setSelectedCertifications([]);
  resetSupplierFormState();
  // Reset material validation state
  const addFibreBtn = document.getElementById('addFibreBtn');
  if (addFibreBtn) {
    addFibreBtn.disabled = false;
  }
  const matOriginWarn = document.getElementById('matOriginWarn');
  if (matOriginWarn) {
    matOriginWarn.style.display = 'none';
    matOriginWarn.innerText = '';
  }
  modal.classList.add('active');
  // Set default values for select menus and material rows (customize these values as needed)
  loadEnums({
    productSelect: 'chemise',  // Default garment type
    makingComplexitySelect: 'very-high',  // Default manufacture time
    fabricProcessSelect: 'weaving',  // Default fabric process
    // Material row defaults (applied when clicking "Add fibre")
    materialRowDefaults: {
      id: 'ei-coton-organic',  // Default material ID (uncomment and set as needed)
      // share: 0.5,  // Default share as decimal (0.5 = 50%, uncomment and set as needed)
      // country: 'FR',  // Default country code (uncomment and set as needed)
    }
  });
};

closeBtn.onclick = () => {
  attemptCloseSupplierModal();
};

modal.onclick = (e) => {
  if (e.target === modal) {
    attemptCloseSupplierModal();
  }
};

if (ecobalyseLogoBtn) {
  ecobalyseLogoBtn.onclick = () => {
    ecobalyseModal.classList.add('active');
  };
  ecobalyseLogoBtn.style.cursor = 'pointer';
}

closeEcobalyseBtn.onclick = () => {
  ecobalyseModal.classList.remove('active');
};

ecobalyseModal.onclick = (e) => {
  if (e.target === ecobalyseModal) {
    ecobalyseModal.classList.remove('active');
  }
};

viewBtn.onclick = () => {
  if (suppliersSection.classList.contains('active')) {
    suppliersSection.classList.remove('active');
  } else {
    suppliersSection.classList.add('active');
    loadSuppliers();
  }
};


// Weighted Comparison Panel Controls
weightedComparisonBtn.onclick = () => {
  if (weightedComparisonPanel.style.display === 'none') {
    weightedComparisonPanel.style.display = 'flex';
    document.body.classList.add('weighted-panel-open');
    updateChartSelector();
  } else {
    weightedComparisonPanel.style.display = 'none';
    document.body.classList.remove('weighted-panel-open');
  }
};

closeWeightedPanel.onclick = () => {
  weightedComparisonPanel.style.display = 'none';
  document.body.classList.remove('weighted-panel-open');
};

// Update chart selector dropdown with available categories
function updateChartSelector() {
  const chartsSection = document.querySelector('.charts-section');
  if (!chartsSection) return;
  
  const chartContainers = chartsSection.querySelectorAll('.chart-container');
  const chartSelect = document.getElementById('chartSelector');
  
  // Clear existing options except "All Charts"
  chartSelect.innerHTML = '<option value="all">All Charts</option>';
  
  chartContainers.forEach(container => {
    const title = container.querySelector('.chart-title');
    if (title && container.style.display !== 'none') {
      const titleText = title.textContent.trim();
      const option = document.createElement('option');
      option.value = titleText.toLowerCase();
      option.textContent = titleText;
      chartSelect.appendChild(option);
    }
  });
}

// Weight slider event handlers with validation
const weightSliders = ['ecobalyse', 'transparency', 'price', 'leadTime', 'moq', 'certifications'];
const weightTotalValue = document.getElementById('weightTotalValue');
const weightWarning = document.getElementById('weightWarning');
const recommendationBtnDefaultText = getRecommendationBtn ? getRecommendationBtn.textContent : 'GET RECOMMENDATION';
let isRecommendationLoading = false;

function calculateTotalWeight() {
  let total = 0;
  weightSliders.forEach(axis => {
    const slider = document.getElementById(axis + 'Weight');
    if (slider) {
      total += parseInt(slider.value) || 0;
    }
  });
  return total;
}

function setRecommendationLoading(isLoading) {
  isRecommendationLoading = isLoading;
  if (getRecommendationBtn) {
    getRecommendationBtn.disabled = isLoading;
    getRecommendationBtn.classList.toggle('loading', isLoading);
    getRecommendationBtn.textContent = isLoading ? 'Calculating...' : recommendationBtnDefaultText;
  }
  if (isLoading && recommendationContent && recommendationResults) {
    recommendationContent.innerHTML = '<p class="recommendation-loading">Calculating recommendation...</p>';
    recommendationResults.style.display = 'block';
  }
}

function getSliderValue(id) {
  const slider = document.getElementById(id);
  if (!slider) return 0;
  const value = parseInt(slider.value);
  return isNaN(value) ? 0 : value;
}

function updateWeightTotal() {
  const total = calculateTotalWeight();
  if (weightTotalValue) {
    weightTotalValue.textContent = total;
  }
  if (weightWarning) {
    if (total > 100) {
      weightWarning.style.display = 'inline';
    } else {
      weightWarning.style.display = 'none';
    }
  }
}

function getCurrentWeights() {
  return {
    ecobalyse: getSliderValue('ecobalyseWeight'),
    transparency: getSliderValue('transparencyWeight'),
    price: getSliderValue('priceWeight'),
    leadTime: getSliderValue('leadTimeWeight'),
    moq: getSliderValue('moqWeight'),
    certifications: getSliderValue('certificationsWeight')
  };
}

weightSliders.forEach(axis => {
  const slider = document.getElementById(axis + 'Weight');
  const valueDisplay = document.getElementById(axis + 'WeightValue');
  if (slider && valueDisplay) {
    slider.addEventListener('input', (e) => {
      const newValue = parseInt(e.target.value);
      
      // Calculate total of all OTHER sliders (excluding this one)
      let otherTotal = 0;
      weightSliders.forEach(otherAxis => {
        if (otherAxis !== axis) {
          const otherSlider = document.getElementById(otherAxis + 'Weight');
          if (otherSlider) {
            otherTotal += parseInt(otherSlider.value) || 0;
          }
        }
      });
      
      const maxAllowed = 100 - otherTotal;
      
      // Prevent exceeding 100% total
      if (newValue > maxAllowed) {
        slider.value = maxAllowed;
        valueDisplay.textContent = maxAllowed;
      } else {
        valueDisplay.textContent = newValue;
      }
      
      updateWeightTotal();
    });
  }
});

// Initialize total display
updateWeightTotal();

// Get recommendation button handler
getRecommendationBtn.onclick = async () => {
  if (isRecommendationLoading) {
    return;
  }
  const selectedChart = chartSelector.value;
  
  // Get weights from sliders
  const weights = getCurrentWeights();
  const totalWeight = calculateTotalWeight();
  
  // Validate that weights sum to 100
  if (totalWeight !== 100) {
    recommendationContent.innerHTML = `<p style="color: #d32f2f;">Please ensure all weights sum to exactly 100% (currently ${totalWeight}%).</p>`;
    recommendationResults.style.display = 'block';
    return;
  }
  
  setRecommendationLoading(true);
  
  // Fetch suppliers based on selected chart
  try {
    const response = await fetch('/api/suppliers/for-radar');
    let suppliers = await response.json();
    suppliers = suppliers.filter(s => !s.error);
    
    // If "all charts" is selected, generate recommendations per chart
    if (selectedChart === 'all') {
      const groups = groupSuppliersByMaterial(suppliers);
      const categories = Object.keys(groups);
      
      if (categories.length === 0) {
        recommendationContent.innerHTML = '<p>No suppliers available for comparison.</p>';
        recommendationResults.style.display = 'block';
        return;
      }
      
      // Generate recommendations for each chart
      let html = '';
      categories.forEach(category => {
        const chartSuppliers = groups[category];
        if (chartSuppliers.length === 0) return;
        
        const recommendedSuppliers = getRecommendedSuppliers(chartSuppliers, weights);
        const recommendation = generateRecommendationSummary(recommendedSuppliers, weights);
        
        // Add chart title
        html += `<div class="chart-recommendation-section">`;
        html += `<h5 class="chart-recommendation-title">${categoryToTitle(category)}</h5>`;
        
        // Summary
        html += `<p class="recommendation-summary">${recommendation.summary}</p>`;
        
        // Priority order list
        html += '<ol class="recommendation-list">';
        recommendedSuppliers.forEach((item, index) => {
          const supplierNameHtml = formatSupplierNameForRecommendation(item);
          html += `<li>${supplierNameHtml} <span class="weighted-score">(Weighted Score: ${item.weightedScore.toFixed(2)})</span></li>`;
        });
        html += '</ol>';
        
        // Caveats
        if (recommendation.caveats && recommendation.caveats.length > 0) {
          html += '<p class="recommendation-caveat">';
          html += '<strong>Note:</strong> ';
          html += recommendation.caveats.join(' ');
          html += '</p>';
        }
        
        html += `</div>`;
      });
      
      recommendationContent.innerHTML = html;
      recommendationResults.style.display = 'block';
      
      // Initialize tooltips for composite fabrics
      initializeCompositeTooltips();
      return;
    }
    
    // Single chart selected - filter suppliers by chart
    const groups = groupSuppliersByMaterial(suppliers);
    const categoryKey = selectedChart.toLowerCase();
    let chartSuppliers = null;
    
    if (groups[categoryKey]) {
      chartSuppliers = groups[categoryKey];
    } else {
      // Try to find by matching chart title
      const allCategories = Object.keys(groups);
      const matchingCategory = allCategories.find(cat => 
        categoryToTitle(cat).toLowerCase() === selectedChart.toLowerCase()
      );
      if (matchingCategory) {
        chartSuppliers = groups[matchingCategory];
      }
    }
    
    if (!chartSuppliers || chartSuppliers.length === 0) {
      recommendationContent.innerHTML = '<p>No suppliers available for the selected chart.</p>';
      recommendationResults.style.display = 'block';
      return;
    }
    
    // Get recommendations for single chart
    const recommendedSuppliers = getRecommendedSuppliers(chartSuppliers, weights);
    const recommendation = generateRecommendationSummary(recommendedSuppliers, weights);
    
    // Display results
    displayRecommendation(recommendedSuppliers, recommendation);
    
  } catch (error) {
    console.error('Error getting recommendation:', error);
    recommendationContent.innerHTML = '<p>Error calculating recommendation. Please try again.</p>';
    recommendationResults.style.display = 'block';
  } finally {
    setRecommendationLoading(false);
  }
};

// Helper function to check if a supplier is composite (has multiple materials)
function isCompositeFabric(supplier) {
  return supplier && supplier.material_origin && supplier.material_origin.length > 1;
}

// Helper function to format supplier name with composite styling if needed
function formatSupplierNameForRecommendation(item) {
  const supplierDisplayName = item.fabricName 
    ? `${item.supplier} (${item.fabricName})`
    : item.supplier;
  
  const isComposite = item.originalSupplier && isCompositeFabric(item.originalSupplier);
  
  if (isComposite) {
    // Create a composition description for the tooltip
    const materials = item.originalSupplier.material_origin || [];
    const compositionText = materials
      .map(m => `${(m.share * 100).toFixed(0)}% ${formatMaterialName(m.id)}`)
      .join(', ');
    
    return `<span class="supplier-name supplier-name-composite" data-tooltip="Composite fabric: ${compositionText}">${supplierDisplayName}</span>`;
  } else {
    return `<span class="supplier-name">${supplierDisplayName}</span>`;
  }
}

// Initialize tooltips for composite fabric indicators
function initializeCompositeTooltips() {
  const compositeElements = document.querySelectorAll('.supplier-name-composite[data-tooltip]');
  compositeElements.forEach(element => {
    // Remove existing event listeners by cloning
    const newElement = element.cloneNode(true);
    element.parentNode.replaceChild(newElement, element);
    
    // Add tooltip functionality
    const tooltip = newElement.getAttribute('data-tooltip');
    if (tooltip) {
      newElement.addEventListener('mouseenter', function(e) {
        showTooltip(e.target, tooltip);
      });
      newElement.addEventListener('mouseleave', function() {
        hideTooltip();
      });
      newElement.addEventListener('focus', function(e) {
        showTooltip(e.target, tooltip);
      });
      newElement.addEventListener('blur', function() {
        hideTooltip();
      });
    }
  });
}

// Simple tooltip functions
let tooltipElement = null;

function showTooltip(target, text) {
  hideTooltip(); // Remove any existing tooltip
  
  tooltipElement = document.createElement('div');
  tooltipElement.className = 'composite-tooltip';
  tooltipElement.textContent = text;
  document.body.appendChild(tooltipElement);
  
  const rect = target.getBoundingClientRect();
  tooltipElement.style.left = rect.left + (rect.width / 2) - (tooltipElement.offsetWidth / 2) + 'px';
  tooltipElement.style.top = rect.top - tooltipElement.offsetHeight - 8 + 'px';
  
  // Adjust if tooltip goes off screen
  const tooltipRect = tooltipElement.getBoundingClientRect();
  if (tooltipRect.left < 0) {
    tooltipElement.style.left = '8px';
  }
  if (tooltipRect.right > window.innerWidth) {
    tooltipElement.style.left = (window.innerWidth - tooltipRect.width - 8) + 'px';
  }
  if (tooltipRect.top < 0) {
    tooltipElement.style.top = rect.bottom + 8 + 'px';
  }
}

function hideTooltip() {
  if (tooltipElement) {
    tooltipElement.remove();
    tooltipElement = null;
  }
}

// Display recommendation results
function displayRecommendation(recommendedSuppliers, recommendation) {
  let html = '';
  
  // Summary as paragraph
  html += `<p class="recommendation-summary">${recommendation.summary}</p>`;
  
  // Priority order list
  html += '<ol class="recommendation-list">';
  recommendedSuppliers.forEach((item, index) => {
    const supplierNameHtml = formatSupplierNameForRecommendation(item);
    html += `<li>${supplierNameHtml} <span class="weighted-score">(Weighted Score: ${item.weightedScore.toFixed(2)})</span></li>`;
  });
  html += '</ol>';
  
  // Caveats as paragraph
  if (recommendation.caveats && recommendation.caveats.length > 0) {
    html += '<p class="recommendation-caveat">';
    html += '<strong>Note:</strong> ';
    html += recommendation.caveats.join(' ');
    html += '</p>';
  }
  
  recommendationContent.innerHTML = html;
  recommendationResults.style.display = 'block';
  
  // Initialize tooltips for composite fabrics
  initializeCompositeTooltips();
}

function loadSuppliers() {
  suppliersList.innerHTML = '<div class="suppliers-loading">Loading suppliers...</div>';
  // Use for-radar endpoint to get suppliers with Ecobalyse scores
  fetch('/api/suppliers/for-radar').then(r=>r.json()).then(suppliers => {
    if (!suppliers || suppliers.length === 0) {
      suppliersList.innerHTML = '<div class="suppliers-empty">No suppliers found. Add a supplier to get started.</div>';
      return;
    }
    // Filter out suppliers with errors
    const validSuppliers = suppliers.filter(s => !s.error);
    renderSuppliers(validSuppliers);
  }).catch(err => {
    suppliersList.innerHTML = '<div class="suppliers-empty">Error loading suppliers: ' + err + '</div>';
  });
}

// Helper function to count traceability fields
// Fields don't count if they are 'Pays Inconnu' or '---'
function calculateTraceabilityCount(supplier) {
  let count = 0;
  const unknownValues = ['pays inconnu', '---'];
  
  // Helper function to check if a value is unknown (case-insensitive)
  // Handles "Pays inconnu", "Pays inconnu (par défaut)", "---", etc.
  const isUnknown = (value) => {
    if (!value) return true;
    const normalized = String(value).trim().toLowerCase();
    if (normalized === '') return true;
    // Check if it contains "pays inconnu" (handles "Pays inconnu (par défaut)")
    if (normalized.includes('pays inconnu')) return true;
    // Check for exact matches
    return unknownValues.includes(normalized);
  };
  
  // Step 1: Fibre/Material origin
  if (supplier.material_origin && supplier.material_origin.length > 0) {
    count++;
  }
  // Step 2: Spinning - only count if not unknown
  if (supplier.countrySpinning && !isUnknown(supplier.countrySpinning)) {
    count++;
  }
  // Step 3: Weaving/Knitting (fabric) - only count if country is not unknown
  if (supplier.countryFabric && !isUnknown(supplier.countryFabric)) {
    count++;
  }
  // Step 4: Dyeing/Finishing - only count if country is not unknown
  if (supplier.countryDyeing && !isUnknown(supplier.countryDyeing)) {
    count++;
  }
  // Step 5: Making - only count if not unknown
  if (supplier.countryMaking && !isUnknown(supplier.countryMaking)) {
    count++;
  }
  return count;
}

// Helper function to get product type display name
function getProductTypeDisplay(productType) {
  const productMap = {
    'chemise': 'Shirt',
    'pull': 'Sweater',
    'tshirt': 'T-Shirt',
    'pantalon': 'Pants',
    'jupe': 'Skirt',
    'jean': 'Jeans'
  };
  return productMap[productType] || productType || 'Product';
}

function humanizeSlug(value) {
  if (!value) return 'Not provided';
  return String(value).replace(/^ei[-_]/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase());
}

const makingComplexityLabels = {
  'very-low': 'Very Low (<5 min)',
  'low': 'Low (5–15 min)',
  'medium': 'Medium (15–30 min)',
  'high': 'High (30–60 min)',
  'very-high': 'Very High (>60 min)'
};

function formatMakingComplexity(value) {
  return makingComplexityLabels[value] || humanizeSlug(value);
}

function formatFabricProcess(value) {
  if (!value) return 'Not provided';
  if (value === 'weaving') return 'Weaving';
  return humanizeSlug(value);
}

function formatMaterialName(id) {
  return humanizeSlug(id);
}

function formatCountryValue(value) {
  if (!value) return 'Not provided';
  return countryDisplayLookup[value] || value;
}

function renderSuppliers(suppliers) {
  suppliersList.innerHTML = '';
  
  if (!suppliers || suppliers.length === 0) {
    suppliersList.innerHTML = '<div class="suppliers-empty">No suppliers found. Add a supplier to get started.</div>';
    return;
  }
  
  const grouped = {};
  suppliers.forEach((supplier, originalIndex) => {
    const supplierName = (supplier.supplier || 'Unnamed Supplier').trim() || 'Unnamed Supplier';
    if (!grouped[supplierName]) grouped[supplierName] = [];
    grouped[supplierName].push({ supplier, originalIndex });
  });
  
  Object.keys(grouped).sort((a, b) => a.localeCompare(b)).forEach(name => {
    const fabrics = grouped[name].sort((a, b) => {
      const fabricA = (a.supplier.fabricName || '').toLowerCase();
      const fabricB = (b.supplier.fabricName || '').toLowerCase();
      return fabricA.localeCompare(fabricB);
    });
    
    const groupCard = document.createElement('div');
    groupCard.className = 'supplier-group';
    
    const header = document.createElement('div');
    header.className = 'supplier-group-header-static';
    header.innerHTML = `<span>${name}</span><span class="supplier-group-count">${fabrics.length} fabric${fabrics.length > 1 ? 's' : ''}</span>`;
    groupCard.appendChild(header);
    
    const fabricList = document.createElement('div');
    fabricList.className = 'supplier-group-body';
    
    fabrics.forEach(({ supplier, originalIndex }) => {
      fabricList.appendChild(buildFabricCard(supplier, originalIndex));
    });
    
    groupCard.appendChild(fabricList);
    suppliersList.appendChild(groupCard);
  });
}

function buildFabricCard(supplier, actualIndex) {
  const card = document.createElement('div');
  card.className = 'supplier-item';
  
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'fabric-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = `<span>${supplier.fabricName || 'Fabric entry'}</span><span class="fabric-product">${getProductTypeDisplay(supplier.product)}</span>`;
  card.appendChild(toggle);
  
  const meta = document.createElement('div');
  meta.className = 'supplier-fabric-meta';
  meta.textContent = `Product: ${getProductTypeDisplay(supplier.product)}`;
  
  const detailsWrapper = document.createElement('div');
  detailsWrapper.className = 'fabric-details';
  detailsWrapper.hidden = true;
  detailsWrapper.appendChild(meta);
  
  const details = document.createElement('div');
  details.className = 'supplier-details';
  
  const traceabilityCount = calculateTraceabilityCount(supplier);
  const certificationsList = Array.isArray(supplier.certifications)
    ? supplier.certifications.filter(cert => cert && String(cert).trim().length > 0)
    : [];
  const certificationsDisplay = certificationsList.length > 0 ? certificationsList.join(', ') : 'None provided';
  const highlightFields = [
    { label: `Ecobalyse Score (${getProductTypeDisplay(supplier.product)})`, value: supplier.ecobalyse_score != null ? supplier.ecobalyse_score.toFixed(2) : 'N/A', infoTooltip: 'Ecobalyse score for the specific garment type. This is the basis for the Ecobalyse score on the radar charts. The higher the score, the worse the environmental impact.' },
    { label: 'Traceability Fields', value: `${traceabilityCount}/5`, isHighlight: true, infoTooltip: 'One point is awarded for each traceable step, and summed across the five steps. This is the basis for the traceability score on the radar charts.' },
    { label: 'Certifications', value: certificationsDisplay, isHighlight: true, infoTooltip: 'One point is awarded for each certification. The certification score does not appear on the charts, but you can prioritise it in the weighted comparison to evaluate suppliers.' }
  ];
  
  const otherFields = [
    { label: 'MOQ (m)', value: supplier.moq_m },
    { label: 'Price €/m', value: supplier.price_eur_per_m },
    { label: 'Fabric Lead Time (weeks)', value: supplier.fabric_lead_time_weeks },
    { label: 'Weight (g/m²)', value: supplier.weight_gm2 },
    { label: 'Gross Width (cm)', value: supplier.gross_width }
  ];
  
  const highlightRow = document.createElement('div');
  highlightRow.className = 'supplier-details-highlight';
  highlightFields.forEach(field => {
    const detail = document.createElement('div');
    detail.className = 'supplier-detail supplier-detail-highlight';
    const labelWrapper = document.createElement('span');
    labelWrapper.className = 'supplier-detail-label supplier-detail-label-bold';
    labelWrapper.textContent = field.label + ':';
    if (field.infoTooltip) {
      const icon = document.createElement('span');
      icon.className = 'info-icon info-inline';
      icon.setAttribute('tabindex', '0');
      icon.setAttribute('data-tooltip', field.infoTooltip);
      icon.textContent = 'ⓘ';
      labelWrapper.appendChild(icon);
    }
    const value = document.createElement('span');
    value.className = 'supplier-detail-value';
    value.textContent = typeof field.value === 'number' ? field.value.toLocaleString() : (field.value || 'N/A');
    detail.appendChild(labelWrapper);
    detail.appendChild(value);
    highlightRow.appendChild(detail);
  });
  details.appendChild(highlightRow);
  
  const otherFieldsContainer = document.createElement('div');
  otherFieldsContainer.className = 'supplier-details-regular';
  otherFields.forEach(field => {
    if (field.value !== undefined && field.value !== null && field.value !== '') {
      const detail = document.createElement('div');
      detail.className = 'supplier-detail';
      const label = document.createElement('span');
      label.className = 'supplier-detail-label';
      label.textContent = field.label + ':';
      const value = document.createElement('span');
      value.className = 'supplier-detail-value';
      value.textContent = typeof field.value === 'number' ? field.value.toLocaleString() : (field.value || 'N/A');
      detail.appendChild(label);
      detail.appendChild(value);
      otherFieldsContainer.appendChild(detail);
    }
  });
  if (otherFieldsContainer.children.length > 0) {
    details.appendChild(otherFieldsContainer);
  }

  if (supplier.material_origin && supplier.material_origin.length > 0) {
    const compositionWrapper = document.createElement('div');
    compositionWrapper.className = 'supplier-composition';
    const title = document.createElement('div');
    title.className = 'supplier-composition-title';
    title.textContent = 'Composition detail';
    compositionWrapper.appendChild(title);

    const headerRow = document.createElement('div');
    headerRow.className = 'composition-header';
    headerRow.innerHTML = '<span>Material</span><span>Share</span><span>Origin</span>';
    compositionWrapper.appendChild(headerRow);

    supplier.material_origin.forEach((mat, idx) => {
      const line = document.createElement('div');
      line.className = 'composition-item';
      const materialName = formatMaterialName(mat.id) || `Material ${idx + 1}`;
      const sharePercent = mat.share != null ? `${(mat.share * 100).toFixed(0)}%` : 'N/A';
      const origin = formatCountryValue(mat.country);
      line.innerHTML = `<span class="composition-material">${materialName}</span><span class="composition-share">${sharePercent}</span><span class="composition-origin">${origin}</span>`;
      compositionWrapper.appendChild(line);
    });

    details.appendChild(compositionWrapper);
  }

  const transformationFields = [
    { label: 'Spinning origin', value: formatCountryValue(supplier.countrySpinning) },
    { label: 'Fabric origin', value: formatCountryValue(supplier.countryFabric) },
    { label: 'Dyeing origin', value: formatCountryValue(supplier.countryDyeing) },
    { label: 'Making origin', value: formatCountryValue(supplier.countryMaking) }
  ];
  const transformationGrid = document.createElement('div');
  transformationGrid.className = 'supplier-origins-grid';
  transformationFields.forEach(field => {
    const card = document.createElement('div');
    card.className = 'origin-card';
    const label = document.createElement('span');
    label.className = 'origin-card-label';
    label.textContent = field.label;
    const value = document.createElement('span');
    value.className = 'origin-card-value';
    value.textContent = field.value || 'Not provided';
    card.appendChild(label);
    card.appendChild(value);
    transformationGrid.appendChild(card);
  });
  details.appendChild(transformationGrid);

  const productionFields = [
    { label: 'Knitting/weaving process', value: formatFabricProcess(supplier.fabricProcess) },
    { label: 'Manufacture time category', value: formatMakingComplexity(supplier.makingComplexity) },
    { label: 'Garment lead time (weeks)', value: supplier.lead_time_weeks },
    { label: 'Number of garments', value: supplier.numberOfReferences },
    { label: 'Price per garment (€)', value: supplier.price }
  ];
  const productionContainer = document.createElement('div');
  productionContainer.className = 'supplier-production-grid';
  productionFields.forEach(field => {
    if (field.value !== undefined && field.value !== null && field.value !== '') {
      const detail = document.createElement('div');
      detail.className = 'supplier-detail';
      const label = document.createElement('span');
      label.className = 'supplier-detail-label';
      label.textContent = field.label + ':';
      const value = document.createElement('span');
      value.className = 'supplier-detail-value';
      value.textContent = typeof field.value === 'number' ? field.value.toLocaleString() : (field.value || 'N/A');
      detail.appendChild(label);
      detail.appendChild(value);
      productionContainer.appendChild(detail);
    }
  });
  if (productionContainer.children.length > 0) {
    details.appendChild(productionContainer);
  }
  
  detailsWrapper.appendChild(details);
  
  const actions = document.createElement('div');
  actions.className = 'supplier-actions';
  const editBtn = document.createElement('button');
  editBtn.className = 'supplier-btn supplier-btn-edit';
  editBtn.textContent = 'Edit';
  editBtn.onclick = () => editSupplier(actualIndex, supplier);
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'supplier-btn supplier-btn-delete';
  deleteBtn.textContent = 'Delete';
  deleteBtn.onclick = () => deleteSupplier(actualIndex, supplier.supplier);
  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);
  detailsWrapper.appendChild(actions);
  
  toggle.addEventListener('click', () => {
    const expanded = detailsWrapper.hidden;
    detailsWrapper.hidden = !expanded;
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.classList.toggle('expanded', expanded);
  });
  
  card.appendChild(detailsWrapper);
  return card;
}

function deleteSupplier(index, supplierName) {
  if (confirm(`Are you sure you want to delete "${supplierName}"? This action cannot be undone.`)) {
    fetch(`/api/suppliers/${index}`, { method: 'DELETE' }).then(resp => {
      if (resp.ok) {
        loadSuppliers();
        // Refresh radar charts
        if (typeof refreshRadarCharts === 'function') {
          refreshRadarCharts();
        }
      } else {
        alert('Error deleting supplier');
      }
    }).catch(err => {
      alert('Error deleting supplier: ' + err);
    });
  }
}

function editSupplier(index, supplier) {
  // Store edit index
  document.getElementById('supplierForm').dataset.editIndex = index;
  
  // Store all supplier values before loading enums (which will clear selects)
  const supplierValues = {
    supplier: supplier.supplier || '',
    fabricName: supplier.fabricName,
    product: supplier.product,
    businessSize: supplier.businessSize,
    countrySpinning: supplier.countrySpinning,
    countryFabric: supplier.countryFabric,
    countryDyeing: supplier.countryDyeing,
    countryMaking: supplier.countryMaking,
    fabricProcess: supplier.fabricProcess,
    dyeingProcess: supplier.dyeingProcess,
    makingComplexity: supplier.makingComplexity,
    gross_width: supplier.gross_width,
    weight_gm2: supplier.weight_gm2,
    fabric_lead_time_weeks: supplier.fabric_lead_time_weeks,
    price_eur_per_m: supplier.price_eur_per_m,
    moq_m: supplier.moq_m,
    numberOfReferences: supplier.numberOfReferences,
    price: supplier.price,
    lead_time_weeks: supplier.lead_time_weeks,
    material_origin: supplier.material_origin,
    certifications: Array.isArray(supplier.certifications) ? supplier.certifications : []
  };
  
  // Update modal title
  document.querySelector('.modal-content h2').textContent = 'Edit Supplier Information';
  
  // Open modal
  modal.classList.add('active');
  resetSupplierFormState();
  
  // Load enums first (this will clear all selects)
  // Preserve the product value in case it's not in the filtered list
  loadEnums({ preserveProduct: supplierValues.product });
  
  // Function to restore all form values after enums are loaded
  const restoreFormValues = () => {
    // Fill text inputs immediately (they don't get cleared)
    if (supplierValues.supplier) {
      document.querySelector('input[name="supplier"]').value = supplierValues.supplier;
    }
    if (supplierValues.fabricName) {
      document.querySelector('input[name="fabricName"]').value = supplierValues.fabricName;
    }
    if (supplierValues.gross_width) {
      document.querySelector('input[name="gross_width"]').value = supplierValues.gross_width;
    }
    if (supplierValues.weight_gm2) {
      document.querySelector('input[name="weight_gm2"]').value = supplierValues.weight_gm2;
    }
    if (supplierValues.price_eur_per_m) {
      document.querySelector('input[name="price_eur_per_m"]').value = supplierValues.price_eur_per_m;
    }
    if (supplierValues.moq_m) {
      document.querySelector('input[name="moq_m"]').value = supplierValues.moq_m;
    }
    if (supplierValues.fabric_lead_time_weeks) {
      document.querySelector('input[name="fabric_lead_time_weeks"]').value = supplierValues.fabric_lead_time_weeks;
    }
    if (supplierValues.numberOfReferences) {
      document.querySelector('input[name="numberOfReferences"]').value = supplierValues.numberOfReferences;
    }
    if (supplierValues.price) {
      document.querySelector('input[name="price"]').value = supplierValues.price;
    }
    if (supplierValues.lead_time_weeks) {
      document.querySelector('input[name="lead_time_weeks"]').value = supplierValues.lead_time_weeks;
    }
    setSelectedCertifications(supplierValues.certifications || []);
    
    // Fill select dropdowns - check if options are loaded first
    const selectIds = [
      { id: 'productSelect', value: supplierValues.product },
      { id: 'spinningCountrySelect', value: supplierValues.countrySpinning },
      { id: 'fabricCountrySelect', value: supplierValues.countryFabric },
      { id: 'dyeingCountrySelect', value: supplierValues.countryDyeing },
      { id: 'makingCountrySelect', value: supplierValues.countryMaking },
      { id: 'fabricProcessSelect', value: supplierValues.fabricProcess },
      { id: 'makingComplexitySelect', value: supplierValues.makingComplexity }
    ];
    
    let allSelectsReady = true;
    selectIds.forEach(({ id, value }) => {
      if (value) {
        const select = document.getElementById(id);
        if (select && select.options.length > 0) {
          select.value = value;
        } else {
          allSelectsReady = false;
        }
      }
    });
    
    // If all selects are ready, also restore materials
    if (allSelectsReady) {
      const materialsSection = document.getElementById('materialsSection');
      materialsSection.innerHTML = '';
      if (supplierValues.material_origin && Array.isArray(supplierValues.material_origin)) {
        fetchMaterialEnums(() => {
          supplierValues.material_origin.forEach(mat => {
            createMaterialRow(mat);
          });
          updateMatSharesSum();
        });
      }
      return true; // All values restored
    }
    return false; // Need to retry
  };
  
  // Retry restoring values until all selects are populated
  const tryRestoreValues = () => {
    const success = restoreFormValues();
    if (!success) {
      setTimeout(tryRestoreValues, 100);
    }
  };
  
  // Start trying to restore values after a short delay
  setTimeout(tryRestoreValues, 100);
}

// Material row button handler
document.getElementById('addFibreBtn').onclick = () => {
  if (materialsData.length === 0) {
    fetchMaterialEnums(()=>{ createMaterialRow(); updateMatSharesSum(); });
  } else {
    createMaterialRow(); updateMatSharesSum();
  }
};

// Form submission handler with duplicate prevention
let isSubmitting = false;
const form = document.getElementById('supplierForm');
if (form) {
  form.addEventListener('input', () => {
    isSupplierFormDirty = true;
  });
  // Remove any existing handlers to prevent duplicates
  form.onsubmit = null;
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    
    // Prevent duplicate submissions
    if (isSubmitting) {
      return false;
    }
    isSubmitting = true;
    
    const fd = new FormData(e.target);
    let obj = {};
    for (let [k, v] of fd.entries()) {
      if (k === 'material_origin') continue;
      else if (k.endsWith('width') || k.endsWith('weight') || k.endsWith('price') || k.endsWith('moq') || k.endsWith('numberOfReferences') || k.endsWith('fabric_lead_time_weeks') || k.endsWith('lead_time_weeks')) { obj[k] = parseFloat(v); }
      else { obj[k] = v; }
    }
    obj['material_origin'] = getMaterialOriginFromForm();
    obj['certifications'] = getSelectedCertifications();
    const totalShare = obj['material_origin'].reduce((acc, v) => acc + v.share, 0);
    if (totalShare > 1.0001 || obj['material_origin'].some(m => isNaN(m.share) || m.share < 0.01 || m.share > 1)) {
      document.getElementById('matOriginWarn').style.display = '';
      document.getElementById('matOriginWarn').innerText = 'Composition shares must add up to 100% and each fibre must be between 1% and 100%.';
      isSubmitting = false;
      return false;
    }
    const editIndex = e.target.dataset.editIndex;
    const isEdit = editIndex !== undefined && editIndex !== '';
    const url = isEdit ? `/api/suppliers/${editIndex}` : '/api/suppliers';
    const method = isEdit ? 'PUT' : 'POST';
    
    fetch(url, { method: method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(obj)}).then(resp => {
      isSubmitting = false; // Reset flag after request completes
      if (resp.ok) {
        document.getElementById('status').innerText = isEdit ? 'Supplier updated!' : 'Supplier saved!';
        // Reload suppliers list if it's visible
        if (suppliersSection.classList.contains('active')) {
          loadSuppliers();
        }
        // Refresh radar charts
        if (typeof refreshRadarCharts === 'function') {
          refreshRadarCharts();
        }
        setTimeout(() => {
          e.target.reset();
          e.target.dataset.editIndex = '';
          document.getElementById('materialsSection').innerHTML = '';
          document.getElementById('status').innerText = '';
          document.querySelector('.modal-content h2').textContent = 'Supplier information';
          resetSupplierFormState();
          setSelectedCertifications([]);
          modal.classList.remove('active');
        }, 1500);
      } else {
        resp.text().then(t => document.getElementById('status').innerText = 'Error: '+t);
      }
    }).catch(err => {
      isSubmitting = false; // Reset flag on error
      document.getElementById('status').innerText = 'Error: ' + err;
    });
    return false;
  });
}
