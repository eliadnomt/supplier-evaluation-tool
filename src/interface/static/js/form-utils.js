// Shared form utilities for supplier forms

function fillSelect(id, url, nameAttr=false, defaultValue=null, preserveValue=null) {
  fetch(url).then(r=>r.json()).then(arr => {
    const s = document.getElementById(id);
    if (!s) return;
    
    // Store current value if we need to preserve it
    const currentValue = preserveValue !== null ? preserveValue : (s.value || null);
    
    s.innerHTML = '';
    
    // If we have a current value that's not in the filtered list, add it first
    if (currentValue && !arr.some(v => {
      const val = typeof(v)==='object' ? (v.id || v.name || JSON.stringify(v)) : v;
      return val === currentValue;
    })) {
      const opt = document.createElement('option');
      opt.value = currentValue;
      opt.text = currentValue;
      s.appendChild(opt);
    }
    
    for (const v of arr) {
      let val = v;
      if (typeof(v)==='object') val = v.id || v.name || JSON.stringify(v);
      let label = val;
      if (typeof(v)==='object' && v.name) label = v.name;
      let opt = document.createElement('option');
      opt.value = val;
      opt.text = label;
      if(nameAttr && v.name) opt.text = v.name;
      s.appendChild(opt);
    }
    
    // Set value: prefer defaultValue, then preserved current value, then first option
    if (defaultValue !== null && s.querySelector(`option[value="${defaultValue}"]`)) {
      s.value = defaultValue;
    } else if (currentValue && s.querySelector(`option[value="${currentValue}"]`)) {
      s.value = currentValue;
    } else if (s.options.length > 0) {
      s.value = s.options[0].value;
    }
  });
}

let materialsData = [];
let countriesData = [];
let materialRowDefaults = { id: null, share: null, country: null }; // Defaults for new material rows
const MAKING_COMPLEXITY_OPTIONS = [
  { value: 'very-low', label: 'Very Low (<5 min)' },
  { value: 'low', label: 'Low (5–15 min)' },
  { value: 'medium', label: 'Medium (15–30 min)' },
  { value: 'high', label: 'High (30–60 min)' },
  { value: 'very-high', label: 'Very High (>60 min)' }
];

function fillMakingComplexitySelect(id, defaultValue=null) {
  const select = document.getElementById(id);
  if (!select) return;
  select.innerHTML = '';
  MAKING_COMPLEXITY_OPTIONS.forEach(opt => {
    const optionEl = document.createElement('option');
    optionEl.value = opt.value;
    optionEl.text = opt.label;
    select.appendChild(optionEl);
  });
  // Set default value if provided and exists in options
  if (defaultValue !== null && select.querySelector(`option[value="${defaultValue}"]`)) {
    select.value = defaultValue;
  }
}

function fetchMaterialEnums(callback) {
  let completed = 0;
  const finish = () => {
    completed += 1;
    if (completed === 2 && typeof callback === 'function') {
      callback();
    }
  };
  fetch('/api/enums/materials')
    .then(r=>r.json())
    .then(arr => { materialsData = arr || []; })
    .catch(() => { materialsData = []; })
    .finally(finish);

  fetch('/api/enums/countries')
    .then(r=>r.json())
    .then(arr => { countriesData = arr || []; })
    .catch(() => { countriesData = []; })
    .finally(finish);
}

function createMaterialRow(rowData) {
  // Use provided rowData, or fall back to defaults, or use empty values
  const data = rowData || {};
  const materialId = data.id || materialRowDefaults.id || null;
  const share = data.share || materialRowDefaults.share || null;
  const country = data.country || materialRowDefaults.country || null;
  
  const row = document.createElement('div');
  row.className = 'material-row';
  const matSel = document.createElement('select');
  matSel.dataset.type = 'material';
  for (const m of materialsData) {
    let val = (typeof m === 'object' ? m.id || m.name || JSON.stringify(m) : m);
    let label = (typeof m === 'object' && m.name) ? m.name : val;
    let opt = document.createElement('option');
    opt.value = val;
    opt.text = label;
    matSel.appendChild(opt);
  }
  // Set material: use provided value, or default, or first option
  if (materialId && matSel.querySelector(`option[value="${materialId}"]`)) {
    matSel.value = materialId;
  } else {
    matSel.value = matSel.options[0]?.value || '';
  }
  row.appendChild(matSel);
  const shareInput = document.createElement('input');
  shareInput.type = 'number';
  shareInput.min = 1;
  shareInput.max = 100;
  shareInput.step = 1;
  shareInput.value = share !== null ? (share * 100) : '';
  shareInput.placeholder = 'Share (%)';
  row.appendChild(shareInput);

  const countrySel = document.createElement('select');
  countrySel.dataset.type = 'country';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.text = 'Origin';
  countrySel.appendChild(placeholder);
  for (const c of countriesData) {
    let val = c;
    let label = c;
    if (typeof c === 'object') {
      val = c.code || c.id || c.name || JSON.stringify(c);
      label = c.name || c.code || val;
    }
    const opt = document.createElement('option');
    opt.value = val;
    opt.text = label;
    countrySel.appendChild(opt);
  }
  // Set country: use provided value, or default, or leave empty
  if (country && countrySel.querySelector(`option[value="${country}"]`)) {
    countrySel.value = country;
  }
  row.appendChild(countrySel);
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.innerText = 'Remove';
  removeBtn.className = 'remove-btn';
  removeBtn.onclick = function() {
    row.remove();
    updateMatSharesSum();
  };
  row.appendChild(removeBtn);
  const materialsSection = document.getElementById('materialsSection');
  if (materialsSection) {
    materialsSection.appendChild(row);
    shareInput.oninput = updateMatSharesSum;
  }
}

function getMaterialOriginFromForm() {
  const rows = document.querySelectorAll('.material-row');
  let out = [];
  for (const row of rows) {
    const matSel = row.querySelector('select[data-type="material"]');
    const countrySel = row.querySelector('select[data-type="country"]');
    const shareInput = row.querySelector('input');
    const shareVal = parseFloat(shareInput ? shareInput.value : '');
    if (!matSel || !matSel.value || isNaN(shareVal)) continue;
    const entry = {
      id: matSel.value,
      share: shareVal / 100
    };
    if (countrySel && countrySel.value) {
      entry.country = countrySel.value;
    }
    out.push(entry);
  }
  return out;
}

function updateMatSharesSum() {
  const orig = getMaterialOriginFromForm();
  const totalSharePercent = orig.reduce((acc,v) => acc + (v.share * 100), 0);
  const warn = document.getElementById('matOriginWarn');
  if (warn) {
    warn.style.display = (totalSharePercent > 100.0001) ? '' : 'none';
    warn.innerText = totalSharePercent > 100.0001 ? 'Total composition must not exceed 100% (currently '+totalSharePercent.toFixed(0)+'%).' : '';
  }
  const addBtn = document.getElementById('addFibreBtn');
  if (addBtn) {
    addBtn.disabled = totalSharePercent >= 100;
  }
}

function setMaterialRowDefaults(defaults) {
  // Set defaults for new material rows
  // Usage: setMaterialRowDefaults({ id: 'ei-coton-organic', share: 0.5, country: 'FR' })
  if (defaults.id !== undefined) materialRowDefaults.id = defaults.id;
  if (defaults.share !== undefined) materialRowDefaults.share = defaults.share;
  if (defaults.country !== undefined) materialRowDefaults.country = defaults.country;
}

function loadEnums(defaults={}) {
  // Usage: Pass defaults object like { 
  //   productSelect: 'chemise', 
  //   makingComplexitySelect: 'medium',
  //   preserveProduct: 'existing-product', // Preserve this value even if not in filtered list
  //   materialRowDefaults: { id: 'ei-coton-organic', share: 0.5, country: 'FR' }
  // }
  fillSelect('productSelect', '/api/enums/products', false, defaults.productSelect, defaults.preserveProduct);
  fillSelect('spinningCountrySelect', '/api/enums/countries', false, defaults.spinningCountrySelect);
  fillSelect('fabricCountrySelect', '/api/enums/countries', false, defaults.fabricCountrySelect);
  fillSelect('dyeingCountrySelect', '/api/enums/countries', false, defaults.dyeingCountrySelect);
  fillSelect('makingCountrySelect', '/api/enums/countries', false, defaults.makingCountrySelect);
  fillSelect('fabricProcessSelect', '/api/enums/fabricProcess', false, defaults.fabricProcessSelect);
  fillMakingComplexitySelect('makingComplexitySelect', defaults.makingComplexitySelect);
  
  // Set material row defaults if provided
  if (defaults.materialRowDefaults) {
    setMaterialRowDefaults(defaults.materialRowDefaults);
  }
  
  fetchMaterialEnums(()=>{});
}

