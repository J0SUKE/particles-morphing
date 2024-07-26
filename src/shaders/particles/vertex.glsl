uniform vec2 uResolution;
uniform float uSize;
uniform float uProgress;

uniform sampler2D uTexture;
uniform sampler2D uTargetTexture;
uniform sampler2D uParticlesTexture;
uniform sampler2D uParticlesTargetTexture;

attribute vec2 modelUv;
attribute vec2 targetModelUv;
attribute vec2 aParticlesUv;
attribute float aSize;
varying vec3 vColor;

#include ../includes/simplexNoise3d.glsl;

void main()
{
    
    
    
    float progress = uProgress;
    
    vec4 baseParticle = texture(uParticlesTexture,aParticlesUv);
    vec4 targetParticle = texture(uParticlesTargetTexture,aParticlesUv);

    vec3 particle =mix(baseParticle.rgb,targetParticle.rgb,progress);
    
    
    vec4 modelPosition = modelMatrix * vec4(particle.rgb, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    gl_PointSize = uSize*aSize *uResolution.y;
    gl_PointSize *= (1.0 / - viewPosition.z);

    vec4 baseTexel = texture(uTexture,mix(modelUv,targetModelUv,progress));
    vec4 targetTexel = texture(uTargetTexture,mix(modelUv,targetModelUv,progress));

    vec4 texel = mix(baseTexel,targetTexel,progress);

    vColor = texel.rgb;


}