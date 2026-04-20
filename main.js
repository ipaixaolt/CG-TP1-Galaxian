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
import { createBullet, createEnemyBullet, updateBullet, BULLET_SIZE } from './objects/bullet.js';

// funções dos inimigos
import {
  createEnemies,
  updateEnemies,
  createEnemyGeometry
} from './objects/enemies.js';

// funções das colisões
import {
  checkPlayerBulletCollisions,
  checkEnemyBulletCollision,
  checkEnemiesReachedGround,
  checkVictory
} from './objects/collision.js';

// função do mutante
function spawnMutant(canvas) {
  mutantActive = true;

  mutant = {
    x: canvas.width / 2,
    y: canvas.height / 2
  };
}


const sceneObjects = {
  bullets: []
};

// estado inicial do jogo
let gameState = 'playing';
let mutantActive = false;
let mutant = null;

// UI
const overlay = document.getElementById('overlay');
const message = document.getElementById('message');

// links para as sprites
const ASSETS = {
  player: './assets/player.png',
  bullet: './assets/balloon.png',
  enemyIdle: './assets/enemy-idle.png',
  enemyShooting: './assets/enemy-shooting.png',
  enemyBullet: './assets/balloon-enemy.png',
  enemyDying: './assets/enemy-dying.png',
  enemyMutant: './assets/enemy-mutante.png'
};

const PLAYER_SPRITE = {
  frameWidth: 256,
  frameHeight: 256,
  totalFrames: 4
};

async function main() {
  const { canvas, gl } = setupWebGL('#game');
  const program = await initialize(gl);

// configurações 
  gl.clearColor(0, 0, 0, 1);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

// inicializa jogador, projéteis e inimigos
  await setupPlayer(gl, program, canvas);
  await setupBullet(gl, program);
  await setupEnemies(gl, program, canvas);

  setProjection(gl, program, canvas);

  listenForPlayerInput(sceneObjects.player.data, generateBullet);

  let lastTime = performance.now();
  requestAnimationFrame(gameLoop);

 // loop principal
  function gameLoop(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

// atualiza jogador, inimigos e projeteis
    if (gameState === 'playing') {
      updatePlayer(sceneObjects.player.data, canvas, deltaTime);

      updateEnemies(sceneObjects.enemies.data, canvas, spawnEnemyBullet);
       // remove a bala que atingiu o inimigo 
      sceneObjects.bullets = sceneObjects.bullets.filter((b) =>
            b.active && updateBullet(b, deltaTime)
      );

      // checa tiros do player nos inimigos
      checkPlayerBulletCollisions(
        sceneObjects.bullets,
        sceneObjects.enemies.data
      );

      if (checkEnemyBulletCollision(sceneObjects.bullets, sceneObjects.player.data)) {
        gameState = 'gameover';
      }

// checa game over quando inimigo chegou no solo
      if (checkEnemiesReachedGround(
        sceneObjects.enemies.data,
        sceneObjects.player.data
      )) {
         spawnMutant(canvas);
  // remove todos os inimigos para virar o mutante
  sceneObjects.enemies.data.list.forEach(e => e.alive = false);
        gameState = 'gameover';
      }

// checa vitória se todos os inimigos estão mortos
     if (
  gameState === 'playing' &&
  checkVictory(sceneObjects.enemies.data)
) {
  gameState = 'victory';
}
    }

// renderiza cena
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

  // carrega textura do tiro do jogador
  const playerTex = await loadTexture(gl, ASSETS.bullet);

  // carrega textura do tiro do inimigo
  const enemyTex = await loadTexture(gl, ASSETS.enemyBullet);

  sceneObjects.bullet = {
    geometry,
    textures: {
      player: playerTex.texture,
      enemy: enemyTex.texture
    }
  };
}

// inicialização dos inimigos
async function setupEnemies(gl, program, canvas) {
  const enemies = createEnemies(canvas);

  const geometry = createEnemyGeometry(gl, program, 30);
const mutantGeometry = createEnemyGeometry(gl, program, 80);

  const idleTexture = await loadTexture(gl, ASSETS.enemyIdle);
  const mutantTexture = await loadTexture(gl, ASSETS.enemyMutant);
  const shootingTexture = await loadTexture(gl, ASSETS.enemyShooting);
  const dyingTexture = await loadTexture(gl, ASSETS.enemyDying); 

  sceneObjects.enemies = {
  geometry,
  mutantGeometry,
  textures: {
    idle: idleTexture.texture,
    shooting: shootingTexture.texture,
    dying: dyingTexture.texture,
    mutant: mutantTexture.texture 
  },
  data: enemies
};
}
// gera projéteis a partir da posição do jogador
function generateBullet() {
  sceneObjects.bullets.push(createBullet(sceneObjects.player.data));
}

// gera projéteis a partir da posição do inimigo
function spawnEnemyBullet(enemy) {
  const bullet = createEnemyBullet(enemy);
  sceneObjects.bullets.push(bullet);
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

// desenha o jogador
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

// desenha inimigos
  sceneObjects.enemies.data.list.forEach((enemy) => {
    if (!enemy.alive) return;

   let texture;

if (enemy.state === 'dying') {
  texture = sceneObjects.enemies.textures.dying;
} else if (enemy.state === 'shooting') {
  texture = sceneObjects.enemies.textures.shooting;
} else {
  texture = sceneObjects.enemies.textures.idle;
}

    drawTexturedObject(
      gl,
      program,
      sceneObjects.enemies.geometry,
      texture,
      enemy.x,
      enemy.y,
      1,
      1,
      0
    );
  });

  // desenha mutante (caso ativo)
if (
  mutantActive &&
  mutant &&
  sceneObjects.enemies.textures.mutant
) {
  drawTexturedObject(
    gl,
    program,
   sceneObjects.enemies.mutantGeometry,
    sceneObjects.enemies.textures.mutant,
    mutant.x,
    mutant.y,
    1, 
    1,
    0
  );
}

 // desenha projéteis
  sceneObjects.bullets.forEach((b) => {
    const texture =
      b.type === 'enemy'
        ? sceneObjects.bullet.textures.enemy
        : sceneObjects.bullet.textures.player;

    drawTexturedObject(
      gl,
      program,
      sceneObjects.bullet.geometry,
      texture,
      b.x,
      b.y,
      1,
      1,
      0
    );
  });

  // UI
  if (gameState === 'gameover' && overlay.classList.contains('hidden')) {
    overlay.classList.remove('hidden');
    overlay.classList.add('gameover');
    message.innerText = 'GAME OVER';
  }

  if (gameState === 'victory'&& overlay.classList.contains('hidden')) {
    overlay.classList.remove('hidden');
    overlay.classList.add('victory');
    message.innerText = 'VITÓRIA';
  }

  console.log(mutantActive, mutant);
}

main().catch((error) => {
  console.error(error);
});