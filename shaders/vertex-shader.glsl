 #version 300 es

in vec2 position;

uniform mat4 projection;
uniform vec2 offset;

void main() {
    vec2 finalPosition = position + offset;
    gl_Position = projection * vec4(finalPosition, 0.0, 1.0);
}