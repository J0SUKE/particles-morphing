#include ../includes/simplexNoise4d.glsl;
#include ../includes/rotateY.glsl;

uniform float uTime;
uniform float uDeltaTime;
uniform sampler2D uBase;


void main()
{
    float time = uTime*0.1;
    
    vec2 uv = gl_FragCoord.xy/resolution.xy;

    vec4 particle = texture(uParticles,uv);
    vec4 base = texture(uBase,uv);
    

    particle.rgb = rotateY(uDeltaTime*0.2)*particle.rgb;    
    base.rgb = rotateY(uDeltaTime*0.2)*particle.rgb;    
    
    gl_FragColor = particle;
}