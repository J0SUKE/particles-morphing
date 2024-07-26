import * as THREE from 'three'

import vertexShader from '../shaders/particles/vertex.glsl'
import fragmentShader from '../shaders/particles/fragment.glsl'
import { Dimensions } from '../types/types'

interface Props {
  scene: THREE.Scene
  dimensions: Dimensions
}

export default class Particles {
  dimensions: Dimensions
  material: THREE.ShaderMaterial
  geometry: THREE.SphereGeometry
  points: THREE.Points
  scene: THREE.Scene

  constructor({ scene, dimensions }: Props) {
    this.scene = scene
    this.dimensions = dimensions

    this.createGeometry()
    this.createMaterial()
    this.createPoints()
  }

  createMaterial() {
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
        uSize: new THREE.Uniform(0.05),
      },
    })
  }

  createGeometry() {
    this.geometry = new THREE.SphereGeometry(2)
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
