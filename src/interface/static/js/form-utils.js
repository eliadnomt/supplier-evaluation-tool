// Shared form utilities for supplier forms

function fillSelect(id, url, nameAttr=false) {
  fetch(url).then(r=>r.json()).then(arr => {
    const s = document.getElementById(id);
    if (!s) return;
    s.innerHTML = '';
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
  });
}

let materialsData = [];
let countriesData = [];
const MAKING_COMPLEXITY_OPTIONS = [
  { value: 'very-low', label: 'Very Low (<5 min)' },
  { value: 'low', label: 'Low (5–15 min)' },
  { value: 'medium', label: 'Medium (15–30 min)' },
  { value: 'high', label: 'High (30–60 min)' },
  { value: 'very-high', label: 'Very High (>60 min)' }
];

function fillMakingComplexitySelect(id) {
  const select = document.getElementById(id);
  if (!select) return;
  select.innerHTML = '';
  MAKING_COMPLEXITY_OPTIONS.forEach(opt => {
    const optionEl = document.createElement('option');
    optionEl.value = opt.value;
    optionEl.text = opt.label;
    select.appendChild(optionEl);
  });
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
  matSel.value = rowData && rowData.id ? rowData.id : (matSel.options[0]?.value || '');
  row.appendChild(matSel);
  const shareInput = document.createElement('input');
  shareInput.type = 'number';
  shareInput.min = 1;
  shareInput.max = 100;
  shareInput.step = 1;
  shareInput.value = rowData && rowData.share ? rowData.share * 100 : '';
  shareInput.placeholder = 'share (%)';
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
  if (rowData && rowData.country) {
    countrySel.value = rowData.country;
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

function loadEnums() {
  fillSelect('productSelect', '/api/enums/products');
  fillSelect('spinningCountrySelect', '/api/enums/countries');
  fillSelect('fabricCountrySelect', '/api/enums/countries');
  fillSelect('dyeingCountrySelect', '/api/enums/countries');
  fillSelect('makingCountrySelect', '/api/enums/countries');
  fillSelect('fabricProcessSelect', '/api/enums/fabricProcess');
  fillMakingComplexitySelect('makingComplexitySelect');
  fetchMaterialEnums(()=>{});
}

