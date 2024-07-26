varying vec3 vColor;

void main()
{
    vec2 uv = gl_PointCoord;
    float dist = distance(vec2(0.5),uv);
    if(dist>0.5)
    {
        discard;
    }
    
    gl_FragColor = vec4(vColor,1.);
}