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
            gravity: { y: 1200 },
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
let halfpipePhysics = [];
let velocity = 0;
let onHalfpipe = false;
let airborne = false;
let angle = 0;
let kickPower = 0;
let debugText;

// Halfpipe dimensions
const HALFPIPE_LEFT = 75;
const HALFPIPE_RIGHT = 725;
const HALFPIPE_BOTTOM = 500;
const HALFPIPE_TOP = 250;
const HALFPIPE_WIDTH = HALFPIPE_RIGHT - HALFPIPE_LEFT;
const HALFPIPE_HEIGHT = HALFPIPE_BOTTOM - HALFPIPE_TOP;

// Physics constants
const GRAVITY = 1200;
const FRICTION = 0.98;
const KICK_FORCE = 150;
const JUMP_FORCE = 600;
const MAX_SPEED = 800;

function preload() {
    // Create a simple white pixel for drawing
    this.load.image('pixel', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
}

function create() {
    // Create halfpipe visual
    halfpipeGraphics = this.add.graphics();
    drawHalfpipe.call(this);
    
    // Create halfpipe physics bodies
    createHalfpipePhysics.call(this);
    
    // Create skater (simple box)
    skater = this.physics.add.sprite(400, 200, 'pixel');
    skater.setScale(30, 40);
    skater.setTint(0xff0000);
    skater.setBounce(0.1);
    skater.setCollideWorldBounds(true);
    skater.body.setDrag(50, 0);
    
    // Setup collisions
    halfpipePhysics.forEach(segment => {
        this.physics.add.collider(skater, segment, handleHalfpipeCollision, null, this);
    });
    
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
    this.add.text(400, 550, 'Arrow Keys: Move | A: Kick/Push | S: Jump', {
        fontSize: '18px',
        fill: '#000000'
    }).setOrigin(0.5);
}

function drawHalfpipe() {
    halfpipeGraphics.clear();
    
    // Draw background
    halfpipeGraphics.fillStyle(0xcccccc, 0.3);
    halfpipeGraphics.fillRect(0, 0, 800, 600);
    
    // Draw halfpipe
    halfpipeGraphics.lineStyle(4, 0x333333, 1);
    halfpipeGraphics.fillStyle(0x666666, 0.8);
    
    halfpipeGraphics.beginPath();
    halfpipeGraphics.moveTo(HALFPIPE_LEFT, HALFPIPE_TOP);
    
    // Draw U-shape using bezier curves
    const segments = 50;
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = HALFPIPE_LEFT + (HALFPIPE_WIDTH * t);
        
        // Create U-shape: steep at edges, flat at bottom
        let normalizedX = (x - HALFPIPE_LEFT) / HALFPIPE_WIDTH;
        let y;
        
        if (normalizedX < 0.2) {
            // Left wall
            y = HALFPIPE_TOP + (HALFPIPE_HEIGHT * (normalizedX / 0.2));
        } else if (normalizedX > 0.8) {
            // Right wall
            y = HALFPIPE_TOP + (HALFPIPE_HEIGHT * ((1 - normalizedX) / 0.2));
        } else {
            // Bottom curve
            const curveX = (normalizedX - 0.2) / 0.6;
            y = HALFPIPE_BOTTOM - Math.cos(curveX * Math.PI) * 20;
        }
        
        halfpipeGraphics.lineTo(x, y);
    }
    
    halfpipeGraphics.strokePath();
    
    // Draw coping (edges)
    halfpipeGraphics.fillStyle(0xff6600, 1);
    halfpipeGraphics.fillCircle(HALFPIPE_LEFT, HALFPIPE_TOP, 8);
    halfpipeGraphics.fillCircle(HALFPIPE_RIGHT, HALFPIPE_TOP, 8);
}

function createHalfpipePhysics() {
    // Clear existing physics bodies
    halfpipePhysics.forEach(body => body.destroy());
    halfpipePhysics = [];
    
    // Create physics segments for the halfpipe
    const segments = 20;
    
    for (let i = 0; i < segments; i++) {
        const t1 = i / segments;
        const t2 = (i + 1) / segments;
        
        const x1 = HALFPIPE_LEFT + (HALFPIPE_WIDTH * t1);
        const x2 = HALFPIPE_LEFT + (HALFPIPE_WIDTH * t2);
        
        let y1, y2;
        
        // Calculate y positions for each segment
        const normalized1 = t1;
        const normalized2 = t2;
        
        if (normalized1 < 0.2) {
            y1 = HALFPIPE_TOP + (HALFPIPE_HEIGHT * (normalized1 / 0.2));
        } else if (normalized1 > 0.8) {
            y1 = HALFPIPE_TOP + (HALFPIPE_HEIGHT * ((1 - normalized1) / 0.2));
        } else {
            const curveX = (normalized1 - 0.2) / 0.6;
            y1 = HALFPIPE_BOTTOM - Math.cos(curveX * Math.PI) * 20;
        }
        
        if (normalized2 < 0.2) {
            y2 = HALFPIPE_TOP + (HALFPIPE_HEIGHT * (normalized2 / 0.2));
        } else if (normalized2 > 0.8) {
            y2 = HALFPIPE_TOP + (HALFPIPE_HEIGHT * ((1 - normalized2) / 0.2));
        } else {
            const curveX = (normalized2 - 0.2) / 0.6;
            y2 = HALFPIPE_BOTTOM - Math.cos(curveX * Math.PI) * 20;
        }
        
        // Create angled platform for this segment
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        
        const platform = this.physics.add.staticSprite(centerX, centerY, 'pixel');
        platform.setScale(length, 10);
        platform.setAngle(angle * 180 / Math.PI);
        platform.setVisible(false);
        platform.refreshBody();
        
        halfpipePhysics.push(platform);
    }
}

function handleHalfpipeCollision(skater, platform) {
    onHalfpipe = true;
    
    // Get the angle of the platform
    const platformAngle = platform.angle * Math.PI / 180;
    
    // Apply momentum based on angle
    if (Math.abs(platformAngle) > 0.1) {
        const slopeForce = Math.sin(platformAngle) * 50;
        velocity += slopeForce;
    }
}

function update() {
    // Reset halfpipe state
    onHalfpipe = false;
    airborne = !skater.body.touching.down;
    
    // Apply friction when on ground
    if (!airborne) {
        velocity *= FRICTION;
    }
    
    // Controls
    if (cursors.left.isDown) {
        velocity -= 10;
    } else if (cursors.right.isDown) {
        velocity += 10;
    }
    
    // A key - Kick/Push
    if (aKey.isDown && !airborne) {
        kickPower = Math.min(kickPower + 5, 100);
    } else if (kickPower > 0) {
        velocity += (kickPower * KICK_FORCE) / 100;
        kickPower = 0;
    }
    
    // S key - Jump
    if (sKey.isDown && !airborne) {
        skater.setVelocityY(-JUMP_FORCE);
        
        // Add horizontal boost based on current velocity
        if (Math.abs(velocity) > 200) {
            skater.setVelocityY(-JUMP_FORCE * 1.5);
        }
    }
    
    // Limit velocity
    velocity = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, velocity));
    
    // Apply velocity
    skater.setVelocityX(velocity);
    
    // Visual feedback
    if (airborne) {
        // Rotate in air
        skater.angle += velocity / 50;
        skater.setTint(0xffff00); // Yellow in air
    } else {
        skater.angle = 0;
        if (kickPower > 0) {
            skater.setTint(0x00ff00); // Green when charging kick
        } else if (Math.abs(velocity) > 400) {
            skater.setTint(0xff00ff); // Purple at high speed
        } else {
            skater.setTint(0xff0000); // Red normally
        }
    }
    
    // Update debug info
    debugText.setText([
        `Speed: ${Math.abs(velocity).toFixed(0)}`,
        `Airborne: ${airborne}`,
        `Kick Power: ${kickPower}%`,
        `Position: ${skater.x.toFixed(0)}, ${skater.y.toFixed(0)}`
    ]);
}

// Create the game
const game = new Phaser.Game(config);