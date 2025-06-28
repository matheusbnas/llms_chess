/* ♟️ LLM Chess Arena - Professional Chessboard Logic */

// ==========================================
// CHESS PIECES MAPPING
// ==========================================

const PIECES = {
    WHITE: {
        KING: '♔',
        QUEEN: '♕',
        ROOK: '♖',
        BISHOP: '♗',
        KNIGHT: '♘',
        PAWN: '♙'
    },
    BLACK: {
        KING: '♚',
        QUEEN: '♛',
        ROOK: '♜',
        BISHOP: '♝',
        KNIGHT: '♞',
        PAWN: '♟'
    }
};

const INITIAL_POSITION = {
    // Black pieces
    'a8': { piece: PIECES.BLACK.ROOK, color: 'black' },
    'b8': { piece: PIECES.BLACK.KNIGHT, color: 'black' },
    'c8': { piece: PIECES.BLACK.BISHOP, color: 'black' },
    'd8': { piece: PIECES.BLACK.QUEEN, color: 'black' },
    'e8': { piece: PIECES.BLACK.KING, color: 'black' },
    'f8': { piece: PIECES.BLACK.BISHOP, color: 'black' },
    'g8': { piece: PIECES.BLACK.KNIGHT, color: 'black' },
    'h8': { piece: PIECES.BLACK.ROOK, color: 'black' },
    'a7': { piece: PIECES.BLACK.PAWN, color: 'black' },
    'b7': { piece: PIECES.BLACK.PAWN, color: 'black' },
    'c7': { piece: PIECES.BLACK.PAWN, color: 'black' },
    'd7': { piece: PIECES.BLACK.PAWN, color: 'black' },
    'e7': { piece: PIECES.BLACK.PAWN, color: 'black' },
    'f7': { piece: PIECES.BLACK.PAWN, color: 'black' },
    'g7': { piece: PIECES.BLACK.PAWN, color: 'black' },
    'h7': { piece: PIECES.BLACK.PAWN, color: 'black' },
    
    // White pieces
    'a1': { piece: PIECES.WHITE.ROOK, color: 'white' },
    'b1': { piece: PIECES.WHITE.KNIGHT, color: 'white' },
    'c1': { piece: PIECES.WHITE.BISHOP, color: 'white' },
    'd1': { piece: PIECES.WHITE.QUEEN, color: 'white' },
    'e1': { piece: PIECES.WHITE.KING, color: 'white' },
    'f1': { piece: PIECES.WHITE.BISHOP, color: 'white' },
    'g1': { piece: PIECES.WHITE.KNIGHT, color: 'white' },
    'h1': { piece: PIECES.WHITE.ROOK, color: 'white' },
    'a2': { piece: PIECES.WHITE.PAWN, color: 'white' },
    'b2': { piece: PIECES.WHITE.PAWN, color: 'white' },
    'c2': { piece: PIECES.WHITE.PAWN, color: 'white' },
    'd2': { piece: PIECES.WHITE.PAWN, color: 'white' },
    'e2': { piece: PIECES.WHITE.PAWN, color: 'white' },
    'f2': { piece: PIECES.WHITE.PAWN, color: 'white' },
    'g2': { piece: PIECES.WHITE.PAWN, color: 'white' },
    'h2': { piece: PIECES.WHITE.PAWN, color: 'white' }
};

// ==========================================
// CHESSBOARD CLASS
// ==========================================

class Chessboard {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        
        if (!this.container) {
            throw new Error(`Container com ID '${containerId}' não encontrado`);
        }

        // Configuration
        this.options = {
            interactive: true,
            showCoordinates: true,
            highlightMoves: true,
            animateMovements: true,
            allowDragAndDrop: true,
            orientation: 'white', // 'white' or 'black'
            theme: 'lichess', // 'lichess', 'blue', 'green'
            pieceStyle: 'unicode',
            sounds: true,
            ...options
        };

        // State
        this.position = { ...INITIAL_POSITION };
        this.selectedSquare = null;
        this.possibleMoves = [];
        this.lastMove = null;
        this.isFlipped = this.options.orientation === 'black';
        this.moveHistory = [];
        this.callbacks = {};

        // Elements
        this.boardElement = null;
        this.squares = new Map();
        
        this.initialize();
    }

    // ==========================================
    // INITIALIZATION
    // ==========================================

    initialize() {
        console.log(`🏁 Inicializando tabuleiro: ${this.containerId}`);
        
        this.createBoardStructure();
        this.createSquares();
        this.setupEventListeners();
        this.setPosition(this.position);
        this.applyTheme();
        
        console.log(`✅ Tabuleiro ${this.containerId} criado com sucesso`);
    }

    createBoardStructure() {
        // Clear existing content
        this.container.innerHTML = '';
        
        // Create main board container
        const boardContainer = document.createElement('div');
        boardContainer.className = 'chessboard-container';
        
        // Create coordinates if enabled
        if (this.options.showCoordinates) {
            this.createCoordinates(boardContainer);
        }
        
        // Create the main board
        this.boardElement = document.createElement('div');
        this.boardElement.className = 'chessboard';
        this.boardElement.setAttribute('data-orientation', this.options.orientation);
        
        boardContainer.appendChild(this.boardElement);
        this.container.appendChild(boardContainer);
    }

    createCoordinates(container) {
        const files = this.isFlipped ? 
            ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : 
            ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
            
        const ranks = this.isFlipped ? 
            ['1', '2', '3', '4', '5', '6', '7', '8'] : 
            ['8', '7', '6', '5', '4', '3', '2', '1'];

        // Top files
        const topFiles = document.createElement('div');
        topFiles.className = 'coordinates-external coord-files-top';
        files.forEach(file => {
            const label = document.createElement('div');
            label.className = 'coord-label';
            label.textContent = file;
            topFiles.appendChild(label);
        });
        container.appendChild(topFiles);

        // Left ranks
        const leftRanks = document.createElement('div');
        leftRanks.className = 'coordinates-external coord-ranks-left';
        ranks.forEach(rank => {
            const label = document.createElement('div');
            label.className = 'coord-label';
            label.textContent = rank;
            leftRanks.appendChild(label);
        });
        container.appendChild(leftRanks);

        // Right ranks
        const rightRanks = document.createElement('div');
        rightRanks.className = 'coordinates-external coord-ranks-right';
        ranks.forEach(rank => {
            const label = document.createElement('div');
            label.className = 'coord-label';
            label.textContent = rank;
            rightRanks.appendChild(label);
        });
        container.appendChild(rightRanks);

        // Bottom files
        const bottomFiles = document.createElement('div');
        bottomFiles.className = 'coordinates-external coord-files-bottom';
        files.forEach(file => {
            const label = document.createElement('div');
            label.className = 'coord-label';
            label.textContent = file;
            bottomFiles.appendChild(label);
        });
        container.appendChild(bottomFiles);
    }

    createSquares() {
        const ranks = this.isFlipped ? 
            [1, 2, 3, 4, 5, 6, 7, 8] : 
            [8, 7, 6, 5, 4, 3, 2, 1];
            
        const files = this.isFlipped ? 
            ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : 
            ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

        ranks.forEach(rank => {
            files.forEach((file, fileIndex) => {
                const square = this.createSquare(file, rank, fileIndex);
                this.boardElement.appendChild(square);
                this.squares.set(`${file}${rank}`, square);
            });
        });
    }

    createSquare(file, rank, fileIndex) {
        const square = document.createElement('div');
        const squareId = `${file}${rank}`;
        
        // Calculate square color
        const isLight = (rank + fileIndex) % 2 !== 0;
        
        square.className = `square ${isLight ? 'light' : 'dark'}`;
        square.dataset.square = squareId;
        square.dataset.file = file;
        square.dataset.rank = rank.toString();
        
        return square;
    }

    setupEventListeners() {
        if (!this.options.interactive) return;

        this.boardElement.addEventListener('click', (e) => {
            this.handleSquareClick(e);
        });

        if (this.options.allowDragAndDrop) {
            this.boardElement.addEventListener('dragstart', (e) => {
                this.handleDragStart(e);
            });

            this.boardElement.addEventListener('dragover', (e) => {
                this.handleDragOver(e);
            });

            this.boardElement.addEventListener('drop', (e) => {
                this.handleDrop(e);
            });
        }
    }

    // ==========================================
    // POSITION MANAGEMENT
    // ==========================================

    setPosition(position) {
        // Clear all pieces
        this.squares.forEach(square => {
            square.innerHTML = '';
            square.classList.remove('has-piece');
        });

        // Place pieces from position
        Object.entries(position).forEach(([squareId, pieceData]) => {
            if (pieceData) {
                this.placePiece(squareId, pieceData.piece, pieceData.color);
            }
        });

        this.position = { ...position };
        this.emit('positionChanged', this.position);
    }

    placePiece(squareId, piece, color) {
        const square = this.squares.get(squareId);
        if (!square) {
            console.warn(`Casa não encontrada: ${squareId}`);
            return;
        }

        // Clear existing piece
        square.innerHTML = '';
        
        // Create piece element
        const pieceElement = document.createElement('div');
        pieceElement.className = `piece ${color}`;
        pieceElement.textContent = piece;
        pieceElement.dataset.piece = piece;
        pieceElement.dataset.color = color;
        pieceElement.draggable = this.options.allowDragAndDrop;
        
        square.appendChild(pieceElement);
        square.classList.add('has-piece');
    }

    removePiece(squareId) {
        const square = this.squares.get(squareId);
        if (square) {
            square.innerHTML = '';
            square.classList.remove('has-piece');
        }
        
        if (this.position[squareId]) {
            delete this.position[squareId];
        }
    }

    getPiece(squareId) {
        return this.position[squareId] || null;
    }

    // ==========================================
    // INTERACTION HANDLING
    // ==========================================

    handleSquareClick(e) {
        const square = e.target.closest('.square');
        if (!square) return;

        const squareId = square.dataset.square;
        
        if (this.selectedSquare) {
            if (square === this.selectedSquare) {
                // Deselect current square
                this.clearSelection();
            } else {
                // Attempt move
                this.attemptMove(this.selectedSquare.dataset.square, squareId);
            }
        } else {
            // Select square if it has a piece
            const piece = this.getPiece(squareId);
            if (piece) {
                this.selectSquare(square);
            }
        }
    }

    handleDragStart(e) {
        const piece = e.target.closest('.piece');
        if (!piece) return;

        const square = piece.closest('.square');
        this.selectSquare(square);
        
        e.dataTransfer.setData('text/plain', square.dataset.square);
        e.dataTransfer.effectAllowed = 'move';
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleDrop(e) {
        e.preventDefault();
        
        const fromSquare = e.dataTransfer.getData('text/plain');
        const toSquare = e.target.closest('.square');
        
        if (toSquare && fromSquare !== toSquare.dataset.square) {
            this.attemptMove(fromSquare, toSquare.dataset.square);
        }
        
        this.clearSelection();
    }

    selectSquare(square) {
        this.clearSelection();
        
        this.selectedSquare = square;
        square.classList.add('selected');
        
        if (this.options.highlightMoves) {
            this.highlightPossibleMoves(square.dataset.square);
        }
        
        this.emit('squareSelected', square.dataset.square);
    }

    clearSelection() {
        if (this.selectedSquare) {
            this.selectedSquare.classList.remove('selected');
            this.selectedSquare = null;
        }
        
        this.clearHighlights();
        this.emit('selectionCleared');
    }

    highlightPossibleMoves(squareId) {
        // This would integrate with chess engine for real move validation
        // For now, we'll use a simplified version
        this.clearHighlights();
        
        // Example: highlight some squares (in real implementation, use chess logic)
        const possibleMoves = this.calculatePossibleMoves(squareId);
        
        possibleMoves.forEach(moveSquareId => {
            const square = this.squares.get(moveSquareId);
            if (square) {
                const hasTargetPiece = this.getPiece(moveSquareId);
                square.classList.add(hasTargetPiece ? 'possible-capture' : 'possible-move');
            }
        });
    }

    clearHighlights() {
        this.squares.forEach(square => {
            square.classList.remove('possible-move', 'possible-capture', 'last-move', 'check');
        });
    }

    // ==========================================
    // MOVE HANDLING
    // ==========================================

    attemptMove(fromSquare, toSquare) {
        const piece = this.getPiece(fromSquare);
        if (!piece) {
            this.clearSelection();
            return false;
        }

        // Validate move (this would integrate with chess engine)
        if (!this.isValidMove(fromSquare, toSquare)) {
            this.clearSelection();
            return false;
        }

        // Execute move
        return this.makeMove(fromSquare, toSquare);
    }

    makeMove(fromSquare, toSquare, options = {}) {
        const piece = this.getPiece(fromSquare);
        const capturedPiece = this.getPiece(toSquare);
        
        if (!piece) return false;

        // Create move object
        const move = {
            from: fromSquare,
            to: toSquare,
            piece: piece.piece,
            color: piece.color,
            captured: capturedPiece,
            timestamp: Date.now(),
            san: this.getMoveNotation(fromSquare, toSquare, piece),
            ...options
        };

        // Animate move if enabled
        if (this.options.animateMovements) {
            this.animateMove(fromSquare, toSquare);
        }

        // Update position
        this.position[toSquare] = piece;
        delete this.position[fromSquare];

        // Update board display
        this.placePiece(toSquare, piece.piece, piece.color);
        this.removePiece(fromSquare);

        // Highlight last move
        this.highlightLastMove(fromSquare, toSquare);

        // Add to move history
        this.moveHistory.push(move);

        // Play sound
        if (this.options.sounds) {
            this.playMoveSound(move);
        }

        // Clear selection
        this.clearSelection();

        // Emit events
        this.emit('moveMade', move);
        this.emit('positionChanged', this.position);

        console.log(`♟️ Lance: ${move.san} (${fromSquare} → ${toSquare})`);
        return true;
    }

    animateMove(fromSquare, toSquare) {
        const fromElement = this.squares.get(fromSquare);
        const toElement = this.squares.get(toSquare);
        const piece = fromElement?.querySelector('.piece');
        
        if (!piece || !fromElement || !toElement) return;

        piece.classList.add('moving');
        
        // Simple animation (in a real implementation, you'd use more sophisticated animation)
        setTimeout(() => {
            piece.classList.remove('moving');
        }, 250);
    }

    highlightLastMove(fromSquare, toSquare) {
        this.clearHighlights();
        
        const fromElement = this.squares.get(fromSquare);
        const toElement = this.squares.get(toSquare);
        
        if (fromElement) fromElement.classList.add('last-move');
        if (toElement) toElement.classList.add('last-move');
        
        this.lastMove = { from: fromSquare, to: toSquare };
    }

    // ==========================================
    // MOVE VALIDATION (Simplified)
    // ==========================================

    isValidMove(fromSquare, toSquare) {
        // This is a simplified validation
        // In a real chess application, you'd use a proper chess engine
        
        if (fromSquare === toSquare) return false;
        
        const piece = this.getPiece(fromSquare);
        if (!piece) return false;
        
        const targetPiece = this.getPiece(toSquare);
        if (targetPiece && targetPiece.color === piece.color) {
            return false; // Can't capture own piece
        }
        
        // Add basic piece movement validation here
        return this.isPieceMovementValid(fromSquare, toSquare, piece);
    }

    isPieceMovementValid(fromSquare, toSquare, piece) {
        // Simplified piece movement validation
        // This should be replaced with proper chess logic
        
        const fromFile = fromSquare.charCodeAt(0);
        const fromRank = parseInt(fromSquare[1]);
        const toFile = toSquare.charCodeAt(0);
        const toRank = parseInt(toSquare[1]);
        
        const fileDiff = Math.abs(toFile - fromFile);
        const rankDiff = Math.abs(toRank - fromRank);
        
        switch (piece.piece) {
            case PIECES.WHITE.PAWN:
            case PIECES.BLACK.PAWN:
                return this.isValidPawnMove(fromSquare, toSquare, piece);
            case PIECES.WHITE.ROOK:
            case PIECES.BLACK.ROOK:
                return (fileDiff === 0 || rankDiff === 0);
            case PIECES.WHITE.BISHOP:
            case PIECES.BLACK.BISHOP:
                return (fileDiff === rankDiff);
            case PIECES.WHITE.QUEEN:
            case PIECES.BLACK.QUEEN:
                return (fileDiff === 0 || rankDiff === 0 || fileDiff === rankDiff);
            case PIECES.WHITE.KING:
            case PIECES.BLACK.KING:
                return (fileDiff <= 1 && rankDiff <= 1);
            case PIECES.WHITE.KNIGHT:
            case PIECES.BLACK.KNIGHT:
                return ((fileDiff === 2 && rankDiff === 1) || (fileDiff === 1 && rankDiff === 2));
            default:
                return false;
        }
    }

    isValidPawnMove(fromSquare, toSquare, piece) {
        const fromFile = fromSquare.charCodeAt(0);
        const fromRank = parseInt(fromSquare[1]);
        const toFile = toSquare.charCodeAt(0);
        const toRank = parseInt(toSquare[1]);
        
        const isWhite = piece.color === 'white';
        const direction = isWhite ? 1 : -1;
        const startRank = isWhite ? 2 : 7;
        
        const fileDiff = Math.abs(toFile - fromFile);
        const rankDiff = toRank - fromRank;
        
        // Forward move
        if (fileDiff === 0) {
            if (rankDiff === direction) return !this.getPiece(toSquare);
            if (rankDiff === 2 * direction && fromRank === startRank) {
                return !this.getPiece(toSquare) && !this.getPiece(fromSquare.charAt(0) + (fromRank + direction));
            }
        }
        
        // Capture
        if (fileDiff === 1 && rankDiff === direction) {
            return !!this.getPiece(toSquare);
        }
        
        return false;
    }

    calculatePossibleMoves(squareId) {
        // Simplified - in real implementation, use proper chess engine
        const piece = this.getPiece(squareId);
        if (!piece) return [];
        
        const moves = [];
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const ranks = [1, 2, 3, 4, 5, 6, 7, 8];
        
        // Check all squares for valid moves (simplified)
        files.forEach(file => {
            ranks.forEach(rank => {
                const targetSquare = `${file}${rank}`;
                if (this.isValidMove(squareId, targetSquare)) {
                    moves.push(targetSquare);
                }
            });
        });
        
        return moves;
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    getMoveNotation(fromSquare, toSquare, piece) {
        // Simplified notation - in real implementation, use proper chess notation
        const capturedPiece = this.getPiece(toSquare);
        const pieceSymbol = this.getPieceSymbol(piece.piece);
        const capture = capturedPiece ? 'x' : '';
        
        return `${pieceSymbol}${capture}${toSquare}`;
    }

    getPieceSymbol(piece) {
        const symbols = {
            [PIECES.WHITE.KING]: 'K', [PIECES.BLACK.KING]: 'K',
            [PIECES.WHITE.QUEEN]: 'Q', [PIECES.BLACK.QUEEN]: 'Q',
            [PIECES.WHITE.ROOK]: 'R', [PIECES.BLACK.ROOK]: 'R',
            [PIECES.WHITE.BISHOP]: 'B', [PIECES.BLACK.BISHOP]: 'B',
            [PIECES.WHITE.KNIGHT]: 'N', [PIECES.BLACK.KNIGHT]: 'N',
            [PIECES.WHITE.PAWN]: '', [PIECES.BLACK.PAWN]: ''
        };
        
        return symbols[piece] || '';
    }

    playMoveSound(move) {
        // In a real implementation, you'd play actual audio files
        console.log(`🔊 Som do lance: ${move.captured ? 'capture' : 'move'}`);
    }

    // ==========================================
    // PUBLIC API METHODS
    // ==========================================

    flip() {
        this.isFlipped = !this.isFlipped;
        this.options.orientation = this.isFlipped ? 'black' : 'white';
        
        // Recreate the board with new orientation
        this.createBoardStructure();
        this.createSquares();
        this.setupEventListeners();
        this.setPosition(this.position);
        
        this.emit('boardFlipped', this.options.orientation);
        console.log(`🔄 Tabuleiro virado: ${this.options.orientation}`);
    }

    reset() {
        this.setPosition(INITIAL_POSITION);
        this.moveHistory = [];
        this.selectedSquare = null;
        this.lastMove = null;
        this.clearHighlights();
        
        this.emit('boardReset');
        console.log('🔄 Tabuleiro resetado');
    }

    applyTheme() {
        this.container.setAttribute('data-board-theme', this.options.theme);
    }

    setTheme(theme) {
        this.options.theme = theme;
        this.applyTheme();
        this.emit('themeChanged', theme);
    }

    getMoveHistory() {
        return [...this.moveHistory];
    }

    getPosition() {
        return { ...this.position };
    }

    // ==========================================
    // EVENT SYSTEM
    // ==========================================

    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }

    off(event, callback) {
        if (this.callbacks[event]) {
            const index = this.callbacks[event].indexOf(callback);
            if (index > -1) {
                this.callbacks[event].splice(index, 1);
            }
        }
    }

    emit(event, data = null) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ Erro em callback do evento '${event}':`, error);
                }
            });
        }
    }

    // ==========================================
    // CLEANUP
    // ==========================================

    destroy() {
        this.clearSelection();
        this.callbacks = {};
        this.container.innerHTML = '';
        console.log(`🗑️ Tabuleiro ${this.containerId} destruído`);
    }
}

// ==========================================
// GLOBAL CHESSBOARD FACTORY
// ==========================================

window.Chessboard = Chessboard;

// Convenience function for creating chessboards
window.createChessboard = (containerId, options = {}) => {
    return new Chessboard(containerId, options);
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Chessboard;
}

console.log('♟️ Chessboard module carregado');