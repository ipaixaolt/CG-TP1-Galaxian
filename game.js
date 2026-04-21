import { createProgram, createShader, setupWebGL } from './utils/gl-utils.js';
import {
  clearScreen,
  createPlayerGeometry,
  createBulletGeometry,
  createBackgroundGeometry,
  setProjection,
  loadTexture,
  drawTexturedObject,
  updateGeometryUVs,
  getFrameUVByPixels
} from './core/renderer.js';

import { createPlayer, updatePlayer, listenForPlayerInput } from './objects/player.js';
import { createBullet, createEnemyBullet, updateBullet, BULLET_SIZE } from './objects/bullet.js';
import { createEnemies, updateEnemies, createEnemyGeometry } from './objects/enemies.js';
import {
  checkPlayerBulletCollisions,
  checkEnemyBulletCollision,
  checkEnemiesReachedGround,
  checkVictory
} from './objects/collision.js';

const backgroundMusic = new Audio('./assets/audio/background-music.mp3');

// efeitos sonoros
const audios = {
  enemyDeath: new Audio('./assets/audio/enemy-death.mp3'),
  shoot: new Audio('./assets/audio/balloon-pop.mp3'),
  playerHit: new Audio('./assets/audio/player-hit.mp3'),
  playerDeath: new Audio('./assets/audio/player-death.mp3'),
  victory: new Audio('./assets/audio/victory.mp3'),
  mutantSpawn: new Audio('./assets/audio/mutant-spawn.mp3'),
  mutantDeath: new Audio('./assets/audio/mutant-death.mp3')
};

backgroundMusic.loop = true;
backgroundMusic.volume = 0.5;

audios.enemyDeath.volume = 0.6;
audios.shoot.volume = 0.6;
audios.playerHit.volume = 0.6;
audios.playerDeath.volume = 0.6;
audios.victory.volume = 0.6;
audios.mutantSpawn.volume = 0.7;
audios.mutantDeath.volume = 0.8;

const sceneObjects = {
  bullets: [],
  background: null,
  player: null,
  bullet: null,
  enemies: null
};

// estados do jogo
const GAME_STATES = {
  PLAYING: 'playing',
  MUTANT_PHASE: 'mutantPhase',
  PAUSED: 'paused',
  GAME_OVER: 'gameOver',
  VICTORY: 'victory',
};

let gameState = GAME_STATES.PLAYING;
let previousGameplayState = GAME_STATES.PLAYING;

let clearingEnemiesAfterMutantDeath = false;
let mutantActive = false;
let mutant = null;

let musicEnabled = false;
let defeatSoundPlayed = false;
let victorySoundPlayed = false;
let mutantSpawnSoundPlayed = false;

// links para as sprites
const ASSETS = {
  player: './assets/images/player.png',
  bullet: './assets/images/balloon.png',
  enemyBullet: './assets/images/enemy-bullet.png',
  background: './assets/images/background.jpg',
  enemyIdle: './assets/images/enemy-idle.png',
  enemyShooting: './assets/images/enemy-shooting.png',
  enemyDying: './assets/images/enemy-dying.png',
};

const BACKGROUND_SCROLL_SPEED = 30;

// detalhes da spritesheet do jogador para recorte
const PLAYER_SPRITE = {
  frameWidth: 256,
  frameHeight: 256,
  totalFrames: 4
};

// detalhes das spritesheets do inimigo para recorte
const ENEMY_SPRITE = {
  frameWidth: 400,
  frameHeight: 400,
  idleFrames: 29,
  shootingFrames: 25,
  dyingFrames: 19
};

function isGameplayState(state) {
  return state === GAME_STATES.PLAYING || state === GAME_STATES.MUTANT_PHASE;
}

// função do mutante
function spawnMutant(canvas) {
  mutantActive = true;

  mutant = {
    x: canvas.width / 2,
    y: 120,
    width: 150,
    height: 150,
    size: 120,

    vx: 3.5,
    vy: 0.9,

    animationFrame: 0,
    animationTimer: 0,

    shootCooldown: 0,
    life: 12,
    maxLife: 12,

    state: 'idle',
    dyingTimer: 0,
    deathFinished: false
  };
}

async function main() {
  const { canvas, gl } = setupWebGL('#game');
  const program = await initialize(gl);

  // elementos de controle de música e overlay
  const musicToggleButton = document.getElementById('musicToggle');
  const mutantLifeElement = document.getElementById('mutant-life');

  const playerLivesElement = document.getElementById('playerLives');

  const overlay = document.getElementById('overlay');
  const overlayMessage = document.getElementById('overlay-message');
  const overlayRestartButton = document.getElementById('overlayRestartButton');

  function updateMusicButton() {
    if (!musicToggleButton) return;

    musicToggleButton.classList.toggle('muted', !musicEnabled);
    musicToggleButton.title = musicEnabled ? 'Turn music off' : 'Turn music on';
    musicToggleButton.setAttribute(
      'aria-label',
      musicEnabled ? 'Turn music off' : 'Turn music on'
    );
  }

  async function syncBackgroundMusic() {
    const shouldPlay =
      musicEnabled &&
      gameState !== GAME_STATES.PAUSED &&
      gameState !== GAME_STATES.GAME_OVER &&
      gameState !== GAME_STATES.VICTORY;

    if (shouldPlay) {
      try {
        await backgroundMusic.play();
      } catch (_) {
        // autoplay pode bloquear até existir interação do usuário
      }
      return;
    }

    backgroundMusic.pause();
  }

  // atualiza o HUD de vida do mutante
  function updateMutantLifeHUD() {
    if (!mutantLifeElement) return;

    if (!mutantActive || !mutant) {
      mutantLifeElement.classList.add('hidden');
      return;
    }

    mutantLifeElement.classList.remove('hidden');
    mutantLifeElement.textContent = `${Math.max(0, mutant.life)}/${mutant.maxLife}`;
  }

  function updatePlayerHud() {
    if (!playerLivesElement || !sceneObjects.player?.data) return;

    const player = sceneObjects.player.data;
    playerLivesElement.innerHTML = '';

    for (let i = 0; i < player.maxLife; i++) {
      const heart = document.createElement('span');
      heart.className = `player-life-heart${i < player.life ? '' : ' empty'}`;
      heart.textContent = '❤';
      playerLivesElement.appendChild(heart);
    }
  }

  function damagePlayer() {
    const player = sceneObjects.player?.data;
    if (!player || player.invulnerable || gameState === GAME_STATES.GAME_OVER) {
      return false;
    }

    player.life = Math.max(0, player.life - 1);
    player.invulnerable = true;
    player.invulnerableTimer = player.invulnerableDuration;

    playSound(audios.playerHit);
    updatePlayerHud();

    if (player.life <= 0) {
      setGameState(GAME_STATES.GAME_OVER);
      showOverlay('FIM DE JOGO', 'gameover');
      return true;
    }

    return false;
  }

  // inicia a morte do mutante e dá tempo para animação + som
  function startMutantDeath() {
    if (!mutantActive || !mutant) return;
    if (mutant.state === 'dying') return;

    mutant.state = 'dying';
    mutant.dyingTimer = 1100;
    mutant.animationFrame = 0;
    mutant.animationTimer = 0;
    mutant.shootCooldown = Infinity;

    audios.mutantDeath.currentTime = 0;
    audios.mutantDeath.play().catch(() => { });
  }

  async function enableMusic() {
    musicEnabled = true;
    updateMusicButton();
    await syncBackgroundMusic();
  }

  function disableMusic() {
    musicEnabled = false;
    backgroundMusic.pause();
    updateMusicButton();
  }

  async function toggleMusic() {
    if (musicEnabled) {
      disableMusic();
      return;
    }

    await enableMusic();
  }

  function showOverlay(text, className) {
    if (!overlay || !overlayMessage) return;

    overlay.classList.remove('hidden', 'gameover', 'victory');
    overlay.classList.add(className);
    overlayMessage.textContent = text;

    // botão de reiniciar
    if (overlayRestartButton) {
      const isPaused = text === 'PAUSADO';
      const isVictory = text === 'VITÓRIA';
      const isGameOver = text === 'FIM DE JOGO';

      const show = isPaused || isVictory || isGameOver;

      overlayRestartButton.classList.toggle('hidden', !show);

      if (isVictory || isGameOver) {
        overlayRestartButton.textContent = 'JOGAR NOVAMENTE';
      } else if (isPaused) {
        overlayRestartButton.textContent = 'REINICIAR';
      }
    }
  }

  function hideOverlay() {
    if (!overlay) return;

    overlay.classList.add('hidden');
    overlay.classList.remove('gameover', 'victory');

    if (overlayRestartButton) {
      overlayRestartButton.classList.add('hidden');
    }
  }

  function restartGame() {
    window.location.reload();
  }

  if (overlayRestartButton) {
    overlayRestartButton.addEventListener('click', () => {
      restartGame();
    });
  }

  function playSound(audio) {
    audio.currentTime = 0;
    audio.play().catch(() => { });
  }

  async function setGameState(nextState) {
    if (gameState === nextState) return;

    if (isGameplayState(nextState)) {
      previousGameplayState = nextState;
    }

    gameState = nextState;

    if (gameState === GAME_STATES.GAME_OVER && !defeatSoundPlayed) {
      defeatSoundPlayed = true;
      playSound(audios.playerDeath);
    }

    if (gameState === GAME_STATES.VICTORY && !victorySoundPlayed) {
      victorySoundPlayed = true;
      playSound(audios.victory);
    }

    if (gameState === GAME_STATES.MUTANT_PHASE && !mutantSpawnSoundPlayed) {
      mutantSpawnSoundPlayed = true;
      playSound(audios.mutantSpawn);
    }

    await syncBackgroundMusic();
  }

  function generateBullet() {
    if (!isGameplayState(gameState)) return;

    if (!musicEnabled) {
      enableMusic();
    }

    playSound(audios.shoot);
    sceneObjects.bullets.push(createBullet(sceneObjects.player.data));
  }

  function spawnEnemyBullet(enemy) {
    if (!isGameplayState(gameState)) return;
    if (mutant && enemy === mutant && mutant.state === 'dying') return;

    const bullet = createEnemyBullet(enemy);
    sceneObjects.bullets.push(bullet);
  }

  // colisão: tiro do jogador com mutante
  function checkMutantBulletCollision(bullets) {
    if (!mutantActive || !mutant) return false;
    if (mutant.state === 'dying') return false;

    const mutantHitbox = {
      x: mutant.x - mutant.size * 0.35,
      y: mutant.y - mutant.size * 0.35,
      size: mutant.size * 0.7
    };

    for (const b of bullets) {
      if (b.type !== 'player' || !b.active) continue;

      const bulletHitbox = {
        x: b.x - 5,
        y: b.y - 5,
        size: 10
      };

      const collided =
        bulletHitbox.x < mutantHitbox.x + mutantHitbox.size &&
        bulletHitbox.x + bulletHitbox.size > mutantHitbox.x &&
        bulletHitbox.y < mutantHitbox.y + mutantHitbox.size &&
        bulletHitbox.y + bulletHitbox.size > mutantHitbox.y;

      if (collided) {
        b.active = false;
        mutant.life--;
        updateMutantLifeHUD();

        if (mutant.life <= 0) {
          startMutantDeath();
          return true;
        }

        audios.enemyDeath.currentTime = 0;
        audios.enemyDeath.play().catch(() => { });
      }
    }

    return false;
  }

  if (musicToggleButton) {
    musicToggleButton.addEventListener('click', toggleMusic);
    updateMusicButton();
  }

  // cuida dos atalhos
  window.addEventListener('keydown', async (event) => {
    if (event.key === 'r' || event.key === 'R') {
      restartGame();
      return;
    }

    if (event.key === 'Escape') {
      if (isGameplayState(gameState)) {
        previousGameplayState = gameState;
        await setGameState(GAME_STATES.PAUSED);
        showOverlay('PAUSADO', 'gameover');
      } else if (gameState === GAME_STATES.PAUSED) {
        await setGameState(previousGameplayState);
        hideOverlay();
      }
      return;
    }

    if (!musicEnabled) {
      await enableMusic();
    }
  });

  window.addEventListener('click', async () => {
    if (!musicEnabled) {
      await enableMusic();
    }
  });

  gl.clearColor(0, 0, 0, 1);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // inicializa os elementos do jogo
  await setupBackground(gl, program, canvas);
  await setupPlayer(gl, program, canvas);
  await setupBullet(gl, program);
  await setupEnemies(gl, program, canvas);

  setProjection(gl, program, canvas);

  listenForPlayerInput(sceneObjects.player.data, generateBullet);

  updatePlayerHud();

  let lastTime = performance.now();
  requestAnimationFrame(gameLoop);

  function gameLoop(currentTime) {
    if (gameState === GAME_STATES.GAME_OVER) {
      showOverlay('FIM DE JOGO', 'gameover');
      render(gl, program, canvas);
      return;
    }

    if (gameState === GAME_STATES.VICTORY) {
      showOverlay('VITÓRIA', 'victory');
      render(gl, program, canvas);
      return;
    }

    if (gameState === GAME_STATES.PAUSED) {
      render(gl, program, canvas);
      requestAnimationFrame(gameLoop);
      return;
    }

    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    if (isGameplayState(gameState)) {
      updateBackground(canvas, deltaTime);
      updatePlayer(sceneObjects.player.data, canvas, deltaTime);

      updateEnemies(
        sceneObjects.enemies.data,
        canvas,
        spawnEnemyBullet,
        sceneObjects.player.data,
        mutantActive
      );

      if (mutantActive) {
        updateMutant(canvas, spawnEnemyBullet, deltaTime);
      }

      updateMutantLifeHUD();

      sceneObjects.bullets = sceneObjects.bullets.filter(
        (b) => b.active && updateBullet(b, deltaTime)
      );

      // colisões dos tiros do jogador com os inimigos
      checkPlayerBulletCollisions(
        sceneObjects.bullets,
        sceneObjects.enemies.data,
        audios.enemyDeath
      );

      // colisão do tiro do jogador com o mutante
      if (mutantActive) {
        checkMutantBulletCollision(sceneObjects.bullets);
      }

      // mutante morre: inicia animação de morte, depois limpa os inimigos restantes e dá vitória
      if (
        gameState === GAME_STATES.MUTANT_PHASE &&
        mutant &&
        mutant.state === 'dying' &&
        mutant.deathFinished
      ) {
        mutantActive = false;
        mutant = null;
        updateMutantLifeHUD();

        if (!clearingEnemiesAfterMutantDeath) {
          clearingEnemiesAfterMutantDeath = true;
          killAllRemainingEnemies();
        }
      }

      if (clearingEnemiesAfterMutantDeath) {
        const hasAliveEnemies = sceneObjects.enemies.data.list.some(
          (enemy) => enemy.alive && enemy.state !== 'dying'
        );

        const hasAnyVisibleDyingEnemy = sceneObjects.enemies.data.list.some(
          (enemy) => enemy.alive
        );

        if (!hasAliveEnemies && !hasAnyVisibleDyingEnemy) {
          clearingEnemiesAfterMutantDeath = false;
          setGameState(GAME_STATES.VICTORY);
          showOverlay('VITÓRIA', 'victory');
          render(gl, program, canvas);
          return;
        }

        render(gl, program, canvas);
        requestAnimationFrame(gameLoop);
        return;
      }

      // colisão de tiro inimigo com player
      if (checkEnemyBulletCollision(sceneObjects.bullets, sceneObjects.player.data)) {
        const defeated = damagePlayer();
        render(gl, program, canvas);

        if (defeated) {
          return;
        }
      }

      // se os inimigos chegarem ao solo, ativa a fase mutante
      if (
        !mutantActive &&
        checkEnemiesReachedGround(
          sceneObjects.enemies.data,
          sceneObjects.player.data
        )
      ) {
        sceneObjects.enemies.data.mutantPhase = true;
        spawnMutant(canvas);
        updateMutantLifeHUD();
        setGameState(GAME_STATES.MUTANT_PHASE);
      }

      // vitória normal só antes da fase mutante
      if (
        !mutantActive &&
        gameState === GAME_STATES.PLAYING &&
        checkVictory(sceneObjects.enemies.data)
      ) {
        setGameState(GAME_STATES.VICTORY);
        showOverlay('VITÓRIA', 'victory');
        render(gl, program, canvas);
        return;
      }
    }

    hideOverlay();
    render(gl, program, canvas);
    requestAnimationFrame(gameLoop);
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

  // inicialização do plano de fundo
  async function setupBackground(gl, program, canvas) {
    const geometry = createBackgroundGeometry(gl, program, canvas);
    const textureInfo = await loadTexture(gl, ASSETS.background);

    sceneObjects.background = {
      geometry,
      texture: textureInfo.texture,
      y1: 0,
      y2: -canvas.height,
      speed: BACKGROUND_SCROLL_SPEED
    };
  }

  // inicialização do projétil
  async function setupBullet(gl, program) {
    const geometry = createBulletGeometry(gl, program, BULLET_SIZE);

    const playerTextureInfo = await loadTexture(gl, ASSETS.bullet);
    const enemyTextureInfo = await loadTexture(gl, ASSETS.enemyBullet);

    sceneObjects.bullet = {
      geometry,
      textures: {
        player: playerTextureInfo.texture,
        enemy: enemyTextureInfo.texture
      }
    };
  }

  // inicialização dos inimigos + mutante
  async function setupEnemies(gl, program, canvas) {
    const enemies = createEnemies(canvas);

    const geometry = createEnemyGeometry(gl, program, 80);
    const mutantGeometry = createEnemyGeometry(gl, program, 150);

    const idleTexture = await loadTexture(gl, ASSETS.enemyIdle);
    const shootingTexture = await loadTexture(gl, ASSETS.enemyShooting);
    const dyingTexture = await loadTexture(gl, ASSETS.enemyDying);

    sceneObjects.enemies = {
      geometry,
      mutantGeometry,
      textures: {
        idle: idleTexture.texture,
        shooting: shootingTexture.texture,
        dying: dyingTexture.texture
      },
      textureInfo: {
        idle: idleTexture,
        shooting: shootingTexture,
        dying: dyingTexture
      },
      data: enemies
    };
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

  // atualiza a animação do inimigo
  function updateEnemyAnimationUV(gl, enemy, textureKey) {
    const enemiesObject = sceneObjects.enemies;
    const textureInfo = enemiesObject.textureInfo[textureKey];
    const frameX = enemy.animationFrame * ENEMY_SPRITE.frameWidth;

    const uvs = getFrameUVByPixels(
      frameX,
      0,
      ENEMY_SPRITE.frameWidth,
      ENEMY_SPRITE.frameHeight,
      textureInfo.width,
      textureInfo.height
    );

    updateGeometryUVs(gl, enemiesObject.geometry, uvs);
  }

  // atualiza a animação do mutante
  function updateMutantAnimationUV(gl) {
    const enemiesObject = sceneObjects.enemies;
    const textureKey = mutant.state === 'dying' ? 'dying' : 'idle';
    const textureInfo = enemiesObject.textureInfo[textureKey];
    const totalFrames =
      mutant.state === 'dying' ? ENEMY_SPRITE.dyingFrames : ENEMY_SPRITE.idleFrames;

    const frameX = (mutant.animationFrame % totalFrames) * ENEMY_SPRITE.frameWidth;

    const uvs = getFrameUVByPixels(
      frameX,
      0,
      ENEMY_SPRITE.frameWidth,
      ENEMY_SPRITE.frameHeight,
      textureInfo.width,
      textureInfo.height
    );

    updateGeometryUVs(gl, enemiesObject.mutantGeometry, uvs);
  }

  // atualiza os frames do fundo
  function updateBackground(canvas, deltaTime) {
    const bg = sceneObjects.background;
    if (!bg) return;

    const delta = (bg.speed * deltaTime) / 1000;

    bg.y1 += delta;
    bg.y2 += delta;

    if (bg.y1 >= canvas.height) {
      bg.y1 = bg.y2 - canvas.height;
    }

    if (bg.y2 >= canvas.height) {
      bg.y2 = bg.y1 - canvas.height;
    }
  }

  function updateMutant(canvas, spawnBullet, deltaTime) {
    if (!mutantActive || !mutant) return;

    // se estiver morrendo, não anda nem atira mais
    if (mutant.state === 'dying') {
      mutant.animationTimer += deltaTime;

      if (mutant.animationTimer >= 70) {
        mutant.animationTimer = 0;
        if (mutant.animationFrame < ENEMY_SPRITE.dyingFrames - 1) {
          mutant.animationFrame++;
        }
      }

      mutant.dyingTimer -= deltaTime;

      if (mutant.dyingTimer <= 0) {
        mutant.deathFinished = true;
      }

      return;
    }

    const factor = deltaTime / 16.67;

    mutant.x += mutant.vx * factor;
    mutant.y += mutant.vy * factor;

    // rebate nas laterais
    if (mutant.x + mutant.width / 2 >= canvas.width || mutant.x - mutant.width / 2 <= 0) {
      mutant.vx *= -1;
      mutant.x = Math.max(mutant.width / 2, Math.min(canvas.width - mutant.width / 2, mutant.x));
    }

    // limita a movimentação vertical no topo da tela
    if (mutant.y >= 180 || mutant.y <= 80) {
      mutant.vy *= -1;
    }

    // animação idle
    mutant.animationTimer += deltaTime;
    if (mutant.animationTimer >= 70) {
      mutant.animationTimer = 0;
      mutant.animationFrame = (mutant.animationFrame + 1) % ENEMY_SPRITE.idleFrames;
    }

    // atira mais
    mutant.shootCooldown -= deltaTime;
    if (mutant.shootCooldown <= 0) {
      spawnBullet(mutant);

      setTimeout(() => {
        if (mutantActive && mutant && mutant.state !== 'dying' && isGameplayState(gameState)) {
          spawnBullet(mutant);
        }
      }, 120);

      setTimeout(() => {
        if (mutantActive && mutant && mutant.state !== 'dying' && isGameplayState(gameState)) {
          spawnBullet(mutant);
        }
      }, 240);

      mutant.shootCooldown = 700;
    }
  }

  function killAllRemainingEnemies() {
    if (!sceneObjects.enemies) return;

    const aliveEnemies = sceneObjects.enemies.data.list.filter(
      (enemy) => enemy.alive && enemy.state !== 'dying'
    );

    aliveEnemies.forEach((enemy, index) => {
      enemy.state = 'dying';
      enemy.dyingTimer = 18 * 3; // acompanha o ritmo da animação atual do enemies.js
      enemy.animationFrame = 0;
      enemy.animationTimer = 0;

      setTimeout(() => {
        audios.enemyDeath.currentTime = 0;
        audios.enemyDeath.play().catch(() => { });
      }, index * 60);
    });
  }

  // renderiza a cena
  function render(gl, program, canvas) {
    clearScreen(gl);
    setProjection(gl, program, canvas);

    // fundo
    const bg = sceneObjects.background;

    drawTexturedObject(
      gl,
      program,
      bg.geometry,
      bg.texture,
      canvas.width / 2,
      bg.y1 + canvas.height / 2,
      1,
      1,
      0
    );

    drawTexturedObject(
      gl,
      program,
      bg.geometry,
      bg.texture,
      canvas.width / 2,
      bg.y2 + canvas.height / 2,
      1,
      1,
      0
    );

    // jogador
    const player = sceneObjects.player.data;
    updatePlayerAnimationUV(gl);

    const playerBlinkVisible = !player.invulnerable || Math.floor(player.invulnerableTimer / 90) % 2 === 0;

    if (playerBlinkVisible) {
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
    }

    // inimigos
    if (sceneObjects.enemies) {
      sceneObjects.enemies.data.list.forEach((enemy) => {
        if (!enemy.alive) return;

        let texture;
        let textureKey;

        if (enemy.state === 'dying') {
          texture = sceneObjects.enemies.textures.dying;
          textureKey = 'dying';
        } else if (enemy.state === 'shooting') {
          texture = sceneObjects.enemies.textures.shooting;
          textureKey = 'shooting';
        } else {
          texture = sceneObjects.enemies.textures.idle;
          textureKey = 'idle';
        }

        updateEnemyAnimationUV(gl, enemy, textureKey);

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
    }

    // mutante
    if (
      mutantActive &&
      mutant &&
      sceneObjects.enemies
    ) {
      const mutantTexture =
        mutant.state === 'dying'
          ? sceneObjects.enemies.textures.dying
          : sceneObjects.enemies.textures.idle;

      updateMutantAnimationUV(gl);

      drawTexturedObject(
        gl,
        program,
        sceneObjects.enemies.mutantGeometry,
        mutantTexture,
        mutant.x,
        mutant.y,
        1.2,
        1.2,
        0
      );
    }

    // projéteis
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
        b.angle ?? 0
      );
    });
  }
}

// inicializa shaders e o programa
async function initialize(gl) {
  const vertexShaderResponse = await fetch('./shaders/vertex-shader.glsl');
  if (!vertexShaderResponse.ok) {
    throw new Error('Failed to load vertex shader');
  }

  const fragmentShaderResponse = await fetch('./shaders/fragment-shader.glsl');
  if (!fragmentShaderResponse.ok) {
    throw new Error('Failed to load fragment shader');
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

main().catch((error) => {
  console.error(error);
});