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