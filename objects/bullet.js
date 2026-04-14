export const BULLET_SIZE = 8;

// criação do projétil
export function createBullet(player) {
    return {
        x: player.x, // posição horizontal do tiro, alinhada com o jogador
        y: player.y - player.size - 12, // posição vertical do tiro
        vy: 5, //velocidade vertical
        size: BULLET_SIZE, // tamanho do tiro
    }
}

// atualiza a posição do projétil e se ele ainda está na tela
export function updateBullet(bullet) {
    bullet.y -= bullet.vy; // sobe o tiro

    if (bullet.y + bullet.size < 0) {
        //TODO: implementar a questão da colisão com os inimigos
        return false; // saiu da tela
    }
    return true; // ainda está na tela
}