import { createProgram, createShader, setupWebGL } from '../utils/gl-utils.js';
import { clearScreen, createPlayerGeometry, setProjection } from './core/renderer.js';
import { createPlayer, updatePlayer, listenForPlayerInput } from './objects/player.js';

const sceneObjects = {};

async function main() {
  const { canvas, gl } = setupWebGL('#game');
  const program = await initialize(gl);

  // configura o jogador e a projeção ortográfica
  setupPlayer(gl, program, canvas);
  setProjection(gl, program, canvas);

  // escuta as entradas do jogador
  listenForPlayerInput(sceneObjects.player.data);


  // inicia o loop principal do jogo
  requestAnimationFrame(gameLoop);
  function gameLoop() {
    updatePlayer(sceneObjects.player.data, canvas);
    
    render(gl, program);
    requestAnimationFrame(gameLoop);
  }
}

// inicializa o WebGL, carrega os shaders
export async function initialize(gl) {
  const { vertexShaderSource, fragmentShaderSource } = await getShaderSources();

  const program = createProgram(
    gl,
    createShader(gl, 'vs', gl.VERTEX_SHADER, vertexShaderSource),
    createShader(gl, 'fs', gl.FRAGMENT_SHADER, fragmentShaderSource)
  );

  gl.useProgram(program);
  return program;
}

// carrega os shaders de vértice e fragmento de forma assíncrona
async function getShaderSources() {
  const vertexShaderSource = await fetch('./shaders/vertex-shader.glsl');
  if (!vertexShaderSource.ok) {
    console.error('Erro ao carregar o shader de vértice:', vertexShaderSource.statusText);
    throw new Error('Falha ao carregar o shader de vértice');
  }

  const fragmentShaderSource = await fetch('./shaders/fragment-shader.glsl');
  if (!fragmentShaderSource.ok) {
    console.error('Erro ao carregar o shader de fragmento:', fragmentShaderSource.statusText);
    throw new Error('Falha ao carregar o shader de fragmento');
  }

  return {
    vertexShaderSource: await vertexShaderSource.text(),
    fragmentShaderSource: await fragmentShaderSource.text()
  };
}

// cria o jogador e configura sua geometria
function setupPlayer(gl, program, canvas) {
  const player = createPlayer(canvas);
  const playerVAO = createPlayerGeometry(gl, program, player);

  sceneObjects.player = {
    vao: playerVAO,
    vertexCount: 4,
    data: player
  };
}

// renderiza os objetos da cena
function render(gl, program) {
  clearScreen(gl);

  // atualiza a posição do jogador no shader
  const offsetLocation = gl.getUniformLocation(program, 'offset');
  gl.uniform2f(
    offsetLocation,
    sceneObjects.player.data.x,
    sceneObjects.player.data.y
  );

  // desenha o jogador
  gl.bindVertexArray(sceneObjects.player.vao);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, sceneObjects.player.vertexCount);
  gl.bindVertexArray(null);
}

main().catch((error) => {
  console.error(error);
});