// Adicionar no início do play.js

function initializePlayPage(app) {
  console.log("🎮 Initializing Play Page...");

  // Wait for the page to be fully loaded
  setTimeout(() => {
    const playInstance = new Play(app);
    playInstance.init();

    // Make it globally available
    window.playInstance = playInstance;
  }, 100);
}

// Make the function globally available
window.initializePlayPage = initializePlayPage;

// Updated Play class with better initialization
class Play {
  constructor(app) {
    this.app = app;
    this.currentGame = null;
    this.gameBoard = null;
    this.gameUpdateInterval = null;
    this.isPlayerTurn = false;
    this.api = app.api;
  }

  init() {
    console.log("🎯 Initializing Play components...");
    this.setupEventListeners();
    this.initializeBoard();
    this.loadAvailableModels();
  }

  setupEventListeners() {
    // Start new game function (global)
    window.startNewHumanGame = () => this.startNewGame();

    // Game control functions (global)
    window.requestHint = () => this.getHint();
    window.undoMove = () => this.undoMove();
    window.offerDraw = () => this.offerDraw();
    window.resignGame = () => this.resignGame();

    // Board control functions (global)
    window.goToMove = (direction) => this.goToMove(direction);
    window.flipPlayBoard = () => this.flipBoard();
    window.changePlayTheme = (theme) => this.changeTheme(theme);
    window.exportGamePGN = () => this.exportPGN();

    console.log("✅ Play event listeners set up");
  }

  initializeBoard() {
    const boardContainer = document.getElementById("play-chessboard");
    if (boardContainer) {
      console.log("🏁 Creating chessboard...");

      // Clear any existing content
      boardContainer.innerHTML = "";

      // Wait a bit to ensure DOM is ready
      setTimeout(() => {
        this.gameBoard = new ProfessionalChessboard("play-chessboard", {
          interactive: true,
          showCoordinates: true,
          onMove: (move) => {
            if (this.isPlayerTurn) {
              this.handleBoardMove(move);
            }
          },
          onGetPossibleMoves: (square) => {
            return this.getPossibleMoves(square);
          },
        });

        // Force render if needed
        if (this.gameBoard && this.gameBoard.board.children.length === 0) {
          console.log("🔧 Force rendering board...");
          this.gameBoard.forceRender();
        }

        console.log("✅ Chessboard created successfully");
      }, 200);
    } else {
      console.error("❌ Board container not found!");
    }
  }

  async loadAvailableModels() {
    try {
      const response = await fetch("/api/models/available");
      const models = await response.json();
      this.updateModelSelector(models);
      console.log("✅ Models loaded");
    } catch (error) {
      console.error("❌ Error loading models:", error);
      if (this.app && this.app.showToast) {
        this.app.showToast("Failed to load models", "error");
      }
    }
  }

  updateModelSelector(models) {
    const opponentSelect = document.getElementById("opponent-model");
    if (opponentSelect) {
      // Keep current selection if exists
      const currentValue = opponentSelect.value;

      opponentSelect.innerHTML = "";
      Object.entries(models).forEach(([name, config]) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = `${config.active ? "🟢" : "🔴"} ${name}`;
        option.disabled = !config.active;
        if (name === currentValue) {
          option.selected = true;
        }
        opponentSelect.appendChild(option);
      });
    }
  }

  async startNewGame() {
    const opponentModel = document.getElementById("opponent-model")?.value;
    const playerColorElement = document.querySelector(
      'input[name="player-color"]:checked'
    );
    const playerColor = playerColorElement ? playerColorElement.value : "white";
    const difficulty =
      document.getElementById("difficulty")?.value || "advanced";
    const timeControl =
      document.getElementById("time-control")?.value || "blitz";

    if (!opponentModel) {
      if (this.app && this.app.showToast) {
        this.app.showToast("Selecione um modelo oponente", "warning");
      }
      return;
    }

    try {
      if (this.app && this.app.showLoading) {
        this.app.showLoading("Iniciando novo jogo...");
      }

      const gameConfig = {
        opponent_model: opponentModel,
        player_color: playerColor,
        difficulty,
        time_control: timeControl,
      };

      const result = await this.api.createHumanGame(gameConfig);

      if (result.success) {
        this.currentGame = result.game;
        this.setupGameUI();
        this.updateGameStatus();

        // Set initial board position
        if (this.gameBoard) {
          this.gameBoard.setPositionFromFen(
            result.game.current_fen ||
              "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
          );
          if (playerColor === "black") {
            this.gameBoard.flip();
          }
        }

        this.isPlayerTurn = playerColor === "white";

        if (this.app && this.app.hideLoading) {
          this.app.hideLoading();
        }
        if (this.app && this.app.showToast) {
          this.app.showToast("Novo jogo iniciado!", "success");
        }

        // If AI plays first (player is black), get AI move
        if (playerColor === "black") {
          this.waitForAIMove();
        }
      } else {
        throw new Error(result.error || "Failed to start game");
      }
    } catch (error) {
      if (this.app && this.app.hideLoading) {
        this.app.hideLoading();
      }
      console.error("Error starting new game:", error);
      if (this.app && this.app.showToast) {
        this.app.showToast("Failed to start new game", "error");
      }
    }
  }

  setupGameUI() {
    // Show game controls
    const gameControls = document.getElementById("game-controls-card");
    if (gameControls) {
      gameControls.style.display = "block";
    }

    // Show board controls
    const boardControls = document.getElementById("board-controls");
    if (boardControls) {
      boardControls.style.display = "flex";
    }

    // Update player info
    this.updatePlayerInfo();
  }

  updatePlayerInfo() {
    if (!this.currentGame) return;

    const playerColorDisplay = document.getElementById("player-color-display");
    const aiModelDisplay = document.getElementById("ai-model-display");
    const aiColorDisplay = document.getElementById("ai-color-display");

    if (playerColorDisplay) {
      playerColorDisplay.textContent =
        this.currentGame.humanColor === "white" ? "Brancas" : "Pretas";
    }
    if (aiModelDisplay) {
      aiModelDisplay.textContent = this.currentGame.aiModel;
    }
    if (aiColorDisplay) {
      aiColorDisplay.textContent =
        this.currentGame.humanColor === "white" ? "Pretas" : "Brancas";
    }
  }

  updateGameStatus() {
    if (!this.currentGame) return;

    const gameStatus = document.getElementById("game-status");
    if (!gameStatus) return;

    const opponent = this.currentGame.aiModel;
    const playerColor = this.currentGame.humanColor;

    let statusText = `🎮 Jogando contra ${opponent}`;
    let statusClass = "status-playing";

    if (this.currentGame.status === "completed") {
      statusText = `🏁 Jogo finalizado`;
      statusClass = "status-finished";
    }

    gameStatus.innerHTML = `
      <div class="status-title">
        <i class="fas fa-info-circle"></i>
        ${statusText}
      </div>
      <div class="status-description">
        Você: ${playerColor === "white" ? "Brancas" : "Pretas"}
      </div>
    `;

    gameStatus.className = `game-status ${statusClass}`;
  }

  async makePlayerMove(from, to) {
    if (!this.currentGame || !this.isPlayerTurn) return;

    try {
      const move = `${from}${to}`; // Simple algebraic notation
      const result = await this.api.makeHumanMove(this.currentGame.id, move);

      if (result.success) {
        // Update board
        if (this.gameBoard) {
          this.gameBoard.setPositionFromFen(result.game_state.current_fen);
        }

        // Update move history
        this.updateMoveHistory(result.game_state.move_history);

        // Switch turns
        this.isPlayerTurn = false;

        if (this.app && this.app.showToast) {
          this.app.showToast(`Lance jogado: ${result.move}`, "success");
        }

        // Check if game is over
        if (result.game_state.status === "finished") {
          this.endGame(result.game_state.result);
        } else {
          // Wait for AI move
          this.waitForAIMove();
        }
      } else {
        if (this.app && this.app.showToast) {
          this.app.showToast(result.error || "Lance inválido", "error");
        }
      }
    } catch (error) {
      console.error("Error making player move:", error);
      if (this.app && this.app.showToast) {
        this.app.showToast("Erro ao processar o lance", "error");
      }
    }
  }

  handleBoardMove(move) {
    if (!this.isPlayerTurn || !this.currentGame) return;

    this.makePlayerMove(move.from, move.to);
  }

  getPossibleMoves(square) {
    // This would need to be implemented based on current game state
    // For now, return empty array
    return [];
  }

  waitForAIMove() {
    if (this.app && this.app.showLoading) {
      this.app.showLoading("IA está pensando...");
    }

    // Listen for AI move via WebSocket or polling
    // For now, we'll use a simple timeout to simulate AI thinking
    setTimeout(() => {
      if (this.app && this.app.hideLoading) {
        this.app.hideLoading();
      }
      this.isPlayerTurn = true;

      if (this.app && this.app.showToast) {
        this.app.showToast("Sua vez de jogar!", "info");
      }
    }, 3000);
  }

  updateMoveHistory(history) {
    const moveHistoryElement = document.getElementById("move-history");
    if (!moveHistoryElement || !history) return;

    if (history.length === 0) {
      moveHistoryElement.innerHTML = `
        <div style="color: var(--text-muted); text-align: center; padding: 20px; font-style: italic;">
          Nenhuma partida em andamento
        </div>
      `;
      return;
    }

    let html = "";
    for (let i = 0; i < history.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = history[i] || "";
      const blackMove = history[i + 1] || "";

      html += `
        <div style="padding: 4px 8px; border-bottom: 1px solid var(--border-color);">
          <span style="color: var(--text-secondary); width: 20px; display: inline-block;">${moveNumber}.</span>
          <span style="margin-right: 12px;">${whiteMove}</span>
          <span>${blackMove}</span>
        </div>
      `;
    }

    moveHistoryElement.innerHTML = html;
    moveHistoryElement.scrollTop = moveHistoryElement.scrollHeight;
  }

  // Placeholder methods for game controls
  getHint() {
    if (this.app && this.app.showToast) {
      this.app.showToast(
        "Dica: Desenvolva suas peças e controle o centro!",
        "info"
      );
    }
  }

  undoMove() {
    if (this.app && this.app.showToast) {
      this.app.showToast("Função ainda não implementada", "warning");
    }
  }

  offerDraw() {
    if (this.app && this.app.showToast) {
      this.app.showToast("Empate oferecido (função não implementada)", "info");
    }
  }

  resignGame() {
    if (confirm("Tem certeza que deseja resignar?")) {
      this.endGame("resign");
    }
  }

  goToMove(direction) {
    console.log(`Go to move: ${direction}`);
  }

  flipBoard() {
    if (this.gameBoard) {
      this.gameBoard.flip();
    }
  }

  changeTheme(theme) {
    if (this.gameBoard) {
      this.gameBoard.changeTheme(theme);
    }
  }

  exportPGN() {
    if (this.app && this.app.showToast) {
      this.app.showToast("Exportação PGN ainda não implementada", "info");
    }
  }

  endGame(result) {
    this.isPlayerTurn = false;
    this.updateGameStatus();

    let resultText = "Jogo finalizado";
    if (result === "resign") {
      resultText = "Você resignou";
    }

    if (this.app && this.app.showToast) {
      this.app.showToast(resultText, "info", 10000);
    }
  }

  destroy() {
    if (this.gameBoard) {
      this.gameBoard.destroy();
    }

    // Clean up global functions
    delete window.startNewHumanGame;
    delete window.requestHint;
    delete window.undoMove;
    delete window.offerDraw;
    delete window.resignGame;
    delete window.goToMove;
    delete window.flipPlayBoard;
    delete window.changePlayTheme;
    delete window.exportGamePGN;
  }
}

// Make Play available globally
window.Play = Play;
