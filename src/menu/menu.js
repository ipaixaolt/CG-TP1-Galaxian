const MENU_STATES = {
    MAIN: 'main',
    CREDITS: 'credits',
    CONTROLS: 'controls'
};

const audios = {
    option: new Audio('../../assets/audio/option.mp3'),
    select: new Audio('../../assets/audio/select.mp3')
};

audios.option.volume = 0.6;
audios.select.volume = 0.7;

// texturas do menu
const ASSETS = {
    menu: '../../assets/images/menu.png'
};

const canvas = document.getElementById('menu');
const gl = canvas.getContext('webgl2');

if (!gl) {
    throw new Error('WebGL não foi suportado neste navegador.');
}

// canvas auxiliar para desenhar os textos do menu
const textCanvas = document.createElement('canvas');
textCanvas.width = 800;
textCanvas.height = 600;
const textCtx = textCanvas.getContext('2d');

const menuItems = ['JOGAR', 'CRÉDITOS', 'CONTROLES'];

let selectedIndex = 0;
let currentState = MENU_STATES.MAIN;
let blinkTimer = 0;

let program;
let positionBuffer;
let texCoordBuffer;
let menuTexture;
let textTexture;

// função principal
async function main() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const vertexShaderResponse = await fetch('../shaders/menu-vertex-shader.glsl');
    if (!vertexShaderResponse.ok) {
        throw new Error('Failed to load vertex shader');
    }

    const fragmentShaderResponse = await fetch('../shaders/fragment-shader.glsl');
    if (!fragmentShaderResponse.ok) {
        throw new Error('Failed to load fragment shader');
    }

    const vertexShaderSource = await vertexShaderResponse.text();
    const fragmentShaderSource = await fragmentShaderResponse.text();


    program = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    // geometria base de um quad com textura
    positionBuffer = createRectBuffer(gl, [
        0, 0,
        1, 0,
        0, 1,

        0, 1,
        1, 0,
        1, 1
    ]);

    texCoordBuffer = createRectBuffer(gl, [
        0, 1,
        1, 1,
        0, 0,

        0, 0,
        1, 1,
        1, 0
    ]);

    gl.useProgram(program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // carrega a imagem principal do menu
    menuTexture = await loadTexture(gl, ASSETS.menu, [0, 0, 0, 255]);

    // cria a textura dinâmica onde os textos serão desenhados
    textTexture = createTexture(gl, textCanvas);

    window.addEventListener('keydown', handleInput);
    canvas.addEventListener('click', handleClick);

    requestAnimationFrame(loop);
}

// ajusta o tamanho do canvas
function resizeCanvas() {
    canvas.width = 800;
    canvas.height = 600;

    textCanvas.width = canvas.width;
    textCanvas.height = canvas.height;

    gl.viewport(0, 0, canvas.width, canvas.height);
}

// controla a navegação do menu pelo teclado
function handleInput(event) {
    if (currentState === MENU_STATES.MAIN) {
        if (event.key === 'ArrowUp') {
            playSound(audios.option);
            selectedIndex = (selectedIndex - 1 + menuItems.length) % menuItems.length;
        }

        if (event.key === 'ArrowDown') {
            playSound(audios.option);
            selectedIndex = (selectedIndex + 1) % menuItems.length;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            playSound(audios.select);
            activateSelectedItem();
        }

        return;
    }

    // volta para a tela principal
    if (event.key === 'Escape' || event.key === 'Backspace') {
        playSound(audios.option);
        currentState = MENU_STATES.MAIN;
    }
}

// controla o clique nas opções do menu
function handleClick(event) {
    if (currentState !== MENU_STATES.MAIN) {
        playSound(audios.option);
        currentState = MENU_STATES.MAIN;
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    const startY = 290;
    const spacing = 64;
    const itemWidth = 320;
    const itemHeight = 44;
    const itemX = canvas.width / 2 - itemWidth / 2;

    for (let i = 0; i < menuItems.length; i++) {
        const itemY = startY + i * spacing - itemHeight / 2;

        const insideX = x >= itemX && x <= itemX + itemWidth;
        const insideY = y >= itemY && y <= itemY + itemHeight;

        if (insideX && insideY) {
            selectedIndex = i;
            playSound(audios.select);
            activateSelectedItem();
            return;
        }
    }
}

// executa a ação da opção selecionada
function activateSelectedItem() {
    const selectedItem = menuItems[selectedIndex];

    if (selectedItem === 'JOGAR') {
        window.location.href = '../game/game.html';
    }

    if (selectedItem === 'CRÉDITOS') {
        currentState = MENU_STATES.CREDITS;
    }

    if (selectedItem === 'CONTROLES') {
        currentState = MENU_STATES.CONTROLS;
    }
}

// loop principal do menu
function loop(time) {
    blinkTimer = time * 0.005;
    render();
    requestAnimationFrame(loop);
}

// renderiza a tela inteira
function render() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // desenha a imagem principal do menu
    drawTexture(menuTexture, 0, 0, canvas.width, canvas.height);

    // desenha os textos e painéis no canvas auxiliar
    drawMenuOverlay();

    // atualiza a textura de texto e desenha por cima
    updateTexture(gl, textTexture, textCanvas);
    drawTexture(textTexture, 0, 0, canvas.width, canvas.height);
}

// desenha a camada de interface por cima da imagem principal
function drawMenuOverlay() {
    textCtx.clearRect(0, 0, textCanvas.width, textCanvas.height);

    // escurece um pouco a tela para melhorar a leitura
    textCtx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    textCtx.fillRect(0, 0, textCanvas.width, textCanvas.height);

    if (currentState === MENU_STATES.MAIN) {
        drawMainMenuText();
        return;
    }

    drawPanel();

    if (currentState === MENU_STATES.CREDITS) {
        drawCreditsText();
        return;
    }

    drawControlsText();
}

// desenha o menu principal
function drawMainMenuText() {
    textCtx.textAlign = 'center';
    textCtx.textBaseline = 'middle';

    const startY = 310;
    const spacing = 64;

    for (let i = 0; i < menuItems.length; i++) {
        const isSelected = i === selectedIndex;
        const y = startY + i * spacing;

        if (isSelected) {
            textCtx.fillStyle = `rgba(255, 180, 0, ${0.14 + Math.abs(Math.sin(blinkTimer)) * 0.18})`;
            roundRect(textCtx, 250, y - 24, 300, 48, 14);
            textCtx.fill();
        }

        textCtx.font = isSelected ? "bold 40px 'Bytesized', monospace" : "30px 'Bytesized', monospace";
        textCtx.fillStyle = isSelected ? '#ffd54a' : '#ffffff';
        textCtx.fillText(menuItems[i], 400, y);
    }

    textCtx.font = "24px 'Bytesized', monospace";
    textCtx.fillStyle = '#d7e3ff';
    textCtx.fillText('↑ ↓ para navegar • Enter para confirmar', 400, 535);
}

// desenha o painel de créditos/controles
function drawPanel() {
    textCtx.fillStyle = 'rgba(5, 10, 25, 0.82)';
    roundRect(textCtx, 120, 220, 560, 290, 22);
    textCtx.fill();

    textCtx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    textCtx.lineWidth = 2;
    roundRect(textCtx, 120, 220, 560, 290, 22);
    textCtx.stroke();
}

// desenha a tela de créditos
function drawCreditsText() {
    textCtx.textAlign = 'center';
    textCtx.textBaseline = 'middle';

    textCtx.font = 'bold 40px "Bytesized", monospace';
    textCtx.fillStyle = '#ffffff';
    textCtx.fillText('CRÉDITOS', 400, 265);

    textCtx.font = '30px "Bytesized", monospace';
    textCtx.fillStyle = '#d7e3ff';
    textCtx.fillText('Desenvolvido por: Isa\'s', 400, 330);
    textCtx.fillText('Isabelle Moreira e Isadellis Paixão', 400, 370);

    textCtx.font = "30px 'Bytesized', monospace";
    textCtx.fillStyle = '#ffd54a';
    textCtx.fillText('ESC para voltar', 400, 470);
}

// desenha a tela de controles
function drawControlsText() {
    textCtx.textAlign = 'center';
    textCtx.textBaseline = 'middle';

    textCtx.font = 'bold 40px "Bytesized", monospace';
    textCtx.fillStyle = '#ffffff';
    textCtx.fillText('CONTROLES', 400, 260);

    textCtx.font = '30px "Bytesized", monospace';
    textCtx.fillStyle = '#d7e3ff';
    textCtx.fillText('← / →  mover a nave', 400, 320);
    textCtx.fillText('SPACE  atirar', 400, 360);
    textCtx.fillText('ESC  pausar o jogo', 400, 400);
    textCtx.fillText('R  reiniciar a partida', 400, 440);

    textCtx.font = "30px 'Bytesized', monospace";
    textCtx.fillStyle = '#ffd54a';
    textCtx.fillText('ESC para voltar', 400, 490);
}

// desenha um retângulo arredondado
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// cria um shader
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`Erro ao compilar shader: ${info}`);
    }

    return shader;
}

// cria o programa WebGL
function createProgram(gl, vertexSource, fragmentSource) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(shaderProgram);
        gl.deleteProgram(shaderProgram);
        throw new Error(`Erro ao linkar programa: ${info}`);
    }

    return shaderProgram;
}

// cria um buffer retangular
function createRectBuffer(gl, data) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    return buffer;
}

// cria uma textura
function createTexture(gl, source) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

    return texture;
}

// atualiza uma textura já existente
function updateTexture(gl, texture, source) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
}

// carrega uma textura a partir de uma imagem
function loadTexture(gl, path, fallbackColor = [255, 255, 255, 255]) {
    return new Promise((resolve) => {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // cor temporária enquanto a imagem não termina de carregar
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            1,
            1,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            new Uint8Array(fallbackColor)
        );

        const image = new Image();

        image.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            resolve(texture);
        };

        image.onerror = () => {
            console.warn(`Não foi possível carregar a textura: ${path}`);
            resolve(texture);
        };

        image.src = path;
    });
}

// desenha uma textura na tela
function drawTexture(texture, x, y, width, height) {
    gl.useProgram(program);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const texCoordLocation = gl.getAttribLocation(program, 'a_texcoord');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const translationLocation = gl.getUniformLocation(program, 'u_translation');
    const scaleLocation = gl.getUniformLocation(program, 'u_scale');
    const textureLocation = gl.getUniformLocation(program, 'u_texture');

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.uniform2f(translationLocation, x, y);
    gl.uniform2f(scaleLocation, width, height);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(textureLocation, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function playSound(audio) {
    if (!audio) return;

    audio.currentTime = 0;
    audio.play().catch(() => { });
}

main().catch((error) => {
    console.error(error);
});