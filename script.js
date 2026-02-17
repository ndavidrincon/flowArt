// --- VARIABLES GLOBALES Y CONFIGURACIÓN ---
const particleCount = 20000;
let scene, camera, renderer, controls, points;
let renderMode = 'flow';
let time = 0;
let positions = new Float32Array(particleCount * 3);
let currentFunctions = {
    x: (scope) => 10 * (scope.y - scope.x),
    y: (scope) => scope.x * (28 - scope.z) - scope.y,
    z: (scope) => scope.x * scope.y - (8 / 3) * scope.z
};

const container = document.getElementById('viewport');

// --- BIBLIOTECA DE EJEMPLOS ---
const examples = {
    lorenz: { x: "10 * (y - x)", y: "x * (28 - z) - y", z: "x * y - (8/3) * z" },
    torus: { x: "(5 + 2 * cos(v)) * cos(u)", y: "(5 + 2 * cos(v)) * sin(u)", z: "2 * sin(v)" },
    sphere: { x: "5 * sin(u) * cos(v)", y: "5 * sin(u) * sin(v)", z: "5 * cos(u)" },
    tornado: { x: "-y + 0.1 * x", y: "x + 0.1 * y", z: "0.5 * sin(t)" },
    spiral: { x: "sin(t + u) * v", y: "cos(t + u) * v", z: "v * 0.1" }
};

// --- FUNCIONES DEL MENÚ MÓVIL ---
function toggleMenu() {
    const sidebar = document.querySelector('aside');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

function closeMenuIfMobile() {
    if (window.innerWidth < 1024) {
        const sidebar = document.querySelector('aside');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
    }
}

// --- INICIALIZACIÓN Y MOTOR ---
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(30, 30, 30);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);

    // --- RESTAURACIÓN DE EJES ---
    const axesHelper = new THREE.AxesHelper(20);
    scene.add(axesHelper);
    createAxisLabel("X", 22, 0, 0, "#ff4444");
    createAxisLabel("Y", 0, 22, 0, "#44ff44");
    createAxisLabel("Z", 0, 0, 22, "#4444ff");

    // Sistema de Partículas inicial
    const geometry = new THREE.BufferGeometry();
    resetParticles();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: 0x00ffff,
        size: 0.1,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });

    points = new THREE.Points(geometry, material);
    scene.add(points);

    animate();
}

// --- UTILIDAD PARA ETIQUETAS DE EJES ---
function createAxisLabel(text, x, y, z, color) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 64; canvas.height = 64;
    context.font = 'Bold 40px Arial';
    context.fillStyle = color;
    context.fillText(text, 10, 50);

    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
    sprite.position.set(x, y, z);
    sprite.scale.set(3, 3, 3);
    scene.add(sprite);
}

function updateVisualization() {
    const eqX_text = document.getElementById('eqX').value.toLowerCase();
    const eqY_text = document.getElementById('eqY').value.toLowerCase();
    const eqZ_text = document.getElementById('eqZ').value.toLowerCase();
    const allText = eqX_text + eqY_text + eqZ_text;

    try {
        currentFunctions.x = math.compile(eqX_text).evaluate;
        currentFunctions.y = math.compile(eqY_text).evaluate;
        currentFunctions.z = math.compile(eqZ_text).evaluate;

        if (allText.includes('u') || allText.includes('v')) {
            renderMode = 'surface';
            generateSurface();
        } else {
            renderMode = 'flow';
            resetParticles();
        }

        closeMenuIfMobile();
    } catch (e) {
        alert("Error en la fórmula: " + e.message);
    }
}

function loadExample(key) {
    if (!key) return;
    const ex = examples[key];
    document.getElementById('eqX').value = ex.x;
    document.getElementById('eqY').value = ex.y;
    document.getElementById('eqZ').value = ex.z;

    updateVisualization();
}

function generateSurface() {
    const positionsArray = points.geometry.attributes.position.array;
    const res = Math.floor(Math.sqrt(particleCount));
    let count = 0;
    for (let i = 0; i < res; i++) {
        for (let j = 0; j < res; j++) {
            const u = (i / res) * Math.PI * 2;
            const v = (j / res) * Math.PI * 2;
            const scope = { u, v, t: time };
            const idx = count * 3;
            positionsArray[idx] = currentFunctions.x(scope) * 10;
            positionsArray[idx + 1] = currentFunctions.y(scope) * 10;
            positionsArray[idx + 2] = currentFunctions.z(scope) * 10;
            count++;
        }
    }
    points.geometry.attributes.position.needsUpdate = true;
}

function resetParticles() {
    for (let i = 0; i < particleCount * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 10;
    }
}

function animate() {
    requestAnimationFrame(animate);
    time += 0.01;

    if (renderMode === 'flow') {
        const positionsArray = points.geometry.attributes.position.array;
        const dt = 0.005;
        for (let i = 0; i < particleCount; i++) {
            const idx = i * 3;
            const scope = { x: positionsArray[idx], y: positionsArray[idx + 1], z: positionsArray[idx + 2], t: time };
            if (document.getElementById('activeX').checked) positionsArray[idx] += currentFunctions.x(scope) * dt;
            if (document.getElementById('activeY').checked) positionsArray[idx + 1] += currentFunctions.y(scope) * dt;
            if (document.getElementById('activeZ').checked) positionsArray[idx + 2] += currentFunctions.z(scope) * dt;
            if (Math.abs(positionsArray[idx]) > 100) positionsArray[idx] = (Math.random() - 0.5) * 5;
        }
        points.geometry.attributes.position.needsUpdate = true;
    }

    points.material.color.set(document.getElementById('particleColor').value);
    points.material.size = parseFloat(document.getElementById('particleSize').value);
    controls.update();
    renderer.render(scene, camera);
}

// Event Listeners
document.getElementById('menuToggle').addEventListener('click', toggleMenu);
document.getElementById('sidebarOverlay').addEventListener('click', toggleMenu);
document.getElementById('updateBtn').addEventListener('click', updateVisualization);
document.getElementById('screenshotBtn').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `art-3d.png`;
    link.href = renderer.domElement.toDataURL();
    link.click();
});

window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

init();