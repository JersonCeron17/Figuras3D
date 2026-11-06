import * as THREE from 'three';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js';

export function createThreeStage(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f4f9fc');

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const initialCameraPosition = new THREE.Vector3(4.6, 3.5, 6.7);
  camera.position.copy(initialCameraPosition);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.replaceChildren(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.enableRotate = false;
  controls.minDistance = 2.5;
  controls.maxDistance = 18;
  controls.target.set(0, 0, 0);

  function render() {
    renderer.render(scene, camera);
  }
  controls.addEventListener('change', render);

  scene.add(new THREE.HemisphereLight('#e7f8ff', '#506b83', 2.1));
  const keyLight = new THREE.DirectionalLight('#ffffff', 3.4);
  keyLight.position.set(4, 7, 5);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight('#78cfff', 1.25);
  fillLight.position.set(-5, 2, -3);
  scene.add(fillLight);

  const grid = new THREE.GridHelper(8, 16, '#9cc3d4', '#d2e3eb');
  grid.position.y = -1.15;
  grid.material.opacity = 0.66;
  grid.material.transparent = true;
  scene.add(grid);

  let model = null;
  let modelSignature = '';
  let currentFactor = 1;
  let dragPoint = null;

  renderer.domElement.style.cursor = 'grab';
  renderer.domElement.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    dragPoint = { x: event.clientX, y: event.clientY };
    renderer.domElement.style.cursor = 'grabbing';
  });
  renderer.domElement.addEventListener('pointermove', (event) => {
    if (!dragPoint || !model) return;
    const deltaX = event.clientX - dragPoint.x;
    const deltaY = event.clientY - dragPoint.y;
    dragPoint = { x: event.clientX, y: event.clientY };
    model.rotation.y += deltaX * 0.012;
    model.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, model.rotation.x + deltaY * 0.012));
    render();
  });
  const stopDragging = () => {
    dragPoint = null;
    renderer.domElement.style.cursor = 'grab';
  };
  renderer.domElement.addEventListener('pointerup', stopDragging);
  renderer.domElement.addEventListener('pointercancel', stopDragging);

  function disposeModel() {
    if (!model) return;
    scene.remove(model);
    model.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    model = null;
    render();
  }

  function addEdgeLines(group, geometry) {
    const edges = new THREE.EdgesGeometry(geometry);
    const lines = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: '#164b70', transparent: true, opacity: 0.75 }));
    group.add(lines);
  }

  function buildModel(figure) {
    disposeModel();
    const dimensions = figure.dimensiones;
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: '#1685d5', roughness: 0.27, metalness: 0.08 });
    const accent = new THREE.MeshStandardMaterial({ color: '#59d0df', roughness: 0.3, metalness: 0.06 });

    if (figure.tipo === 'Cubo') {
      const side = dimensions.lado;
      const geometry = new THREE.BoxGeometry(side, side, side);
      group.add(new THREE.Mesh(geometry, [material, accent, material, accent, material, material]));
      addEdgeLines(group, geometry);
      group.userData.normalizer = 1.8 / side;
    } else if (figure.tipo === 'Esfera') {
      const radius = dimensions.radio;
      const geometry = new THREE.SphereGeometry(radius, 64, 40);
      const sphereMaterial = new THREE.MeshStandardMaterial({ color: '#1585d6', roughness: 0.24, metalness: 0.08, flatShading: false });
      group.add(new THREE.Mesh(geometry, sphereMaterial));
      const equator = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.002, radius * 0.009, 8, 96), new THREE.MeshBasicMaterial({ color: '#d4fbff', transparent: true, opacity: 0.72 }));
      equator.rotation.x = Math.PI / 2;
      group.add(equator);
      const meridian = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.004, radius * 0.007, 8, 96), new THREE.MeshBasicMaterial({ color: '#d4fbff', transparent: true, opacity: 0.48 }));
      group.add(meridian);
      group.userData.normalizer = 1.8 / (radius * 2);
    } else {
      const radius = dimensions.radio;
      const height = dimensions.altura;
      const geometry = new THREE.CylinderGeometry(radius, radius, height, 64, 1, false);
      group.add(new THREE.Mesh(geometry, [material, accent, accent]));
      addEdgeLines(group, geometry);
      group.userData.normalizer = 1.8 / Math.max(radius * 2, height);
    }

    group.userData.figure = figure;
    model = group;
    scene.add(model);
    modelSignature = JSON.stringify([figure.tipo, dimensions]);
    applyFactor(currentFactor);
  }

  function applyFactor(factor) {
    currentFactor = factor;
    if (!model) return;
    const normalizedSize = factor * model.userData.normalizer;
    model.scale.setScalar(normalizedSize);
    model.position.y = factor - 1.15;
    render();
  }

  function setFigure(figure, factor = currentFactor) {
    currentFactor = factor;
    if (!figure) {
      disposeModel();
      modelSignature = '';
      return;
    }
    const signature = JSON.stringify([figure.tipo, figure.dimensiones]);
    if (signature !== modelSignature) buildModel(figure);
    applyFactor(factor);
  }

  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  }

  function resetCamera() {
    camera.position.copy(initialCameraPosition);
    controls.target.set(0, 0, 0);
    controls.update();
    render();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(container);
  window.addEventListener('resize', resize);
  resize();
  render();

  return { setFigure, resize, resetCamera, observer };
}