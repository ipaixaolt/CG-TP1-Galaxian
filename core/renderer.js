/* LIMPA A TELA */
export function clearScreen(gl) {
  gl.clear(gl.COLOR_BUFFER_BIT);
}

/* CRIA A GEOMETRIA DO JOGADOR E CONFIGURA A PROJEÇÃO ORTOGRÁFICA */
export function createPlayerGeometry(gl, program, player) {
  // centraliza o jogador na tela de acordo com seu tamanho
  const vertices = new Float32Array([
    player.size, player.size, // vértice superior direito
    player.size, -player.size, // vértice inferior direito
    -player.size, -player.size, // vértice inferior esquerdo
    -player.size, player.size // vértice superior esquerdo
  ]);

  // vao, vbo para geometria do jogador
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  // configuração do atributo de posição
  const positionAttributeLocation  = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(positionAttributeLocation );
  gl.vertexAttribPointer(positionAttributeLocation , 2, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return vao;
}

/* CONFIGURA A PROJEÇÃO ORTOGRÁFICA PARA O JOGO */
export function setProjection(gl, program, canvas) {
  const projectionLocation = gl.getUniformLocation(program, 'projection');
  const projectionMatrix = new Float32Array([
    2 / canvas.width, 0, 0, 0,
    0, -2 / canvas.height, 0, 0,
    0, 0, 1, 0,
    -1, 1, 0, 1
  ]);
  gl.uniformMatrix4fv(projectionLocation, false, projectionMatrix);
}