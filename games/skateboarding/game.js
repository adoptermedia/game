// Skateboarding Halfpipe Physics Demo
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
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
let cursors;
let aKey;
let sKey;
let halfpipeGraphics;
let halfpipeBody;
let velocity = 0;
let onRamp = false;
let kickPower = 0;
let debugText;
let rampZones = [];

// Halfpipe dimensions
const HALFPIPE_LEFT = 75;
const HALFPIPE_RIGHT = 725;
const HALFPIPE_BOTTOM = 500;
const HALFPIPE_TOP = 250;
const HALFPIPE_WIDTH = HALFPIPE_RIGHT - HALFPIPE_LEFT;
const HALFPIPE_HEIGHT = HALFPIPE_BOTTOM - HALFPIPE_TOP;
const HALFPIPE_CENTER = (HALFPIPE_LEFT + HALFPIPE_RIGHT) / 2;

// Physics constants
const GRAVITY = 800;
const FRICTION = 0.985;
const KICK_FORCE = 200;
const JUMP_FORCE = 500;
const MAX_SPEED = 600;
const RAMP_BOOST = 15;

function preload() {
    // Create a simple white pixel for drawing
    this.load.image('pixel', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
}

function create() {
    // Create halfpipe visual
    halfpipeGraphics = this.add.graphics();
    drawHalfpipe.call(this);
    
    // Create halfpipe collision body
    createHalfpipeCollision.call(this);
    
    // Create skater (simple box)
    skater = this.physics.add.sprite(400, 200, 'pixel');
    skater.setScale(30, 40);
    skater.setTint(0xff0000);
    skater.setBounce(0);
    skater.setCollideWorldBounds(true);
    skater.body.setMaxVelocity(MAX_SPEED, 1000);
    
    // Prevent rotation
    skater.body.setAllowRotation(false);
    
    // Setup collision
    this.physics.add.collider(skater, halfpipeBody);
    
    // Create ramp detection zones
    createRampZones.call(this);
    
    // Controls
    cursors = this.input.keyboard.createCursorKeys();
    aKey = this.input.keyboard.addKey('A');
    sKey = this.input.keyboard.addKey('S');
    
    // Debug text
    debugText = this.add.text(10, 10, '', {
        fontSize: '16px',
        fill: '#000000'
    });
    
    // Instructions
    this.add.text(400, 570, 'Arrow Keys: Move | A: Kick/Push | S: Jump', {
        fontSize: '18px',
        fill: '#000000'
    }).setOrigin(0.5);
}

function drawHalfpipe() {
    halfpipeGraphics.clear();
    
    // Draw background
    halfpipeGraphics.fillStyle(0xdddddd, 0.3);
    halfpipeGraphics.fillRect(0, 0, 800, 600);
    
    // Draw halfpipe with smooth U shape
    halfpipeGraphics.lineStyle(4, 0x333333, 1);
    halfpipeGraphics.fillStyle(0x888888, 0.8);
    
    halfpipeGraphics.beginPath();
    halfpipeGraphics.moveTo(HALFPIPE_LEFT, HALFPIPE_TOP);
    
    // Create smooth U curve using quadratic function
    const points = [];
    for (let x = HALFPIPE_LEFT; x <= HALFPIPE_RIGHT; x += 5) {
        // Normalize x to range [-1, 1]
        const normalizedX = ((x - HALFPIPE_CENTER) / (HALFPIPE_WIDTH / 2));
        
        // Create parabolic U shape: y = ax^2 + b
        const y = HALFPIPE_BOTTOM - (1 - normalizedX * normalizedX) * HALFPIPE_HEIGHT;
        
        points.push({x, y});
        halfpipeGraphics.lineTo(x, y);
    }
    
    // Complete the shape
    halfpipeGraphics.lineTo(HALFPIPE_RIGHT, 600);
    halfpipeGraphics.lineTo(HALFPIPE_LEFT, 600);
    halfpipeGraphics.closePath();
    halfpipeGraphics.fillPath();
    halfpipeGraphics.strokePath();
    
    // Draw coping (edges)
    halfpipeGraphics.fillStyle(0xff6600, 1);
    halfpipeGraphics.fillCircle(HALFPIPE_LEFT, HALFPIPE_TOP, 8);
    halfpipeGraphics.fillCircle(HALFPIPE_RIGHT, HALFPIPE_TOP, 8);
    
    // Draw center line
    halfpipeGraphics.lineStyle(2, 0x666666, 0.5);
    halfpipeGraphics.lineBetween(HALFPIPE_CENTER, HALFPIPE_BOTTOM, HALFPIPE_CENTER, HALFPIPE_TOP);
}

function createHalfpipeCollision() {
    // Create a compound body for the halfpipe
    halfpipeBody = this.physics.add.staticGroup();
    
    // Create small segments to approximate the curve
    const segments = 40;
    
    for (let i = 0; i < segments; i++) {
        const x1 = HALFPIPE_LEFT + (HALFPIPE_WIDTH / segments) * i;
        const x2 = HALFPIPE_LEFT + (HALFPIPE_WIDTH / segments) * (i + 1);
        
        // Calculate y positions using same parabolic function
        const norm1 = ((x1 - HALFPIPE_CENTER) / (HALFPIPE_WIDTH / 2));
        const norm2 = ((x2 - HALFPIPE_CENTER) / (HALFPIPE_WIDTH / 2));
        
        const y1 = HALFPIPE_BOTTOM - (1 - norm1 * norm1) * HALFPIPE_HEIGHT;
        const y2 = HALFPIPE_BOTTOM - (1 - norm2 * norm2) * HALFPIPE_HEIGHT;
        
        // Create platform segment
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        
        const segment = halfpipeBody.create(centerX, centerY, 'pixel');
        segment.setScale(length + 2, 20);
        segment.setAngle(angle * 180 / Math.PI);
        segment.setAlpha(0); // Make invisible
        segment.refreshBody();
    }
    
    // Add floor segments at the bottom
    halfpipeBody.create(HALFPIPE_CENTER, HALFPIPE_BOTTOM + 10, 'pixel')
        .setScale(HALFPIPE_WIDTH * 0.6, 20)
        .setAlpha(0)
        .refreshBody();
}

function createRampZones() {
    // Left ramp zone
    const leftZone = this.add.zone(HALFPIPE_LEFT + 100, HALFPIPE_CENTER, 150, 300);
    this.physics.add.existing(leftZone, true);
    leftZone.body.setAllowGravity(false);
    rampZones.push({ zone: leftZone, side: 'left' });
    
    // Right ramp zone
    const rightZone = this.add.zone(HALFPIPE_RIGHT - 100, HALFPIPE_CENTER, 150, 300);
    this.physics.add.existing(rightZone, true);
    rightZone.body.setAllowGravity(false);
    rampZones.push({ zone: rightZone, side: 'right' });
    
    // Check overlaps
    rampZones.forEach(ramp => {
        this.physics.add.overlap(skater, ramp.zone, () => {
            onRamp = ramp.side;
        });
    });
}

function update() {
    // Reset ramp state
    onRamp = false;
    
    // Check if on ground
    const isGrounded = skater.body.blocked.down || skater.body.touching.down;
    
    // Apply custom physics when on ramp
    if (skater.x < HALFPIPE_LEFT + 150 || skater.x > HALFPIPE_RIGHT - 150) {
        // On the slopes - add gravity assist
        const side = skater.x < HALFPIPE_CENTER ? -1 : 1;
        velocity += side * RAMP_BOOST;
    }
    
    // Apply friction when grounded
    if (isGrounded) {
        velocity *= FRICTION;
    }
    
    // Controls
    if (cursors.left.isDown) {
        velocity -= 8;
    } else if (cursors.right.isDown) {
        velocity += 8;
    }
    
    // A key - Kick/Push (only when grounded)
    if (aKey.isDown && isGrounded) {
        kickPower = Math.min(kickPower + 3, 100);
    } else if (kickPower > 0) {
        velocity += (kickPower * KICK_FORCE) / 100;
        kickPower = 0;
    }
    
    // S key - Jump (only when grounded)
    if (Phaser.Input.Keyboard.JustDown(sKey) && isGrounded) {
        skater.setVelocityY(-JUMP_FORCE);
        
        // Add extra height based on speed
        if (Math.abs(velocity) > 300) {
            skater.setVelocityY(-JUMP_FORCE * 1.3);
        }
    }
    
    // Limit velocity
    velocity = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, velocity));
    
    // Apply horizontal velocity
    skater.setVelocityX(velocity);
    
    // Keep skater upright
    skater.setRotation(0);
    
    // Visual feedback
    if (!isGrounded) {
        skater.setTint(0xffff00); // Yellow in air
    } else if (kickPower > 0) {
        skater.setTint(0x00ff00); // Green when charging kick
    } else if (Math.abs(velocity) > 400) {
        skater.setTint(0xff00ff); // Purple at high speed
    } else {
        skater.setTint(0xff0000); // Red normally
    }
    
    // Update debug info
    debugText.setText([
        `Speed: ${Math.abs(velocity).toFixed(0)}`,
        `Grounded: ${isGrounded}`,
        `Kick Power: ${kickPower}%`,
        `Position: ${skater.x.toFixed(0)}, ${skater.y.toFixed(0)}`
    ]);
}

// Create the game
const game = new Phaser.Game(config);