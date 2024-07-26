import * as THREE from 'three'
import fragmentShader from '../shaders/gpgpu/particles.glsl'
import { GPUComputationRenderer, Variable } from 'three/addons/misc/GPUComputationRenderer.js'

interface Props {
  count: number
  geometry: THREE.BufferGeometry
  renderer: THREE.WebGLRenderer
}

export default class GPGPU {
  time: number
  count: number
  size: number
  geometry: THREE.BufferGeometry
  gpgpuRenderer: GPUComputationRenderer
  renderer: THREE.WebGLRenderer
  dataTexture: THREE.DataTexture
  variable: Variable

  constructor({ count, geometry, renderer }: Props) {
    this.count = count
    this.renderer = renderer
    this.size = Math.ceil(Math.sqrt(this.count))
    this.time = 0
    this.geometry = geometry

    this.createGPGPURenderer()

    this.createDataTexture()

    this.createVariable()
  }

  createGPGPURenderer() {
    this.gpgpuRenderer = new GPUComputationRenderer(this.size, this.size, this.renderer)
  }

  createDataTexture() {
    this.dataTexture = this.gpgpuRenderer.createTexture()
  }

  createVariable() {
    this.variable = this.gpgpuRenderer.addVariable('uParticles', fragmentShader, this.dataTexture)
  }

  createDebugPlane() {}

  render(time: number) {
    this.time = time
  }
}
