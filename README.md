# Catlaxnyan
Catlaxnyan é um jogo 2D desenvolvido com WebGL, JavaScript e Javascript , inspirado no jogo **Galaxian**, em que o jogador controla um personagem que deve eliminar ondas de inimigos enquanto desvia de ataques.
Na releitura temos um valente gatinho que enfrenta uma orda de aliens ferozes. Se os inimigos chegarem ao chão o nosso protagonista precisará enfrentar os inimigos que sobreviveram e uma nova entidade: um mutante com mais vidas e maior velocidade de disparo.

[![TP1 - GALAXIAN](https://img.youtube.com/vi/n4OYm65eYTs/0.jpg)](https://www.youtube.com/watch?v=n4OYm65eYTs)

(Vídeo: https://www.youtube.com/watch?v=n4OYm65eYTs)


### Menu
<img width="883" height="652" alt="image" src="https://github.com/user-attachments/assets/7556d81b-a9c7-4ccf-9d40-9c042a3b021c" />

### Jogo
<img width="880" height="659" alt="image" src="https://github.com/user-attachments/assets/8db10c5c-fed1-407f-aaca-f6b6159e312c" />


## Funcionalidades

- Menu interativo com opções de jogo, créditos e controles
- Sistema de movimentação do jogador
- Sistema de disparo com controle de cooldown
- Inimigos com comportamento dinâmico
- Fase especial com inimigo mutante
- Sistema de colisão entre objetos
- HUD com vida do jogador e do mutante
- Sistema de estados do jogo:
  - Jogando
  - Pausado
  - Game Over
  - Vitória
- Sistema de áudio com música e efeitos sonoros

## Controles

- Seta Esquerda: mover para a esquerda
- Seta Direita: mover para a direita
- Espaço: atirar
- ESC: pausar o jogo
- R: reiniciar a partida


### Jogador

- Movimentação horizontal limitada pela tela
- Sistema de animação por frames
- Invulnerabilidade temporária após dano
- Controle de disparo com tempo de recarga

### Projéteis

- Velocidade constante
- Remoção automática ao sair da tela ou ao atingir um personagem (inimigo ou protagonista)
- Tipos distintos (player e enemy)

### Inimigos

Os inimigos são gerados em formação e possuem dois comportamentos:

- Movimento clássico lateral com descida
- Fase mutante com movimento livre e reaparecimento no topo

Além disso:
- Sistema de animação por estados (idle, shooting, dying) usando frames
- Disparo baseado na posição do jogador

### Colisões

O sistema de colisão é baseado em hitboxes simplificadas.

Inclui:
- Colisão entre tiros e inimigos
- Colisão entre tiros inimigos e jogador
- Verificação de vitória
- Verificação de inimigos atingindo o solo

### Fase Mutante

Quando os inimigos alcançam o solo, o jogo entra em uma fase especial:

- Surge um inimigo mutante com múltiplas vidas
- Aumenta a intensidade dos ataques
- Após derrotar o mutante, o jogo entra em estado de vitória


## Tecnologias Utilizadas
- JavaScript
- WebGL
- HTML5
- CSS
- Áudio via API nativa do navegador

## Créditos

Desenvolvido por:
- Isabelle Moreira
- Isadellis Paixão
