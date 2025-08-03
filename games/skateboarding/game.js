// Skateboarding game configuration
const config = {
    type: Phaser.AUTO,
    width: 640,
    height: 480,
    parent: 'game-container',
    backgroundColor: '#87CEEB',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

// Game variables
let skater;
let ground;
let halfpipe;
let obstacles = [];
let score = 0;
let scoreText;
let scene = 'beach'; // 'beach' or 'parking'
let timeOfDay = 0; // 0-24 for day/night cycle
let background;
let cursors;
let spaceKey;
let isInHalfpipe = false;
let halfpipeAngle = 0;
let speed = 200;
let combo = 0;
let comboTimer = 0;
let skyGradient;

// Pixel measurements
const SKATER_WIDTH = 32;
const SKATER_HEIGHT = 48;
const HALFPIPE_WIDTH = 200;
const HALFPIPE_HEIGHT = 100;
const HALFPIPE_CURVE_POINTS = 20;

function preload() {
    // We'll generate all graphics procedurally
    this.load.image('pixel', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
}

function create() {
    // Create sky gradient
    skyGradient = this.add.graphics();
    updateSkyGradient.call(this);
    
    // Create background elements
    createBackground.call(this);
    
    // Create ground
    ground = this.add.rectangle(320, 460, 640, 40, 0x4a4a4a);
    this.physics.add.existing(ground, true);
    
    // Create halfpipe
    createHalfpipe.call(this);
    
    // Create skater (pixel art style)
    skater = createSkater.call(this, 100, 400);
    
    // Add collisions
    this.physics.add.collider(skater, ground);
    
    // Create UI
    scoreText = this.add.text(16, 16, 'Score: 0', { 
        fontSize: '24px', 
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
    });
    
    // Time display
    this.timeText = this.add.text(320, 16, 'Beach - Day', { 
        fontSize: '20px', 
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
    }).setOrigin(0.5, 0);
    
    // Controls
    cursors = this.input.keyboard.createCursorKeys();
    spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    // Scene switch button
    const switchButton = this.add.rectangle(580, 40, 100, 30, 0x333333)
        .setInteractive()
        .on('pointerdown', () => switchScene.call(this));
    
    this.add.text(580, 40, 'Switch Scene', {
        fontSize: '14px',
        fill: '#ffffff'
    }).setOrigin(0.5);
    
    // Start day/night cycle
    this.time.addEvent({
        delay: 1000,
        callback: updateTimeOfDay,
        callbackScope: this,
        loop: true
    });
    
    // Generate initial obstacles
    generateObstacles.call(this);
}

function createSkater(x, y) {
    // Create pixel art skater using shapes
    const container = this.add.container(x, y);
    
    // Body (torso)
    const body = this.add.rectangle(0, -20, 16, 20, 0x3498db);
    
    // Head
    const head = this.add.circle(0, -35, 8, 0xfdbcb4);
    
    // Helmet
    const helmet = this.add.ellipse(0, -38, 18, 12, 0x2c3e50);
    
    // Arms
    const leftArm = this.add.rectangle(-8, -15, 6, 16, 0x3498db);
    const rightArm = this.add.rectangle(8, -15, 6, 16, 0x3498db);
    
    // Legs
    const leftLeg = this.add.rectangle(-4, -5, 6, 20, 0x34495e);
    const rightLeg = this.add.rectangle(4, -5, 6, 20, 0x34495e);
    
    // Skateboard
    const board = this.add.rectangle(0, 8, 40, 6, 0x8b4513);
    const wheelLeft = this.add.circle(-12, 11, 3, 0x2c3e50);
    const wheelRight = this.add.circle(12, 11, 3, 0x2c3e50);
    
    container.add([board, wheelLeft, wheelRight, leftLeg, rightLeg, body, leftArm, rightArm, head, helmet]);
    
    // Add physics
    this.physics.add.existing(container);
    container.body.setSize(SKATER_WIDTH, SKATER_HEIGHT);
    container.body.setCollideWorldBounds(true);
    
    return container;
}

function createHalfpipe() {
    halfpipe = this.add.graphics();
    
    // Draw halfpipe curve
    halfpipe.lineStyle(4, 0x666666, 1);
    halfpipe.fillStyle(0x999999, 1);
    
    const startX = 220;
    const startY = 440;
    
    halfpipe.beginPath();
    halfpipe.moveTo(startX, startY);
    
    // Create halfpipe curve points
    for (let i = 0; i <= HALFPIPE_CURVE_POINTS; i++) {
        const angle = (i / HALFPIPE_CURVE_POINTS) * Math.PI;
        const x = startX + (i / HALFPIPE_CURVE_POINTS) * HALFPIPE_WIDTH;
        const y = startY - Math.sin(angle) * HALFPIPE_HEIGHT;
        
        if (i === 0) {
            halfpipe.moveTo(x, y);
        } else {
            halfpipe.lineTo(x, y);
        }
    }
    
    halfpipe.lineTo(startX + HALFPIPE_WIDTH, startY);
    halfpipe.lineTo(startX, startY);
    halfpipe.closePath();
    halfpipe.fillPath();
    halfpipe.strokePath();
    
    // Create physics bodies for halfpipe edges
    const leftEdge = this.add.rectangle(startX - 10, startY - HALFPIPE_HEIGHT/2, 20, HALFPIPE_HEIGHT, 0x666666, 0);
    const rightEdge = this.add.rectangle(startX + HALFPIPE_WIDTH + 10, startY - HALFPIPE_HEIGHT/2, 20, HALFPIPE_HEIGHT, 0x666666, 0);
    this.physics.add.existing(leftEdge, true);
    this.physics.add.existing(rightEdge, true);
}

function createBackground() {
    background = this.add.group();
    
    if (scene === 'beach') {
        // Beach scene
        // Ocean
        const ocean = this.add.rectangle(320, 300, 640, 200, 0x006994);
        background.add(ocean);
        
        // Waves
        for (let i = 0; i < 5; i++) {
            const wave = this.add.ellipse(
                100 + i * 150 + Math.random() * 50, 
                280 + Math.random() * 40, 
                80, 20, 0x0099cc
            );
            background.add(wave);
        }
        
        // Sand
        const sand = this.add.rectangle(320, 420, 640, 120, 0xf4a460);
        background.add(sand);
        
        // Palm trees
        for (let i = 0; i < 3; i++) {
            const x = 100 + i * 200;
            const trunk = this.add.rectangle(x, 380, 20, 80, 0x8b4513);
            const leaves = this.add.circle(x, 340, 40, 0x228b22);
            background.add([trunk, leaves]);
        }
    } else {
        // Parking lot with Hollywood sign
        // Mountains
        const mountain1 = this.add.triangle(100, 400, 0, 100, 100, 0, 200, 100, 0x8b7355, 0.8);
        const mountain2 = this.add.triangle(300, 400, 0, 120, 150, 0, 300, 120, 0x8b7355, 0.8);
        background.add([mountain1, mountain2]);
        
        // Hollywood sign
        const signBg = this.add.rectangle(400, 200, 160, 40, 0xffffff);
        const signText = this.add.text(400, 200, 'HOLLYWOOD', {
            fontSize: '16px',
            fill: '#000000',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        background.add([signBg, signText]);
        
        // Parking lot lines
        for (let i = 0; i < 8; i++) {
            const line = this.add.rectangle(80 + i * 80, 440, 60, 4, 0xffff00);
            background.add(line);
        }
        
        // Street lights
        for (let i = 0; i < 3; i++) {
            const pole = this.add.rectangle(200 + i * 200, 400, 8, 80, 0x333333);
            const light = this.add.circle(200 + i * 200, 360, 15, 0xffff99);
            background.add([pole, light]);
        }
    }
}

function updateSkyGradient() {
    skyGradient.clear();
    
    // Calculate sky colors based on time
    let topColor, bottomColor;
    
    if (timeOfDay < 6 || timeOfDay > 20) {
        // Night
        topColor = 0x0f0f2e;
        bottomColor = 0x1a1a3e;
    } else if (timeOfDay < 8 || timeOfDay > 18) {
        // Dawn/Dusk
        topColor = 0xff6b6b;
        bottomColor = 0xfeca57;
    } else {
        // Day
        topColor = 0x87ceeb;
        bottomColor = 0xb8e6ff;
    }
    
    // Draw gradient
    for (let i = 0; i < 240; i++) {
        const ratio = i / 240;
        const color = Phaser.Display.Color.Interpolate.ColorWithColor(
            Phaser.Display.Color.ValueToColor(topColor),
            Phaser.Display.Color.ValueToColor(bottomColor),
            240, i
        );
        skyGradient.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b));
        skyGradient.fillRect(0, i * 2, 640, 2);
    }
}

function generateObstacles() {
    // Clear existing obstacles
    obstacles.forEach(obs => obs.destroy());
    obstacles = [];
    
    const obstacleTypes = scene === 'beach' 
        ? ['cone', 'sandcastle', 'shell'] 
        : ['cone', 'barrier', 'trash'];
    
    for (let i = 0; i < 5; i++) {
        const x = 500 + i * 200;
        const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        const obstacle = createObstacle.call(this, x, 430, type);
        obstacles.push(obstacle);
    }
}

function createObstacle(x, y, type) {
    let obstacle;
    
    switch(type) {
        case 'cone':
            obstacle = this.add.triangle(x, y, 0, 20, 10, 0, 20, 20, 0xff6600);
            break;
        case 'sandcastle':
            obstacle = this.add.rectangle(x, y, 30, 25, 0xdaa520);
            break;
        case 'shell':
            obstacle = this.add.circle(x, y, 10, 0xffc0cb);
            break;
        case 'barrier':
            obstacle = this.add.rectangle(x, y, 40, 20, 0xff0000);
            break;
        case 'trash':
            obstacle = this.add.rectangle(x, y, 15, 20, 0x666666);
            break;
    }
    
    this.physics.add.existing(obstacle, true);
    return obstacle;
}

function update() {
    // Check if skater is in halfpipe zone
    isInHalfpipe = skater.x > 220 && skater.x < 420;
    
    // Movement
    if (cursors.left.isDown) {
        skater.body.setVelocityX(-speed);
        skater.angle = -5;
    } else if (cursors.right.isDown) {
        skater.body.setVelocityX(speed);
        skater.angle = 5;
    } else {
        skater.body.setVelocityX(0);
        skater.angle = 0;
    }
    
    // Jump/Tricks
    if (spaceKey.isDown && skater.body.touching.down) {
        skater.body.setVelocityY(-400);
        
        // Bonus jump in halfpipe
        if (isInHalfpipe) {
            skater.body.setVelocityY(-600);
            score += 50;
            combo++;
            comboTimer = 60;
        }
    }
    
    // Halfpipe physics
    if (isInHalfpipe && !skater.body.touching.down) {
        // Apply curved motion in halfpipe
        const relativeX = (skater.x - 220) / HALFPIPE_WIDTH;
        const targetY = 440 - Math.sin(relativeX * Math.PI) * HALFPIPE_HEIGHT;
        
        if (skater.y > targetY - 50) {
            skater.body.setVelocityY(Math.min(skater.body.velocity.y, -100));
        }
    }
    
    // Update combo
    if (comboTimer > 0) {
        comboTimer--;
        if (comboTimer === 0) {
            combo = 0;
        }
    }
    
    // Scroll obstacles
    obstacles.forEach(obstacle => {
        obstacle.x -= 3;
        
        // Check collision
        if (Math.abs(skater.x - obstacle.x) < 30 && Math.abs(skater.y - obstacle.y) < 30) {
            // Hit obstacle
            score = Math.max(0, score - 10);
            combo = 0;
            obstacle.x = -100; // Move off screen
        }
        
        // Respawn obstacle
        if (obstacle.x < -50) {
            obstacle.x = 700 + Math.random() * 200;
        }
    });
    
    // Update score display
    scoreText.setText(`Score: ${score}` + (combo > 1 ? ` Combo x${combo}!` : ''));
}

function updateTimeOfDay() {
    timeOfDay = (timeOfDay + 1) % 24;
    updateSkyGradient.call(this);
    
    const timeStr = timeOfDay < 6 || timeOfDay > 20 ? 'Night' :
                   timeOfDay < 8 || timeOfDay > 18 ? 'Dawn/Dusk' : 'Day';
    
    this.timeText.setText(`${scene === 'beach' ? 'Beach' : 'Hollywood'} - ${timeStr}`);
}

function switchScene() {
    scene = scene === 'beach' ? 'parking' : 'beach';
    
    // Clear and recreate background
    background.clear(true, true);
    createBackground.call(this);
    
    // Generate new obstacles
    generateObstacles.call(this);
}

// Create the game
const game = new Phaser.Game(config);