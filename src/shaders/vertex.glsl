varying vec2 vUv;
varying vec2 vCoordinates;
attribute vec3 aCoordinates;

void main(){
    

    vec4 myPosition = modelViewMatrix * vec4(position, 1.0);
    
    gl_PointSize = 400. * (1./ -myPosition.z);
    gl_Position = projectionMatrix * myPosition;

    vCoordinates = aCoordinates.xy; //Custom Geometry
    vUv = uv; // THREEjs normals
} 