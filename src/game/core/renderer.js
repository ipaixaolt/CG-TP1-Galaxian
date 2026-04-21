export function clearScreen(gl) {
  gl.clear(gl.COLOR_BUFFER_BIT);
}

// configura a projeção
export function setProjection(gl, program, canvas) {
  const projectionMatrix = new Float32Array([
    2 / canvas.width, 0, 0,
    0, -2 / canvas.height, 0,
    -1, 1, 1
  ]);

  const uMatrix = gl.getUniformLocation(program, 'u_matrix');
  gl.uniformMatrix3fv(uMatrix, false, projectionMatrix);
}

// cria geometria quadrada
function createTexturedQuadGeometry(gl, program, width, height) {
  const halfW = width / 2;
  const halfH = height / 2;

  const positions = new Float32Array([
    -halfW, -halfH,
    halfW, -halfH,
    -halfW, halfH,

    -halfW, halfH,
    halfW, -halfH,
    halfW, halfH
  ]);

  const texCoords = new Float32Array([
    0, 1,
    1, 1,
    0, 0,

    0, 0,
    1, 1,
    1, 0
  ]);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.DYNAMIC_DRAW);

  return {
    positionBuffer,
    texCoordBuffer,
    vertexCount: 6,
    attributes: {
      position: gl.getAttribLocation(program, 'a_position'),
      texCoord: gl.getAttribLocation(program, 'a_texcoord')
    }
  };
}

// cria a geometria de textura do jogador
export function createPlayerGeometry(gl, program, player) {
  return createTexturedQuadGeometry(gl, program, player.width, player.height);
}


// cria a geometria de textura do projétil
export function createBulletGeometry(gl, program, size) {
  return createTexturedQuadGeometry(gl, program, size, size);
}

// cria a geometria de textura do fundo
export function createBackgroundGeometry(gl, program, canvas) {
  return createTexturedQuadGeometry(gl, program, canvas.width, canvas.height);
}

// Atualiza os UVs da geometria para exibir um novo frame da spritesheet
export function updateGeometryUVs(gl, geometry, uvs) {
  gl.bindBuffer(gl.ARRAY_BUFFER, geometry.texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.DYNAMIC_DRAW);
}

// Converte um recorte da spritesheet para coordenadas UV (0–1)
export function getFrameUVByPixels(frameX, frameY, frameWidth, frameHeight, imageWidth, imageHeight) {
  const u0 = frameX / imageWidth;
  const v0 = frameY / imageHeight;
  const u1 = (frameX + frameWidth) / imageWidth;
  const v1 = (frameY + frameHeight) / imageHeight;

  return [
    u0, v1,
    u1, v1,
    u0, v0,

    u0, v0,
    u1, v1,
    u1, v0
  ];
}

// carrega a textura
export function loadTexture(gl, path) {
  return new Promise((resolve, reject) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    const image = new Image();
    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

      resolve({
        texture,
        width: image.width,
        height: image.height
      });
    };

    image.onerror = () => reject(new Error(`Erro ao carregar imagem: ${path}`));
    image.src = path;
  });
}

// desenha a textura
export function drawTexturedObject(
  gl,
  program,
  geometry,
  texture,
  x,
  y,
  scaleX = 1,
  scaleY = 1,
  rotation = 0
) {
  const aPosition = geometry.attributes.position;
  const aTexCoord = geometry.attributes.texCoord;

  gl.bindBuffer(gl.ARRAY_BUFFER, geometry.positionBuffer);
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, geometry.texCoordBuffer);
  gl.enableVertexAttribArray(aTexCoord);
  gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);

  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  const modelMatrix = new Float32Array([
    cos * scaleX, sin * scaleX, 0,
    -sin * scaleY, cos * scaleY, 0,
    x, y, 1
  ]);

  const uModel = gl.getUniformLocation(program, 'u_model');
  gl.uniformMatrix3fv(uModel, false, modelMatrix);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  const uTexture = gl.getUniformLocation(program, 'u_texture');
  gl.uniform1i(uTexture, 0);

  gl.drawArrays(gl.TRIANGLES, 0, geometry.vertexCount);
}