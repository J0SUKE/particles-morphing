import * as THREE from 'three'

import vertexShader from '../shaders/particles/vertex.glsl'
import fragmentShader from '../shaders/particles/fragment.glsl'
import { Dimensions } from '../types/types'
import { GLTF, GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import GUI from 'lil-gui'
import GPGPU from './gpgpu'

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
    geometry: THREE.BufferGeometry
    texture: THREE.Texture
  }[]
  currentModelIndex: number
  debug: GUI
  gpgpu: GPGPU
  time: number

  constructor({ scene, dimensions, gltfLoader, debug, renderer }: Props) {
    this.scene = scene
    this.dimensions = dimensions
    this.gltfLoader = gltfLoader
    this.debug = debug
    this.renderer = renderer

    this.models = []
    this.currentModelIndex = 2
    this.time = 0

    this.loadModels()
  }

  createMaterial(texture?: THREE.Texture) {
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
        uTexture: new THREE.Uniform(texture),
        uSize: new THREE.Uniform(0.04),
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
      this.initModels()
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
        geometry.scale(10, 10, 10)
        geometry.rotateY(-Math.PI / 5)

        this.models.push({
          geometry: geometry,
          texture: material.map as THREE.Texture,
        })
      }
    })
  }

  initModels() {
    this.verticesCount = 0
    this.models.forEach((model) => {
      const { count } = model.geometry.attributes.position
      if (count > this.verticesCount) this.verticesCount = count
    })

    this.models.map((model) => {
      const { count } = model.geometry.attributes.position

      const newPositionsArray = new Float32Array(this.verticesCount * 3)
      const newUvsArray = new Float32Array(this.verticesCount * 2)
      const sizesArray = new Float32Array(this.verticesCount)

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

        sizesArray[i] = Math.random()
      }

      model.geometry.setAttribute('position', new THREE.BufferAttribute(newPositionsArray, 3))
      model.geometry.setAttribute('uv', new THREE.BufferAttribute(newUvsArray, 2))
      model.geometry.setAttribute('aSize', new THREE.BufferAttribute(sizesArray, 1))

      return model
    })

    this.setDebug()
    this.selectModel(0)
    this.createGPGPU()
  }

  selectModel(index: number) {
    if (this.points) {
      this.scene.remove(this.points)
    }

    this.currentModelIndex = index

    this.createGeometry(
      this.models[this.currentModelIndex].geometry.attributes.position as THREE.BufferAttribute,
      this.models[this.currentModelIndex].geometry.attributes.uv as THREE.BufferAttribute
    )
    this.createMaterial(this.models[this.currentModelIndex].texture)
    this.createPoints()
  }

  setDebug() {
    const f: any = {}

    f.model0 = () => {
      this.selectModel(0)
    }
    f.model1 = () => {
      this.selectModel(1)
    }
    f.model2 = () => {
      this.selectModel(2)
    }

    this.debug.add(f, 'model0')
    this.debug.add(f, 'model1')
    this.debug.add(f, 'model2')
  }

  createGeometry(position: THREE.BufferAttribute, uv: THREE.BufferAttribute) {
    if (this.geometry) {
      this.geometry.dispose()
    }

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', position)
    this.geometry.setAttribute('modelUv', uv)
    this.geometry.setAttribute('aSize', this.models[this.currentModelIndex].geometry.attributes.aSize)
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

  createGPGPU() {
    this.gpgpu = new GPGPU({ count: this.verticesCount, geometry: this.geometry, renderer: this.renderer })
  }

  render(time: number) {
    const deltaTime = time - this.time
    this.time = time

    this.geometry?.rotateY(deltaTime * 0.1)

    this.gpgpu?.render(time)
  }
}
