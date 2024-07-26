import * as THREE from 'three'

import vertexShader from '../shaders/particles/vertex.glsl'
import fragmentShader from '../shaders/particles/fragment.glsl'
import { Dimensions } from '../types/types'
import { GLTF, GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

interface Props {
  scene: THREE.Scene
  dimensions: Dimensions
  gltfLoader: GLTFLoader
}

export default class Particles {
  dimensions: Dimensions
  gltfLoader: GLTFLoader
  material: THREE.ShaderMaterial
  geometry: THREE.BufferGeometry
  points: THREE.Points
  scene: THREE.Scene
  models: {
    geometry: THREE.BufferGeometry
    texture: THREE.Texture
  }[]
  currentModelIndex: number

  constructor({ scene, dimensions, gltfLoader }: Props) {
    this.scene = scene
    this.dimensions = dimensions
    this.gltfLoader = gltfLoader

    this.models = []
    this.currentModelIndex = 2

    this.loadModels()
  }

  createMaterial(texture?: THREE.Texture) {
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
        uSize: new THREE.Uniform(0.02),
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
      this.initModel()
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

        this.models.push({
          geometry: mesh.geometry,
          texture: material.map as THREE.Texture,
        })
      }
    })
  }

  initModel() {
    this.createGeometry(
      this.models[this.currentModelIndex].geometry.attributes.position as THREE.BufferAttribute,
      this.models[this.currentModelIndex].geometry.attributes.uv as THREE.BufferAttribute
    )
    this.createMaterial(this.models[this.currentModelIndex].texture)
    this.createPoints()
  }

  createGeometry(position: THREE.BufferAttribute, uv: THREE.BufferAttribute) {
    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', position)
    this.geometry.setAttribute('modelUv', uv)
    this.geometry.scale(10, 10, 10)
    this.geometry.rotateY(-Math.PI / 5)
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
}
