import { createProgram, createShader, setupWebGL } from './utils/gl-utils.js';
import {
  clearScreen,
  createPlayerGeometry,
  setProjection,
  createBulletGeometry,
  loadTexture,
  drawTexturedObject,
  updateGeometryUVs,
  getFrameUVByPixels
} from './core/renderer.js';

import { createPlayer, updatePlayer, listenForPlayerInput } from './objects/player.js';
import { createBullet, updateBullet, BULLET_SIZE } from './objects/bullet.js';

const sceneObjects = {
  bullets: []
};

// links para as sprites
const ASSETS = {
  player: './assets/player.png',
  bullet: './assets/balloon.png'
};

// detalhes da spritesheet do player para recorte
const PLAYER_SPRITE = {
  frameWidth: 256,
  frameHeight: 256,
  totalFrames: 4
};

async function main() {
  const { canvas, gl } = setupWebGL('#game');
  const program = await initialize(gl);

  gl.clearColor(0, 0, 0, 1);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // inicializa jogador e projétil
  await setupPlayer(gl, program, canvas);
  await setupBullet(gl, program);

  setProjection(gl, program, canvas);

  listenForPlayerInput(sceneObjects.player.data, generateBullet); // cuida das ações do jogador

  let lastTime = performance.now();
  requestAnimationFrame(gameLoop);

  // loop principal
  function gameLoop(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    updatePlayer(sceneObjects.player.data, canvas, deltaTime); // atualiza o jogador

    sceneObjects.bullets = sceneObjects.bullets.filter((b) =>
      updateBullet(b, deltaTime)
    );

    render(gl, program, canvas);
    requestAnimationFrame(gameLoop);
  }
}

// inicializa shaders e o programa
async function initialize(gl) {
  const vertexShaderResponse = await fetch('./shaders/vertex-shader.glsl');
  if (!vertexShaderResponse.ok) {
    throw new Error('Falha ao carregar o shader de vértice');
  }

  const fragmentShaderResponse = await fetch('./shaders/fragment-shader.glsl');
  if (!fragmentShaderResponse.ok) {
    throw new Error('Falha ao carregar o shader de fragmento');
  }

  const vertexShaderSource = await vertexShaderResponse.text();
  const fragmentShaderSource = await fragmentShaderResponse.text();

  const program = createProgram(
    gl,
    createShader(gl, 'vs', gl.VERTEX_SHADER, vertexShaderSource),
    createShader(gl, 'fs', gl.FRAGMENT_SHADER, fragmentShaderSource)
  );

  gl.useProgram(program);
  return program;
}

// inicialização do jogador
async function setupPlayer(gl, program, canvas) {
  const player = createPlayer(canvas);

  player.totalFrames = PLAYER_SPRITE.totalFrames;

  const geometry = createPlayerGeometry(gl, program, player);
  const textureInfo = await loadTexture(gl, ASSETS.player);

  const initialUVs = getFrameUVByPixels(
    0,
    0,
    PLAYER_SPRITE.frameWidth,
    PLAYER_SPRITE.frameHeight,
    textureInfo.width,
    textureInfo.height
  );

  updateGeometryUVs(gl, geometry, initialUVs);

  sceneObjects.player = {
    geometry,
    texture: textureInfo.texture,
    textureInfo,
    data: player
  };
}

// inicialização do projétil
async function setupBullet(gl, program) {
  const geometry = createBulletGeometry(gl, program, BULLET_SIZE);
  const textureInfo = await loadTexture(gl, ASSETS.bullet);

  sceneObjects.bullet = {
    geometry,
    texture: textureInfo.texture
  };
}

// gera projéteis a partir da posição do jogador
function generateBullet() {
  sceneObjects.bullets.push(createBullet(sceneObjects.player.data));
}

// atualiza a animação do jogador
function updatePlayerAnimationUV(gl) {
  const playerObject = sceneObjects.player;
  const player = playerObject.data;
  const frameX = player.animationFrame * PLAYER_SPRITE.frameWidth;

  const uvs = getFrameUVByPixels(
    frameX,
    0,
    PLAYER_SPRITE.frameWidth,
    PLAYER_SPRITE.frameHeight,
    playerObject.textureInfo.width,
    playerObject.textureInfo.height
  );

  updateGeometryUVs(gl, playerObject.geometry, uvs);
}

// renderiza a cena
function render(gl, program, canvas) {
  clearScreen(gl);
  setProjection(gl, program, canvas);

  const player = sceneObjects.player.data;

  updatePlayerAnimationUV(gl);

  // desenha o jogador com textura
  drawTexturedObject(
    gl,
    program,
    sceneObjects.player.geometry,
    sceneObjects.player.texture,
    player.x,
    player.y,
    player.facing,
    1,
    player.angle
  );

  // desenha os projéteis com textura
  sceneObjects.bullets.forEach((b) => {
    drawTexturedObject(
      gl,
      program,
      sceneObjects.bullet.geometry,
      sceneObjects.bullet.texture,
      b.x,
      b.y,
      1,
      1,
      0
    );
  });
}

main().catch((error) => {
  console.error(error);
});