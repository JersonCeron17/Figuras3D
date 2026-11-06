const form = document.querySelector('#figure-form');
const typeSelect = document.querySelector('#figure-type');
const dimensionFields = document.querySelector('#dimension-fields');
const figureList = document.querySelector('#figure-list');
const figureCount = document.querySelector('#figure-count');
const resultsBody = document.querySelector('#results-body');
const scaleInput = document.querySelector('#scale-factor');
const formMessage = document.querySelector('#form-message');
const scaleMessage = document.querySelector('#scale-message');
const emptyList = document.querySelector('#empty-list');
const emptyResults = document.querySelector('#empty-results');
const canvas = document.querySelector('#shape-canvas');
const context = canvas.getContext('2d');

const dimensionNames = {
  Cubo: [['lado', 'Lado']],
  Esfera: [['radio', 'Radio']],
  Cilindro: [['radio', 'Radio'], ['altura', 'Altura']],
};
const shapeIcons = { Cubo: '◇', Esfera: '◉', Cilindro: '▤' };
let figures = [];
let selectedIndex = -1;

function showMessage(element, message = '') {
  element.textContent = message;
}

function renderDimensionFields() {
  dimensionFields.replaceChildren();
  for (const [key, label] of dimensionNames[typeSelect.value]) {
    const wrapper = document.createElement('div');
    wrapper.className = 'dimension-field';
    const fieldLabel = document.createElement('label');
    fieldLabel.htmlFor = `dimension-${key}`;
    fieldLabel.textContent = label;
    const input = document.createElement('input');
    input.className = 'dimension-input';
    input.id = `dimension-${key}`;
    input.name = key;
    input.type = 'number';
    input.min = '0';
    input.step = 'any';
    input.required = true;
    input.inputMode = 'decimal';
    input.placeholder = 'Mayor que 0';
    wrapper.append(fieldLabel, input);
    dimensionFields.append(wrapper);
  }
}

function formatNumber(value) {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 4 }).format(value);
}

function formatDimensions(dimensions) {
  return Object.entries(dimensions).map(([name, value]) => `${name} ${formatNumber(value)}`).join(' · ');
}

function selectFigure(index) {
  selectedIndex = index;
  renderFigureList();
  drawSelectedFigure();
}

function renderFigureList() {
  figureList.replaceChildren();
  figureCount.textContent = String(figures.length);
  emptyList.hidden = figures.length > 0;
  figures.forEach((figure, index) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `figure-item${index === selectedIndex ? ' selected' : ''}`;
    button.setAttribute('aria-pressed', String(index === selectedIndex));
    const icon = document.createElement('span');
    icon.className = 'figure-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = shapeIcons[figure.tipo];
    const details = document.createElement('span');
    const name = document.createElement('strong');
    name.textContent = figure.nombre;
    const dimensions = document.createElement('small');
    dimensions.textContent = formatDimensions(figure.dimensiones);
    details.append(name, dimensions);
    const chevron = document.createElement('span');
    chevron.className = 'chevron';
    chevron.setAttribute('aria-hidden', 'true');
    chevron.textContent = '›';
    button.append(icon, details, chevron);
    button.addEventListener('click', () => selectFigure(index));
    item.append(button);
    figureList.append(item);
  });
}

function renderResults(results, factor) {
  resultsBody.replaceChildren();
  emptyResults.hidden = results.length > 0;
  for (const result of results) {
    const row = document.createElement('tr');
    const values = [
      result.nombre,
      formatDimensions(result.dimensiones),
      formatNumber(result.area_original),
      formatNumber(result.volumen_original),
      formatNumber(result.area_escalada),
      formatNumber(result.volumen_escalado),
    ];
    for (const value of values) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    }
    resultsBody.append(row);
  }
  document.querySelector('#results-subtitle').textContent = results.length
    ? `Comparación con factor × ${formatNumber(factor)}.`
    : 'Área y volumen, antes y después de escalar.';
}

async function requestJson(path, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.');
  return data;
}

async function refreshFigures() {
  const data = await requestJson('/api/figuras');
  figures = data.figuras;
  if (selectedIndex >= figures.length) selectedIndex = figures.length - 1;
  if (figures.length && selectedIndex < 0) selectedIndex = 0;
  renderFigureList();
  drawSelectedFigure();
}

async function calculate() {
  showMessage(scaleMessage);
  const factor = Number(scaleInput.value);
  if (scaleInput.value.trim() === '' || !Number.isFinite(factor) || factor < 0) {
    showMessage(scaleMessage, 'Ingresa un factor de escala igual o mayor que cero.');
    scaleInput.focus();
    return;
  }
  try {
    const data = await requestJson(`/api/resultados?factor=${encodeURIComponent(factor)}`);
    renderResults(data.resultados, factor);
  } catch (error) {
    showMessage(scaleMessage, error.message);
  }
}

function drawGrid(width, height) {
  context.clearRect(0, 0, width, height);
  context.strokeStyle = '#e5edef';
  context.lineWidth = 1;
  for (let x = 12; x < width; x += 24) {
    context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke();
  }
  for (let y = 12; y < height; y += 24) {
    context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke();
  }
}

function drawSelectedFigure() {
  const bounds = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(bounds.width * ratio));
  canvas.height = Math.max(1, Math.round(bounds.height * ratio));
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  drawGrid(bounds.width, bounds.height);
  const figure = figures[selectedIndex];
  const title = document.querySelector('#preview-title');
  const description = document.querySelector('#preview-description');
  if (!figure) {
    title.textContent = 'Selecciona una figura';
    description.textContent = 'La representación se actualiza al elegir un sólido de la colección.';
    return;
  }
  title.textContent = figure.nombre;
  description.textContent = `${formatDimensions(figure.dimensiones)} · escala visual original`;
  const width = bounds.width;
  const height = bounds.height;
  const scale = Math.min(width / 250, height / 150, 1.2);
  context.save();
  context.translate(width / 2, height / 2 + 5);
  context.scale(scale, scale);
  if (figure.tipo === 'Cubo') drawCube();
  else if (figure.tipo === 'Esfera') drawSphere();
  else drawCylinder();
  context.restore();
}

function drawCube() {
  const a = [-45, -35], b = [0, -61], c = [45, -35], d = [0, -9];
  const e = [-45, 18], f = [0, 44], g = [45, 18];
  context.lineWidth = 2;
  context.strokeStyle = '#176f80';
  context.fillStyle = '#c9f0e2';
  context.beginPath(); context.moveTo(...a); context.lineTo(...b); context.lineTo(...c); context.lineTo(...d); context.closePath(); context.fill(); context.stroke();
  context.fillStyle = '#84d8dd';
  context.beginPath(); context.moveTo(...a); context.lineTo(...d); context.lineTo(...f); context.lineTo(...e); context.closePath(); context.fill(); context.stroke();
  context.fillStyle = '#5ab7c4';
  context.beginPath(); context.moveTo(...d); context.lineTo(...c); context.lineTo(...g); context.lineTo(...f); context.closePath(); context.fill(); context.stroke();
}

function drawSphere() {
  const gradient = context.createRadialGradient(-20, -32, 5, 12, 4, 69);
  gradient.addColorStop(0, '#e1faf0'); gradient.addColorStop(.58, '#81d9dc'); gradient.addColorStop(1, '#278b9b');
  context.fillStyle = gradient;
  context.strokeStyle = '#176f80';
  context.lineWidth = 2;
  context.beginPath(); context.arc(0, 0, 58, 0, Math.PI * 2); context.fill(); context.stroke();
  context.strokeStyle = 'rgba(18, 75, 96, .55)';
  context.beginPath(); context.ellipse(0, 0, 58, 20, 0, 0, Math.PI * 2); context.stroke();
  context.beginPath(); context.ellipse(0, 0, 22, 58, 0, 0, Math.PI * 2); context.stroke();
}

function drawCylinder() {
  context.lineWidth = 2;
  context.strokeStyle = '#176f80';
  context.fillStyle = '#65c4cc';
  context.fillRect(-51, -34, 102, 68);
  context.beginPath();
  context.moveTo(-51, -34); context.lineTo(-51, 34);
  context.moveTo(51, -34); context.lineTo(51, 34);
  context.stroke();
  context.fillStyle = '#c9f0e2';
  context.beginPath(); context.ellipse(0, 34, 51, 19, 0, 0, Math.PI * 2); context.fill(); context.stroke();
  context.fillStyle = '#95dfe0';
  context.beginPath(); context.ellipse(0, -34, 51, 19, 0, 0, Math.PI * 2); context.fill(); context.stroke();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage(formMessage);
  const dimensions = {};
  for (const input of dimensionFields.querySelectorAll('input')) {
    const value = Number(input.value);
    if (input.value.trim() === '' || !Number.isFinite(value) || value <= 0) {
      showMessage(formMessage, `La dimensión «${input.name}» debe ser mayor que cero.`);
      input.focus();
      return;
    }
    dimensions[input.name] = value;
  }
  try {
    const result = await requestJson('/api/figuras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: typeSelect.value, dimensiones: dimensions }),
    });
    await refreshFigures();
    selectFigure(result.indice);
    await calculate();
    for (const input of dimensionFields.querySelectorAll('input')) input.value = '';
  } catch (error) {
    showMessage(formMessage, error.message);
  }
});

typeSelect.addEventListener('change', renderDimensionFields);
document.querySelector('#calculate-button').addEventListener('click', calculate);
document.querySelectorAll('.scale-chip').forEach((button) => {
  button.addEventListener('click', () => {
    scaleInput.value = button.dataset.factor;
    document.querySelectorAll('.scale-chip').forEach((chip) => chip.classList.toggle('active', chip === button));
    calculate();
  });
});
scaleInput.addEventListener('input', () => {
  document.querySelectorAll('.scale-chip').forEach((chip) => chip.classList.toggle('active', chip.dataset.factor === scaleInput.value));
});
document.querySelector('#clear-button').addEventListener('click', async () => {
  try {
    await requestJson('/api/figuras', { method: 'DELETE' });
    figures = [];
    selectedIndex = -1;
    form.reset();
    renderDimensionFields();
    scaleInput.value = '1';
    document.querySelectorAll('.scale-chip').forEach((chip) => chip.classList.toggle('active', chip.dataset.factor === '1'));
    renderFigureList();
    renderResults([], 1);
    drawSelectedFigure();
    showMessage(formMessage);
    showMessage(scaleMessage);
  } catch (error) {
    showMessage(scaleMessage, error.message);
  }
});
window.addEventListener('resize', drawSelectedFigure);

renderDimensionFields();
refreshFigures().then(calculate).catch((error) => showMessage(scaleMessage, error.message));