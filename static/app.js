let figures = [];
let history = [];
let selectedIndex = 0;
let currentFactor = 1;
let comparisonRevision = 0;
let stage;

const visualPanel = document.querySelector('#visual-panel');
const figureList = document.querySelector('#figure-list');
const figureSelects = ['#figure-select', '#calculator-select', '#scale-select'].map((selector) => document.querySelector(selector));
const figureSymbols = { Cubo: '⬡', Esfera: '◉', Cilindro: '▤' };
const numberFormat = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatNumber(value) {
  return numberFormat.format(value);
}

function formatDimensions(dimensions) {
  return Object.entries(dimensions).map(([name, value]) => `${name} ${formatNumber(value)} u`).join(' · ');
}

function setMessage(element, message = '') {
  element.textContent = message;
}

async function requestJson(path, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.');
  return data;
}

async function postJson(path, data) {
  return requestJson(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

function switchView(name) {
  document.querySelectorAll('.view').forEach((view) => {
    view.hidden = view.dataset.view !== name;
    view.classList.toggle('active', !view.hidden);
  });
  document.querySelectorAll('.nav-link').forEach((button) => {
    const active = button.dataset.viewTarget === name;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  const slot = document.querySelector(`#${name}-stage-slot`) || document.querySelector('#home-stage-slot');
  slot.append(visualPanel);
  stage?.resize();
  document.querySelector('#sidebar').classList.remove('open');
  document.querySelector('#mobile-nav-toggle').setAttribute('aria-expanded', 'false');
  document.querySelector('.main-content').scrollTo({ top: 0, behavior: 'smooth' });
}

function renderFigureSelectors() {
  for (const select of figureSelects) {
    select.replaceChildren();
    if (!figures.length) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No hay figuras en la colección';
      select.append(option);
      select.disabled = true;
      continue;
    }
    select.disabled = false;
    figures.forEach((figure, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `${figure.nombre} · ${formatDimensions(figure.dimensiones)}`;
      option.selected = index === selectedIndex;
      select.append(option);
    });
  }
}

function renderFigureList() {
  figureList.replaceChildren();
  document.querySelector('#figure-count').textContent = String(figures.length);
  document.querySelector('#figure-list-empty').hidden = figures.length > 0;
  figures.forEach((figure, index) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.className = `figure-choice${index === selectedIndex ? ' active' : ''}`;
    button.type = 'button';
    button.setAttribute('aria-pressed', String(index === selectedIndex));
    const icon = document.createElement('span');
    icon.className = 'figure-choice-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = figureSymbols[figure.tipo];
    const text = document.createElement('span');
    const name = document.createElement('b');
    name.textContent = figure.nombre;
    const dimensions = document.createElement('small');
    dimensions.textContent = formatDimensions(figure.dimensiones);
    text.append(name, dimensions);
    const arrow = document.createElement('span');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '›';
    button.append(icon, text, arrow);
    button.addEventListener('click', () => selectFigure(index));
    item.append(button);
    figureList.append(item);
  });
  document.querySelector('#metric-figures').textContent = String(figures.length);
  renderFigureSelectors();
}

function selectFigure(index) {
  if (!Number.isInteger(index) || index < 0 || index >= figures.length) return;
  selectedIndex = index;
  renderFigureList();
  updateStage();
  updateScaleComparison();
}

function updateStage() {
  const figure = figures[selectedIndex];
  const title = document.querySelector('#stage-title');
  const description = document.querySelector('#stage-dimensions');
  const factor = document.querySelector('#stage-factor');
  if (!figure) {
    title.textContent = 'Sin figura seleccionada';
    description.textContent = 'Agrega un sólido para mostrarlo en 3D.';
    stage?.setFigure(null, currentFactor);
    return;
  }
  title.textContent = figure.nombre;
  description.textContent = formatDimensions(figure.dimensiones);
  factor.textContent = `× ${formatNumber(currentFactor)}`;
  stage?.setFigure(figure, currentFactor);
}

async function loadFigures() {
  const data = await requestJson('/api/figuras');
  figures = data.figuras;
  if (selectedIndex >= figures.length) selectedIndex = figures.length - 1;
  if (figures.length && selectedIndex < 0) selectedIndex = 0;
  renderFigureList();
  updateStage();
  await updateScaleComparison();
}

function createResultMarkup(result, scaled = true) {
  const area = scaled ? result.area_escalada : result.area_original;
  const volume = scaled ? result.volumen_escalado : result.volumen_original;
  const factorText = scaled ? `Factor × ${formatNumber(result.factor)}` : 'Dimensiones originales';
  return `<div><span>ÁREA SUPERFICIAL</span><strong>${formatNumber(area)} u²</strong></div><div><span>VOLUMEN</span><strong>${formatNumber(volume)} u³</strong></div><div><span>${factorText}</span><strong>${result.nombre}</strong></div><div><span>DIMENSIONES</span><strong>${formatDimensions(result.dimensiones)}</strong></div>`;
}

function renderCalculatorResult(result) {
  const target = document.querySelector('#calculator-result');
  target.replaceChildren();
  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'RESULTADO CALCULADO EN PYTHON';
  const title = document.createElement('h3');
  title.textContent = result.nombre;
  const dimensions = document.createElement('p');
  dimensions.textContent = formatDimensions(result.dimensiones);
  const values = document.createElement('div');
  values.className = 'result-pair';
  values.innerHTML = `<div><span>Área superficial</span><strong>${formatNumber(result.area_escalada)} u²</strong><small>factor × ${formatNumber(result.factor)}</small></div><div><span>Volumen</span><strong>${formatNumber(result.volumen_escalado)} u³</strong><small>factor × ${formatNumber(result.factor)}</small></div>`;
  target.append(eyebrow, title, dimensions, values);
}

function renderFigureResult(result, form) {
  const output = document.querySelector('#figure-result');
  output.innerHTML = createResultMarkup(result);
  output.hidden = false;
  const feedback = form.querySelector('.form-feedback');
  feedback.textContent = `${result.nombre} agregado a la colección.`;
}

async function calculateFigure(index, factor = 1) {
  const data = await postJson('/api/calcular', { indice: index, factor });
  await loadHistory();
  return data.resultado;
}

async function loadHistory() {
  const data = await requestJson('/api/historial');
  history = data.historial;
  renderHistory();
}

function renderHistory() {
  const body = document.querySelector('#history-body');
  body.replaceChildren();
  document.querySelector('#history-empty').hidden = history.length > 0;
  document.querySelector('#nav-history-count').textContent = String(history.length);
  document.querySelector('#metric-calculations').textContent = String(history.length);
  const rows = history.slice(0, 6);
  document.querySelector('#home-history-empty').hidden = rows.length > 0;
  const homeBody = document.querySelector('#home-history-body');
  homeBody.replaceChildren();
  for (const [index, item] of history.entries()) {
    const row = document.createElement('tr');
    const values = [new Date(item.fecha).toLocaleString('es-ES'), item.tipo, formatDimensions(item.dimensiones), `× ${formatNumber(item.factor)}`, `${formatNumber(item.area_superficial)} u²`, `${formatNumber(item.volumen)} u³`];
    for (const value of values) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    }
    body.append(row);
    if (index < 6) {
      const homeRow = document.createElement('tr');
      for (const value of [item.tipo, formatDimensions(item.dimensiones), `${formatNumber(item.area_superficial)} u²`, `${formatNumber(item.volumen)} u³`, `× ${formatNumber(item.factor)}`]) {
        const cell = document.createElement('td');
        cell.textContent = value;
        homeRow.append(cell);
      }
      homeBody.append(homeRow);
    }
  }
}

function readFactor() {
  const value = Number(document.querySelector('#scale-number').value);
  if (!Number.isFinite(value) || value <= 0) throw new Error('El factor debe ser un número mayor que cero.');
  return value;
}

function setFactor(value) {
  currentFactor = Number(value);
  document.querySelector('#scale-range').value = String(Math.min(3, Math.max(.1, currentFactor)));
  document.querySelector('#scale-number').value = String(currentFactor);
  document.querySelector('#scale-value').textContent = `× ${formatNumber(currentFactor)}`;
  document.querySelector('#scale-tag').textContent = `× ${formatNumber(currentFactor)}`;
  document.querySelector('#metric-factor').textContent = `× ${formatNumber(currentFactor)}`;
  document.querySelectorAll('[data-scale-preset]').forEach((button) => button.classList.toggle('selected', Number(button.dataset.scalePreset) === currentFactor));
  updateStage();
}

async function updateScaleComparison() {
  const revision = ++comparisonRevision;
  const figure = figures[selectedIndex];
  const fields = ['#scale-figure-name', '#dimensions-original', '#dimensions-scaled', '#area-original', '#area-scaled', '#volume-original', '#volume-scaled'];
  if (!figure) {
    document.querySelector('#scale-figure-name').textContent = 'Selecciona una figura';
    for (const selector of fields.slice(1)) document.querySelector(selector).textContent = '—';
    return;
  }
  try {
    const data = await requestJson(`/api/resultados?factor=${encodeURIComponent(currentFactor)}`);
    if (revision !== comparisonRevision) return;
    const result = data.resultados[selectedIndex];
    if (!result) return;
    document.querySelector('#scale-figure-name').textContent = result.nombre;
    document.querySelector('#dimensions-original').textContent = formatDimensions(result.dimensiones);
    document.querySelector('#dimensions-scaled').textContent = formatDimensions(result.dimensiones_escaladas);
    document.querySelector('#area-original').textContent = `${formatNumber(result.area_original)} u²`;
    document.querySelector('#area-scaled').textContent = `${formatNumber(result.area_escalada)} u²`;
    document.querySelector('#volume-original').textContent = `${formatNumber(result.volumen_original)} u³`;
    document.querySelector('#volume-scaled').textContent = `${formatNumber(result.volumen_escalado)} u³`;
  } catch (error) {
    setMessage(document.querySelector('#scale-error'), error.message);
  }
}

async function initializeThree() {
  const host = document.querySelector('#three-container');
  try {
    const { createThreeStage } = await import('./three-stage.js');
    stage = createThreeStage(host);
    document.querySelector('#reset-camera').addEventListener('click', () => stage.resetCamera());
  } catch (error) {
    const fallback = document.createElement('div');
    fallback.className = 'three-loading';
    fallback.textContent = 'No se pudo iniciar WebGL. Verifica la conexión a Three.js y el soporte gráfico del navegador.';
    host.replaceChildren(fallback);
  }
}

document.querySelectorAll('[data-view-target]').forEach((button) => {
  button.addEventListener('click', () => switchView(button.dataset.viewTarget));
});
document.querySelector('#mobile-nav-toggle').addEventListener('click', (event) => {
  const sidebar = document.querySelector('#sidebar');
  const open = sidebar.classList.toggle('open');
  event.currentTarget.setAttribute('aria-expanded', String(open));
});

for (const form of document.querySelectorAll('[data-shape-form]')) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const feedback = form.querySelector('.form-feedback');
    setMessage(feedback);
    const dimensions = {};
    for (const input of form.querySelectorAll('input')) {
      const value = Number(input.value);
      if (input.value.trim() === '' || !Number.isFinite(value) || value <= 0) {
        setMessage(feedback, `La dimensión «${input.name}» debe ser un número mayor que cero.`);
        input.focus();
        return;
      }
      dimensions[input.name] = value;
    }
    try {
      const data = await postJson('/api/figuras', { tipo: form.dataset.shapeForm, dimensiones: dimensions });
      await loadFigures();
      selectFigure(data.indice);
      const result = await calculateFigure(data.indice, 1);
      renderFigureResult(result, form);
      switchView('figures');
    } catch (error) {
      setMessage(feedback, error.message);
    }
  });
}

for (const select of figureSelects) {
  select.addEventListener('change', () => {
    const index = Number(select.value);
    if (Number.isInteger(index)) selectFigure(index);
  });
}

document.querySelector('#calculate-selected').addEventListener('click', async () => {
  try {
    const result = await calculateFigure(selectedIndex, 1);
    renderCalculatorResult(result);
    setMessage(document.querySelector('#calculator-error'));
  } catch (error) {
    setMessage(document.querySelector('#calculator-error'), error.message);
  }
});

document.querySelector('#scale-range').addEventListener('input', (event) => {
  setFactor(event.currentTarget.value);
  setMessage(document.querySelector('#scale-error'));
  updateScaleComparison();
});
document.querySelector('#scale-number').addEventListener('input', (event) => {
  const value = Number(event.currentTarget.value);
  if (event.currentTarget.value === '' || !Number.isFinite(value) || value <= 0) {
    setMessage(document.querySelector('#scale-error'), 'El factor debe ser un número mayor que cero.');
    return;
  }
  setFactor(value);
  setMessage(document.querySelector('#scale-error'));
  updateScaleComparison();
});
document.querySelectorAll('[data-scale-preset]').forEach((button) => {
  button.addEventListener('click', () => {
    setFactor(button.dataset.scalePreset);
    setMessage(document.querySelector('#scale-error'));
    updateScaleComparison();
  });
});
document.querySelector('#calculate-scale').addEventListener('click', async () => {
  try {
    const factor = readFactor();
    const result = await calculateFigure(selectedIndex, factor);
    renderCalculatorResult(result);
    await updateScaleComparison();
    setMessage(document.querySelector('#scale-error'));
  } catch (error) {
    setMessage(document.querySelector('#scale-error'), error.message);
  }
});

document.querySelector('#clear-figures').addEventListener('click', async () => {
  try {
    await requestJson('/api/figuras', { method: 'DELETE' });
    selectedIndex = -1;
    document.querySelector('#figure-result').hidden = true;
    await loadFigures();
  } catch (error) {
    setMessage(document.querySelector('#global-message'), error.message);
  }
});
document.querySelector('#clear-history').addEventListener('click', async () => {
  try {
    await requestJson('/api/historial', { method: 'DELETE' });
    await loadHistory();
  } catch (error) {
    setMessage(document.querySelector('#global-message'), error.message);
  }
});

await initializeThree();
await Promise.all([loadFigures(), loadHistory()]);
setFactor(1);