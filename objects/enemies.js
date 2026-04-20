// cria os inimigos em linhas e colinas
export function createEnemies(canvas) {
  const enemies = [];

  const rows = 3;
  const cols = 6;

  const spacingX = 70;
  const spacingY = 60;

  const startX = 120;
  const startY = 80;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      enemies.push({
        x: startX + col * spacingX,
        y: startY + row * spacingY,
        size: 30,
        alive: true,

        state: 'idle',
        shootTimer: 0
      });
    }
  }

  return {
    list: enemies,
    direction: 1,
    speed: 0.10,
    dropDistance: 20,

    // controle de tiro
    shootCooldown: 0
  };
}

// atualiza o movimento dos inimigos
export function updateEnemies(enemies, canvas, spawnBullet) {
  let hitEdge = false;

  for (const enemy of enemies.list) {
    if (!enemy.alive) continue;

    if (
      enemy.x + enemy.size >= canvas.width ||
      enemy.x - enemy.size <= 0
    ) {
      hitEdge = true;
      break;
    }
  }

  if (hitEdge) {
    enemies.direction *= -1;

    for (const enemy of enemies.list) {
      enemy.y += enemies.dropDistance;
    }
  }

  for (const enemy of enemies.list) {
    enemy.x += enemies.direction * enemies.speed * 16;
  }

  // controle de disparo
  enemies.shootCooldown--;

  if (enemies.shootCooldown <= 0) {
    shoot(enemies, spawnBullet);
    enemies.shootCooldown = 80 + Math.random() * 80;
  }

  // atualiza estado visual
  for (const enemy of enemies.list) {
    if (enemy.shootTimer > 0) {
      enemy.shootTimer--;
      if (enemy.shootTimer <= 0) {
        enemy.state = 'idle';
      }
    }
  }

  // atualiza estado de morte (animação dying)
for (const enemy of enemies.list) {
  if (enemy.state === 'dying') {
    enemy.dyingTimer--;

    if (enemy.dyingTimer <= 0) {
      enemy.alive = false; // só aqui ele morre de verdade
    }
  }
}
}

// escolhe um inimigo aleatório para realizar o disparo
function shoot(enemies, spawnBullet) {
  const alive = enemies.list.filter(e => e.alive);
  if (alive.length === 0) return;

  const shooter = alive[Math.floor(Math.random() * alive.length)];
  
  // altera o estado para "shooting" 
  shooter.state = 'shooting';
  shooter.shootTimer = 40;

  // cria o projétil com um pequeno atraso para visulalizar o ataque antes do disparo
  setTimeout(() => {
    if (spawnBullet) {
      spawnBullet(shooter);
    }
  }, 120);
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