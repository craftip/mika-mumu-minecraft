let scene, camera, renderer, controls;
const GRID_SIZE = 16;
const BLOCK_SIZE = 1;
const levels = [
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAHUlEQVR4nGP4//8/AwMD8SQDSapB5KgNozYMGRsA2Vd+kCxBIfoAAAAASUVORK5CYII=',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAHElEQVR4nGNgYGD4//8/CSRpqiFg1IZRG4aGDQDZV36Q2LNWkwAAAABJRU5ErkJggg==',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAHUlEQVR4nGP4//8/AwMD8SQDSapB5KgNozYMGRsA2Vd+kCxBIfoAAAAASUVORK5CYII=',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAHElEQVR4nGNgYGD4//8/CSRpqiFg1IZRG4aGDQDZV36Q2LNWkwAAAABJRU5ErkJggg==',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAHUlEQVR4nGP4//8/AwMD8SQDSapB5KgNozYMGRsA2Vd+kCxBIfoAAAAASUVORK5CYII='
];
let levelIndex = 0;
let mode = 'level';
let blocks = {};
let currentColor = 0xffffff;
let blueprint = [];

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // ground
    const grid = new THREE.GridHelper(GRID_SIZE, GRID_SIZE);
    scene.add(grid);

    // lighting
    const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    scene.add(light);

    // controls
    controls = new THREE.PointerLockControls(camera, renderer.domElement);
    document.body.addEventListener('click', () => controls.lock());

    camera.position.y = 2;

    // palette UI
    createPalette();

    // events
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown);

    loadProgress();
    animate();
}

function loadProgress() {
    const data = JSON.parse(localStorage.getItem('bq-progress') || '{}');
    levelIndex = data.levelIndex || 0;
    if (levelIndex >= levels.length) {
        mode = 'sandbox';
        document.getElementById('blueprint').style.display = 'none';
        document.getElementById('level-info').textContent = 'Sandbox Mode';
    } else {
        loadLevel(levelIndex);
    }
}

function saveProgress() {
    localStorage.setItem('bq-progress', JSON.stringify({ levelIndex }));
}

function loadLevel(index) {
    mode = 'level';
    loadBlueprint(levels[index]).then(data => {
        blueprint = data;
        document.getElementById('blueprint').src = levels[index];
        document.getElementById('level-info').textContent = `Level ${index + 1}`;
    });
}

function loadBlueprint(url) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const data = [];
            const pixels = ctx.getImageData(0, 0, img.width, img.height).data;
            for (let z = 0; z < img.height; z++) {
                const row = [];
                for (let x = 0; x < img.width; x++) {
                    const i = (z * img.width + x) * 4;
                    const value = pixels[i] > 128 ? 1 : 0;
                    row.push(value);
                }
                data.push(row);
            }
            resolve(data);
        };
        img.src = url;
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function createPalette() {
    const colors = [
        0xff0000, 0x00ff00, 0x0000ff, 0xffff00,
        0xff00ff, 0x00ffff, 0xffffff, 0x888888,
        0xff8800, 0x88ff00, 0x0088ff, 0xffff88,
        0xff88ff, 0x88ffff, 0x444444, 0x000000
    ];
    const paletteEl = document.getElementById('palette');
    colors.forEach((c, i) => {
        const div = document.createElement('div');
        div.className = 'palette-color';
        div.style.background = '#' + c.toString(16).padStart(6, '0');
        div.addEventListener('click', () => currentColor = c);
        paletteEl.appendChild(div);
    });
    currentColor = colors[0];
}

function onKeyDown(e) {
    if (e.code === 'KeyF') {
        controls.getObject().position.y += 0.1; // toggle float by slight move
    }
    if (e.code.startsWith('Digit')) {
        const n = parseInt(e.code.substring(5));
        const paletteEl = document.getElementById('palette');
        if (n > 0 && n <= paletteEl.children.length) {
            const c = paletteEl.children[n - 1].style.background;
            currentColor = parseInt(c.slice(1), 16);
        }
    }
}

function onMouseDown(e) {
    const mouse = new THREE.Vector2();
    mouse.x = 0;
    mouse.y = 0;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, false);
    if (intersects.length > 0) {
        const hit = intersects[0];
        const pos = hit.point.clone().add(hit.face.normal).floor();
        if (e.button === 0) {
            placeBlock(pos.x, pos.y, pos.z);
        } else if (e.button === 2) {
            const target = hit.object;
            if (target.userData.isBlock) {
                removeBlock(target);
            }
        }
    }
}

function placeBlock(x, y, z) {
    const key = `${x},${y},${z}`;
    if (blocks[key]) return;
    const geom = new THREE.BoxGeometry(1,1,1);
    const mat = new THREE.MeshLambertMaterial({ color: currentColor });
    const cube = new THREE.Mesh(geom, mat);
    cube.position.set(x + 0.5, y + 0.5, z + 0.5);
    cube.userData.isBlock = true;
    scene.add(cube);
    blocks[key] = cube;
    checkCompletion();
}

function removeBlock(cube) {
    const pos = cube.position.clone().floor();
    const key = `${pos.x},${pos.y},${pos.z}`;
    scene.remove(cube);
    delete blocks[key];
}

function checkCompletion() {
    if (mode !== 'level') return;
    for (let z = 0; z < blueprint.length; z++) {
        for (let x = 0; x < blueprint[z].length; x++) {
            const need = blueprint[z][x];
            const key = `${x},1,${z}`;
            if (need && !blocks[key]) return;
            if (!need && blocks[key]) return;
        }
    }
    // completed
    levelIndex++;
    saveProgress();
    if (levelIndex >= levels.length) {
        mode = 'sandbox';
        document.getElementById('blueprint').style.display = 'none';
        document.getElementById('level-info').textContent = 'Sandbox Mode';
    } else {
        // clear scene blocks
        Object.values(blocks).forEach(b => scene.remove(b));
        blocks = {};
        loadLevel(levelIndex);
    }
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

document.getElementById('export-save').addEventListener('click', () => {
    const data = localStorage.getItem('bq-progress') || '{}';
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'blockquest-save.json';
    a.click();
    URL.revokeObjectURL(url);
});

init();
