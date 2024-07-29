import * as THREE from 'three'

import vertexShader from '../shaders/particles/vertex.glsl'
import fragmentShader from '../shaders/particles/fragment.glsl'
import { Dimensions } from '../types/types'
import { GLTF, GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import GUI from 'lil-gui'
import GPGPU from './gpgpu'
import gsap from 'gsap'

interface Props {
  scene: THREE.Scene
  dimensions: Dimensions
  gltfLoader: GLTFLoader
  debug: GUI
  renderer: THREE.WebGLRenderer
}

export default class Particles {
  dimensions: Dimensions
  gltfLoader: GLTFLoader
  renderer: THREE.WebGLRenderer
  material: THREE.ShaderMaterial
  geometry: THREE.BufferGeometry
  points: THREE.Points
  scene: THREE.Scene
  verticesCount: number
  models: {
    //will store the base geometries
    geometry: THREE.BufferGeometry
    texture: THREE.Texture
  }[]
  currentModelIndex: number
  debug: GUI
  gpgpus: GPGPU[]
  time: number

  constructor({ scene, dimensions, gltfLoader, debug, renderer }: Props) {
    this.scene = scene
    this.dimensions = dimensions
    this.gltfLoader = gltfLoader
    this.debug = debug
    this.renderer = renderer

    this.models = []
    this.gpgpus = []
    this.currentModelIndex = 0
    this.time = 0

    this.loadModels()
  }

  createMaterial() {
    if (this.material) {
      this.material.dispose()
    }

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uResolution: new THREE.Uniform(
          new THREE.Vector2(
            this.dimensions.width * this.dimensions.pixelRatio,
            this.dimensions.height * this.dimensions.pixelRatio
          )
        ),
        //particles colors
        uTexture: new THREE.Uniform(new THREE.Vector4()),
        uTargetTexture: new THREE.Uniform(new THREE.Vector4()),

        uSize: new THREE.Uniform(0.03),
        uProgress: new THREE.Uniform(0),

        //gpgpu variables
        uParticles: new THREE.Uniform(new THREE.Vector4()),
        uParticlesTarget: new THREE.Uniform(new THREE.Vector4()),
      },
    })
  }

  loadModels() {
    const promises = Promise.all([
      this.loadModel('./static/nissan_skyline/scene.gltf'),
      this.loadModel('./static/suzuki_alto/scene.gltf'),
      this.loadModel('./static/volkswagen_van/scene.gltf'),
    ])

    promises.then(() => {
      this.setupBaseGeometries()
    })
  }

  loadModel(url: string) {
    return new Promise<void>((resolve) => {
      this.gltfLoader.load(url, (gltf) => {
        this.onModelLoaded(gltf)
        resolve()
      })
    })
  }

  onModelLoaded(gltf: GLTF) {
    gltf.scene.traverse((child) => {
      if ('isMesh' in child && child.isMesh) {
        const mesh = child as THREE.Mesh
        const material = mesh.material as THREE.MeshStandardMaterial
        const geometry = mesh.geometry as THREE.BufferGeometry
        const { customScale } = gltf.parser.json
        geometry.scale(customScale, customScale, customScale)
        geometry.rotateY(-Math.PI / 5)

        this.models.push({
          geometry: geometry,
          texture: material.map as THREE.Texture,
        })
      }
    })
  }

  setupBaseGeometries() {
    this.verticesCount = 0

    this.models.forEach((model) => {
      const { count } = model.geometry.attributes.position
      if (count > this.verticesCount) this.verticesCount = count
    })

    this.models.map((model) => {
      const { count } = model.geometry.attributes.position

      const newPositionsArray = new Float32Array(this.verticesCount * 3)
      const newUvsArray = new Float32Array(this.verticesCount * 2)

      for (let i = 0; i < this.verticesCount; i++) {
        const i3 = i * 3
        const i2 = i * 2

        if (i < count) {
          newPositionsArray[i3] = model.geometry.attributes.position.array[i3]
          newPositionsArray[i3 + 1] = model.geometry.attributes.position.array[i3 + 1]
          newPositionsArray[i3 + 2] = model.geometry.attributes.position.array[i3 + 2]

          newUvsArray[i2] = model.geometry.attributes.uv.array[i2]
          newUvsArray[i2 + 1] = model.geometry.attributes.uv.array[i2 + 1]
        } else {
          const rand = Math.random()

          const randI3 = rand * this.verticesCount * 3 - 3
          const randI2 = rand * this.verticesCount * 2 - 2

          newPositionsArray[randI3] = model.geometry.attributes.position.array[randI3]
          newPositionsArray[randI3 + 1] = model.geometry.attributes.position.array[randI3 + 1]
          newPositionsArray[randI3 + 2] = model.geometry.attributes.position.array[randI3 + 2]

          newUvsArray[randI2] = model.geometry.attributes.uv.array[randI2]
          newUvsArray[randI2 + 1] = model.geometry.attributes.uv.array[randI2 + 1]
        }
      }

      model.geometry.setAttribute('position', new THREE.BufferAttribute(newPositionsArray, 3))
      model.geometry.setAttribute('uv', new THREE.BufferAttribute(newUvsArray, 2))

      return model
    })

    this.models.forEach((model) => {
      this.createGPGPU(model.geometry)
    })

    this.createGeometry()
    this.createMaterial()
    this.createPoints()

    this.setDebug()

    this.geometry.setAttribute('modelUv', this.models[this.currentModelIndex].geometry.attributes.uv)
    this.material.uniforms.uTexture.value = this.models[this.currentModelIndex].texture
  }

  setDebug() {
    this.debug.add(this.material.uniforms.uProgress, 'value').min(0).max(1).step(0.001).name('progress').listen()

    const f: any = {}

    f.m0 = () => this.transitionModel(0)
    f.m1 = () => this.transitionModel(1)
    f.m2 = () => this.transitionModel(2)

    this.debug.add(f, 'm0')
    this.debug.add(f, 'm1')
    this.debug.add(f, 'm2')
  }

  createGeometry() {
    const particlesUvArray = new Float32Array(this.verticesCount * 2)

    const gpgpuSize = this.gpgpus[this.currentModelIndex].size
    const sizesArray = new Float32Array(this.verticesCount)

    for (let y = 0; y < gpgpuSize; y++) {
      for (let x = 0; x < gpgpuSize; x++) {
        const i = y * gpgpuSize + x
        const i2 = i * 2

        const uvX = (x + 0.5) / gpgpuSize
        const uvY = (y + 0.5) / gpgpuSize

        particlesUvArray[i2] = uvX
        particlesUvArray[i2 + 1] = uvY
      }
    }

    for (let i = 0; i < this.verticesCount; i++) {
      sizesArray[i] = Math.random()
    }

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setDrawRange(0, this.verticesCount)

    this.geometry.setAttribute('aParticlesUv', new THREE.BufferAttribute(particlesUvArray, 2))
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(sizesArray, 1))
  }

  transitionModel(index: number) {
    this.geometry.setAttribute('targetModelUv', this.models[index].geometry.attributes.uv)
    this.material.uniforms.uTargetTexture.value = this.models[index].texture
    this.material.uniforms.uParticlesTarget.value = this.gpgpus[index].getTexture()

    gsap.to(this.material.uniforms.uProgress, {
      value: 1,
      duration: 2,
      ease: 'linear',
      onComplete: () => {
        this.material.uniforms.uProgress.value = 0

        this.geometry.setAttribute('modelUv', this.models[index].geometry.attributes.uv)
        this.material.uniforms.uTexture.value = this.models[index].texture
        this.material.uniforms.uParticles.value = this.gpgpus[index].getTexture()

        this.currentModelIndex = index
      },
    })
  }

  onResize(dimensions: Dimensions) {
    this.dimensions = dimensions

    this.material.uniforms.uResolution.value = new THREE.Vector2(
      this.dimensions.width * this.dimensions.pixelRatio,
      this.dimensions.height * this.dimensions.pixelRatio
    )
  }

  createPoints() {
    this.points = new THREE.Points(this.geometry, this.material)

    this.scene.add(this.points)
  }

  createGPGPU(geometry: THREE.BufferGeometry) {
    this.gpgpus.push(
      new GPGPU({
        count: this.verticesCount,
        geometry: geometry,
        renderer: this.renderer,
        scene: this.scene,
      })
    )
  }

  render(time: number) {
    const deltaTime = time - this.time
    this.time = time

    this.gpgpus.forEach((gpgpu) => {
      gpgpu.render(time, deltaTime)
    })

    if (this.material && this.gpgpus[this.currentModelIndex]) {
      this.material.uniforms.uParticles.value = this.gpgpus[this.currentModelIndex].getTexture()
    }
  }
}
