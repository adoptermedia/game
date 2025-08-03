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
    pixelArt: true,
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

// Base64 encoded assets (1x1 pixel for procedural generation)
const PIXEL_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// Simple sound effect generation (base64 encoded minimal WAV files)
// These are tiny procedural beeps/clicks for web audio
const LAND_SOUND_BASE64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='; // Silent placeholder
const GRIND_SOUND_BASE64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='; // Silent placeholder

// Halfpipe Y-coordinate map for smooth U-shape (x: 220-420)
const halfpipeYMap = {};
for (let x = 220; x <= 420; x++) {
    const relX = (x - 220) / HALFPIPE_WIDTH;
    const angle = relX * Math.PI;
    halfpipeYMap[x] = 440 - Math.sin(angle) * HALFPIPE_HEIGHT;
}

function preload() {
    // Load base pixel for procedural generation
    this.load.image('pixel', `data:image/png;base64,${PIXEL_BASE64}`);
    
    // Create and load skater sprite sheet procedurally
    this.load.on('filecomplete-image-pixel', () => {
        // Generate skater spritesheet
        const skaterCanvas = this.textures.createCanvas('skater-sheet', 512, 64);
        const ctx = skaterCanvas.context;
        
        // Draw 16 frames of skater animations
        for (let frame = 0; frame < 16; frame++) {
            const x = frame * 32;
            drawSkaterFrame(ctx, x, 0, frame);
        }
        
        skaterCanvas.refresh();
        
        // Create sprite sheet from canvas
        this.textures.addSpriteSheet('skater', skaterCanvas.canvas, {
            frameWidth: 32,
            frameHeight: 48
        });
    });
}

function create() {
    // Create animations
    this.anims.create({
        key: 'idle',
        frames: this.anims.generateFrameNumbers('skater', { start: 0, end: 1 }),
        frameRate: 4,
        repeat: -1
    });
    
    this.anims.create({
        key: 'pushLeft',
        frames: this.anims.generateFrameNumbers('skater', { start: 2, end: 3 }),
        frameRate: 8,
        repeat: -1
    });
    
    this.anims.create({
        key: 'pushRight',
        frames: this.anims.generateFrameNumbers('skater', { start: 4, end: 5 }),
        frameRate: 8,
        repeat: -1
    });
    
    this.anims.create({
        key: 'jump',
        frames: [{ key: 'skater', frame: 6 }],
        frameRate: 1
    });
    
    this.anims.create({
        key: 'grab',
        frames: [{ key: 'skater', frame: 7 }],
        frameRate: 1
    });
    
    this.anims.create({
        key: 'kickflip',
        frames: this.anims.generateFrameNumbers('skater', { start: 8, end: 9 }),
        frameRate: 16,
        repeat: 0
    });
    
    this.anims.create({
        key: 'handplant',
        frames: [{ key: 'skater', frame: 10 }],
        frameRate: 1
    });
    
    this.anims.create({
        key: 'bail',
        frames: [{ key: 'skater', frame: 11 }],
        frameRate: 1
    });
    
    this.anims.create({
        key: 'grind',
        frames: [{ key: 'skater', frame: 12 }],
        frameRate: 1
    });
    
    this.anims.create({
        key: 'spin360',
        frames: [{ key: 'skater', frame: 13 }],
        frameRate: 1
    });
    
    this.anims.create({
        key: 'crouch',
        frames: [{ key: 'skater', frame: 14 }],
        frameRate: 1
    });
    
    this.anims.create({
        key: 'victory',
        frames: [{ key: 'skater', frame: 15 }],
        frameRate: 1
    });
    
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
    
    // Create skater sprite
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

// Helper function to draw skater frames
function drawSkaterFrame(ctx, x, y, frame) {
    ctx.save();
    ctx.translate(x + 16, y + 24);
    
    // Different poses based on frame
    switch(frame) {
        case 0: // Idle
        case 1:
            drawSkaterStanding(ctx, frame === 1);
            break;
        case 2: // Push left
        case 3:
            drawSkaterPushing(ctx, true, frame === 3);
            break;
        case 4: // Push right
        case 5:
            drawSkaterPushing(ctx, false, frame === 5);
            break;
        case 6: // Jump
            drawSkaterJumping(ctx);
            break;
        case 7: // Grab
            drawSkaterGrab(ctx);
            break;
        case 8: // Kickflip frame 1
        case 9: // Kickflip frame 2
            drawSkaterKickflip(ctx, frame - 8);
            break;
        case 10: // Handplant
            drawSkaterHandplant(ctx);
            break;
        case 11: // Bail
            drawSkaterBail(ctx);
            break;
        case 12: // Grind
            drawSkaterGrind(ctx);
            break;
        case 13: // 360 spin
            drawSkater360(ctx);
            break;
        case 14: // Crouch
            drawSkaterCrouch(ctx);
            break;
        case 15: // Victory
            drawSkaterVictory(ctx);
            break;
    }
    
    ctx.restore();
}

function drawSkaterStanding(ctx, alt) {
    // Skateboard
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-20, 20, 40, 4);
    ctx.fillStyle = '#333';
    ctx.fillRect(-15, 24, 6, 6);
    ctx.fillRect(9, 24, 6, 6);
    
    // Legs
    ctx.fillStyle = '#34495e';
    ctx.fillRect(-6, 0, 5, 20);
    ctx.fillRect(1, 0, 5, 20);
    
    // Body
    ctx.fillStyle = '#3498db';
    ctx.fillRect(-8, -20, 16, 20);
    
    // Arms
    const armOffset = alt ? 2 : 0;
    ctx.fillRect(-12, -15 + armOffset, 4, 12);
    ctx.fillRect(8, -15 - armOffset, 4, 12);
    
    // Head
    ctx.fillStyle = '#fdbcb4';
    ctx.fillRect(-6, -30, 12, 10);
    
    // Helmet
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(-8, -32, 16, 8);
}

function drawSkaterPushing(ctx, left, extended) {
    drawSkaterStanding(ctx, false);
    
    // Pushing leg
    ctx.fillStyle = '#34495e';
    if (left) {
        ctx.fillRect(extended ? -10 : -8, extended ? 15 : 10, 5, extended ? 10 : 15);
    } else {
        ctx.fillRect(extended ? 5 : 3, extended ? 15 : 10, 5, extended ? 10 : 15);
    }
}

function drawSkaterJumping(ctx) {
    // Skateboard (rotated)
    ctx.save();
    ctx.rotate(0.3);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-20, 25, 40, 4);
    ctx.fillStyle = '#333';
    ctx.fillRect(-15, 29, 6, 6);
    ctx.fillRect(9, 29, 6, 6);
    ctx.restore();
    
    // Bent legs
    ctx.fillStyle = '#34495e';
    ctx.fillRect(-6, -5, 5, 15);
    ctx.fillRect(1, -5, 5, 15);
    ctx.fillRect(-8, 8, 7, 5);
    ctx.fillRect(1, 8, 7, 5);
    
    // Body (leaning)
    ctx.save();
    ctx.rotate(-0.1);
    ctx.fillStyle = '#3498db';
    ctx.fillRect(-8, -20, 16, 20);
    
    // Arms out
    ctx.fillRect(-16, -18, 6, 4);
    ctx.fillRect(10, -18, 6, 4);
    ctx.fillRect(-16, -18, 4, 10);
    ctx.fillRect(12, -18, 4, 10);
    
    // Head
    ctx.fillStyle = '#fdbcb4';
    ctx.fillRect(-6, -30, 12, 10);
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(-8, -32, 16, 8);
    ctx.restore();
}

function drawSkaterGrab(ctx) {
    drawSkaterJumping(ctx);
    
    // Hand grabbing board
    ctx.fillStyle = '#fdbcb4';
    ctx.fillRect(-10, 15, 6, 6);
}

function drawSkaterKickflip(ctx, frame) {
    // Rotating board
    ctx.save();
    ctx.rotate(frame * Math.PI);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-20, 25, 40, 4);
    ctx.fillStyle = '#333';
    ctx.fillRect(-15, 29, 6, 6);
    ctx.fillRect(9, 29, 6, 6);
    ctx.restore();
    
    drawSkaterJumping(ctx);
}

function drawSkaterHandplant(ctx) {
    // Upside down
    ctx.save();
    ctx.scale(1, -1);
    drawSkaterStanding(ctx, false);
    ctx.restore();
    
    // Hand on ground
    ctx.fillStyle = '#fdbcb4';
    ctx.fillRect(-12, 28, 6, 6);
}

function drawSkaterBail(ctx) {
    // Fallen position
    ctx.save();
    ctx.rotate(1.2);
    drawSkaterStanding(ctx, false);
    ctx.restore();
    
    // Stars around head
    ctx.fillStyle = '#FFD700';
    for (let i = 0; i < 3; i++) {
        const angle = i * 2.09;
        const x = Math.cos(angle) * 15;
        const y = Math.sin(angle) * 15 - 25;
        ctx.fillRect(x - 2, y - 2, 4, 4);
    }
}

function drawSkaterGrind(ctx) {
    drawSkaterCrouch(ctx);
    
    // Sparks
    ctx.fillStyle = '#FFA500';
    ctx.fillRect(-18, 24, 2, 2);
    ctx.fillRect(-14, 26, 2, 2);
    ctx.fillRect(12, 24, 2, 2);
    ctx.fillRect(16, 26, 2, 2);
}

function drawSkater360(ctx) {
    ctx.save();
    ctx.rotate(Math.PI / 4);
    drawSkaterJumping(ctx);
    ctx.restore();
}

function drawSkaterCrouch(ctx) {
    // Skateboard
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-20, 20, 40, 4);
    ctx.fillStyle = '#333';
    ctx.fillRect(-15, 24, 6, 6);
    ctx.fillRect(9, 24, 6, 6);
    
    // Crouched legs
    ctx.fillStyle = '#34495e';
    ctx.fillRect(-6, 5, 5, 15);
    ctx.fillRect(1, 5, 5, 15);
    ctx.fillRect(-8, 0, 7, 8);
    ctx.fillRect(1, 0, 7, 8);
    
    // Crouched body
    ctx.fillStyle = '#3498db';
    ctx.fillRect(-8, -12, 16, 15);
    
    // Arms
    ctx.fillRect(-12, -10, 4, 10);
    ctx.fillRect(8, -10, 4, 10);
    
    // Head
    ctx.fillStyle = '#fdbcb4';
    ctx.fillRect(-6, -22, 12, 10);
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(-8, -24, 16, 8);
}

function drawSkaterVictory(ctx) {
    drawSkaterStanding(ctx, false);
    
    // Arms up
    ctx.fillStyle = '#3498db';
    ctx.fillRect(-12, -25, 4, 12);
    ctx.fillRect(8, -25, 4, 12);
    
    // Victory hands
    ctx.fillStyle = '#fdbcb4';
    ctx.fillRect(-12, -28, 4, 4);
    ctx.fillRect(8, -28, 4, 4);
}

function createSkater(x, y) {
    // Create sprite-based skater
    const skater = this.physics.add.sprite(x, y, 'skater', 0);
    skater.setSize(SKATER_WIDTH, SKATER_HEIGHT);
    skater.setCollideWorldBounds(true);
    
    return skater;
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
    
    // Air tricks
    if (!skater.body.touching.down && Phaser.Input.Keyboard.JustDown(spaceKey)) {
        const trickRoll = Math.random();
        if (trickRoll < 0.3) {
            skater.anims.play('kickflip');
            score += 50 * combo;
        } else if (trickRoll < 0.6) {
            skater.anims.play('grab');
            score += 75 * combo;
        } else {
            skater.anims.play('handplant');
            score += 100 * combo;
        }
        combo = Math.min(5, combo + 0.2);
        comboTimer = 90;
    }
    
    // Handle halfpipe mechanics
    if (isInHalfpipe) {
        const relativeX = (skater.x - 220) / HALFPIPE_WIDTH;
        if (relativeX >= 0 && relativeX <= 1) {
            const targetY = halfpipeYMap[Math.round(skater.x)];
            
            if (skater.body.touching.down && targetY) {
                // Follow halfpipe curve
                skater.y = targetY - SKATER_HEIGHT/2;
                
                // Add angular momentum based on position
                const angle = relativeX * Math.PI;
                const slopeMultiplier = Math.cos(angle);
                speed = Math.min(300, speed + slopeMultiplier * 2);
                
                // Halfpipe tricks
                if (spaceKey.isDown && (relativeX < 0.1 || relativeX > 0.9)) {
                    skater.body.setVelocityY(-800);
                    score += 100 * combo;
                    combo = Math.min(5, combo + 0.5);
                    comboTimer = 120;
                    skater.anims.play('spin360');
                }
            }
        } else {
            isInHalfpipe = false;
        }
    }
    
    // Update animations
    if (!skater.body.touching.down) {
        if (!skater.anims.currentAnim || !['jump', 'grab', 'kickflip', 'handplant', 'spin360'].includes(skater.anims.currentAnim.key)) {
            skater.anims.play('jump');
        }
    } else if (Math.abs(skater.body.velocity.x) > 10) {
        if (skater.body.velocity.x < 0) {
            skater.anims.play('pushLeft', true);
            skater.setFlipX(true);
        } else {
            skater.anims.play('pushRight', true);
            skater.setFlipX(false);
        }
    } else {
        skater.anims.play('idle', true);
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
            skater.anims.play('bail');
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