/**
 * CONFIGURAÇÕES DO JOGO
 */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Dimensões fixas para integração perfeita no Readymag
canvas.width = 800;
canvas.height = 200;

// Estados do Jogo: 'START', 'PLAYING', 'GAMEOVER'
let gameState = 'START';

// Carregamento de Imagens
const playerRun1 = new Image();
playerRun1.src = "images/Chrome_T-Rex_Left_Run.webp";

const playerRun2 = new Image();
playerRun2.src = "images/Chrome_T-Rex_Right_Run.webp";

const obstacle1 = new Image();
obstacle1.src = "images/1_Cactus_Chrome_Dino.webp";

const obstacle2 = new Image();
obstacle2.src = "images/3_Cactus_Chrome_Dino.webp";

// Variáveis Globais
let score = 0;
let gameSpeed = 6;
const initialSpeed = 6;
const gravity = 0.6;
const jumpForce = -12;
const groundY = 140; // Ajustado para a altura do dinossauro
let frameCount = 0;

// Objetos do Jogo
const player = {
    x: 50,
    y: groundY,
    width: 44, // Proporções aproximadas do Dino original
    height: 47,
    vy: 0,
    jumping: false,
    
    draw() {
        // Animação de corrida: alterna entre as duas imagens a cada 10 frames
        let img = playerRun1;
        if (!this.jumping) {
            if (Math.floor(frameCount / 10) % 2 === 0) {
                img = playerRun1;
            } else {
                img = playerRun2;
            }
        }
        ctx.drawImage(img, this.x, this.y, this.width, this.height);
    },
    
    jump() {
        if (!this.jumping) {
            this.vy = jumpForce;
            this.jumping = true;
        }
    },
    
    update() {
        // Gravidade
        this.vy += gravity;
        this.y += this.vy;
        
        // Deteção de Chão
        if (this.y > groundY) {
            this.y = groundY;
            this.vy = 0;
            this.jumping = false;
        }
    }
};

const obstacles = [];
const obstacleConfig = {
    spawnTimer: 0,
    minSpawnInterval: 60,
    maxSpawnInterval: 120
};

/**
 * FUNÇÕES DE LÓGICA
 */

function spawnObstacle() {
    const isTriple = Math.random() > 0.5;
    obstacles.push({
        x: canvas.width,
        y: isTriple ? 145 : 145, // Ajuste fino no chão para os cactos
        width: isTriple ? 50 : 25, // Cacto triplo é mais largo
        height: 45,
        img: isTriple ? obstacle2 : obstacle1
    });
}

function resetGame() {
    score = 0;
    gameSpeed = initialSpeed;
    obstacles.length = 0;
    player.y = groundY;
    player.vy = 0;
    player.jumping = false;
    gameState = 'PLAYING';
}

function handleInput() {
    if (gameState === 'START' || gameState === 'GAMEOVER') {
        resetGame();
    } else if (gameState === 'PLAYING') {
        player.jump();
    }
}

// Eventos (Teclado e Mobile)
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault(); // Evita scroll da página
        handleInput();
    }
});

// Suporte Mobile (Toque no ecrã)
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleInput();
}, { passive: false });

// Também funciona com clique do rato para testes rápidos
canvas.addEventListener('mousedown', (e) => {
    handleInput();
});

/**
 * LOOP PRINCIPAL
 */

function update() {
    if (gameState !== 'PLAYING') return;

    frameCount++;
    // Aumenta velocidade gradualmente
    gameSpeed += 0.001;
    score += 0.1; // Pontuação baseada na distância

    player.update();

    // Gestão de Obstáculos
    obstacleConfig.spawnTimer--;
    if (obstacleConfig.spawnTimer <= 0) {
        spawnObstacle();
        // Randomiza próximo spawn
        obstacleConfig.spawnTimer = Math.floor(Math.random() * (obstacleConfig.maxSpawnInterval - obstacleConfig.minSpawnInterval)) + obstacleConfig.minSpawnInterval;
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= gameSpeed;

        // Deteção de Colisão (AABB)
        if (
            player.x < obs.x + obs.width &&
            player.x + player.width > obs.x &&
            player.y < obs.y + obs.height &&
            player.y + player.height > obs.y
        ) {
            gameState = 'GAMEOVER';
        }

        // Remover obstáculos que saíram do ecrã
        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
        }
    }
}

function draw() {
    // Limpar Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenhar Player
    player.draw();

    // Desenhar Obstáculos
    for (const obs of obstacles) {
        ctx.drawImage(obs.img, obs.x, obs.y, obs.width, obs.height);
    }

    // UI: Pontuação
    ctx.fillStyle = "#333";
    ctx.font = "bold 20px Courier New";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE: ${Math.floor(score)}`, 20, 30);

    // Ecrãs de Estado
    if (gameState === 'START') {
        drawOverlay("PRESS SPACE OR TAP TO START");
    } else if (gameState === 'GAMEOVER') {
        drawOverlay("GAME OVER - PRESS TO RESTART");
    }
}

function drawOverlay(text) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "24px Courier New";
    ctx.textAlign = "center";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Iniciar Loop
gameLoop();