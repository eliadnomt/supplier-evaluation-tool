// Dashboard-specific JavaScript

// Modal control
const modal = document.getElementById('addSupplierModal');
const addBtn = document.getElementById('addSupplierBtn');
const closeBtn = document.getElementById('closeModal');
const viewBtn = document.getElementById('viewSuppliersBtn');
const ecobalyseBtn = document.getElementById('ecobalyseBtn');
const ecobalyseModal = document.getElementById('ecobalyseModal');
const closeEcobalyseBtn = document.getElementById('closeEcobalyseModal');
const suppliersSection = document.getElementById('suppliersSection');
const suppliersList = document.getElementById('suppliersList');

addBtn.onclick = () => {
  // Reset form and remove edit mode
  document.getElementById('supplierForm').reset();
  document.getElementById('supplierForm').dataset.editIndex = '';
  document.getElementById('materialsSection').innerHTML = '';
  document.querySelector('.modal-content h2').textContent = 'Enter Supplier Information';
  document.getElementById('status').innerText = '';
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

function loadSuppliers() {
  suppliersList.innerHTML = '<div class="suppliers-loading">Loading suppliers...</div>';
  fetch('/api/suppliers/all').then(r=>r.json()).then(suppliers => {
    if (!suppliers || suppliers.length === 0) {
      suppliersList.innerHTML = '<div class="suppliers-empty">No suppliers found. Add a supplier to get started.</div>';
      return;
    }
    renderSuppliers(suppliers);
  }).catch(err => {
    suppliersList.innerHTML = '<div class="suppliers-empty">Error loading suppliers: ' + err + '</div>';
  });
}

function renderSuppliers(suppliers) {
  suppliersList.innerHTML = '';
  suppliers.forEach((supplier, index) => {
    const item = document.createElement('div');
    item.className = 'supplier-item';
    
    const header = document.createElement('div');
    header.className = 'supplier-item-header';
    header.textContent = supplier.supplier || 'Unnamed Supplier';
    item.appendChild(header);
    
    const details = document.createElement('div');
    details.className = 'supplier-details';
    
    const fields = [
      { label: 'Price €/m', value: supplier.price_eur_per_m },
      { label: 'MOQ (m)', value: supplier.moq_m },
      { label: 'Lead Time (weeks)', value: supplier.lead_time_weeks },
      { label: 'Weight (g/m²)', value: supplier.weight_gm2 },
      { label: 'Gross Width (cm)', value: supplier.gross_width },
      { label: 'Price per Article (€)', value: supplier.price },
      { label: 'Number of Articles', value: supplier.numberOfReferences },
      { label: 'Stock Service', value: supplier.stock_service ? 'Yes' : 'No' }
    ];
    
    fields.forEach(field => {
      if (field.value !== undefined && field.value !== null && field.value !== '') {
        const detail = document.createElement('div');
        detail.className = 'supplier-detail';
        const label = document.createElement('span');
        label.className = 'supplier-detail-label';
        label.textContent = field.label + ':';
        const value = document.createElement('span');
        value.className = 'supplier-detail-value';
        value.textContent = typeof field.value === 'number' ? field.value.toLocaleString() : field.value;
        detail.appendChild(label);
        detail.appendChild(value);
        details.appendChild(detail);
      }
    });
    
    item.appendChild(details);
    
    // Add edit/delete buttons
    const actions = document.createElement('div');
    actions.className = 'supplier-actions';
    const editBtn = document.createElement('button');
    editBtn.className = 'supplier-btn supplier-btn-edit';
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => editSupplier(index, supplier);
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'supplier-btn supplier-btn-delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = () => deleteSupplier(index, supplier.supplier);
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
  
  // Pre-fill form with supplier data
  document.querySelector('input[name="supplier"]').value = supplier.supplier || '';
  if (supplier.businessSize) {
    document.getElementById('businessSizeSelect').value = supplier.businessSize;
  }
  
  // Fill country selects
  if (supplier.countrySpinning) document.getElementById('spinningCountrySelect').value = supplier.countrySpinning;
  if (supplier.countryFabric) document.getElementById('fabricCountrySelect').value = supplier.countryFabric;
  if (supplier.countryDyeing) document.getElementById('dyeingCountrySelect').value = supplier.countryDyeing;
  if (supplier.countryMaking) document.getElementById('makingCountrySelect').value = supplier.countryMaking;
  
  // Fill production specs
  if (supplier.fabricProcess) document.getElementById('fabricProcessSelect').value = supplier.fabricProcess;
  if (supplier.dyeingProcess) document.getElementById('dyeingProcessSelect').value = supplier.dyeingProcess;
  if (supplier.makingComplexity) document.getElementById('makingComplexitySelect').value = supplier.makingComplexity;
  if (supplier.gross_width) document.querySelector('input[name="gross_width"]').value = supplier.gross_width;
  if (supplier.weight_gm2) document.querySelector('input[name="weight_gm2"]').value = supplier.weight_gm2;
  if (supplier.price_eur_per_m) document.querySelector('input[name="price_eur_per_m"]').value = supplier.price_eur_per_m;
  if (supplier.moq_m) document.querySelector('input[name="moq_m"]').value = supplier.moq_m;
  if (supplier.numberOfReferences) document.querySelector('input[name="numberOfReferences"]').value = supplier.numberOfReferences;
  if (supplier.price) document.querySelector('input[name="price"]').value = supplier.price;
  
  // Update modal title
  document.querySelector('.modal-content h2').textContent = 'Edit Supplier Information';
  
  // Open modal
  modal.classList.add('active');
  loadEnums();
  
  // Fill material_origin after materials data loads
  const materialsSection = document.getElementById('materialsSection');
  materialsSection.innerHTML = '';
  if (supplier.material_origin && Array.isArray(supplier.material_origin)) {
    fetchMaterialEnums(() => {
      supplier.material_origin.forEach(mat => {
        createMaterialRow(mat);
      });
      updateMatSharesSum();
    });
  }
}

// Material row button handler
document.getElementById('addMaterialBtn').onclick = () => {
  if (materialsData.length === 0 || spinningData.length === 0) {
    fetchMaterialEnums(()=>{ createMaterialRow(); updateMatSharesSum(); });
  } else {
    createMaterialRow(); updateMatSharesSum();
  }
};

// Form submission handler
document.getElementById('supplierForm').onsubmit = function(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  let obj = {};
  for (let [k, v] of fd.entries()) {
    if (k === 'material_origin') continue;
    else if (k.endsWith('width') || k.endsWith('weight') || k.endsWith('price') || k.endsWith('moq') || k.endsWith('numberOfReferences')) { obj[k] = parseFloat(v); }
    else { obj[k] = v; }
  }
  obj['material_origin'] = getMaterialOriginFromForm();
  const totalShare = obj['material_origin'].reduce((acc, v) => acc + v.share, 0);
  if (totalShare > 1.0001 || obj['material_origin'].some(m => isNaN(m.share) || m.share < 0.01 || m.share > 1)) {
    document.getElementById('matOriginWarn').style.display = '';
    document.getElementById('matOriginWarn').innerText = 'Material shares total must not exceed 1 and all shares must be between 0.01 and 1.';
    return;
  }
  const editIndex = e.target.dataset.editIndex;
  const isEdit = editIndex !== undefined && editIndex !== '';
  const url = isEdit ? `/api/suppliers/${editIndex}` : '/api/suppliers';
  const method = isEdit ? 'PUT' : 'POST';
  
  fetch(url, { method: method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(obj)}).then(resp => {
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
    } else resp.text().then(t => document.getElementById('status').innerText = 'Error: '+t);
  });
};

