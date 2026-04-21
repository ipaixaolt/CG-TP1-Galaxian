// cria os inimigos em linhas e colinas
export function createEnemies(canvas) {
  const enemies = [];

  const rows = 3;
  const cols = 6;

  const spacingX = 90;
  const spacingY = 60;

  const startX = 120;
  const startY = 80;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      enemies.push(createEnemyAt(startX + col * spacingX, startY + row * spacingY));
    }
  }

  return {
    list: enemies,
    direction: 1,
    speed: 0.10,
    dropDistance: 20,

    // controle de tiro
    shootCooldown: 0,

    // fase mutante
    mutantPhase: false
  };
}

function createEnemyAt(x, y) {
  return {
    x,
    y,
    size: 80,
    alive: true,

    state: 'idle',
    shootTimer: 0,
    animationFrame: 0,
    animationTimer: 0,
    dyingTimer: 0
  };
}

// coloca o inimigo novamente no topo
function recycleEnemyToTop(enemy, canvas) {
  enemy.x = 80 + Math.random() * (canvas.width - 160);
  enemy.y = -60 - Math.random() * 180;

  enemy.alive = true;
  enemy.state = 'idle';
  enemy.shootTimer = 0;
  enemy.animationFrame = 0;
  enemy.animationTimer = 0;
  enemy.dyingTimer = 0;
}

// atualiza o movimento dos inimigos
export function updateEnemies(enemies, canvas, spawnBullet, player, mutantActive = false) {
  let hitEdge = false;

  // na fase mutante os inimigos não fazem mais o movimento clássico
  if (!mutantActive) {
    for (const enemy of enemies.list) {
      if (!enemy.alive) continue;

      if (
        enemy.x + enemy.size / 2 >= canvas.width ||
        enemy.x - enemy.size / 2 <= 0
      ) {
        hitEdge = true;
        break;
      }
    }

    if (hitEdge) {
      enemies.direction *= -1;

      for (const enemy of enemies.list) {
        if (!enemy.alive) continue;
        enemy.y += enemies.dropDistance;
      }
    }

    for (const enemy of enemies.list) {
      if (!enemy.alive) continue;
      if (enemy.state === 'dying') continue;
      enemy.x += enemies.direction * enemies.speed * 16;
    }
  } else {
    // fase mutante: inimigos descem e, quando saem da tela, voltam para o topo
    for (const enemy of enemies.list) {
      if (!enemy.alive) continue;
      if (enemy.state === 'dying') continue;

      enemy.y += 2.2;
      enemy.x += Math.sin((enemy.y + enemy.x) * 0.02) * 1.2;

      if (enemy.y - enemy.size / 2 > canvas.height + 40) {
        recycleEnemyToTop(enemy, canvas);
      }
    }
  }

  // controle de disparo
  enemies.shootCooldown--;

  if (enemies.shootCooldown <= 0) {
    shoot(enemies, spawnBullet, player, mutantActive);
    enemies.shootCooldown = mutantActive
      ? 35 + Math.random() * 25
      : 80 + Math.random() * 80;
  }

  // atualiza estado visual
  for (const enemy of enemies.list) {
    if (!enemy.alive) continue;

    if (enemy.shootTimer > 0) {
      enemy.shootTimer--;
      if (enemy.shootTimer <= 0 && enemy.state !== 'dying') {
        enemy.state = 'idle';
        enemy.animationFrame = 0;
        enemy.animationTimer = 0;
      }
    }
  }

  // atualiza estado de morte (animação dying)
  for (const enemy of enemies.list) {
    if (!enemy.alive) continue;
    if (enemy.state === 'dying') {
      enemy.dyingTimer--;

      if (enemy.dyingTimer <= 0) {
        if (mutantActive) {
          recycleEnemyToTop(enemy, canvas);
        } else {
          enemy.alive = false;
        }
      }
    }
  }

  // atualiza animação dos inimigos
  for (const enemy of enemies.list) {
    if (!enemy.alive) continue;

    enemy.animationTimer++;

    if (enemy.state === 'idle' && enemy.animationTimer >= 4) {
      enemy.animationTimer = 0;
      enemy.animationFrame = (enemy.animationFrame + 1) % 29;
    }

    if (enemy.state === 'shooting' && enemy.animationTimer >= 3) {
      enemy.animationTimer = 0;
      enemy.animationFrame = (enemy.animationFrame + 1) % 25;
    }

    if (enemy.state === 'dying' && enemy.animationTimer >= 3) {
      enemy.animationTimer = 0;

      if (enemy.animationFrame < 18) {
        enemy.animationFrame++;
      }
    }
  }
}

// escolhe alguns inimigos aleatórios para realizar o disparo
function shoot(enemies, spawnBullet, player, mutantActive = false) {
  const alive = enemies.list.filter(e => e.alive && e.state !== 'dying');
  if (alive.length === 0) return;

  const shootersCount = mutantActive
    ? Math.min(Math.floor(Math.random() * 4) + 2, alive.length)
    : Math.min(Math.floor(Math.random() * 3) + 1, alive.length);

  const sortedByDistance = [...alive].sort((a, b) => {
    const distanceA = Math.abs(a.x - player.x);
    const distanceB = Math.abs(b.x - player.x);
    return distanceA - distanceB;
  });

  const closestPoolSize = mutantActive
    ? Math.min(8, sortedByDistance.length)
    : Math.min(5, sortedByDistance.length);

  const available = sortedByDistance.slice(0, closestPoolSize);

  for (let i = 0; i < shootersCount && available.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * available.length);
    const shooter = available.splice(randomIndex, 1)[0];

    // altera o estado para "shooting"
    shooter.state = 'shooting';
    shooter.shootTimer = mutantActive ? 24 : 40;
    shooter.animationFrame = 0;
    shooter.animationTimer = 0;

    // cria o projétil com pequeno atraso
    setTimeout(() => {
      if (spawnBullet && shooter.alive && shooter.state !== 'dying') {
        spawnBullet(shooter);
      }
    }, mutantActive ? 70 : 120);
  }
}

export function createEnemyGeometry(gl, program, size) {
  const half = size / 2;

  const positions = new Float32Array([
    -half, -half,
    half, -half,
    -half, half,

    -half, half,
    half, -half,
    half, half
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
  gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

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