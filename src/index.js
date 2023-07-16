import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
)
camera.position.set(1, 8, 40)

const renderer = new THREE.WebGL1Renderer({
    alpha: true,
    antialias: true
})
renderer.shadowMap.enabled = true
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)

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

function boxCollision({ box1, box2 }) {
    const xCollision = box1.right >= box2.left && box1.left <= box2.right
    const yCollision = box1.bottom + box1.velocity.y <= box2.top && box1.top >= box2.bottom
    const zCollision = box1.front >= box2.back && box1.back <= box2.front
    return xCollision && yCollision && zCollision
}

function updateScoreElement(score, element) {
    element.textContent = score
}

const player = new Box({
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

const ground = new Box({
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

const light = new THREE.DirectionalLight(0xffffff, 1)
light.position.y = 3
light.position.z = 1
light.castShadow = true
scene.add(light)

scene.add(new THREE.AmbientLight(0xffffff, 0.5))

camera.position.z = 10

console.log(ground.top)
console.log(player.bottom)

const keys = {
    a: {
        pressed: false
    },
    d: {
        pressed: false
    },
    w: {
        pressed: false
    },
    s: {
        pressed: false
    }
}

window.addEventListener('keydown', (event) => {
    switch (event.code) {
        case 'KeyA':
            keys.a.pressed = true
            break
        case 'KeyD':
            keys.d.pressed = true
            break
        case 'KeyS':
            keys.s.pressed = true
            break
        case 'KeyW':
            keys.w.pressed = true
            break
        case 'Space':
            player.velocity.y = 0.08
            break
    }
}) 

window.addEventListener('keyup', (event) => {
    switch (event.code) {
        case 'KeyA':
            keys.a.pressed = false
            break
        case 'KeyD':
            keys.d.pressed = false
            break
        case 'KeyS':
            keys.s.pressed = false
            break
        case 'KeyW':
            keys.w.pressed = false
            break
    }
})

const snakes = []
const waters = []

const scoreElement = document.getElementById('score')
const hydrationElement = document.getElementById('hydration')

let frames = 0
let spawnRate = 400
let waterSpawnRate = 600
let thirstRate = 350
let hydration = 100
function animate() {
    const animationId = requestAnimationFrame(animate)
    renderer.render(scene, camera)

    player.velocity.x = 0
    player.velocity.z = 0
    if (keys.a.pressed) {
        player.velocity.x = -0.04
    } else if (keys.d.pressed) {
        player.velocity.x = 0.04
    }
    if (keys.w.pressed) {
        player.velocity.z = -0.04
    } else if (keys.s.pressed) {
        player.velocity.z = 0.04
    }

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

animate()
