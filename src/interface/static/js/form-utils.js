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
let spinningData = [];

function fetchMaterialEnums(callback) {
  let done = 0;
  fetch('/api/enums/materials').then(r=>r.json()).then(arr => { materialsData = arr; checkReady(); });
  fetch('/api/enums/materialSpinning').then(r=>r.json()).then(arr => { spinningData = arr; checkReady(); });
  function checkReady() { done++; if(done===2 && callback) callback(); }
}

function createMaterialRow(rowData) {
  const row = document.createElement('div');
  row.className = 'material-row';
  const matSel = document.createElement('select');
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
  shareInput.min = 0.01;
  shareInput.max = 1;
  shareInput.step = 0.01;
  shareInput.value = rowData && rowData.share ? rowData.share : '';
  shareInput.placeholder = 'share (0-1)';
  row.appendChild(shareInput);
  const spinSel = document.createElement('select');
  for (const s of spinningData) {
    const opt = document.createElement('option');
    opt.value = s;
    opt.text = s;
    spinSel.appendChild(opt);
  }
  spinSel.value = rowData && rowData.spinning ? rowData.spinning : 'ConventionalSpinning';
  row.appendChild(spinSel);
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
    const [matSel, shareInput, spinSel] = row.querySelectorAll('select, input');
    const shareVal = parseFloat(shareInput.value);
    if (!matSel.value || isNaN(shareVal) || !spinSel.value) continue;
    out.push({ id: matSel.value, share: shareVal, spinning: spinSel.value });
  }
  return out;
}

function updateMatSharesSum() {
  const orig = getMaterialOriginFromForm();
  const totalShare = orig.reduce((acc,v) => acc+v.share,0);
  const warn = document.getElementById('matOriginWarn');
  if (warn) {
    warn.style.display = (totalShare > 1.0001) ? '' : 'none';
    warn.innerText = totalShare > 1.0001 ? 'Total share of all materials must not exceed 1 (currently '+totalShare.toFixed(2)+').' : '';
  }
  const addBtn = document.getElementById('addMaterialBtn');
  if (addBtn) {
    addBtn.disabled = totalShare >= 1.0;
  }
}

function loadEnums() {
  fillSelect('productSelect', '/api/enums/products');
  fillSelect('spinningCountrySelect', '/api/enums/countries');
  fillSelect('fabricCountrySelect', '/api/enums/countries');
  fillSelect('dyeingCountrySelect', '/api/enums/countries');
  fillSelect('makingCountrySelect', '/api/enums/countries');
  fillSelect('fabricProcessSelect', '/api/enums/fabricProcess');
  fillSelect('makingComplexitySelect', '/api/enums/makingComplexity');
  fillSelect('dyeingProcessSelect', '/api/enums/dyeingProcess');
  fillSelect('businessSizeSelect', '/api/enums/businessSize');
  fetchMaterialEnums(()=>{});
}

