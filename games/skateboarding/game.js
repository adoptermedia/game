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
            gravity: { y: 0 }, // We'll handle gravity manually
            debug: true
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
let debugText;

// Physics variables
let position = 400; // X position along halfpipe
let velocity = 0; // Horizontal velocity
let verticalVelocity = 0; // For jumping
let isAirborne = false;
let airHeight = 0; // Height above halfpipe
let kickPower = 0;

// Halfpipe dimensions
const HALFPIPE_LEFT = 75;
const HALFPIPE_RIGHT = 725;
const HALFPIPE_BOTTOM = 500;
const HALFPIPE_TOP = 250;
const HALFPIPE_WIDTH = HALFPIPE_RIGHT - HALFPIPE_LEFT;
const HALFPIPE_HEIGHT = HALFPIPE_BOTTOM - HALFPIPE_TOP;
const HALFPIPE_CENTER = (HALFPIPE_LEFT + HALFPIPE_RIGHT) / 2;

// Physics constants
const GRAVITY = 25;
const FRICTION = 0.98;
const KICK_FORCE = 5;
const JUMP_FORCE = 15;
const MAX_SPEED = 15;
const SLOPE_GRAVITY = 0.5;

function preload() {
    // Create a simple white pixel for drawing
    this.load.image('pixel', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
}

function create() {
    // Create halfpipe visual
    halfpipeGraphics = this.add.graphics();
    drawHalfpipe.call(this);
    
    // Create skater (simple box)
    skater = this.add.rectangle(position, 300, 30, 40, 0xff0000);
    
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
    
    // Create smooth U curve
    for (let x = HALFPIPE_LEFT; x <= HALFPIPE_RIGHT; x += 5) {
        const y = getHalfpipeY(x);
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

// Get Y position for any X position on the halfpipe
function getHalfpipeY(x) {
    // Clamp x to halfpipe bounds
    x = Math.max(HALFPIPE_LEFT, Math.min(HALFPIPE_RIGHT, x));
    
    // Normalize x to range [-1, 1]
    const normalizedX = ((x - HALFPIPE_CENTER) / (HALFPIPE_WIDTH / 2));
    
    // Create parabolic U shape: y = ax^2 + b
    return HALFPIPE_BOTTOM - (1 - normalizedX * normalizedX) * HALFPIPE_HEIGHT;
}

// Get the slope angle at a given X position
function getHalfpipeSlope(x) {
    // Calculate derivative of the parabola to get slope
    const normalizedX = ((x - HALFPIPE_CENTER) / (HALFPIPE_WIDTH / 2));
    const slope = 2 * normalizedX * HALFPIPE_HEIGHT / (HALFPIPE_WIDTH / 2);
    return Math.atan(slope);
}

function update() {
    // Apply gravity based on position on halfpipe
    if (!isAirborne) {
        const slope = getHalfpipeSlope(position);
        velocity += Math.sin(slope) * SLOPE_GRAVITY;
    }
    
    // Apply friction
    velocity *= FRICTION;
    
    // Controls
    if (cursors.left.isDown) {
        velocity -= 0.3;
    } else if (cursors.right.isDown) {
        velocity += 0.3;
    }
    
    // A key - Kick/Push
    if (aKey.isDown && !isAirborne) {
        kickPower = Math.min(kickPower + 2, 100);
    } else if (kickPower > 0) {
        velocity += (kickPower / 100) * KICK_FORCE;
        kickPower = 0;
    }
    
    // S key - Jump
    if (Phaser.Input.Keyboard.JustDown(sKey) && !isAirborne) {
        isAirborne = true;
        verticalVelocity = -JUMP_FORCE;
        
        // Add extra height based on speed
        if (Math.abs(velocity) > 8) {
            verticalVelocity = -JUMP_FORCE * 1.5;
        }
    }
    
    // Limit velocity
    velocity = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, velocity));
    
    // Update position
    position += velocity;
    
    // Keep within bounds
    if (position < HALFPIPE_LEFT) {
        position = HALFPIPE_LEFT;
        velocity = -velocity * 0.5; // Bounce off wall
    } else if (position > HALFPIPE_RIGHT) {
        position = HALFPIPE_RIGHT;
        velocity = -velocity * 0.5; // Bounce off wall
    }
    
    // Handle airborne physics
    if (isAirborne) {
        airHeight += verticalVelocity;
        verticalVelocity += GRAVITY / 60; // Apply gravity
        
        // Check if landed
        if (airHeight >= 0) {
            airHeight = 0;
            isAirborne = false;
            verticalVelocity = 0;
        }
    }
    
    // Calculate skater position
    const baseY = getHalfpipeY(position);
    skater.x = position;
    skater.y = baseY + airHeight;
    
    // Visual feedback
    if (isAirborne) {
        skater.fillColor = 0xffff00; // Yellow in air
    } else if (kickPower > 0) {
        skater.fillColor = 0x00ff00; // Green when charging kick
    } else if (Math.abs(velocity) > 10) {
        skater.fillColor = 0xff00ff; // Purple at high speed
    } else {
        skater.fillColor = 0xff0000; // Red normally
    }
    
    // Update debug info
    const slope = getHalfpipeSlope(position);
    const slopeDegrees = (slope * 180 / Math.PI).toFixed(1);
    
    debugText.setText([
        `Speed: ${Math.abs(velocity).toFixed(1)}`,
        `Position: ${position.toFixed(0)}`,
        `Airborne: ${isAirborne}`,
        `Kick Power: ${kickPower}%`,
        `Slope: ${slopeDegrees}°`,
        `Height: ${airHeight.toFixed(1)}`,
        `Y Velocity: ${verticalVelocity.toFixed(1)}`,
        `FPS: ${this.game.loop.actualFps.toFixed(0)}`
    ]);
}

// Create the game
const game = new Phaser.Game(config);