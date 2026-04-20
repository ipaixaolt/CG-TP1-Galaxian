export const BULLET_SIZE = 38;
export const BULLET_SPEED = 8;

// cria o projétil do jogador
export function createBullet(player) {
    return {
        x: player.x,
        y: player.y - player.height / 2,
        vx: 0,
        vy: -BULLET_SPEED,
        active: true,

        type: 'player' 
    };
}

// movimenta o projétil
export function updateBullet(bullet, deltaTime = 16.67) {
    const factor = deltaTime / 16.67;

    bullet.x += bullet.vx * factor;
    bullet.y += bullet.vy * factor;

    // remove quando sai da tela (cima OU baixo)
    if (bullet.y < -50 || bullet.y > 650) return false;

    return true;
}

// cria projétil do inimigo 
export function createEnemyBullet(enemy) {
    return {
        x: enemy.x,
        y: enemy.y + enemy.size / 2,
        vx: 0,
        vy: BULLET_SPEED,
        active: true,
        type: 'enemy' 
    };
}