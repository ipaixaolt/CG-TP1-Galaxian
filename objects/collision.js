// verifica colisão simples 
function isColliding(a, b, sizeA, sizeB) {
  return (
    a.x < b.x + sizeB &&
    a.x + sizeA > b.x &&
    a.y < b.y + sizeB &&
    a.y + sizeA > b.y
  );
}

// colisão: tiro do player com inimigos
export function checkPlayerBulletCollisions(bullets, enemies) {
  bullets.forEach((b) => {
    if (b.type !== 'player') return;
    if (!b.active) return;

    for (const enemy of enemies.list) {
      if (!enemy.alive) continue;

      if (isColliding(b, enemy, 10, enemy.size)) {
        enemy.state = 'dying';
        enemy.dyingTimer = 30;
  // destroi a bala que atingiu o inimigo
        b.active = false; 
        break; 
      }
    }
  });
}

// colisão: tiro do inimigo com player
export function checkEnemyBulletCollision(bullets, player) {
  for (const b of bullets) {
    if (b.type !== 'enemy') continue;

    if (isColliding(b, player, 10, player.size)) {
      return true;
    }
  }
  return false;
}

// colisão: inimigos chegaram no solo
export function checkEnemiesReachedGround(enemies, player) {
  for (const enemy of enemies.list) {
    if (!enemy.alive) continue;

    if (enemy.y + enemy.size >= player.y) {
      return true;
    }
  }
  return false;
}

// verifica vitória (todos mortos)
export function checkVictory(enemies) {
  return enemies.list.every(e => !e.alive);
}