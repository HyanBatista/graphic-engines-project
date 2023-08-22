import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import * as CANNON from "cannon-es"
import CannonDebugger from "cannon-es-debugger"

let camera, scene, renderer;

// Game settings
let frames = 0
let spawnRate = 400
let waterSpawnRate = 600
let thirstRate = 350
let hydration = 100

// Game variables
let ground
let player
const snakes = []
const waters = []
let keyboard = {}

// Panel elements
const scoreElement = document.getElementById('score')
const hydrationElement = document.getElementById('hydration')

// Game 3D Objects
let wolfThree = await createWolf()
let waterThree = await createWater()


class Box extends THREE.Mesh {
    constructor({
        width,
        height,
        depth,
        color = '#00ff00',
        velocity = {
            x: 0,
            y: 0,
            z: 0
        },
        position = {
            x: 0,
            y: 0,
            z: 0
        },
        zAcceleration = false
    }) {
        super(
            new THREE.BoxGeometry(width, height, depth),
            new THREE.MeshStandardMaterial({ color: color })
        )
        this.width = width
        this.height = height
        this.depth = depth
        this.color = color
        this.position.set(position.x, position.y, position.z)
        this.bottom = this.position.y - this.height / 2
        this.top = this.position.y + this.height / 2
        this.right = this.position.x + this.width / 2
        this.left = this.position.x - this.width / 2
        this.front = this.position.z + this.depth / 2
        this.back = this.position.z - this.depth / 2
        this.velocity = velocity
        this.gravity = -0.002
        this.zAcceleration = zAcceleration
    }

    updateSides() {
        this.right = this.position.x + this.width / 2
        this.left = this.position.x - this.width / 2
        this.bottom = this.position.y - this.height / 2
        this.top = this.position.y + this.height / 2
        this.front = this.position.z + this.depth / 2
        this.back = this.position.z - this.depth / 2
    }

    update(ground) {
        this.updateSides()
        if (this.zAcceleration) {
            this.velocity.z += 0.0002
        }
        this.position.x += this.velocity.x
        this.position.z += this.velocity.z
        this.applyGravity(ground)
    }

    applyGravity(ground) {
        this.velocity.y += this.gravity

        if (boxCollision({
            box1: this,
            box2: ground
        })) {
            const friction = 0.4
            this.velocity.y *= friction
            this.velocity.y = -this.velocity.y
        }
        else {
            this.position.y += this.velocity.y
        }
    }
}


class Object3DBox extends THREE.Mesh {
    constructor({
        object,
        width,
        height,
        depth,
        color = '#00ff00',
        velocity = {
            x: 0,
            y: 0,
            z: 0
        },
        position = {
            x: 0,
            y: 0,
            z: 0
        },
        zAcceleration = false
    }) {
        super(
            new THREE.BoxGeometry(width, height, depth),
            new THREE.MeshStandardMaterial({ color: color })
        )
        this.object = object
        this.width = width
        this.height = height
        this.depth = depth
        this.color = color
        this.position.set(position.x, position.y, position.z)
        this.bottom = this.position.y - this.height / 2
        this.top = this.position.y + this.height / 2
        this.right = this.position.x + this.width / 2
        this.left = this.position.x - this.width / 2
        this.front = this.position.z + this.depth / 2
        this.back = this.position.z - this.depth / 2
        this.velocity = velocity
        this.gravity = -0.002
        this.zAcceleration = zAcceleration
    }

    updateSides() {
        this.right = this.position.x + this.width / 2
        this.left = this.position.x - this.width / 2
        this.bottom = this.position.y - this.height / 2
        this.top = this.position.y + this.height / 2
        this.front = this.position.z + this.depth / 2
        this.back = this.position.z - this.depth / 2
    }

    update(ground) {
        this.updateSides()
        if (this.zAcceleration) {
            this.velocity.z += 0.0002
        }
        this.position.x += this.velocity.x
        this.object.position.copy(this.position)
        this.position.z += this.velocity.z
        this.applyGravity(ground)
    }

    applyGravity(ground) {
        this.velocity.y += this.gravity

        if (boxCollision({
            box1: this,
            box2: ground
        })) {
            const friction = 0.4
            this.velocity.y *= friction
            this.velocity.y = -this.velocity.y
        }
        else {
            this.position.y += this.velocity.y
        }
    }
}


init()


async function init() {
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.z = 10;
    camera.position.y = 5;


    renderer = new THREE.WebGL1Renderer({
        alpha: true,
        antialias: true
    })
    renderer.shadowMap.enabled = true
    renderer.setSize(window.innerWidth, window.innerHeight)

    const ambient = new THREE.HemisphereLight(0xffffbb, 0x080820);
    scene.add(ambient);

    const light = new THREE.DirectionalLight(0xFFFFFF, 1);
    light.position.set(1, 10, 6);
    scene.add(light);

    document.body.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)

    addBackground()

    addGround()
    addPlayer()

    addKeysListener()

    await animate()
}


function boxCollision({ box1, box2 }) {
    const xCollision = box1.right >= box2.left && box1.left <= box2.right
    const yCollision = box1.bottom + box1.velocity.y <= box2.top && box1.top >= box2.bottom
    const zCollision = box1.front >= box2.back && box1.back <= box2.front
    return xCollision && yCollision && zCollision
}


function updateScoreElement(score, element) {
    element.textContent = score
}


function addPlayer() {
    player = new Box({
        width: 1,
        height: 1,
        depth: 1,
        velocity: {
            x: 0,
            y: -0.01,
            z: 0
        },
        color: 'red'
    })
    player.castShadow = true
    scene.add(player)
}


function addGround() {
    ground = new Box({
        width: 20,
        height: 0.5,
        depth: 50,
        color: 'yellow',
        position: {
            x: 0,
            y: -2,
            z: 0
        }
    })
    ground.receiveShadow = true
    scene.add(ground)
}


async function createWater() {
    const gltfLoader = new GLTFLoader();
    const waterLoaded = await gltfLoader.loadAsync('assets/water_bottle.glb');
    let waterThree = waterLoaded.scene.children[0];
    waterThree.scale.set(6, 6, 6)
    return waterThree
}


async function createWolf() {
    const gltfLoader = new GLTFLoader();
    const wolfLoaded = await gltfLoader.loadAsync('assets/fantasy_wolf.glb');
    let wolfThree = wolfLoaded.scene.children[0];
    wolfThree.scale.set(0.15, 0.15, 0.15)
    return wolfThree
}


function addKeysListener() {
    window.addEventListener('keydown', function (event) {
        keyboard[event.code] = true;
    }, false);
    window.addEventListener('keyup', function (event) {
        keyboard[event.code] = false;
    }, false);
}


function movePlayer() {
    player.velocity.x = 0
    player.velocity.z = 0

    if (keyboard['KeyW']) {
        player.velocity.z = -0.04
    }
    else if (keyboard['KeyS']) {
        player.velocity.z = 0.04
    }
    else if (keyboard['KeyD']) {
        player.velocity.x = 0.04
    }
    else if (keyboard['KeyA']) {
        player.velocity.x = -0.04
    }
}

async function animate() {
    const animationId = requestAnimationFrame(animate)
    renderer.render(scene, camera)

    movePlayer()

    player.update(ground)
    snakes.forEach(snake => {
        snake.update(ground)
        if (boxCollision({
            box1: player,
            box2: snake
        })) {
            cancelAnimationFrame(animationId)
        }
    })

    if (frames % thirstRate === 0) {
        hydration += -10
        if (hydration <= 0) {
            cancelAnimationFrame(animationId)
        }
    }

    waters.forEach((water, index) => {
        water.update(ground)
        if (boxCollision({
            box1: player,
            box2: water
        })) {
            waters.splice(index, 1)
            let newHydrationValue = hydration + 20
            if (newHydrationValue > 100) {
                newHydrationValue = 100
            }
            hydration = newHydrationValue
            scene.remove(water.object)
        }
    })

    if (frames % spawnRate === 0) {
        if (spawnRate > 20) {
            spawnRate -= 5
        }

        let snake_object = wolfThree.clone()

        const snake = new Object3DBox({
            object: snake_object,
            width: 1,
            height: 1,
            depth: 1,
            velocity: {
                x: 0,
                y: 0,
                z: 0.005
            },
            position: {
                x: (Math.random() - 0.5) * 15,
                y: 0,
                z: -20
            },
            color: 'green',
            zAcceleration: true
        })
        snake.castShadow = true
        snake.object.position.copy(snake.position)
        scene.add(snake.object)
        snakes.push(snake)
    }

    if (frames % waterSpawnRate === 0) {

        const water = new Object3DBox({
            object: waterThree,
            width: 1,
            height: 1,
            depth: 1,
            velocity: {
                x: 0,
                y: 0,
                z: 0.005
            },
            position: {
                x: (Math.random() - 0.5) * 15,
                y: 0,
                z: -20
            },
            color: 'blue',
            zAcceleration: true
        })
        water.castShadow = true
        scene.add(water.object)
        waters.push(water)
    }

    frames++
    if (frames % 20 === 0) {
        updateScoreElement(frames, scoreElement)
        updateScoreElement(hydration, hydrationElement)
    }
}


async function addBackground() {
    const gltfLoader = new GLTFLoader();

    const mountainLoaded = await gltfLoader.loadAsync('assets/mountain.glb');
    let mountainMesh = mountainLoaded.scene.children[0];
    mountainMesh.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI / 180 * 90);
    mountainMesh.position.set(0, 60, -90);
    mountainMesh.scale.set(0.008, 0.008, 0.008);
    scene.add(mountainMesh);

    const domeLoaded = await gltfLoader.loadAsync('assets/skydome.glb');
    let domeMesh = domeLoaded.scene.children[0];
    domeMesh.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI / 180 * 90);
    domeMesh.position.set(0, -40, 0);
    domeMesh.scale.set(0.1, 0.1, 0.1);
    scene.add(domeMesh);
}
