// Supplier form page JavaScript

document.getElementById('addMaterialBtn').onclick = () => {
  // Ensure enums are loaded, then add a row
  if (materialsData.length === 0 || spinningData.length === 0) {
    fetchMaterialEnums(()=>{ createMaterialRow(); updateMatSharesSum(); });
  } else {
    createMaterialRow(); updateMatSharesSum();
  }
};

window.onload = () => {
  fillSelect('spinningCountrySelect', '/api/enums/countries');
  fillSelect('fabricCountrySelect', '/api/enums/countries');
  fillSelect('dyeingCountrySelect', '/api/enums/countries');
  fillSelect('makingCountrySelect', '/api/enums/countries');
  fillSelect('fabricProcessSelect', '/api/enums/fabricProcess');
  fillSelect('makingComplexitySelect', '/api/enums/makingComplexity');
  fillSelect('dyeingProcessSelect', '/api/enums/dyeingProcess');
  fillSelect('businessSizeSelect', '/api/enums/businessSize');
  // Preload materials/spinning in background, but don't auto add row
  fetchMaterialEnums(()=>{});
};

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
  fetch('/api/suppliers', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(obj)}).then(resp => {
    if (resp.ok) {
      document.getElementById('status').innerText = 'Supplier saved!';
      e.target.reset();
      document.getElementById('materialsSection').innerHTML = '';
      // Keep enums cached; do not add default row
    } else resp.text().then(t => document.getElementById('status').innerText = 'Error: '+t);
  });
};

