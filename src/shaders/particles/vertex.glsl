uniform vec2 uResolution;
uniform float uSize;
uniform float uProgress;
uniform float uDeltaTime;

uniform sampler2D uTexture;
uniform sampler2D uTargetTexture;
uniform sampler2D uParticles;
uniform sampler2D uParticlesTarget;

attribute vec2 modelUv;
attribute vec2 targetModelUv;
attribute vec2 aParticlesUv;
attribute float aSize;

varying vec3 vColor;

#include ../includes/simplexNoise3d.glsl;
#include ../includes/rotateY.glsl;

void main()
{            
    
    vec4 baseParticle = texture(uParticles,aParticlesUv);
    vec4 targetParticle = texture(uParticlesTarget,aParticlesUv);
    
    float noiseOrigin = simplexNoise3d(0.2*baseParticle.rgb);
    float noiseTarget = simplexNoise3d(0.2*targetParticle.rgb);

    float noise = mix(noiseOrigin,noiseTarget,uProgress);
    
    noise = smoothstep(-1.,1.,noise);
    
    float duration = 0.4;
    float delay = (1.-duration)*noise;
    float end = delay + duration;

    float progress = smoothstep(delay,end,uProgress);

    vec4 particle =mix(baseParticle,targetParticle,progress);    
    
    vec4 modelPosition = modelMatrix * vec4(particle.rgb, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;
    

    float sizeIn = smoothstep(0.,0.1,particle.a);
    float sizeOut = smoothstep(1.,0.8,particle.a);
    float size = min(sizeIn,sizeOut);

    gl_PointSize = uSize*size*aSize*uResolution.y;
    gl_PointSize *= (1.0 / - viewPosition.z);

    vec4 baseColor = texture(uTexture,modelUv);
    vec4 targetColor = texture(uTargetTexture,targetModelUv);

    vec4 color = mix(baseColor,targetColor,progress);

    vColor = color.rgb;


}