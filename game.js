/**
 * CONFIGURAÇÕES DO JOGO
 */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const baseWidth = 1400;
const baseHeight = 360;
canvas.width = baseWidth;
canvas.height = baseHeight;

// Estados do Jogo: 'START', 'PLAYING', 'GAMEOVER'
let gameState = 'START';
let isLoggedIn = false;

// Elementos de Autenticação
const loginOverlay = document.getElementById("login-overlay");
const instaHandleInput = document.getElementById("insta-handle");
const loginPassInput = document.getElementById("login-pass");
const btnLogin = document.getElementById("btn-login");
const btnSignup = document.getElementById("btn-signup");
const loginError = document.getElementById("login-error");

// Lógica de Autenticação Firebase
let currentUserHandle = null;

async function handleSignup() {
    console.log("Tentando criar conta...");
    const instaHandle = instaHandleInput.value.trim();
    const password = loginPassInput.value.trim();

    if (!instaHandle || !password) {
        loginError.innerText = "Preencha todos os campos!";
        return;
    }

    if (!instaHandle.startsWith("@")) {
        loginError.innerText = "O handle deve começar com @";
        return;
    }

    try {
        if (!window.firestore) throw new Error("Firebase Firestore não carregou!");
        const { collection, addDoc, getDocs, query, where } = window.firestore;
        const db = window.firebaseDB;
        
        // Verificar se já existe
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("handle", "==", instaHandle));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            loginError.innerText = "Este @ já está registado!";
            return;
        }

        // Criar conta no Firestore (para perfil/auth)
        await addDoc(usersRef, {
            handle: instaHandle,
            password: password,
            createdAt: new Date()
        });

        console.log("Conta criada no Firestore!");
        loginError.style.color = "#4CAF50";
        loginError.innerText = "Conta criada! Já podes entrar.";
    } catch (e) {
        console.error("Erro no signup: ", e);
        loginError.innerText = "Erro: " + e.message;
    }
}

async function handleLogin() {
    console.log("Tentando fazer login...");
    const instaHandle = instaHandleInput.value.trim();
    const password = loginPassInput.value.trim();

    if (!instaHandle || !password) {
        loginError.innerText = "Preencha todos os campos!";
        return;
    }

    try {
        if (!window.firestore) throw new Error("Firebase Firestore não carregou!");
        const { collection, getDocs, query, where } = window.firestore;
        const db = window.firebaseDB;
        
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("handle", "==", instaHandle), where("password", "==", password));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            loginError.style.color = "#ff4d4d";
            loginError.innerText = "@ ou password incorretos!";
            return;
        }

        // Login sucesso
        isLoggedIn = true;
        currentUserHandle = instaHandle;
        loginOverlay.style.display = "none";
        console.log("Login efetuado com sucesso para:", currentUserHandle);
        
        // Sincronizar HighScore do RTDB se existir
        syncHighScoreFromRTDB();
    } catch (e) {
        console.error("Erro no login: ", e);
        loginError.innerText = "Erro: " + e.message;
    }
}

async function syncHighScoreFromRTDB() {
    if (!currentUserHandle) return;
    const { ref, onValue } = window.rtdb;
    const db = window.firebaseRTDB;
    const scoreRef = ref(db, 'scores/' + currentUserHandle.replace('@', ''));
    
    onValue(scoreRef, (snapshot) => {
        const data = snapshot.val();
        if (data && data.highScore > highScore) {
            highScore = data.highScore;
            localStorage.setItem("highScore", String(highScore));
        }
    });
}

async function saveScoreToRTDB(newScore) {
    if (!currentUserHandle || !isLoggedIn) {
        console.warn("Não foi possível guardar no RTDB: User não logado!");
        return;
    }
    try {
        const { ref, set } = window.rtdb;
        const db = window.firebaseRTDB;
        const cleanHandle = currentUserHandle.replace('@', '').replace('.', '_'); // Evita caracteres inválidos no RTDB
        const scoreRef = ref(db, 'scores/' + cleanHandle);
        
        console.log("A tentar guardar score para:", cleanHandle, "Valor:", Math.floor(newScore));
        
        await set(scoreRef, {
            handle: currentUserHandle,
            highScore: Math.floor(newScore),
            updatedAt: new Date().toISOString()
        });
        console.log("Score guardado com SUCESSO no RTDB!");
    } catch (e) {
        console.error("ERRO ao guardar no RTDB: ", e);
    }
}

if (btnLogin) btnLogin.addEventListener("click", handleLogin);
if (btnSignup) btnSignup.addEventListener("click", handleSignup);

// Carregamento dos sprites do player
function createSprite(src) {
    const image = new Image();
    image.src = src;
    return image;
}

function createFrameSequence(rows) {
    return rows.flatMap(({ row, columns }) => (
        columns.map((column) => ({ row, column }))
    ));
}

const playerSprites = {
    run: createSprite("imagens reais/sprite_running.png"),
    duck: createSprite("imagens reais/sprite_crouching.png"),
    jump: createSprite("imagens reais/sprite_jumping.png")
};

const duckForwardFrames = createFrameSequence([
    { row: 3, columns: [0, 1, 2, 3, 4, 5] },
    { row: 4, columns: [0, 1, 2, 3, 4, 5] }
]);

const playerAnimations = {
    run: {
        image: playerSprites.run,
        columns: 6,
        rows: 6,
        frameStep: 4,
        cropX: 4,
        cropY: 2,
        drawScale: 1,
        frames: createFrameSequence([
            { row: 0, columns: [0, 1, 2, 3, 4, 5] },
            { row: 1, columns: [0, 1, 2, 3, 4, 5] },
            { row: 2, columns: [0, 1, 2, 3, 4, 5] },
            { row: 3, columns: [0, 1, 2, 3, 4, 5] },
            { row: 4, columns: [0, 1, 2, 3, 4, 5] },
            { row: 5, columns: [0, 1, 2, 3, 4, 5] }
        ])
    },
    duck: {
        image: playerSprites.duck,
        columns: 6,
        rows: 6,
        frameStep: 4,
        cropX: 5,
        cropY: 5,
        drawScale: 1.03,
        frames: [
            ...duckForwardFrames,
            ...duckForwardFrames.slice(1, -1).reverse()
        ]
    },
    jump: {
        image: playerSprites.jump,
        columns: 3,
        rows: 3,
        frameStep: 6,
        cropX: 4,
        cropY: 20,
        drawScale: 1.14,
        frames: createFrameSequence([
            { row: 1, columns: [0, 1, 2] }
        ])
    }
};

let activePlayerAnimationKey = "run";

function getPlayerAnimationKey() {
    if (player.jumping) {
        return "jump";
    }

    if (player.ducking) {
        return "duck";
    }

    return "run";
}

function setActivePlayerAnimation(nextKey, options = {}) {
    const { restart = false } = options;

    if (!restart && activePlayerAnimationKey === nextKey) {
        return;
    }

    activePlayerAnimationKey = nextKey;

    if (restart && nextKey === "jump") {
        player.jumpAnimationFrame = 0;
    }
}

function syncPlayerAnimation() {
    setActivePlayerAnimation(getPlayerAnimationKey());
}

function drawMirroredSprite(animation, frame, x, y, width, height, options = {}) {
    const {
        extraTopCrop = 0,
        extraBottomCrop = 0
    } = options;

    const image = animation.image;
    if (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) {
        return false;
    }

    const frameWidth = image.naturalWidth / animation.columns;
    const frameHeight = image.naturalHeight / animation.rows;
    const sourceX = frame.column * frameWidth + animation.cropX / 2;
    const sourceY = frame.row * frameHeight + animation.cropY / 2 + extraTopCrop;
    const sourceWidth = frameWidth - animation.cropX;
    const sourceHeight = Math.max(1, frameHeight - animation.cropY - extraTopCrop - extraBottomCrop);

    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        -(x + width),
        y,
        width,
        height
    );
    ctx.restore();

    return true;
}

const obstacle1 = new Image();
obstacle1.src = "imagens reais/barril_1.png";

const obstacle2 = new Image();
obstacle2.src = "imagens reais/barril_3.png";

const bottleSprite = new Image();
bottleSprite.src = "imagens reais/botija_3.png";

// Carregamento do Chão
const floorImage = new Image();
floorImage.src = "imagens reais/chao_disco.png";

// Carregamento da imagem de gameover
const gameoverImage = new Image();
gameoverImage.src = "imagens reais/dancinha_do_jamal_lobo.png";

// Carregamento da imagem do Easter egg - Artista revelado
const easterEggImage = new Image();
easterEggImage.src = "artistas/espama.jpg";

// Variáveis Globais
let score = 0;
let highScore = Number(localStorage.getItem("highScore") || 0);
let gameoverAnimationFrame = 0;
let gameSpeed = 2.8;

// Easter egg variables
let easterEggActive = false;
let easterEggTimer = 0;
let easterEggAnimationFrame = 0;
let leftInputActive = false;
const initialSpeed = 5;
const speedIncrease = 0.00005;
const riseGravity = 0.34;
const fallGravity = 0.78;
const jumpForce = -12.8;
const maxFallSpeed = 16;
const groundY = canvas.height - 74; // Mantém o player junto ao chão com mais espaço vertical
const floorTopY = groundY + 42;
const floorHeight = canvas.height - floorTopY;
let frameCount = 0;
let distanceTraveled = 0;
let nextSpawnDistance = 0;
let lastPatternId = "singleSmall";
let newHighScoreAchieved = false;
let floorOffset = 0;
let duckInputActive = false;
const defaultBackgroundImage = "url('imagens reais/noite_de_pato.jpg')";
const specialBackgroundImage = "url('imagens reais/terraqueo.jpeg')";
const specialBackgroundTriggerScore = 1000;
const specialBackgroundDurationMs = 2200;
let specialBackgroundTriggered = false;
let specialBackgroundEndTime = 0;

const nightBackground = document.getElementById('night-background');

const obstacleTypes = {
    small: {
        width: 28,
        height: 47,
        yOffset: 21,
        img: obstacle1,
        // Hitbox menor para ser mais justo
        collisionWidth: 20,
        collisionHeight: 35,
        collisionOffsetX: 4,
        collisionOffsetY: 6
    },
    large: {
        width: 52, // Reduzido de 60
        height: 47,
        yOffset: 21,
        img: obstacle2,
        // Hitbox menor para ser mais justo
        collisionWidth: 38,
        collisionHeight: 35,
        collisionOffsetX: 7,
        collisionOffsetY: 6
    },
    bottle: {
        width: 69, // Tamanho reduzido (escala de 70%)
        height: 27,
        yOffset: 0, // Será definido dinamicamente
        img: bottleSprite,
        totalFrames: 3,
        speedModifier: 0.5,
        animated: true,
        // Hitbox menor para ser mais justo
        collisionWidth: 58,
        collisionHeight: 22,
        collisionOffsetX: 5,
        collisionOffsetY: 2
    }
};

const patternLibrary = [
    {
        id: "singleSmall",
        minDifficulty: 0,
        maxDifficulty: 1,
        weight: 5,
        obstacles: [
            { type: "small", gap: 0 }
        ]
    },
    {
        id: "singleLarge",
        minDifficulty: 0.12,
        maxDifficulty: 1,
        weight: 4,
        obstacles: [
            { type: "large", gap: 0 }
        ]
    },
    {
        id: "smallLarge",
        minDifficulty: 0.35,
        maxDifficulty: 1,
        weight: 3,
        obstacles: [
            { type: "small", gap: 0 },
            { type: "large", gap: 260 }
        ]
    },
    {
        id: "largeSmall",
        minDifficulty: 0.45,
        maxDifficulty: 1,
        weight: 2,
        obstacles: [
            { type: "large", gap: 0 },
            { type: "small", gap: 300 }
        ]
    },
    {
        id: "doubleSmall",
        minDifficulty: 0.6,
        maxDifficulty: 1,
        weight: 2,
        obstacles: [
            { type: "small", gap: 0 },
            { type: "small", gap: 250 }
        ]
    },
    {
        id: "flyingBottle",
        minDifficulty: 0.25,
        maxDifficulty: 1,
        weight: 1, // Reduzido para ser mais raro
        obstacles: [
            { type: "bottle", gap: 0 }
        ]
    }
];

// Objetos do Jogo
const player = {
    x: 50,
    y: groundY,
    width: 72,
    height: 72,
    duckWidth: 72,
    duckHeight: 54,
    vy: 0,
    jumping: false,
    ducking: false,
    jumpAnimationFrame: 0,
    collisionOffsetX: 14,
    collisionOffsetY: 12,
    collisionWidth: 44,
    collisionHeight: 56,
    
    draw() {
        const animation = playerAnimations[activePlayerAnimationKey];
        let frameIndex = Math.floor(frameCount / animation.frameStep) % animation.frames.length;
        let drawX = this.x;
        let drawY = this.y;
        let drawWidth = this.width;
        let drawHeight = this.height;
        let extraBottomCrop = 0;

        if (this.jumping) {
            frameIndex = Math.min(
                Math.floor(this.jumpAnimationFrame / animation.frameStep),
                animation.frames.length - 1
            );
        }

        if (this.ducking && !this.jumping) {
            drawWidth = this.duckWidth;
            drawHeight = this.duckHeight - 4;
            drawY = this.y + (this.height - drawHeight) + 2;
            extraBottomCrop = 8;
        }

        const drawScale = animation.drawScale || 1;
        if (drawScale !== 1) {
            const scaledWidth = drawWidth * drawScale;
            const scaledHeight = drawHeight * drawScale;
            drawX -= (scaledWidth - drawWidth) / 2;
            drawY -= scaledHeight - drawHeight;
            drawWidth = scaledWidth;
            drawHeight = scaledHeight;
        }

        if (drawMirroredSprite(animation, animation.frames[frameIndex], drawX, drawY, drawWidth, drawHeight, {
            extraBottomCrop
        })) {
            return;
        }

        ctx.fillStyle = "#0b1b3b";
        ctx.fillRect(this.x, this.y, this.width, this.height);
    },

    getHitbox() {
        if (this.ducking && !this.jumping) {
            return {
                x: this.x + 12,
                y: this.y + 28,
                width: 46,
                height: 28
            };
        }

        return {
            x: this.x + this.collisionOffsetX,
            y: this.y + this.collisionOffsetY,
            width: this.collisionWidth,
            height: this.collisionHeight
        };
    },
    
    jump() {
        if (!this.jumping && !this.ducking) {
            this.vy = jumpForce;
            this.jumping = true;
            this.jumpAnimationFrame = 0;
            setActivePlayerAnimation("jump", { restart: true });
        }
    },

    endJump() {
        // Se o jogador estiver a subir, corta o salto
        if (this.vy < 0) {
            this.vy = Math.max(this.vy, -6); // Salto curto um pouco mais alto
        }
    },
    
    update() {
        this.ducking = duckInputActive && !this.jumping;

        const gravity = this.vy < 0 ? riseGravity : fallGravity;
        this.vy += gravity;
        this.vy = Math.min(this.vy, maxFallSpeed);
        this.y += this.vy;
        this.jumpAnimationFrame = this.jumping ? this.jumpAnimationFrame + 1 : 0;
        
        // Deteção de Chão
        if (this.y > groundY) {
            this.y = groundY;
            this.vy = 0;
            this.jumping = false;
            this.ducking = duckInputActive;
        }
    }
};



const obstacles = [];

/**
 * FUNÇÕES DE LÓGICA
 */

function getDifficultyLevel() {
    return Math.min(score / 400, 1);
}

function getPatternById(id) {
    return patternLibrary.find((pattern) => pattern.id === id) || patternLibrary[0];
}

function getWeightedRandomPattern(availablePatterns) {
    const totalWeight = availablePatterns.reduce((sum, pattern) => sum + pattern.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const pattern of availablePatterns) {
        roll -= pattern.weight;
        if (roll <= 0) {
            return pattern;
        }
    }

    return availablePatterns[availablePatterns.length - 1];
}

function selectPattern() {
    const difficulty = getDifficultyLevel();
    const availablePatterns = patternLibrary.filter((pattern) => (
        difficulty >= pattern.minDifficulty &&
        difficulty <= pattern.maxDifficulty &&
        pattern.id !== lastPatternId
    ));

    const bottleOnMap = obstacles.some((obstacle) => obstacle.type === "bottle");

    if (bottleOnMap) {
        const saferPatterns = availablePatterns.filter((pattern) => (
            pattern.obstacles.length === 1 && pattern.obstacles[0].type !== "bottle"
        ));

        if (saferPatterns.length > 0) {
            return getWeightedRandomPattern(saferPatterns);
        }
    }

    if (availablePatterns.length === 0) {
        return getPatternById("singleSmall");
    }

    return getWeightedRandomPattern(availablePatterns);
}

function getObstacleSpacing(type) {
    const reactionFrames = type === "large" ? 72 : 66;
    return Math.round(gameSpeed * reactionFrames + (type === "large" ? 230 : 190));
}

function getMinimumObjectGap(previousType, nextType) {
    const baseGap = Math.round(gameSpeed * 42 + 150);

    if (previousType === "large" || nextType === "large") {
        return baseGap + 70;
    }

    return baseGap;
}

function getPostPatternSpacing(lastType) {
    const safeSpacing = getObstacleSpacing(lastType);
    const extraSpacing = Math.max(260 - score * 0.15, 150);
    return safeSpacing + extraSpacing;
}

function createObstacle(type, x) {
    const config = obstacleTypes[type];
    const obstacle = {
        x,
        y: groundY + config.yOffset,
        width: config.width,
        height: config.height,
        img: config.img,
        type: type // Adiciona o tipo ao obstáculo
    };

    // Posição Y especial para a botija
    if (type === 'bottle') {
        obstacle.y = 52 + Math.random() * 82; // Sobe a botija e mantém alguma variação
    }

    return obstacle;
}

function spawnPattern() {
    const pattern = selectPattern();
    const rightmostObstacle = obstacles.reduce((rightmost, obstacle) => (
        !rightmost || obstacle.x > rightmost.x ? obstacle : rightmost
    ), null);
    let desiredX = canvas.width;
    let previousPlaced = rightmostObstacle ? {
        x: rightmostObstacle.x,
        width: rightmostObstacle.width,
        type: rightmostObstacle.width > 28 ? "large" : "small"
    } : null;

    for (const part of pattern.obstacles) {
        desiredX += part.gap;

        if (previousPlaced) {
            const previousRightEdge = previousPlaced.x + previousPlaced.width;
            const minimumGap = getMinimumObjectGap(previousPlaced.type, part.type);
            desiredX = Math.max(desiredX, previousRightEdge + minimumGap);
        }

        const obstacle = createObstacle(part.type, desiredX);
        obstacles.push(obstacle);
        previousPlaced = {
            x: obstacle.x,
            width: obstacle.width,
            type: part.type
        };
    }

    const lastType = pattern.obstacles[pattern.obstacles.length - 1].type;
    nextSpawnDistance = distanceTraveled + getPostPatternSpacing(lastType);
    lastPatternId = pattern.id;

    // Adiciona um grande espaçamento após a botija para reduzir a densidade de obstáculos
    if (pattern.id === 'flyingBottle') {
        nextSpawnDistance += 460;
    }
}

function saveHighScore() {
    const currentScore = Math.floor(score);
    
    // Guardar no Firebase RTDB sempre que termina para testar ligação
    saveScoreToRTDB(currentScore);

    if (currentScore > highScore) {
        highScore = currentScore;
        newHighScoreAchieved = true;
        localStorage.setItem("highScore", String(highScore));
    }
}

function handleBackgroundTransition() {
    const currentScore = Math.floor(score);
    const now = performance.now();
    const cycleLength = 2000; // O ciclo repete a cada 2000 pontos
    const scoreInCycle = currentScore % cycleLength;

    if (!specialBackgroundTriggered && currentScore >= specialBackgroundTriggerScore) {
        specialBackgroundTriggered = true;
        specialBackgroundEndTime = now + specialBackgroundDurationMs;
    }

    if (specialBackgroundEndTime > now) {
        nightBackground.style.backgroundImage = specialBackgroundImage;
        nightBackground.classList.add('active');
        return;
    }

    nightBackground.style.backgroundImage = defaultBackgroundImage;

    // Lógica: 0-499 (off), 500-1499 (on), 1500-1999 (off)
    if (scoreInCycle >= 500 && scoreInCycle < 1500) {
        nightBackground.classList.add('active');
    } else {
        nightBackground.classList.remove('active');
    }
}

function resetGame() {
    score = 0;
    gameSpeed = initialSpeed;
    distanceTraveled = 0;
    floorOffset = 0;
    duckInputActive = false;
    specialBackgroundTriggered = false;
    specialBackgroundEndTime = 0;
    nextSpawnDistance = 220;
    lastPatternId = "singleSmall";
    newHighScoreAchieved = false;
    obstacles.length = 0;
    player.x = 50;
    player.y = groundY;
    player.vy = 0;
    player.jumping = false;
    player.ducking = false;
    player.jumpAnimationFrame = 0;
    gameoverAnimationFrame = 0;
    easterEggActive = false;
    easterEggTimer = 0;
    easterEggAnimationFrame = 0;
    leftInputActive = false;
    nightBackground.style.backgroundImage = defaultBackgroundImage;
    nightBackground.classList.remove('active');
    setActivePlayerAnimation("run", { restart: true });
    gameState = 'PLAYING';
}

function handleInput() {
    if (!isLoggedIn) return;
    if (gameState === 'START' || gameState === 'GAMEOVER' || easterEggActive) {
        resetGame();
    } else if (gameState === 'PLAYING') {
        player.jump();
    }
}

function handleJumpEnd() {
    if (gameState === 'PLAYING') {
        player.endJump();
    }
}

function setDuckInput(active) {
    if (!isLoggedIn) return;
    duckInputActive = active;

    if (gameState !== 'PLAYING' || player.jumping) {
        return;
    }

    player.ducking = active;
    syncPlayerAnimation();
}

// Eventos (Teclado e Mobile)
window.addEventListener('keydown', (e) => {
    // Se o login estiver visível, não bloqueamos teclas para permitir escrita
    if (!isLoggedIn) return;

    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault(); // Evita scroll da página
        handleInput();
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        setDuckInput(true);
    } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        if (isLoggedIn) leftInputActive = true;
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

// Eventos para terminar o salto (quando se solta a tecla/dedo)
window.addEventListener('keyup', (e) => {
    if (!isLoggedIn) return;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        handleJumpEnd();
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        setDuckInput(false);
    } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        leftInputActive = false;
    }
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    handleJumpEnd();
});

canvas.addEventListener('mouseup', (e) => {
    handleJumpEnd();
});

/**
 * LOOP PRINCIPAL
 */

function update() {
    if (!isLoggedIn) return;

    if (gameState === 'GAMEOVER') {
        gameoverAnimationFrame++;
        return;
    }
    
    if (easterEggActive) {
        easterEggAnimationFrame++;
        return;
    }

    if (gameState !== 'PLAYING') return;

    frameCount++;
    
    const isMovingLeftForEasterEgg = Math.floor(score) < 200 && leftInputActive && gameState === 'PLAYING';

    if (!isMovingLeftForEasterEgg) {
        // Aumenta velocidade gradualmente
        gameSpeed += speedIncrease;
        distanceTraveled += gameSpeed;
        floorOffset += gameSpeed;
        score += gameSpeed * 0.08; // Pontuação baseada na distância
    }

    // Easter egg logic: move player to the left
    if (isMovingLeftForEasterEgg) {
        player.x -= 4;
        if (player.x < -100) {
            easterEggActive = true;
            easterEggTimer = 0;
            easterEggAnimationFrame = 0;
        }
    }

    handleBackgroundTransition();

    player.update();
    syncPlayerAnimation();

    // Gestão de Obstáculos baseada em distância percorrida
    if (distanceTraveled >= nextSpawnDistance) {
        spawnPattern();
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        
        if (!isMovingLeftForEasterEgg) {
            // A botija move-se mais devagar
            const speed = obs.type === 'bottle' 
                ? gameSpeed * obstacleTypes.bottle.speedModifier 
                : gameSpeed;
            obs.x -= speed;
        }

        // Deteção de Colisão (AABB) - not active when moving left for easter egg
        if (!isMovingLeftForEasterEgg) {
            const hitbox = player.getHitbox();
            
            // Usar hitbox customizada se existir, senão usar dimensões do obstáculo
            const obsHitbox = obstacleTypes[obs.type].collisionWidth 
                ? {
                    x: obs.x + obstacleTypes[obs.type].collisionOffsetX,
                    y: obs.y + obstacleTypes[obs.type].collisionOffsetY,
                    width: obstacleTypes[obs.type].collisionWidth,
                    height: obstacleTypes[obs.type].collisionHeight
                }
                : {
                    x: obs.x,
                    y: obs.y,
                    width: obs.width,
                    height: obs.height
                };
            
            if (
                hitbox.x < obsHitbox.x + obsHitbox.width &&
                hitbox.x + hitbox.width > obsHitbox.x &&
                hitbox.y < obsHitbox.y + obsHitbox.height &&
                hitbox.y + hitbox.height > obsHitbox.y
            ) {
                gameState = 'GAMEOVER';
                saveHighScore();
            }
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

    // Easter egg overlay - draw this first if active
    if (easterEggActive) {
        drawEasterEgg();
        return;
    }

    // Desenhar Chão
    if (floorImage.complete && floorImage.naturalWidth > 0) {
        // Escala a textura para caber na faixa inferior e repete-a num loop para a esquerda.
        const floorScale = floorHeight / floorImage.naturalHeight;
        const tileWidth = floorImage.naturalWidth * floorScale;
        const offsetX = -(floorOffset % tileWidth);

        for (let x = offsetX - tileWidth; x < canvas.width + tileWidth; x += tileWidth) {
            ctx.drawImage(floorImage, x, floorTopY, tileWidth, floorHeight);
        }
    }

    // Desenhar Obstáculos
    for (const obs of obstacles) {
        if (obs.type === 'bottle') {
            const config = obstacleTypes.bottle;
            const frameWidth = obs.img.naturalWidth / config.totalFrames;
            const frameHeight = obs.img.naturalHeight;
            const currentFrame = Math.floor(frameCount / 8) % config.totalFrames;
            const sourceX = currentFrame * frameWidth;

            ctx.drawImage(
                obs.img,
                sourceX, 0,
                frameWidth, frameHeight,
                obs.x, obs.y,
                config.width, config.height // Usa o tamanho reduzido
            );
        } else {
            ctx.drawImage(obs.img, obs.x, obs.y, obs.width, obs.height);
        }
    }

    // Desenhar Player
    player.draw();

    drawScoreboard();

    // Ecrãs de Estado
    if (gameState === 'START') {
        drawOverlay("PRESS SPACE OR TAP TO START");
    } else if (gameState === 'GAMEOVER') {
        drawOverlay("GAME OVER - PRESS TO RESTART");
    }
}

function drawEasterEgg() {
    // Dynamic background
    const bgAlpha = 0.7 + Math.sin(easterEggAnimationFrame * 0.05) * 0.3;
    ctx.fillStyle = `rgba(0, 0, 0, ${bgAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the artist image with dynamic scaling and movement
    if (easterEggImage.complete && easterEggImage.naturalWidth > 0) {
        const scale = 0.5 + Math.sin(easterEggAnimationFrame * 0.08) * 0.1;
        const maxWidth = 350;
        const maxHeight = 350;
        let drawWidth = Math.min(easterEggImage.naturalWidth, maxWidth);
        let drawHeight = (drawWidth / easterEggImage.naturalWidth) * easterEggImage.naturalHeight;
        
        if (drawHeight > maxHeight) {
            const ratio = maxHeight / drawHeight;
            drawHeight = maxHeight;
            drawWidth = drawWidth * ratio;
        }

        drawWidth *= scale;
        drawHeight *= scale;

        // Dynamic position with slight movement
        const offsetX = Math.sin(easterEggAnimationFrame * 0.06) * 20;
        const offsetY = Math.cos(easterEggAnimationFrame * 0.06) * 15;
        
        const x = (canvas.width - drawWidth) / 2 + offsetX;
        const y = 30 + offsetY;

        // Glow effect behind image
        ctx.shadowBlur = 30 + Math.sin(easterEggAnimationFrame * 0.1) * 15;
        ctx.shadowColor = "rgba(255, 215, 0, 0.8)";
        
        ctx.drawImage(easterEggImage, x, y, drawWidth, drawHeight);
        
        // Reset shadow
        ctx.shadowBlur = 0;

        // Text with dynamic effects
        const textY = y + drawHeight + 40;
        const textScale = 1 + Math.sin(easterEggAnimationFrame * 0.1) * 0.1;
        
        ctx.save();
        ctx.translate(canvas.width / 2, textY);
        ctx.scale(textScale, textScale);
        
        // Rainbow text
        const hue = (easterEggAnimationFrame * 2) % 360;
        ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
        ctx.font = "bold 42px Courier New";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        // Text shadow for better readability
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        
        ctx.fillText("Artista revelado!!!", 0, 0);
        
        ctx.restore();

        // Sparkles around
        for (let i = 0; i < 8; i++) {
            const angle = (easterEggAnimationFrame * 0.03 + i * Math.PI / 4);
            const radius = 150 + Math.sin(easterEggAnimationFrame * 0.05 + i) * 30;
            const sparkX = canvas.width / 2 + Math.cos(angle) * radius;
            const sparkY = (canvas.height / 2) - 50 + Math.sin(angle) * radius;
            const sparkSize = 4 + Math.sin(easterEggAnimationFrame * 0.1 + i * 0.5) * 2;
            
            ctx.beginPath();
            ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
            ctx.fillStyle = `hsl(${(easterEggAnimationFrame + i * 45) % 360}, 100%, 70%)`;
            ctx.fill();
        }
    }
}

function drawScoreboard() {
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.fillRect(18, 14, 200, 50);
    ctx.fillRect(canvas.width - 218, 14, 200, 50);

    ctx.fillStyle = "#111";
    ctx.font = "bold 28px Courier New";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE ${Math.floor(score)}`, 30, 24);
    ctx.fillText(`BEST ${highScore}`, canvas.width - 206, 24);
    ctx.restore();
}

function drawOverlay(text) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (gameState === "GAMEOVER" && gameoverImage.complete && gameoverImage.naturalWidth > 0) {
        const columns = 6;
        const rows = 6;
        const totalFrames = columns * rows;
        const frameWidth = gameoverImage.naturalWidth / columns;
        const frameHeight = gameoverImage.naturalHeight / rows;
        
        const frameIndex = Math.floor(gameoverAnimationFrame / 8) % totalFrames;
        const col = frameIndex % columns;
        const row = Math.floor(frameIndex / columns);
        
        const sourceX = col * frameWidth;
        const sourceY = row * frameHeight;
        
        const maxDrawWidth = 200;
        const maxDrawHeight = 200;
        let drawWidth = frameWidth;
        let drawHeight = frameHeight;
        
        if (drawWidth > maxDrawWidth) {
            const ratio = maxDrawWidth / drawWidth;
            drawWidth = maxDrawWidth;
            drawHeight = drawHeight * ratio;
        }
        
        if (drawHeight > maxDrawHeight) {
            const ratio = maxDrawHeight / drawHeight;
            drawHeight = maxDrawHeight;
            drawWidth = drawWidth * ratio;
        }
        
        const x = (canvas.width - drawWidth) / 2;
        const y = 40;
        
        ctx.drawImage(
            gameoverImage,
            sourceX, sourceY,
            frameWidth, frameHeight,
            x, y,
            drawWidth, drawHeight
        );
        
        ctx.fillStyle = "white";
        ctx.font = "24px Courier New";
        ctx.textAlign = "center";
        ctx.fillText(text, canvas.width / 2, y + drawHeight + 40);
        
        if (newHighScoreAchieved) {
            ctx.font = "bold 18px Courier New";
            ctx.fillText("NEW BEST SCORE", canvas.width / 2, y + drawHeight + 74);
        }
    } else {
        ctx.fillStyle = "white";
        ctx.font = "24px Courier New";
        ctx.textAlign = "center";
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        
        if (gameState === "GAMEOVER" && newHighScoreAchieved) {
            ctx.font = "bold 18px Courier New";
            ctx.fillText("NEW BEST SCORE", canvas.width / 2, canvas.height / 2 + 34);
        }
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Resize handler
function resizeCanvas() {
    const container = document.getElementById('game-container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const ratio = Math.min(containerWidth / baseWidth, containerHeight / baseHeight);

    canvas.style.width = `${baseWidth * ratio}px`;
    canvas.style.height = `${baseHeight * ratio}px`;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Mobile button controls
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnDown = document.getElementById('btn-down');
const btnJump = document.getElementById('btn-jump');

if (btnLeft) {
    btnLeft.addEventListener('touchstart', (e) => {
        e.preventDefault();
        leftInputActive = true;
    }, { passive: false });
    btnLeft.addEventListener('touchend', (e) => {
        e.preventDefault();
        leftInputActive = false;
    }, { passive: false });
}

if (btnRight) {
    btnRight.addEventListener('touchstart', (e) => {
        e.preventDefault();
        // Placeholder for future right movement if needed
    }, { passive: false });
}

if (btnDown) {
    btnDown.addEventListener('touchstart', (e) => {
        e.preventDefault();
        setDuckInput(true);
    }, { passive: false });
    btnDown.addEventListener('touchend', (e) => {
        e.preventDefault();
        setDuckInput(false);
    }, { passive: false });
}

if (btnJump) {
    btnJump.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleInput();
    }, { passive: false });
    btnJump.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleJumpEnd();
    }, { passive: false });
}

// Iniciar Loop
gameLoop();
