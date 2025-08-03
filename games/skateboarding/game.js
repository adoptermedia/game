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
let speed = 200;
let combo = 1;
let comboTimer = 0;
let skyGradient;

// Pixel measurements
const SKATER_WIDTH = 32;
const SKATER_HEIGHT = 48;
const HALFPIPE_WIDTH = 200;
const HALFPIPE_HEIGHT = 100;

// Base64 encoded assets
const PIXEL_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

function preload() {
    // Load base pixel for drawing
    this.load.image('pixel', `data:image/png;base64,${PIXEL_BASE64}`);
}

function create() {
    // Create sky gradient
    skyGradient = this.add.graphics();
    updateSkyGradient.call(this);
    
    // Create background elements
    createBackground.call(this);
    
    // Create ground
    ground = this.physics.add.staticGroup();
    ground.create(320, 460, 'pixel').setScale(640, 40).refreshBody().setTint(0x4a4a4a);
    
    // Create halfpipe
    createHalfpipe.call(this);
    
    // Create skater as a simple rectangle sprite for now
    skater = this.physics.add.sprite(100, 400, 'pixel');
    skater.setScale(SKATER_WIDTH, SKATER_HEIGHT);
    skater.setTint(0xff0000); // Red for visibility
    skater.setBounce(0.2);
    skater.setCollideWorldBounds(true);
    
    // Physics
    this.physics.add.collider(skater, ground);
    
    // Create obstacles
    generateObstacles.call(this);
    
    // UI
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
    
    // Controls info
    this.add.text(320, 460, 'Arrow Keys: Move | Space: Jump/Tricks', {
        fontSize: '16px',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3
    }).setOrigin(0.5);
    
    // Start day/night cycle
    this.time.addEvent({
        delay: 2000,
        callback: updateTimeOfDay,
        callbackScope: this,
        loop: true
    });
}

function createHalfpipe() {
    const graphics = this.add.graphics();
    
    // Draw halfpipe visual
    graphics.lineStyle(4, 0x666666, 1);
    graphics.fillStyle(0x999999, 0.5);
    
    const startX = 220;
    const endX = 420;
    const baseY = 440;
    
    graphics.beginPath();
    graphics.moveTo(startX, baseY);
    
    // Draw U-shape curve
    for (let x = startX; x <= endX; x += 5) {
        const t = (x - startX) / HALFPIPE_WIDTH;
        const y = baseY - Math.sin(t * Math.PI) * HALFPIPE_HEIGHT;
        graphics.lineTo(x, y);
    }
    
    graphics.lineTo(endX, baseY);
    graphics.lineTo(startX, baseY);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
    
    // Create invisible physics boundaries for halfpipe
    halfpipe = this.physics.add.staticGroup();
    
    // Left wall
    halfpipe.create(startX - 10, baseY - HALFPIPE_HEIGHT/2, 'pixel')
        .setScale(20, HALFPIPE_HEIGHT)
        .refreshBody()
        .setVisible(false);
    
    // Right wall  
    halfpipe.create(endX + 10, baseY - HALFPIPE_HEIGHT/2, 'pixel')
        .setScale(20, HALFPIPE_HEIGHT)
        .refreshBody()
        .setVisible(false);
}

function createBackground() {
    if (background) {
        background.clear(true, true);
    }
    
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
        const sand = this.add.rectangle(320, 380, 640, 80, 0xf4a460);
        background.add(sand);
        
        // Palm trees
        for (let i = 0; i < 3; i++) {
            const x = 100 + i * 200;
            const trunk = this.add.rectangle(x, 340, 20, 80, 0x8b4513);
            const leaves = this.add.circle(x, 300, 40, 0x228b22);
            background.add([trunk, leaves]);
        }
    } else {
        // Parking lot with Hollywood sign
        // Asphalt
        const asphalt = this.add.rectangle(320, 380, 640, 80, 0x333333);
        background.add(asphalt);
        
        // Mountains
        const mountain1 = this.add.triangle(150, 350, 0, 150, 100, 0, 200, 150, 0x8b7355);
        const mountain2 = this.add.triangle(350, 350, 0, 180, 150, 0, 300, 180, 0x967444);
        background.add([mountain1, mountain2]);
        
        // Hollywood sign
        const signBg = this.add.rectangle(400, 200, 160, 40, 0xffffff);
        const signText = this.add.text(400, 200, 'HOLLYWOOD', {
            fontSize: '16px',
            fill: '#000000',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        background.add([signBg, signText]);
        
        // Parking lines
        for (let i = 0; i < 8; i++) {
            const line = this.add.rectangle(80 + i * 80, 420, 60, 4, 0xffff00);
            background.add(line);
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
    // Check if in halfpipe
    isInHalfpipe = skater.x > 220 && skater.x < 420;
    
    // Basic movement
    if (cursors.left.isDown) {
        skater.setVelocityX(-speed);
        skater.setTint(0xff0000); // Red when moving left
    } else if (cursors.right.isDown) {
        skater.setVelocityX(speed);
        skater.setTint(0x00ff00); // Green when moving right
    } else {
        skater.setVelocityX(0);
        skater.setTint(0x0000ff); // Blue when idle
    }
    
    // Jump
    if (spaceKey.isDown && skater.body.touching.down) {
        skater.setVelocityY(-500);
        
        // Extra height in halfpipe
        if (isInHalfpipe) {
            skater.setVelocityY(-700);
            score += 50;
            combo = Math.min(5, combo + 0.5);
            comboTimer = 60;
        }
    }
    
    // Halfpipe boost
    if (isInHalfpipe && skater.body.touching.down) {
        const relX = (skater.x - 220) / HALFPIPE_WIDTH;
        if (relX > 0 && relX < 1) {
            // Add speed boost on slopes
            const boost = Math.abs(Math.cos(relX * Math.PI)) * 5;
            speed = Math.min(400, 200 + boost * 20);
        }
    } else {
        speed = 200;
    }
    
    // Air rotation visual
    if (!skater.body.touching.down) {
        skater.angle += 5;
        skater.setTint(0xffff00); // Yellow in air
    } else {
        skater.angle = 0;
    }
    
    // Update combo
    if (comboTimer > 0) {
        comboTimer--;
        if (comboTimer === 0) {
            combo = 1;
        }
    }
    
    // Scroll obstacles
    obstacles.forEach(obstacle => {
        obstacle.x -= 3;
        
        // Simple collision check
        if (Phaser.Geom.Intersects.RectangleToRectangle(skater.getBounds(), obstacle.getBounds())) {
            score = Math.max(0, score - 10);
            combo = 1;
            obstacle.x = -100;
            skater.setTint(0xff00ff); // Purple on hit
        }
        
        // Respawn
        if (obstacle.x < -50) {
            obstacle.x = 700 + Math.random() * 200;
        }
    });
    
    // Score for distance
    score += 0.1;
    
    // Update display
    scoreText.setText(`Score: ${Math.floor(score)}` + (combo > 1 ? ` Combo x${combo.toFixed(1)}!` : ''));
}

function updateTimeOfDay() {
    timeOfDay = (timeOfDay + 2) % 24;
    updateSkyGradient.call(this);
    
    const timeStr = timeOfDay < 6 || timeOfDay > 20 ? 'Night' :
                   timeOfDay < 8 || timeOfDay > 18 ? 'Dawn/Dusk' : 'Day';
    
    this.timeText.setText(`${scene === 'beach' ? 'Beach' : 'Hollywood'} - ${timeStr}`);
}

function switchScene() {
    scene = scene === 'beach' ? 'parking' : 'beach';
    
    // Recreate background
    createBackground.call(this);
    
    // Generate new obstacles
    generateObstacles.call(this);
}

// Create the game
const game = new Phaser.Game(config);