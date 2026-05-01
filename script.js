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
let line;

const container = document.getElementById('viewport');

// --- BIBLIOTECA DE EJEMPLOS ---
const examples = {
    lorenz: { x: "10 * (y - x)", y: "x * (28 - z) - y", z: "x * y - (8/3) * z" },
    torus: { x: "(5 + 2 * cos(v)) * cos(u)", y: "(5 + 2 * cos(v)) * sin(u)", z: "2 * sin(v)" },
    sphere: { x: "5 * sin(u) * cos(v)", y: "5 * sin(u) * sin(v)", z: "5 * cos(u)" },
    tornado: { x: "-y + 0.1 * x", y: "x + 0.1 * y", z: "0.5 * sin(t)" },
    spiral: { x: "sin(t + u) * v", y: "cos(t + u) * v", z: "v * 0.1" },
    lissajous: { x: "sin(21*u) * cos(u) * 1.5", y: "sin(21*u) * sin(u) * 1.5", z: "cos(21 * u) * 1.2" },
    lissajous2: { x: "sin(31*u)* 1.5", y: "sin(37*u) * 1.5", z: "cos(43 * u) * 1.2" }

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

    const pointMaterial = new THREE.PointsMaterial({
        color: 0x00ffff,
        size: 0.1,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });

    points = new THREE.Points(geometry, pointMaterial);
    scene.add(points);

    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.8
    });
    line = new THREE.Line(geometry, lineMaterial); // Usa la misma geometría que los puntos
    line.visible = false; // Oculta por defecto
    scene.add(line);

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
    const eqX_text = document.getElementById('eqX').value.toLowerCase().replace(/sen/g, 'sin');
    const eqY_text = document.getElementById('eqY').value.toLowerCase().replace(/sen/g, 'sin');
    const eqZ_text = document.getElementById('eqZ').value.toLowerCase().replace(/sen/g, 'sin');
    const allText = eqX_text + eqY_text + eqZ_text;

    try {
        currentFunctions.x = math.compile(eqX_text).evaluate;
        currentFunctions.y = math.compile(eqY_text).evaluate;
        currentFunctions.z = math.compile(eqZ_text).evaluate;

        if (allText.includes('u') || allText.includes('v')) {
            renderMode = 'surface';
            generateSurface();

            // Si tiene 'v' es una malla de puntos, si no, es una línea
            if (allText.includes('v')) {
                line.visible = false;
                points.visible = true;
                points.material.size = 0.05; // Puntos pequeños para la superficie
            } else {
                line.visible = true;
                points.visible = false;
            }
        } else {
            renderMode = 'flow';
            resetParticles();
            line.visible = false;
            points.visible = true;
            points.material.size = parseFloat(document.getElementById('particleSize').value);
        }
        closeMenuIfMobile();
    } catch (e) {
        alert("Error: " + e.message);
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
    const eqText = document.getElementById('eqX').value + document.getElementById('eqY').value + document.getElementById('eqZ').value;

    // Detectamos si la fórmula usa la variable 'v'
    const hasV = eqText.toLowerCase().includes('v');

    if (hasV) {
        // MODO SUPERFICIE (Para Esferas, Toroides, etc.)
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
    } else {
        // MODO LÍNEA (Para Lissajous y curvas 1D)
        for (let i = 0; i < particleCount; i++) {
            const u = (i / particleCount) * Math.PI * 2 * 10; // Más longitud para la curva
            const scope = { u, v: 0, t: time };
            const idx = i * 3;
            positionsArray[idx] = currentFunctions.x(scope) * 10;
            positionsArray[idx + 1] = currentFunctions.y(scope) * 10;
            positionsArray[idx + 2] = currentFunctions.z(scope) * 10;
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
        const h = 0.01; // El "paso" (step size) del integrador

        for (let i = 0; i < particleCount; i++) {
            const idx = i * 3;
            const x = positionsArray[idx];
            const y = positionsArray[idx + 1];
            const z = positionsArray[idx + 2];

            // --- PASO 1: Calcular k1 (Pendiente en el punto inicial) ---
            const scope1 = { x, y, z, t: time };
            const k1x = currentFunctions.x(scope1);
            const k1y = currentFunctions.y(scope1);
            const k1z = currentFunctions.z(scope1);

            // --- PASO 2: Calcular k2 (Pendiente en el punto predicho) ---
            const scope2 = {
                x: x + k1x * h,
                y: y + k1y * h,
                z: z + k1z * h,
                t: time + h
            };
            const k2x = currentFunctions.x(scope2);
            const k2y = currentFunctions.y(scope2);
            const k2z = currentFunctions.z(scope2);

            // --- ACTUALIZACIÓN FINAL: Promedio de pendientes ---[cite: 7]
            if (document.getElementById('activeX').checked) {
                positionsArray[idx] += (h / 2) * (k1x + k2x);
            }
            if (document.getElementById('activeY').checked) {
                positionsArray[idx + 1] += (h / 2) * (k1y + k2y);
            }
            if (document.getElementById('activeZ').checked) {
                positionsArray[idx + 2] += (h / 2) * (k1z + k2z);
            }

            // Reposicionamiento si salen del límite
            if (Math.abs(positionsArray[idx]) > 80) {
                positionsArray[idx] = (Math.random() - 0.5) * 5;
            }
        }
        points.geometry.attributes.position.needsUpdate = true;

    } else if (renderMode === 'surface') {
        generateSurface(); // Refresca la curva si tiene el parámetro 't'
    }

    // Actualización de materiales y controles
    line.material.color.set(document.getElementById('particleColor').value);
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