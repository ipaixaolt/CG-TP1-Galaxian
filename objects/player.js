// cria o objeto do jogador com os dados iniciais
export function createPlayer(canvas) {
    return {
        x: canvas.width / 2,
        y: canvas.height - 50, // ficará fixo na parte inferior da tela
        vx: 0, // deslocamento horizontal atual do jogador
        size: 20, // tamanho do jogador
        speed: 5, // velocidade de movimento
    };
}

// controla o movimento do jogador com as setas esquerda e direita
export function listenForPlayerInput(player) {
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            player.vx = -player.speed;
        } else if (e.key === 'ArrowRight') {
            player.vx = player.speed;
        }
    });

    // para evitar que o jogador continue se movendo após soltar a tecla
    window.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            player.vx = 0;
        }
    });
}

export function updatePlayer(player, canvas) {
    const newX = player.x + player.vx;

    const minX = player.size; // limite à esquerda
    const maxX = canvas.width - player.size; // limite à direita

    // o jogador só pode se mover dentro dos limites da tela
    if (newX >= minX && newX <= maxX) {
        player.x = newX;
    }

}