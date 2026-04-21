// cria o jogador
export function createPlayer(canvas) {
    return {
        x: canvas.width / 2,
        y: canvas.height - 60,
        vx: 0,

        width: 80,
        height: 80,
        size: 40,
        speed: 5,

        facing: 1,

        isShooting: false,
        shootingTimer: 0,
        shootingDuration: 120,

        angle: 0,
        shootAngle: 0.15,

        life: 3,
        maxLife: 3,
        invulnerable: false,
        invulnerableTimer: 0,
        invulnerableDuration: 1200,

        animationFrame: 0,
        animationTimer: 0,
        animationDuration: 120,
        totalFrames: 4
    };
}

// controles do jogador
export function listenForPlayerInput(player, onPeteco) {
    window.addEventListener('keydown', (e) => {
        if (e.code === 'ArrowLeft') {
            player.vx = -player.speed;
            player.facing = -1; //jogador olha para a esquerda 
        }

        if (e.code === 'ArrowRight') {
            player.vx = player.speed;
            player.facing = 1; // jogador olha para a direita
        }

        // atira e barra que o usuário pressione a tecla e fique spammando tiros
        if (e.code === 'Space' && !e.repeat) {
            if (!player.isShooting) {
                player.isShooting = true;
                player.shootingTimer = player.shootingDuration;
                onPeteco();
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'ArrowLeft' && player.vx < 0) {
            player.vx = 0;
        }

        if (e.code === 'ArrowRight' && player.vx > 0) {
            player.vx = 0;
        }
    });
}

export function updatePlayer(player, canvas, deltaTime = 16.67) {
    player.x += player.vx;

    const half = player.width / 2;
    player.x = Math.max(half, Math.min(canvas.width - half, player.x));

    // atualiza frame da sprite
    player.animationTimer += deltaTime;
    if (player.animationTimer >= player.animationDuration) {
        player.animationTimer = 0;
        player.animationFrame = (player.animationFrame + 1) % player.totalFrames;
    }

    // invulnerabilidade após levar dano: pisca o personagem e ignora colisões
    if (player.invulnerable) {
        player.invulnerableTimer -= deltaTime;

        if (player.invulnerableTimer <= 0) {
            player.invulnerable = false;
            player.invulnerableTimer = 0;
        }
    }

    // entorta um pouco o personagem quando ele atira
    if (player.isShooting) {
        player.shootingTimer -= deltaTime;
        player.angle = player.facing * player.shootAngle;

        if (player.shootingTimer <= 0) {
            player.isShooting = false;
            player.angle = 0;
        }

        return;
    }

    player.angle = 0;
}
