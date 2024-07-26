uniform float uDeltaTime;
uniform float uProgress;

mat3 rotateY(float angle)
{
    float c = cos(angle);
    float s = sin(angle);

    return mat3(
        vec3(c,0.,-s),
        vec3(0.,1.,0.),
        vec3(s,0.,c)
    );
}


void main()
{
    vec2 uv = gl_FragCoord.xy/resolution.xy;

    vec4 texel = texture(uParticles,uv);

    texel.rgb = rotateY(uDeltaTime*0.2)*texel.rgb;
    
    gl_FragColor = texel;
}