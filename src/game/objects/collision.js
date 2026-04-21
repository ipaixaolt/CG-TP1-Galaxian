// verifica colisão simples 
function isColliding(a, b, sizeA, sizeB) {
  return (
    a.x < b.x + sizeB &&
    a.x + sizeA > b.x &&
    a.y < b.y + sizeB &&
    a.y + sizeA > b.y
  );
}

// retorna hitbox centralizada
function getHitbox(obj, size) {
  return {
    x: obj.x - size / 2,
    y: obj.y - size / 2,
    size
  };
}

// colisão: tiro do player com inimigos
export function checkPlayerBulletCollisions(bullets, enemies, deathSound) {
  bullets.forEach((b) => {
    if (b.type !== 'player') return;
    if (!b.active) return;

    const bulletHitbox = getHitbox(b, 10);

    for (const enemy of enemies.list) {
      if (!enemy.alive) continue;
      if (enemy.state === 'dying') continue;

      // hitbox menor que o sprite (mais justo)
      const enemyHitbox = getHitbox(enemy, enemy.size * 0.6);

      if (isColliding(
        bulletHitbox,
        enemyHitbox,
        bulletHitbox.size,
        enemyHitbox.size
      )) {
        enemy.state = 'dying';
        enemy.dyingTimer = 30;
        enemy.animationFrame = 0;
        enemy.animationTimer = 0;

        // toca som de morte
        deathSound.currentTime = 0;
        deathSound.play().catch(() => { });

        // destroi a bala que atingiu o inimigo
        b.active = false;
        break;
      }
    }
  });
}

// colisão: tiro do inimigo com player
export function checkEnemyBulletCollision(bullets, player) {
  const playerHitbox = getHitbox(player, player.size * 0.6);

  for (const b of bullets) {
    if (b.type !== 'enemy') continue;
    if (!b.active) continue;

    const bulletHitbox = getHitbox(b, 10);

    if (isColliding(
      bulletHitbox,
      playerHitbox,
      bulletHitbox.size,
      playerHitbox.size
    )) {
      return true;
    }
  }
  return false;
}

// colisão: inimigos chegaram no solo
export function checkEnemiesReachedGround(enemies, player) {
  const playerHitbox = getHitbox(player, player.size * 0.6);

  for (const enemy of enemies.list) {
    if (!enemy.alive) continue;

    const enemyHitbox = getHitbox(enemy, enemy.size * 0.6);

    if (enemyHitbox.y + enemyHitbox.size >= playerHitbox.y) {
      return true;
    }
  }
  return false;
}

// verifica vitória (todos mortos)
export function checkVictory(enemies) {
  return enemies.list.every(e => !e.alive);
}