#version 300 es
precision mediump float;

in vec2 a_position;
in vec2 a_texcoord;

uniform mat3 u_matrix;
uniform mat3 u_model;

out vec2 v_texcoord;

void main() {
    vec3 worldPosition = u_model * vec3(a_position, 1.0);
    vec3 clipSpace = u_matrix * worldPosition;

    gl_Position = vec4(clipSpace.xy, 0.0, 1.0);
    v_texcoord = a_texcoord;
}