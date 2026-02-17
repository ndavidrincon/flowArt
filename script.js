// --- VARIABLES GLOBALES Y CONFIGURACIÓN ---
let scene, camera, renderer, controls, points;
let renderMode = 'flow'; // 'flow' o 'surface'
let time = 0;

const container = document.getElementById('viewport');
const particleCount = 20000; // Cantidad de puntos
let positions = new Float32Array(particleCount * 3);

// Funciones matemáticas por defecto (Atractor de Lorenz)
let currentFunctions = {
    x: (scope) => 10 * (scope.y - scope.x),
    y: (scope) => scope.x * (28 - scope.z) - scope.y,
    z: (scope) => scope.x * scope.y - (8 / 3) * scope.z
};

// --- BIBLIOTECA DE EJEMPLOS ---
const examples = {
    lorenz: {
        name: "Atractor de Lorenz",
        x: "10 * (y - x)",
        y: "x * (28 - z) - y",
        z: "x * y - (8/3) * z"
    },
    torus: {
        name: "Superficie Toroide",
        x: "(5 + 2 * cos(v)) * cos(u)",
        y: "(5 + 2 * cos(v)) * sin(u)",
        z: "2 * sin(v)"
    },
    sphere: {
        name: "Esfera Paramétrica",
        x: "5 * sin(u) * cos(v)",
        y: "5 * sin(u) * sin(v)",
        z: "5 * cos(u)"
    },
    tornado: {
        name: "Tornado de Flujo",
        x: "-y + 0.1 * x",
        y: "x + 0.1 * y",
        z: "0.5 * sin(t)"
    }
};

// --- INICIALIZACIÓN DEL MOTOR 3D ---
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(30, 30, 30);

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);

    // Ejes y Etiquetas
    const axesHelper = new THREE.AxesHelper(20);
    scene.add(axesHelper);
    createAxisLabel("X", 22, 0, 0, "#ff4444");
    createAxisLabel("Y", 0, 22, 0, "#44ff44");
    createAxisLabel("Z", 0, 0, 22, "#4444ff");

    // Sistema de Partículas
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

// --- LÓGICA DE RENDERIZADO Y CÁLCULO ---

function updateVisualization() {
    const eqX_text = document.getElementById('eqX').value.toLowerCase();
    const eqY_text = document.getElementById('eqY').value.toLowerCase();
    const eqZ_text = document.getElementById('eqZ').value.toLowerCase();
    const allText = eqX_text + eqY_text + eqZ_text;

    try {
        // Compilar nuevas funciones
        currentFunctions.x = math.compile(eqX_text).evaluate;
        currentFunctions.y = math.compile(eqY_text).evaluate;
        currentFunctions.z = math.compile(eqZ_text).evaluate;

        // DETECTOR AUTOMÁTICO: ¿Es superficie (u,v) o flujo (x,y,z)?
        if (allText.includes('u') || allText.includes('v')) {
            renderMode = 'surface';
            generateSurface();
        } else {
            renderMode = 'flow';
            resetParticles();
        }
    } catch (e) {
        alert("Error en la fórmula: " + e.message);
    }
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
            // Escalamiento visual * 10 para que no sea muy pequeña
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

// --- BUCLE DE ANIMACIÓN ---
function animate() {
    requestAnimationFrame(animate);
    time += 0.01;

    if (renderMode === 'flow') {
        const positionsArray = points.geometry.attributes.position.array;
        const dt = 0.005;

        for (let i = 0; i < particleCount; i++) {
            const idx = i * 3;
            const scope = {
                x: positionsArray[idx],
                y: positionsArray[idx + 1],
                z: positionsArray[idx + 2],
                t: time
            };

            // Aplicar ecuaciones solo si el eje está activo
            if (document.getElementById('activeX').checked)
                positionsArray[idx] += currentFunctions.x(scope) * dt;

            if (document.getElementById('activeY').checked)
                positionsArray[idx + 1] += currentFunctions.y(scope) * dt;

            if (document.getElementById('activeZ').checked)
                positionsArray[idx + 2] += currentFunctions.z(scope) * dt;

            // Evitar que las partículas escapen al infinito
            if (Math.abs(positionsArray[idx]) > 100) positionsArray[idx] = (Math.random() - 0.5) * 5;
        }
        points.geometry.attributes.position.needsUpdate = true;
    }

    // Actualizar color y tamaño desde la UI
    points.material.color.set(document.getElementById('particleColor').value);
    points.material.size = parseFloat(document.getElementById('particleSize').value);

    controls.update();
    renderer.render(scene, camera);
}

// --- UTILIDADES (Etiquetas, Captura, Eventos) ---

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

function takeScreenshot() {
    renderer.render(scene, camera);
    const link = document.createElement('a');
    link.download = `Flow-Art-${Date.now()}.png`;
    link.href = renderer.domElement.toDataURL("image/png");
    link.click();
}

function loadExample(key) {
    const ex = examples[key];
    if (ex) {
        // Llenar los campos de texto
        document.getElementById('formulaName').value = ex.name;
        document.getElementById('eqX').value = ex.x;
        document.getElementById('eqY').value = ex.y;
        document.getElementById('eqZ').value = ex.z;

        // Asegurarse de que los checkboxes estén activos
        document.getElementById('activeX').checked = true;
        document.getElementById('activeY').checked = true;
        document.getElementById('activeZ').checked = true;

        // Ejecutar la visualización
        updateVisualization();
    }
}

// Event Listeners
document.getElementById('updateBtn').addEventListener('click', updateVisualization);
document.getElementById('screenshotBtn').addEventListener('click', takeScreenshot);
window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

// Arrancar
init();