// Dashboard-specific JavaScript

// Modal control
const modal = document.getElementById('addSupplierModal');
const addBtn = document.getElementById('addSupplierBtn');
const closeBtn = document.getElementById('closeModal');
const viewBtn = document.getElementById('viewSuppliersBtn');
const ecobalyseBtn = document.getElementById('ecobalyseBtn');
const ecobalyseModal = document.getElementById('ecobalyseModal');
const closeEcobalyseBtn = document.getElementById('closeEcobalyseModal');
const howToReadBtn = document.getElementById('howToReadBtn');
const chartReadingSection = document.getElementById('chartReadingSection');
const suppliersSection = document.getElementById('suppliersSection');
const suppliersList = document.getElementById('suppliersList');

addBtn.onclick = () => {
  // Reset form and remove edit mode
  document.getElementById('supplierForm').reset();
  document.getElementById('supplierForm').dataset.editIndex = '';
  document.getElementById('materialsSection').innerHTML = '';
  document.querySelector('.modal-content h2').textContent = 'Enter Supplier Information';
  document.getElementById('status').innerText = '';
  // Reset material validation state
  const addMaterialBtn = document.getElementById('addMaterialBtn');
  if (addMaterialBtn) {
    addMaterialBtn.disabled = false;
  }
  const matOriginWarn = document.getElementById('matOriginWarn');
  if (matOriginWarn) {
    matOriginWarn.style.display = 'none';
    matOriginWarn.innerText = '';
  }
  modal.classList.add('active');
  loadEnums();
};

closeBtn.onclick = () => {
  modal.classList.remove('active');
};

modal.onclick = (e) => {
  if (e.target === modal) {
    modal.classList.remove('active');
  }
};

ecobalyseBtn.onclick = () => {
  ecobalyseModal.classList.add('active');
};

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

howToReadBtn.onclick = () => {
  if (chartReadingSection.style.display === 'none') {
    chartReadingSection.style.display = 'block';
  } else {
    chartReadingSection.style.display = 'none';
  }
};

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

function renderSuppliers(suppliers) {
  suppliersList.innerHTML = '';
  
  // Sort suppliers alphabetically by name
  const sortedSuppliers = [...suppliers].sort((a, b) => {
    const nameA = (a.supplier || '').toLowerCase();
    const nameB = (b.supplier || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });
  
  sortedSuppliers.forEach((supplier, originalIndex) => {
    // Find original index for edit/delete operations
    const index = suppliers.findIndex(s => s === supplier);
    const actualIndex = index >= 0 ? index : originalIndex;
    const item = document.createElement('div');
    item.className = 'supplier-item';
    
    const header = document.createElement('div');
    header.className = 'supplier-item-header';
    header.textContent = supplier.supplier || 'Unnamed Supplier';
    item.appendChild(header);
    
    const details = document.createElement('div');
    details.className = 'supplier-details';
    
    // Calculate traceability count (number of known production steps)
    const traceabilityCount = calculateTraceabilityCount(supplier);
    
    // Separate Ecobalyse and Traceability fields (always shown, on their own row)
    const highlightFields = [
      { label: `Ecobalyse Score (${getProductTypeDisplay(supplier.product)})`, value: supplier.ecobalyse_score != null ? supplier.ecobalyse_score.toFixed(2) : 'N/A', isHighlight: true },
      { label: 'Traceability Fields', value: `${traceabilityCount}/5`, isHighlight: true }
    ];
    
    // Other fields
    const otherFields = [
      { label: 'Price €/m', value: supplier.price_eur_per_m },
      { label: 'MOQ (m)', value: supplier.moq_m },
      { label: 'Lead Time (weeks)', value: supplier.lead_time_weeks },
      { label: 'Weight (g/m²)', value: supplier.weight_gm2 },
      { label: 'Gross Width (cm)', value: supplier.gross_width },
      { label: 'Price per Article (€)', value: supplier.price },
      { label: 'Number of Articles', value: supplier.numberOfReferences }
    ];
    
    // Render highlight fields first (on their own row)
    const highlightRow = document.createElement('div');
    highlightRow.className = 'supplier-details-highlight';
    highlightFields.forEach(field => {
      const detail = document.createElement('div');
      detail.className = 'supplier-detail supplier-detail-highlight';
      const label = document.createElement('span');
      label.className = 'supplier-detail-label supplier-detail-label-bold';
      label.textContent = field.label + ':';
      const value = document.createElement('span');
      value.className = 'supplier-detail-value';
      value.textContent = typeof field.value === 'number' ? field.value.toLocaleString() : (field.value || 'N/A');
      detail.appendChild(label);
      detail.appendChild(value);
      highlightRow.appendChild(detail);
    });
    details.appendChild(highlightRow);
    
    // Render other fields in a grid container
    const otherFieldsContainer = document.createElement('div');
    otherFieldsContainer.className = 'supplier-details-regular';
    otherFields.forEach(field => {
      // Show field if it has a value (including 0)
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
    
    item.appendChild(details);
    
    // Add edit/delete buttons
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
    item.appendChild(actions);
    
    suppliersList.appendChild(item);
  });
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
    price_eur_per_m: supplier.price_eur_per_m,
    moq_m: supplier.moq_m,
    numberOfReferences: supplier.numberOfReferences,
    price: supplier.price,
    lead_time_weeks: supplier.lead_time_weeks,
    material_origin: supplier.material_origin
  };
  
  // Update modal title
  document.querySelector('.modal-content h2').textContent = 'Edit Supplier Information';
  
  // Open modal
  modal.classList.add('active');
  
  // Load enums first (this will clear all selects)
  loadEnums();
  
  // Function to restore all form values after enums are loaded
  const restoreFormValues = () => {
    // Fill text inputs immediately (they don't get cleared)
    if (supplierValues.supplier) {
      document.querySelector('input[name="supplier"]').value = supplierValues.supplier;
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
    if (supplierValues.numberOfReferences) {
      document.querySelector('input[name="numberOfReferences"]').value = supplierValues.numberOfReferences;
    }
    if (supplierValues.price) {
      document.querySelector('input[name="price"]').value = supplierValues.price;
    }
    if (supplierValues.lead_time_weeks) {
      document.querySelector('input[name="lead_time_weeks"]').value = supplierValues.lead_time_weeks;
    }
    
    // Fill select dropdowns - check if options are loaded first
    const selectIds = [
      { id: 'productSelect', value: supplierValues.product },
      { id: 'businessSizeSelect', value: supplierValues.businessSize },
      { id: 'spinningCountrySelect', value: supplierValues.countrySpinning },
      { id: 'fabricCountrySelect', value: supplierValues.countryFabric },
      { id: 'dyeingCountrySelect', value: supplierValues.countryDyeing },
      { id: 'makingCountrySelect', value: supplierValues.countryMaking },
      { id: 'fabricProcessSelect', value: supplierValues.fabricProcess },
      { id: 'dyeingProcessSelect', value: supplierValues.dyeingProcess },
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
document.getElementById('addMaterialBtn').onclick = () => {
  if (materialsData.length === 0 || spinningData.length === 0) {
    fetchMaterialEnums(()=>{ createMaterialRow(); updateMatSharesSum(); });
  } else {
    createMaterialRow(); updateMatSharesSum();
  }
};

// Form submission handler with duplicate prevention
let isSubmitting = false;
const form = document.getElementById('supplierForm');
if (form) {
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
      else if (k.endsWith('width') || k.endsWith('weight') || k.endsWith('price') || k.endsWith('moq') || k.endsWith('numberOfReferences') || k.endsWith('lead_time_weeks')) { obj[k] = parseFloat(v); }
      else { obj[k] = v; }
    }
    obj['material_origin'] = getMaterialOriginFromForm();
    const totalShare = obj['material_origin'].reduce((acc, v) => acc + v.share, 0);
    if (totalShare > 1.0001 || obj['material_origin'].some(m => isNaN(m.share) || m.share < 0.01 || m.share > 1)) {
      document.getElementById('matOriginWarn').style.display = '';
      document.getElementById('matOriginWarn').innerText = 'Material shares total must not exceed 1 and all shares must be between 0.01 and 1.';
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
          document.querySelector('.modal-content h2').textContent = 'Enter Supplier Information';
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

