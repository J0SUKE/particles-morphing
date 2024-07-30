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

    base.rgb = rotateY(uTime*0.2)*base.rgb;
    
    if(particle.a>=1.)
    {
        particle.a  = mod(particle.a,1.);        
        particle.xyz = base.xyz;
    }
    else{
        
        float strenght = simplexNoise4d(vec4(base.xyz,time+1.));
        strenght = smoothstep(-0.2,1.,strenght);
        
        vec3 flowField = vec3(
            simplexNoise4d(vec4(particle.xyz,time)),
            simplexNoise4d(vec4(particle.xyz+1.,time)),
            simplexNoise4d(vec4(particle.xyz+2.,time))
        );

        flowField = normalize(flowField);
        particle.xyz += flowField*uDeltaTime*strenght*0.5;
        
        particle.a += uDeltaTime*0.3;        
    }        
        
    particle.rgb = rotateY(uDeltaTime*0.2)*particle.rgb;        
    
    gl_FragColor = particle;
}