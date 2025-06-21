// ♟️ LLM Chess Arena - Professional Chessboard

class ProfessionalChessboard {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);

    if (!this.container) {
      throw new Error(`Container ${containerId} not found`);
    }

    // Configuration
    this.config = {
      size: options.size || 512,
      coordinates: options.coordinates !== false,
      theme: options.theme || "brown",
      flipped: options.flipped || false,
      draggable: options.draggable !== false,
      interactive: options.interactive !== false,
      animations: options.animations !== false,
      sounds: options.sounds || false,
      ...options,
    };

    // State
    this.position = options.position || this.getInitialPosition();
    this.selectedSquare = null;
    this.possibleMoves = [];
    this.lastMove = null;
    this.checkSquare = null;
    this.moveHistory = [];

    // Callbacks
    this.onMove = options.onMove || null;
    this.onSelect = options.onSelect || null;
    this.onDrop = options.onDrop || null;

    // Piece symbols
    this.pieces = {
      white: { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙" },
      black: { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" },
    };

    this.init();
  }

  init() {
    this.createBoard();
    this.setupEventListeners();
    this.updatePosition();
    console.log(`✅ Professional Chessboard initialized: ${this.containerId}`);
  }

  createBoard() {
    this.container.innerHTML = "";
    this.container.className = `chessboard-wrapper theme-${this.config.theme}`;

    // Create board container with coordinates
    const boardContainer = document.createElement("div");
    boardContainer.className = "chessboard-container";

    if (this.config.coordinates) {
      this.createCoordinates(boardContainer);
    }

    // Create main board
    const board = document.createElement("div");
    board.className = `chessboard ${this.config.flipped ? "flipped" : ""}`;
    board.style.width = `${this.config.size}px`;
    board.style.height = `${this.config.size}px`;

    // Create squares
    this.createSquares(board);

    boardContainer.appendChild(board);
    this.container.appendChild(boardContainer);

    // Create controls if needed
    if (this.config.controls) {
      this.createControls();
    }
  }

  createCoordinates(container) {
    const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

    // Top files
    const topFiles = document.createElement("div");
    topFiles.className = "coordinates-external coord-files-top";
    files.forEach((file) => {
      const label = document.createElement("div");
      label.className = "coord-label";
      label.textContent = this.config.flipped
        ? files[7 - files.indexOf(file)]
        : file;
      topFiles.appendChild(label);
    });
    container.appendChild(topFiles);

    // Left ranks
    const leftRanks = document.createElement("div");
    leftRanks.className = "coordinates-external coord-ranks-left";
    ranks.forEach((rank) => {
      const label = document.createElement("div");
      label.className = "coord-label";
      label.textContent = this.config.flipped
        ? ranks[7 - ranks.indexOf(rank)]
        : rank;
      leftRanks.appendChild(label);
    });
    container.appendChild(leftRanks);

    // Right ranks
    const rightRanks = document.createElement("div");
    rightRanks.className = "coordinates-external coord-ranks-right";
    ranks.forEach((rank) => {
      const label = document.createElement("div");
      label.className = "coord-label";
      label.textContent = this.config.flipped
        ? ranks[7 - ranks.indexOf(rank)]
        : rank;
      rightRanks.appendChild(label);
    });
    container.appendChild(rightRanks);

    // Bottom files
    const bottomFiles = document.createElement("div");
    bottomFiles.className = "coordinates-external coord-files-bottom";
    files.forEach((file) => {
      const label = document.createElement("div");
      label.className = "coord-label";
      label.textContent = this.config.flipped
        ? files[7 - files.indexOf(file)]
        : file;
      bottomFiles.appendChild(label);
    });
    container.appendChild(bottomFiles);
  }

  createSquares(board) {
    this.squares = {};

    for (let rank = 8; rank >= 1; rank--) {
      for (let file = 0; file < 8; file++) {
        const square = document.createElement("div");
        const fileChar = String.fromCharCode(97 + file);
        const squareId = `${fileChar}${rank}`;

        const isLight = (rank + file) % 2 !== 0;
        square.className = `square ${isLight ? "light" : "dark"}`;
        square.dataset.square = squareId;

        // Store reference
        this.squares[squareId] = square;

        board.appendChild(square);
      }
    }
  }

  createControls() {
    const controls = document.createElement("div");
    controls.className = "board-controls";

    const buttons = [
      {
        icon: "fas fa-step-backward",
        title: "Primeiro lance",
        action: "first",
      },
      {
        icon: "fas fa-chevron-left",
        title: "Lance anterior",
        action: "previous",
      },
      { icon: "fas fa-chevron-right", title: "Próximo lance", action: "next" },
      { icon: "fas fa-step-forward", title: "Último lance", action: "last" },
      { icon: "fas fa-refresh", title: "Virar tabuleiro", action: "flip" },
    ];

    buttons.forEach((btn) => {
      const button = document.createElement("button");
      button.className = "control-btn";
      button.title = btn.title;
      button.innerHTML = `<i class="${btn.icon}"></i>`;
      button.addEventListener("click", () =>
        this.handleControlAction(btn.action)
      );
      controls.appendChild(button);
    });

    this.container.appendChild(controls);
  }

  setupEventListeners() {
    const board = this.container.querySelector(".chessboard");
    if (!board) return;

    // Click events
    board.addEventListener("click", (e) => {
      if (!this.config.interactive) return;
      const square = e.target.closest(".square");
      if (square) {
        this.handleSquareClick(square);
      }
    });

    // Drag and drop events
    if (this.config.draggable) {
      board.addEventListener("dragstart", (e) => this.handleDragStart(e));
      board.addEventListener("dragover", (e) => this.handleDragOver(e));
      board.addEventListener("drop", (e) => this.handleDrop(e));
      board.addEventListener("dragend", (e) => this.handleDragEnd(e));
    }
  }

  handleSquareClick(square) {
    const squareId = square.dataset.square;

    if (this.selectedSquare) {
      if (square === this.selectedSquare) {
        // Deselect
        this.clearSelection();
      } else {
        // Attempt move
        this.attemptMove(this.selectedSquare.dataset.square, squareId);
      }
    } else {
      // Select square if it has a piece
      const piece = this.position[squareId];
      if (piece && this.config.interactive) {
        this.selectSquare(square);
      }
    }

    if (this.onSelect) {
      this.onSelect(squareId, this.position[squareId]);
    }
  }

  handleDragStart(e) {
    const piece = e.target.closest(".piece");
    if (!piece) return;

    const square = piece.closest(".square");
    if (!square) return;

    this.draggedPiece = {
      piece: piece,
      square: square,
      squareId: square.dataset.square,
    };

    piece.classList.add("dragging");
    this.selectSquare(square);

    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", square.dataset.square);
  }

  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  handleDrop(e) {
    e.preventDefault();

    const targetSquare = e.target.closest(".square");
    if (!targetSquare || !this.draggedPiece) return;

    const fromSquare = this.draggedPiece.squareId;
    const toSquare = targetSquare.dataset.square;

    this.attemptMove(fromSquare, toSquare);

    if (this.onDrop) {
      this.onDrop(fromSquare, toSquare);
    }
  }

  handleDragEnd(e) {
    if (this.draggedPiece) {
      this.draggedPiece.piece.classList.remove("dragging");
      this.draggedPiece = null;
    }
    this.clearSelection();
  }

  selectSquare(square) {
    this.clearSelection();
    this.selectedSquare = square;
    square.classList.add("selected");

    // Show possible moves if available
    const squareId = square.dataset.square;
    const piece = this.position[squareId];
    if (piece) {
      this.showPossibleMoves(squareId, piece);
    }
  }

  showPossibleMoves(squareId, piece) {
    // This is a simplified example - in a real implementation,
    // you would calculate legal moves based on chess rules
    this.clearPossibleMoves();

    // Example: show some basic moves for demonstration
    const moves = this.calculatePossibleMoves(squareId, piece);
    moves.forEach((moveSquare) => {
      const square = this.squares[moveSquare];
      if (square) {
        const isCapture = this.position[moveSquare];
        square.classList.add(isCapture ? "possible-capture" : "possible-move");
      }
    });

    this.possibleMoves = moves;
  }

  calculatePossibleMoves(squareId, piece) {
    // Simplified move calculation for demonstration
    // In a real implementation, use a proper chess engine
    const moves = [];
    const [file, rank] = [
      squareId.charCodeAt(0) - 97,
      parseInt(squareId[1]) - 1,
    ];

    // Basic pawn moves
    if (piece.type === "P") {
      const direction = piece.color === "white" ? 1 : -1;
      const newRank = rank + direction;

      if (newRank >= 0 && newRank <= 7) {
        const newSquare = String.fromCharCode(97 + file) + (newRank + 1);
        if (!this.position[newSquare]) {
          moves.push(newSquare);
        }
      }
    }

    return moves;
  }

  clearPossibleMoves() {
    this.possibleMoves.forEach((squareId) => {
      const square = this.squares[squareId];
      if (square) {
        square.classList.remove("possible-move", "possible-capture");
      }
    });
    this.possibleMoves = [];
  }

  clearSelection() {
    if (this.selectedSquare) {
      this.selectedSquare.classList.remove("selected");
      this.selectedSquare = null;
    }
    this.clearPossibleMoves();
  }

  attemptMove(fromSquare, toSquare) {
    if (fromSquare === toSquare) {
      this.clearSelection();
      return;
    }

    const piece = this.position[fromSquare];
    if (!piece) {
      this.clearSelection();
      return;
    }

    // Validate move (simplified)
    if (!this.isValidMove(fromSquare, toSquare, piece)) {
      this.clearSelection();
      return;
    }

    // Execute move
    this.makeMove(fromSquare, toSquare);

    if (this.onMove) {
      this.onMove(fromSquare, toSquare, piece);
    }
  }

  isValidMove(fromSquare, toSquare, piece) {
    // Simplified validation - implement proper chess rules
    return ChessUtils.isValidSquare(toSquare) && fromSquare !== toSquare;
  }

  makeMove(fromSquare, toSquare) {
    const piece = this.position[fromSquare];
    const capturedPiece = this.position[toSquare];

    // Update position
    delete this.position[fromSquare];
    this.position[toSquare] = piece;

    // Update visual board
    this.updateSquare(fromSquare);
    this.updateSquare(toSquare);

    // Highlight last move
    this.highlightLastMove(fromSquare, toSquare);

    // Add to history
    this.moveHistory.push({
      from: fromSquare,
      to: toSquare,
      piece: piece,
      captured: capturedPiece,
      timestamp: Date.now(),
    });

    // Clear selection
    this.clearSelection();

    // Play sound effect
    if (this.config.sounds) {
      this.playMoveSound(capturedPiece !== null);
    }
  }

  highlightLastMove(fromSquare, toSquare) {
    // Clear previous highlights
    Object.values(this.squares).forEach((square) => {
      square.classList.remove("last-move");
    });

    // Add new highlights
    if (this.squares[fromSquare]) {
      this.squares[fromSquare].classList.add("last-move");
    }
    if (this.squares[toSquare]) {
      this.squares[toSquare].classList.add("last-move");
    }

    this.lastMove = { from: fromSquare, to: toSquare };
  }

  updatePosition(newPosition = null) {
    if (newPosition) {
      this.position = { ...newPosition };
    }

    // Clear all squares
    Object.values(this.squares).forEach((square) => {
      square.innerHTML = "";
    });

    // Place pieces
    Object.entries(this.position).forEach(([squareId, piece]) => {
      this.updateSquare(squareId, piece);
    });
  }

  updateSquare(squareId, piece = null) {
    const square = this.squares[squareId];
    if (!square) return;

    square.innerHTML = "";

    if (piece || this.position[squareId]) {
      const pieceData = piece || this.position[squareId];
      const pieceElement = this.createPieceElement(pieceData);
      square.appendChild(pieceElement);
    }
  }

  createPieceElement(piece) {
    const pieceEl = document.createElement("div");
    pieceEl.className = `piece ${piece.color}`;
    pieceEl.draggable = this.config.draggable;

    // Get piece symbol
    const symbol = this.pieces[piece.color][piece.type];
    pieceEl.textContent = symbol;

    // Add data attributes
    pieceEl.dataset.piece = piece.type;
    pieceEl.dataset.color = piece.color;

    return pieceEl;
  }

  // Control actions
  handleControlAction(action) {
    switch (action) {
      case "first":
        this.goToMove(0);
        break;
      case "previous":
        this.goToMove(Math.max(0, this.currentMoveIndex - 1));
        break;
      case "next":
        this.goToMove(
          Math.min(this.moveHistory.length, this.currentMoveIndex + 1)
        );
        break;
      case "last":
        this.goToMove(this.moveHistory.length);
        break;
      case "flip":
        this.flip();
        break;
    }
  }

  goToMove(moveIndex) {
    this.currentMoveIndex = moveIndex;
    // Implement move navigation
    console.log(`Going to move ${moveIndex}`);
  }

  flip() {
    this.config.flipped = !this.config.flipped;
    const board = this.container.querySelector(".chessboard");
    if (board) {
      board.classList.toggle("flipped", this.config.flipped);
    }

    // Update coordinate labels
    this.updateCoordinates();
  }

  updateCoordinates() {
    if (!this.config.coordinates) return;

    const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

    // Update file coordinates
    const topFiles = this.container.querySelectorAll(
      ".coord-files-top .coord-label"
    );
    const bottomFiles = this.container.querySelectorAll(
      ".coord-files-bottom .coord-label"
    );

    topFiles.forEach((label, index) => {
      label.textContent = this.config.flipped ? files[7 - index] : files[index];
    });

    bottomFiles.forEach((label, index) => {
      label.textContent = this.config.flipped ? files[7 - index] : files[index];
    });

    // Update rank coordinates
    const leftRanks = this.container.querySelectorAll(
      ".coord-ranks-left .coord-label"
    );
    const rightRanks = this.container.querySelectorAll(
      ".coord-ranks-right .coord-label"
    );

    leftRanks.forEach((label, index) => {
      label.textContent = this.config.flipped ? ranks[7 - index] : ranks[index];
    });

    rightRanks.forEach((label, index) => {
      label.textContent = this.config.flipped ? ranks[7 - index] : ranks[index];
    });
  }

  // Set position from FEN
  setPositionFromFEN(fen) {
    const position = this.parseFEN(fen);
    this.updatePosition(position);
  }

  parseFEN(fen) {
    const parts = fen.split(" ");
    const board = parts[0];
    const position = {};

    const ranks = board.split("/");

    for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
      const rank = ranks[rankIndex];
      let fileIndex = 0;

      for (const char of rank) {
        if (isNaN(char)) {
          // Piece
          const squareId =
            String.fromCharCode(97 + fileIndex) + (8 - rankIndex);
          const color = char === char.toUpperCase() ? "white" : "black";
          const type = char.toUpperCase();

          position[squareId] = { type, color };
          fileIndex++;
        } else {
          // Empty squares
          fileIndex += parseInt(char);
        }
      }
    }

    return position;
  }

  // Get current position as FEN
  getPositionAsFEN() {
    let fen = "";

    for (let rank = 8; rank >= 1; rank--) {
      let rankString = "";
      let emptyCount = 0;

      for (let file = 0; file < 8; file++) {
        const squareId = String.fromCharCode(97 + file) + rank;
        const piece = this.position[squareId];

        if (piece) {
          if (emptyCount > 0) {
            rankString += emptyCount;
            emptyCount = 0;
          }

          let symbol = piece.type;
          if (piece.color === "black") {
            symbol = symbol.toLowerCase();
          }
          rankString += symbol;
        } else {
          emptyCount++;
        }
      }

      if (emptyCount > 0) {
        rankString += emptyCount;
      }

      fen += rankString;
      if (rank > 1) fen += "/";
    }

    // Add additional FEN components (simplified)
    fen += " w - - 0 1";

    return fen;
  }

  getInitialPosition() {
    return {
      a8: { type: "R", color: "black" },
      b8: { type: "N", color: "black" },
      c8: { type: "B", color: "black" },
      d8: { type: "Q", color: "black" },
      e8: { type: "K", color: "black" },
      f8: { type: "B", color: "black" },
      g8: { type: "N", color: "black" },
      h8: { type: "R", color: "black" },
      a7: { type: "P", color: "black" },
      b7: { type: "P", color: "black" },
      c7: { type: "P", color: "black" },
      d7: { type: "P", color: "black" },
      e7: { type: "P", color: "black" },
      f7: { type: "P", color: "black" },
      g7: { type: "P", color: "black" },
      h7: { type: "P", color: "black" },

      a2: { type: "P", color: "white" },
      b2: { type: "P", color: "white" },
      c2: { type: "P", color: "white" },
      d2: { type: "P", color: "white" },
      e2: { type: "P", color: "white" },
      f2: { type: "P", color: "white" },
      g2: { type: "P", color: "white" },
      h2: { type: "P", color: "white" },
      a1: { type: "R", color: "white" },
      b1: { type: "N", color: "white" },
      c1: { type: "B", color: "white" },
      d1: { type: "Q", color: "white" },
      e1: { type: "K", color: "white" },
      f1: { type: "B", color: "white" },
      g1: { type: "N", color: "white" },
      h1: { type: "R", color: "white" },
    };
  }

  playMoveSound(isCapture = false) {
    if (!this.config.sounds) return;

    // Create audio context if needed
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
    }

    // Simple beep sound
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = isCapture ? 800 : 600;
    oscillator.type = "square";

    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioContext.currentTime + 0.1
    );

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.1);
  }

  // Destroy the board
  destroy() {
    if (this.container) {
      this.container.innerHTML = "";
    }

    if (this.audioContext) {
      this.audioContext.close();
    }
  }

  // Update theme
  setTheme(theme) {
    this.config.theme = theme;
    this.container.className = `chessboard-wrapper theme-${theme}`;
  }

  // Get current configuration
  getConfig() {
    return { ...this.config };
  }

  // Update configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.createBoard();
    this.updatePosition();
  }
}

// Export the chessboard class
window.ProfessionalChessboard = ProfessionalChessboard;

// Utility function to create a chessboard
window.createChessboard = function (containerId, options = {}) {
  return new ProfessionalChessboard(containerId, options);
};
