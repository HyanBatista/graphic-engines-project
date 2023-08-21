import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

let camera, scene, renderer;

// Game settings
let frames = 0
let spawnRate = 400
let waterSpawnRate = 600
let thirstRate = 350
let hydration = 100
let timeStep = 1 / 60

// Game variables
let ground
let player
let waterThree
const snakes = []
const waters = []
let keyboard = {}

// Panel elements
const scoreElement = document.getElementById('score')
const hydrationElement = document.getElementById('hydration')


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


init()


async function init() {
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    )
    camera.position.set(1, 8, 10)

    renderer = new THREE.WebGL1Renderer({
        alpha: true,
        antialias: true
    })
    renderer.shadowMap.enabled = true
    renderer.setSize(window.innerWidth, window.innerHeight)

    const light = new THREE.DirectionalLight(0xffffff, 1)
    light.position.y = 3
    light.position.z = 1
    light.castShadow = true
    scene.add(light)
    scene.add(new THREE.AmbientLight(0xffffff, 0.5))

    document.body.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)

    addGround()
    addPlayer()

    await addWater()

    addKeysListener()

    animate()
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


async function addWater() {
    const gltfLoader = new GLTFLoader();
    const waterLoaded = await gltfLoader.loadAsync('assets/car.glb');
    waterThree = waterLoaded.scene.children[0];
    console.log(typeof(waterLoaded))
    scene.add(waterThree);
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


function animate() {
    const animationId = requestAnimationFrame(animate)
    renderer.render(scene, camera)

    movePlayer()

    world.step(timeStep);

    waterThree.position.copy(player.position);

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
            scene.remove(water)
        }
    })

    if (frames % spawnRate === 0) {
        if (spawnRate > 20) {
            spawnRate -= 5
        }
        const snake = new Box({
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
        scene.add(snake)
        snakes.push(snake)
    }

    if (frames % waterSpawnRate === 0) {

        const water = new Box({
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
        scene.add(water)
        waters.push(water)
    }

    frames++
    if (frames % 20 === 0) {
        updateScoreElement(frames, scoreElement)
        updateScoreElement(hydration, hydrationElement)
    }
}
