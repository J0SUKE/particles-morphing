import * as THREE from 'three'
import fragmentShader from '../shaders/gpgpu/particles.glsl'
import { GPUComputationRenderer, Variable } from 'three/addons/misc/GPUComputationRenderer.js'

interface Props {
  count: number
  geometry: THREE.BufferGeometry
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
}

export default class GPGPU {
  time: number
  count: number
  size: number
  baseGeometry: THREE.BufferGeometry
  gpgpuRenderer: GPUComputationRenderer
  renderer: THREE.WebGLRenderer
  dataTexture: THREE.DataTexture
  variable: Variable
  targetVariable: Variable
  debugPlane: THREE.Mesh
  scene: THREE.Scene

  constructor({ count, geometry, renderer, scene }: Props) {
    this.count = count
    this.scene = scene
    this.renderer = renderer
    this.size = Math.ceil(Math.sqrt(this.count))
    this.time = 0
    this.baseGeometry = geometry

    this.createGPGPURenderer()
    this.createDataTexture()
    this.createVariable()
    this.setRendererDependencies()
    this.initiateRenderer()
    this.createDebugPlane()
  }

  createGPGPURenderer() {
    this.gpgpuRenderer = new GPUComputationRenderer(this.size, this.size, this.renderer)
  }

  createDataTexture() {
    this.dataTexture = this.gpgpuRenderer.createTexture()

    //Fill the texture with the initial geometry vertices
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3
      const i4 = i * 4

      this.dataTexture.image.data[i4] = this.baseGeometry.attributes.position.array[i3]
      this.dataTexture.image.data[i4 + 1] = this.baseGeometry.attributes.position.array[i3 + 1]
      this.dataTexture.image.data[i4 + 2] = this.baseGeometry.attributes.position.array[i3 + 2]

      this.dataTexture.image.data[i4 + 3] = 0
    }
    //
  }

  createVariable() {
    this.variable = this.gpgpuRenderer.addVariable('uParticles', fragmentShader, this.dataTexture)

    this.variable.material.uniforms.uDeltaTime = new THREE.Uniform(0)
    this.variable.material.uniforms.uProgress = new THREE.Uniform(0)
  }

  setRendererDependencies() {
    this.gpgpuRenderer.setVariableDependencies(this.variable, [this.variable])
  }

  initiateRenderer() {
    this.gpgpuRenderer.init()
  }

  createDebugPlane() {
    this.debugPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: this.gpgpuRenderer.getCurrentRenderTarget(this.variable).texture,
      })
    )

    this.debugPlane.scale.set(4, 4, 4)
    this.debugPlane.position.set(-4, 4, 0)

    this.scene.add(this.debugPlane)
  }

  getTexture() {
    return this.gpgpuRenderer.getCurrentRenderTarget(this.variable).textures[0]
  }

  render(time: number) {
    const deltaTime = time - this.time
    this.time = time

    this.variable.material.uniforms.uDeltaTime.value = deltaTime

    this.gpgpuRenderer.compute()
  }
}
