// Tic Tac Toe game configuration
const config = {
    type: Phaser.AUTO,
    width: 640,
    height: 480,
    parent: 'game-container',
    backgroundColor: '#34495e',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: {
        preload: preload,
        create: create
    }
};

// Game variables
let board = [[null, null, null], [null, null, null], [null, null, null]];
let currentPlayer = 'X';
let gameOver = false;
let cells = [];
let statusText;
let resetButton;
let winLine;
let playerScore = 0;
let aiScore = 0;
let tieScore = 0;
let scoreText;

function preload() {
    // Create simple colored rectangles for sprites
    this.load.image('cell', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
}

function create() {
    // Title
    this.add.text(320, 40, 'Tic Tac Toe', {
        fontSize: '48px',
        fill: '#ecf0f1',
        fontStyle: 'bold'
    }).setOrigin(0.5);

    // Score display
    scoreText = this.add.text(320, 90, `Player: ${playerScore}  |  AI: ${aiScore}  |  Ties: ${tieScore}`, {
        fontSize: '20px',
        fill: '#bdc3c7'
    }).setOrigin(0.5);

    // Create game board
    const cellSize = 100;
    const boardSize = 300;
    const startX = (640 - boardSize) / 2;
    const startY = 140;

    // Draw grid lines
    const graphics = this.add.graphics();
    graphics.lineStyle(4, 0xecf0f1, 1);
    
    // Vertical lines
    graphics.moveTo(startX + cellSize, startY);
    graphics.lineTo(startX + cellSize, startY + boardSize);
    graphics.moveTo(startX + cellSize * 2, startY);
    graphics.lineTo(startX + cellSize * 2, startY + boardSize);
    
    // Horizontal lines
    graphics.moveTo(startX, startY + cellSize);
    graphics.lineTo(startX + boardSize, startY + cellSize);
    graphics.moveTo(startX, startY + cellSize * 2);
    graphics.lineTo(startX + boardSize, startY + cellSize * 2);
    
    graphics.strokePath();

    // Create clickable cells
    for (let row = 0; row < 3; row++) {
        cells[row] = [];
        for (let col = 0; col < 3; col++) {
            const x = startX + col * cellSize + cellSize / 2;
            const y = startY + row * cellSize + cellSize / 2;
            
            const cell = this.add.rectangle(x, y, cellSize - 10, cellSize - 10, 0x2c3e50, 0)
                .setInteractive()
                .setData('row', row)
                .setData('col', col);
            
            cell.on('pointerover', () => {
                if (!gameOver && board[row][col] === null) {
                    cell.setFillStyle(0x3498db, 0.3);
                }
            });
            
            cell.on('pointerout', () => {
                cell.setFillStyle(0x2c3e50, 0);
            });
            
            cell.on('pointerdown', () => handleCellClick.call(this, row, col));
            
            cells[row][col] = { rect: cell, text: null };
        }
    }

    // Status text
    statusText = this.add.text(320, 460, "Your turn (X)", {
        fontSize: '24px',
        fill: '#ecf0f1'
    }).setOrigin(0.5);

    // Reset button
    const buttonBg = this.add.rectangle(320, 410, 150, 40, 0x3498db)
        .setInteractive()
        .on('pointerover', () => buttonBg.setFillStyle(0x2980b9))
        .on('pointerout', () => buttonBg.setFillStyle(0x3498db))
        .on('pointerdown', () => resetGame.call(this));
    
    this.add.text(320, 410, 'New Game', {
        fontSize: '20px',
        fill: '#ffffff'
    }).setOrigin(0.5);

    // Store scene reference for later use
    this.gameScene = this;
}

function handleCellClick(row, col) {
    if (gameOver || board[row][col] !== null || currentPlayer !== 'X') {
        return;
    }

    // Player move
    makeMove.call(this, row, col, 'X');
    
    if (!gameOver) {
        currentPlayer = 'O';
        statusText.setText("AI thinking...");
        
        // AI move with slight delay
        this.time.delayedCall(500, () => {
            if (!gameOver) {
                makeAIMove.call(this);
            }
        });
    }
}

function makeMove(row, col, player) {
    board[row][col] = player;
    
    // Add X or O text
    const cell = cells[row][col];
    const x = cell.rect.x;
    const y = cell.rect.y;
    
    cell.text = this.add.text(x, y, player, {
        fontSize: '64px',
        fill: player === 'X' ? '#e74c3c' : '#3498db',
        fontStyle: 'bold'
    }).setOrigin(0.5);

    // Check for winner
    const winner = checkWinner();
    if (winner) {
        gameOver = true;
        if (winner === 'X') {
            statusText.setText('You Win!');
            playerScore++;
        } else {
            statusText.setText('AI Wins!');
            aiScore++;
        }
        drawWinningLine.call(this, winner);
        updateScore();
    } else if (isBoardFull()) {
        gameOver = true;
        statusText.setText("It's a Tie!");
        tieScore++;
        updateScore();
    } else {
        statusText.setText(currentPlayer === 'X' ? "Your turn (X)" : "AI's turn (O)");
    }
}

function makeAIMove() {
    // Simple AI: Try to win, block player, or take center/corners
    const move = getBestMove();
    if (move) {
        makeMove.call(this, move.row, move.col, 'O');
        currentPlayer = 'X';
    }
}

function getBestMove() {
    // Try to win
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            if (board[row][col] === null) {
                board[row][col] = 'O';
                if (checkWinner() === 'O') {
                    board[row][col] = null;
                    return { row, col };
                }
                board[row][col] = null;
            }
        }
    }

    // Block player from winning
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            if (board[row][col] === null) {
                board[row][col] = 'X';
                if (checkWinner() === 'X') {
                    board[row][col] = null;
                    return { row, col };
                }
                board[row][col] = null;
            }
        }
    }

    // Take center if available
    if (board[1][1] === null) {
        return { row: 1, col: 1 };
    }

    // Take corners
    const corners = [[0, 0], [0, 2], [2, 0], [2, 2]];
    const availableCorners = corners.filter(([r, c]) => board[r][c] === null);
    if (availableCorners.length > 0) {
        const [row, col] = availableCorners[Math.floor(Math.random() * availableCorners.length)];
        return { row, col };
    }

    // Take any available space
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            if (board[row][col] === null) {
                return { row, col };
            }
        }
    }
    
    return null;
}

function checkWinner() {
    // Check rows
    for (let row = 0; row < 3; row++) {
        if (board[row][0] && board[row][0] === board[row][1] && board[row][1] === board[row][2]) {
            return board[row][0];
        }
    }

    // Check columns
    for (let col = 0; col < 3; col++) {
        if (board[0][col] && board[0][col] === board[1][col] && board[1][col] === board[2][col]) {
            return board[0][col];
        }
    }

    // Check diagonals
    if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
        return board[0][0];
    }
    if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
        return board[0][2];
    }

    return null;
}

function isBoardFull() {
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            if (board[row][col] === null) {
                return false;
            }
        }
    }
    return true;
}

function drawWinningLine(winner) {
    const graphics = this.add.graphics();
    graphics.lineStyle(8, winner === 'X' ? 0xe74c3c : 0x3498db, 1);
    
    const cellSize = 100;
    const startX = 170;
    const startY = 140;
    
    // Find winning combination
    // Check rows
    for (let row = 0; row < 3; row++) {
        if (board[row][0] === winner && board[row][1] === winner && board[row][2] === winner) {
            const y = startY + row * cellSize + cellSize / 2;
            graphics.moveTo(startX + 20, y);
            graphics.lineTo(startX + 280, y);
            graphics.strokePath();
            return;
        }
    }
    
    // Check columns
    for (let col = 0; col < 3; col++) {
        if (board[0][col] === winner && board[1][col] === winner && board[2][col] === winner) {
            const x = startX + col * cellSize + cellSize / 2;
            graphics.moveTo(x, startY + 20);
            graphics.lineTo(x, startY + 280);
            graphics.strokePath();
            return;
        }
    }
    
    // Check diagonals
    if (board[0][0] === winner && board[1][1] === winner && board[2][2] === winner) {
        graphics.moveTo(startX + 30, startY + 30);
        graphics.lineTo(startX + 270, startY + 270);
        graphics.strokePath();
        return;
    }
    
    if (board[0][2] === winner && board[1][1] === winner && board[2][0] === winner) {
        graphics.moveTo(startX + 270, startY + 30);
        graphics.lineTo(startX + 30, startY + 270);
        graphics.strokePath();
        return;
    }
}

function resetGame() {
    // Clear board
    board = [[null, null, null], [null, null, null], [null, null, null]];
    gameOver = false;
    currentPlayer = 'X';
    
    // Clear cell texts
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            if (cells[row][col].text) {
                cells[row][col].text.destroy();
                cells[row][col].text = null;
            }
        }
    }
    
    // Clear any win lines
    this.children.list.forEach(child => {
        if (child instanceof Phaser.GameObjects.Graphics && child !== this.children.list[2]) {
            child.destroy();
        }
    });
    
    statusText.setText("Your turn (X)");
}

function updateScore() {
    scoreText.setText(`Player: ${playerScore}  |  AI: ${aiScore}  |  Ties: ${tieScore}`);
}

// Create the game
const game = new Phaser.Game(config);