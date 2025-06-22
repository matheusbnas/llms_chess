// ♟️ Professional Chessboard Class
class ProfessionalChessboard {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.board = document.getElementById(containerId);
    this.selectedSquare = null;
    this.isFlipped = false;
    this.currentTheme = "brown";
    this.gamePosition = this.getInitialPosition();
    this.moveHistory = [];
    this.currentMove = 0;
    this.interactive = options.interactive !== false;
    this.onMove = options.onMove || null;
    this.onGetPossibleMoves = options.onGetPossibleMoves || null;
    this.showCoordinates = options.showCoordinates !== false;

    if (this.board) {
      this.initializeBoard();
      this.setupInitialPosition();
      if (this.interactive) {
        this.addEventListeners();
      }
      console.log(`✅ Professional Chessboard initialized: ${containerId}`);
    } else {
      console.error(`❌ Board element not found: ${containerId}`);
    }
  }

  getInitialPosition() {
    return {
      a8: { piece: "♜", color: "black" },
      b8: { piece: "♞", color: "black" },
      c8: { piece: "♝", color: "black" },
      d8: { piece: "♛", color: "black" },
      e8: { piece: "♚", color: "black" },
      f8: { piece: "♝", color: "black" },
      g8: { piece: "♞", color: "black" },
      h8: { piece: "♜", color: "black" },
      a7: { piece: "♟", color: "black" },
      b7: { piece: "♟", color: "black" },
      c7: { piece: "♟", color: "black" },
      d7: { piece: "♟", color: "black" },
      e7: { piece: "♟", color: "black" },
      f7: { piece: "♟", color: "black" },
      g7: { piece: "♟", color: "black" },
      h7: { piece: "♟", color: "black" },

      a2: { piece: "♙", color: "white" },
      b2: { piece: "♙", color: "white" },
      c2: { piece: "♙", color: "white" },
      d2: { piece: "♙", color: "white" },
      e2: { piece: "♙", color: "white" },
      f2: { piece: "♙", color: "white" },
      g2: { piece: "♙", color: "white" },
      h2: { piece: "♙", color: "white" },
      a1: { piece: "♖", color: "white" },
      b1: { piece: "♘", color: "white" },
      c1: { piece: "♗", color: "white" },
      d1: { piece: "♕", color: "white" },
      e1: { piece: "♔", color: "white" },
      f1: { piece: "♗", color: "white" },
      g1: { piece: "♘", color: "white" },
      h1: { piece: "♖", color: "white" },
    };
  }

  initializeBoard() {
    // Limpar conteúdo existente
    this.board.innerHTML = "";
    this.board.className = "chessboard";

    // Criar as 64 casas do tabuleiro
    for (let rank = 8; rank >= 1; rank--) {
      for (let file = 0; file < 8; file++) {
        const square = document.createElement("div");
        const fileChar = String.fromCharCode(97 + file); // a-h
        const squareId = `${fileChar}${rank}`;

        const isLight = (rank + file) % 2 !== 0;
        square.className = `square ${isLight ? "light" : "dark"}`;
        square.dataset.square = squareId;
        square.dataset.file = fileChar;
        square.dataset.rank = rank.toString();

        this.board.appendChild(square);
      }
    }

    console.log("✅ Board squares initialized");
  }

  setupInitialPosition() {
    // Limpar todas as casas primeiro
    this.board.querySelectorAll(".square").forEach((square) => {
      square.innerHTML = "";
      square.classList.remove(
        "selected",
        "last-move",
        "possible-move",
        "possible-capture"
      );
    });

    // Adicionar peças na posição inicial
    Object.entries(this.gamePosition).forEach(([square, pieceData]) => {
      this.placePiece(square, pieceData.piece, pieceData.color);
    });

    console.log("✅ Initial position set");
  }

  placePiece(squareId, piece, color) {
    const square = this.board.querySelector(`[data-square="${squareId}"]`);
    if (!square) {
      console.warn(`Square not found: ${squareId}`);
      return;
    }

    const pieceElement = document.createElement("div");
    pieceElement.className = `piece ${color}`;
    pieceElement.textContent = piece;
    pieceElement.dataset.piece = piece;
    pieceElement.dataset.color = color;
    pieceElement.draggable = this.interactive;

    square.appendChild(pieceElement);
  }

  setPositionFromFen(fen) {
    // Limpar todas as casas
    this.board.querySelectorAll(".square").forEach((square) => {
      square.innerHTML = "";
    });

    const fenParts = fen.split(" ");
    const boardState = fenParts[0];
    const ranks = boardState.split("/");

    const pieceMap = {
      r: "♜",
      n: "♞",
      b: "♝",
      q: "♛",
      k: "♚",
      p: "♟",
      R: "♖",
      N: "♘",
      B: "♗",
      Q: "♕",
      K: "♔",
      P: "♙",
    };

    let rankIndex = 8;
    ranks.forEach((rank) => {
      let fileIndex = 0;
      for (const char of rank) {
        if (isNaN(char)) {
          const squareId = String.fromCharCode(97 + fileIndex) + rankIndex;
          const color = char === char.toUpperCase() ? "white" : "black";
          this.placePiece(squareId, pieceMap[char], color);
          fileIndex++;
        } else {
          fileIndex += parseInt(char);
        }
      }
      rankIndex--;
    });

    console.log("✅ Position set from FEN:", fen);
  }

  addEventListeners() {
    if (!this.interactive) return;

    this.board.addEventListener("click", (e) => {
      const square = e.target.closest(".square");
      if (!square) return;
      this.handleSquareClick(square);
    });

    // Drag and drop
    this.board.addEventListener("dragstart", (e) => {
      if (e.target.classList.contains("piece")) {
        e.target.classList.add("dragging");
        this.selectedSquare = e.target.closest(".square");
        e.dataTransfer.effectAllowed = "move";
      }
    });

    this.board.addEventListener("dragend", (e) => {
      if (e.target.classList.contains("piece")) {
        e.target.classList.remove("dragging");
      }
    });

    this.board.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });

    this.board.addEventListener("drop", (e) => {
      e.preventDefault();
      const targetSquare = e.target.closest(".square");
      if (targetSquare && this.selectedSquare) {
        this.attemptMove(this.selectedSquare, targetSquare);
      }
    });
  }

  handleSquareClick(square) {
    if (this.selectedSquare) {
      if (square === this.selectedSquare) {
        // Clicou na mesma casa - desselecionar
        this.clearSelection();
      } else {
        // Tentar fazer o movimento
        this.attemptMove(this.selectedSquare, square);
      }
    } else {
      // Selecionar casa se tiver peça
      const piece = square.querySelector(".piece");
      if (piece) {
        this.selectSquare(square);
      }
    }
  }

  selectSquare(square) {
    this.clearSelection();
    this.selectedSquare = square;
    square.classList.add("selected");

    if (this.onGetPossibleMoves) {
      const moves = this.onGetPossibleMoves(square.dataset.square);
      this.displayPossibleMoves(moves);
    } else {
      this.showPossibleMoves(square);
    }
  }

  displayPossibleMoves(moves) {
    this.clearPossibleMoves();
    if (!moves) return;

    moves.forEach((move) => {
      const targetSquare = this.board.querySelector(
        `[data-square="${move.to}"]`
      );
      if (targetSquare) {
        const isCapture = targetSquare.querySelector(".piece") !== null;
        targetSquare.classList.add(
          isCapture ? "possible-capture" : "possible-move"
        );
      }
    });
  }

  clearPossibleMoves() {
    this.board
      .querySelectorAll(".possible-move, .possible-capture")
      .forEach((s) => {
        s.classList.remove("possible-move", "possible-capture");
      });
  }

  showPossibleMoves(square) {
    const piece = square.querySelector(".piece");
    if (!piece) return;

    const squareId = square.dataset.square;
    const file = squareId.charCodeAt(0) - 97; // a=0, b=1, etc.
    const rank = parseInt(squareId[1]);

    // Exemplo simples para peões
    if (piece.dataset.piece === "♙" || piece.dataset.piece === "♟") {
      const direction = piece.dataset.color === "white" ? 1 : -1;
      const targetRank = rank + direction;

      if (targetRank >= 1 && targetRank <= 8) {
        const targetSquare = String.fromCharCode(97 + file) + targetRank;
        const targetElement = this.board.querySelector(
          `[data-square="${targetSquare}"]`
        );
        if (targetElement && !targetElement.querySelector(".piece")) {
          targetElement.classList.add("possible-move");
        }
      }
    }
  }

  attemptMove(fromSquare, toSquare) {
    const piece = fromSquare.querySelector(".piece");
    if (!piece) {
      this.clearSelection();
      return;
    }

    const targetPiece = toSquare.querySelector(".piece");
    const isCapture = targetPiece !== null;

    // Animação simples de movimento
    piece.classList.add("moving");

    setTimeout(() => {
      // Remover peça capturada
      if (isCapture) {
        targetPiece.classList.add("captured");
        setTimeout(() => targetPiece.remove(), 300);
      }

      // Mover peça
      toSquare.appendChild(piece);
      piece.classList.remove("moving");

      const from = fromSquare.dataset.square;
      const to = toSquare.dataset.square;
      const san = this.generateSAN(from, to, piece.dataset.piece, isCapture);

      if (this.onMove) {
        this.onMove({ from, to, san });
      }

      this.highlightLastMove(from, to);
      this.addToHistory(from, to, isCapture);
      this.clearSelection();
    }, 100);
  }

  generateSAN(from, to, piece, isCapture) {
    // Geração simples de SAN - melhorar depois
    const pieceSymbol =
      piece === "♙" || piece === "♟"
        ? ""
        : piece === "♔" || piece === "♚"
        ? "K"
        : piece === "♕" || piece === "♛"
        ? "Q"
        : piece === "♖" || piece === "♜"
        ? "R"
        : piece === "♗" || piece === "♝"
        ? "B"
        : piece === "♘" || piece === "♞"
        ? "N"
        : "";

    return `${pieceSymbol}${isCapture ? "x" : ""}${to}`;
  }

  addToHistory(from, to, isCapture) {
    this.currentMove++;
    this.moveHistory.push({ from, to, isCapture, move: this.currentMove });
  }

  clearSelection() {
    if (this.selectedSquare) {
      this.selectedSquare.classList.remove("selected");
      this.selectedSquare = null;
    }
    this.clearPossibleMoves();
  }

  highlightLastMove(from, to) {
    // Limpar highlights anteriores
    this.board.querySelectorAll(".last-move").forEach((square) => {
      square.classList.remove("last-move");
    });

    // Destacar novo movimento
    if (from) {
      const fromSquare = this.board.querySelector(`[data-square="${from}"]`);
      if (fromSquare) fromSquare.classList.add("last-move");
    }

    if (to) {
      const toSquare = this.board.querySelector(`[data-square="${to}"]`);
      if (toSquare) toSquare.classList.add("last-move");
    }
  }

  flip() {
    this.isFlipped = !this.isFlipped;
    this.board.style.transform = this.isFlipped
      ? "rotate(180deg)"
      : "rotate(0deg)";

    // Rotacionar peças para manter orientação correta
    this.board.querySelectorAll(".piece").forEach((piece) => {
      piece.style.transform = this.isFlipped
        ? "rotate(180deg)"
        : "rotate(0deg)";
    });
  }

  changeTheme(theme) {
    const root = document.documentElement;

    switch (theme) {
      case "brown":
        root.style.setProperty("--board-light", "#f0d9b5");
        root.style.setProperty("--board-dark", "#b58863");
        root.style.setProperty("--board-border", "#8b7355");
        break;
      case "blue":
        root.style.setProperty("--board-light", "#dee3e6");
        root.style.setProperty("--board-dark", "#8ca2ad");
        root.style.setProperty("--board-border", "#7a8b94");
        break;
      case "green":
        root.style.setProperty("--board-light", "#ffffdd");
        root.style.setProperty("--board-dark", "#86a666");
        root.style.setProperty("--board-border", "#759654");
        break;
    }

    this.currentTheme = theme;
  }

  setInteractive(interactive) {
    this.interactive = interactive;

    this.board.querySelectorAll(".piece").forEach((piece) => {
      piece.draggable = interactive;
      piece.style.cursor = interactive ? "grab" : "default";
    });

    if (!interactive) {
      this.clearSelection();
    }
  }

  destroy() {
    if (this.board) {
      this.board.innerHTML = "";
      this.board.removeEventListener("click", this.handleSquareClick);
      this.board.removeEventListener("dragstart", null);
      this.board.removeEventListener("dragend", null);
      this.board.removeEventListener("dragover", null);
      this.board.removeEventListener("drop", null);
    }
  }
}

// Tornar disponível globalmente
window.ProfessionalChessboard = ProfessionalChessboard;
