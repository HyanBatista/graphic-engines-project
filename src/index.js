import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

const renderer = new THREE.WebGL1Renderer()
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
            this.velocity.z += 0.0003
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
            this.velocity.y *= 0.8
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

const player = new Box({
    width: 1,
    height: 1,
    depth: 1,
    velocity: {
        x: 0,
        y: -0.01,
        z: 0
    }
})
player.castShadow = true
scene.add(player)

const ground = new Box({
    width: 5,
    height: 0.5,
    depth: 10,
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
light.position.z = 2
light.castShadow = true
scene.add(light)

camera.position.z = 5

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
        x: 0,
        y: 0,
        z: -4
    },
    color: 'blue',
    zAcceleration: true
})
water.castShadow = true
scene.add(water)

const waters = [water]

let frames = 0
function animate() {
    const animationId = requestAnimationFrame(animate)
    renderer.render(scene, camera)

    player.velocity.x = 0
    player.velocity.z = 0
    if (keys.a.pressed) {
        player.velocity.x = -0.01
    } else if (keys.d.pressed) {
        player.velocity.x = 0.01
    }
    if (keys.w.pressed) {
        player.velocity.z = -0.01
    } else if (keys.s.pressed) {
        player.velocity.z = 0.01
    }

    player.update(ground)
    waters.forEach(water => {
        water.update(ground)
        if (boxCollision({
            box1: player,
            box2: water
        })) {
            cancelAnimationFrame(animationId)
        }
    })
    
    frames++
}

animate()
