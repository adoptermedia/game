// Basic Phaser 3 game configuration
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
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

let player;
let cursors;
let platforms;

function preload() {
    // Create simple colored rectangles for sprites
    this.load.image('ground', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    this.load.image('player', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
}

function create() {
    // Create platforms
    platforms = this.physics.add.staticGroup();
    
    // Ground platform
    platforms.create(320, 450, 'ground').setScale(640, 60).refreshBody().setTint(0x228B22);
    
    // Floating platforms
    platforms.create(480, 320, 'ground').setScale(160, 20).refreshBody().setTint(0x228B22);
    platforms.create(100, 200, 'ground').setScale(160, 20).refreshBody().setTint(0x228B22);
    platforms.create(540, 150, 'ground').setScale(160, 20).refreshBody().setTint(0x228B22);
    
    // Create player
    player = this.physics.add.sprite(100, 350, 'player');
    player.setScale(32, 32);
    player.setTint(0xFF6347);
    player.setBounce(0.2);
    player.setCollideWorldBounds(true);
    
    // Player physics
    this.physics.add.collider(player, platforms);
    
    // Create cursor keys
    cursors = this.input.keyboard.createCursorKeys();
    
    // Add instructions text
    this.add.text(16, 16, 'Use arrow keys to move and jump', { 
        fontSize: '18px', 
        fill: '#000' 
    });
}

function update() {
    // Player movement
    if (cursors.left.isDown) {
        player.setVelocityX(-160);
    } else if (cursors.right.isDown) {
        player.setVelocityX(160);
    } else {
        player.setVelocityX(0);
    }
    
    // Jump only when on ground
    if (cursors.up.isDown && player.body.touching.down) {
        player.setVelocityY(-330);
    }
}

// Create the game
const game = new Phaser.Game(config);