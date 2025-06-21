/**
 * ♟️ LLM Chess Arena - Main Application
 * Professional Chess Application with AI Integration
 */

class LLMChessArena {
  constructor() {
    this.currentPage = "dashboard";
    this.chessboards = new Map();
    this.gameManager = new GameManager();
    this.apiClient = new APIClient();
    this.socketManager = new SocketManager();

    this.init();
  }

  async init() {
    console.log("🚀 Initializing LLM Chess Arena...");

    // Initialize components
    this.setupEventListeners();
    this.initializePages();
    this.loadInitialData();

    // Show initial page
    this.showPage("dashboard");

    console.log("✅ LLM Chess Arena initialized successfully");
  }

  setupEventListeners() {
    // Navigation
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const page = btn
          .getAttribute("onclick")
          ?.match(/goToPage\('(\w+)'\)/)?.[1];
        if (page) {
          e.preventDefault();
          this.showPage(page);
        }
      });
    });

    // Global keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "1":
            e.preventDefault();
            this.showPage("dashboard");
            break;
          case "2":
            e.preventDefault();
            this.showPage("arena");
            break;
          case "3":
            e.preventDefault();
            this.showPage("play");
            break;
          case "4":
            e.preventDefault();
            this.showPage("analysis");
            break;
        }
      }
    });
  }

  initializePages() {
    // Setup page-specific initializers
    this.pageInitializers = {
      dashboard: () => this.initializeDashboard(),
      arena: () => this.initializeArena(),
      play: () => this.initializePlay(),
      analysis: () => this.initializeAnalysis(),
    };
  }

  async loadInitialData() {
    try {
      // Load initial application data
      const [models, games, stats] = await Promise.all([
        this.apiClient.getAvailableModels(),
        this.apiClient.getRecentGames(),
        this.apiClient.getStats(),
      ]);

      this.models = models;
      this.recentGames = games;
      this.stats = stats;
    } catch (error) {
      console.error("Error loading initial data:", error);
      this.showToast("Erro ao carregar dados iniciais", "error");
    }
  }

  showPage(pageName) {
    // Hide all pages
    document.querySelectorAll(".page").forEach((page) => {
      page.classList.remove("active");
    });

    // Update navigation
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.remove("active");
    });

    // Show target page
    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
      targetPage.classList.add("active");

      // Update active nav button
      const activeBtn = document.querySelector(`[onclick*="${pageName}"]`);
      if (activeBtn) {
        activeBtn.classList.add("active");
      }

      // Initialize page if needed
      if (this.pageInitializers[pageName]) {
        this.pageInitializers[pageName]();
      }

      // Call page event handlers
      if (window.pageEventHandlers && window.pageEventHandlers[pageName]) {
        window.pageEventHandlers[pageName].onShow?.();
      }

      this.currentPage = pageName;
    }
  }

  // ==========================================
  // PAGE INITIALIZERS
  // ==========================================

  initializeDashboard() {
    console.log("🏠 Initializing Dashboard...");
    this.updateDashboardStats();
    this.loadRecentGames();
  }

  initializeArena() {
    console.log("⚔️ Initializing Arena...");
    if (!this.chessboards.has("arena")) {
      this.chessboards.set(
        "arena",
        new ProfessionalChessboard("arena-chessboard")
      );
    }
    this.loadBattleHistory();
  }

  initializePlay() {
    console.log("🎮 Initializing Play...");
    if (!this.chessboards.has("play")) {
      const playBoard = new ProfessionalChessboard("play-chessboard");
      playBoard.onMove = (move) => this.handlePlayerMove(move);
      this.chessboards.set("play", playBoard);
    }
    this.updateModelSelections();
  }

  initializeAnalysis() {
    console.log("📊 Initializing Analysis...");
    if (!this.chessboards.has("analysis")) {
      this.chessboards.set(
        "analysis",
        new ProfessionalChessboard("analysis-chessboard")
      );
    }
    this.loadAnalysisData();
  }

  // ==========================================
  // DASHBOARD METHODS
  // ==========================================

  updateDashboardStats() {
    if (!this.stats) return;

    // Update metric cards
    const metrics = {
      "total-games": this.stats.totalGames || 248,
      "active-models": this.stats.activeModels || 8,
      "avg-moves": this.stats.avgMoves || 42,
      tournaments: this.stats.tournaments || 12,
    };

    Object.entries(metrics).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    });
  }

  loadRecentGames() {
    const tableBody = document.getElementById("recent-games-table");
    if (!tableBody || !this.recentGames) return;

    // Clear existing content
    tableBody.innerHTML = "";

    this.recentGames.slice(0, 10).forEach((game, index) => {
      const row = this.createGameRow(game, index + 1);
      tableBody.appendChild(row);
    });
  }

  createGameRow(game, index) {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>
                <div class="d-flex align-center gap-8">
                    <div style="width: 24px; height: 24px; background: var(--lichess-green); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px;">
                        <i class="fas fa-brain"></i>
                    </div>
                    <strong>${game.white}</strong>
                </div>
            </td>
            <td>
                <div class="d-flex align-center gap-8">
                    <div style="width: 24px; height: 24px; background: var(--lichess-blue); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px;">
                        <i class="fas fa-gem"></i>
                    </div>
                    <strong>${game.black}</strong>
                </div>
            </td>
            <td>
                <span class="status status-finished">${game.result}</span>
            </td>
            <td>
                <span style="font-family: var(--font-mono);">${game.moves}</span>
            </td>
            <td style="color: var(--text-secondary);">
                <span style="font-family: var(--font-mono);">${game.duration}</span>
            </td>
            <td style="color: var(--text-secondary);">
                ${game.date}
            </td>
            <td>
                <div class="d-flex gap-4">
                    <button class="btn btn-sm" onclick="arena.viewGame('${game.id}')">
                        <i class="fas fa-eye"></i>
                        Ver
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="arena.downloadPGN('${game.id}')">
                        <i class="fas fa-download"></i>
                        PGN
                    </button>
                </div>
            </td>
        `;
    return row;
  }

  // ==========================================
  // PLAY METHODS
  // ==========================================

  updateModelSelections() {
    if (!this.models) return;

    const modelSelect = document.getElementById("opponent-model");
    if (modelSelect) {
      modelSelect.innerHTML = "";
      Object.entries(this.models).forEach(([name, available]) => {
        if (available) {
          const option = document.createElement("option");
          option.value = name;
          option.textContent = name;
          modelSelect.appendChild(option);
        }
      });
    }
  }

  async handlePlayerMove(move) {
    console.log("Player move:", move);

    try {
      const response = await this.apiClient.makePlayerMove(move);
      if (response.success) {
        this.updateMoveHistory(response.history);

        // If AI needs to move
        if (!response.gameOver && response.aiTurn) {
          this.showAIThinking();

          setTimeout(async () => {
            try {
              const aiResponse = await this.apiClient.getAIMove();
              this.handleAIMove(aiResponse);
            } catch (error) {
              console.error("AI move error:", error);
              this.showToast("Erro no lance da IA", "error");
            }
          }, 1000);
        }
      }
    } catch (error) {
      console.error("Player move error:", error);
      this.showToast("Lance inválido", "warning");
    }
  }

  handleAIMove(aiMove) {
    const playBoard = this.chessboards.get("play");
    if (playBoard && aiMove.move) {
      // Animate AI move on board
      playBoard.makeMove(aiMove.from, aiMove.to);

      // Update UI
      this.updateMoveHistory(aiMove.history);
      this.hideAIThinking();

      if (aiMove.gameOver) {
        this.handleGameEnd(aiMove.result);
      }
    }
  }

  showAIThinking() {
    const board = document.querySelector(".chessboard-container");
    if (board) {
      const indicator = document.createElement("div");
      indicator.className = "thinking-indicator";
      indicator.innerHTML = `
                <div class="thinking-spinner"></div>
                IA pensando...
            `;
      board.appendChild(indicator);
    }
  }

  hideAIThinking() {
    const indicator = document.querySelector(".thinking-indicator");
    if (indicator) {
      indicator.remove();
    }
  }

  updateMoveHistory(moves) {
    const historyElement = document.getElementById("move-history");
    if (!historyElement || !moves) return;

    if (moves.length === 0) {
      historyElement.innerHTML = `
                <div style="color: var(--text-muted); text-align: center; padding: 20px; font-style: italic;">
                    Nenhuma partida em andamento
                </div>
            `;
      return;
    }

    let html = "";
    for (let i = 0; i < moves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = moves[i] || "";
      const blackMove = moves[i + 1] || "";

      html += `
                <div style="padding: 4px 8px; border-bottom: 1px solid var(--border-color);">
                    <span style="color: var(--text-secondary); width: 20px; display: inline-block;">${moveNumber}.</span>
                    <span style="margin-right: 12px;">${whiteMove}</span>
                    <span>${blackMove}</span>
                </div>
            `;
    }

    historyElement.innerHTML = html;
    historyElement.scrollTop = historyElement.scrollHeight;
  }

  // ==========================================
  // ARENA METHODS
  // ==========================================

  async startBattle(config) {
    try {
      this.showLoading("Iniciando batalha...");

      const battle = await this.apiClient.startBattle(config);

      this.hideLoading();
      this.showToast("Batalha iniciada!", "success");

      // Listen for battle updates
      this.socketManager.onBattleUpdate = (update) => {
        this.updateBattleProgress(update);
      };

      return battle;
    } catch (error) {
      this.hideLoading();
      this.showToast("Erro ao iniciar batalha", "error");
      throw error;
    }
  }

  updateBattleProgress(battle) {
    // Update battle progress UI
    const progressElement = document.getElementById("battle-progress");
    if (progressElement) {
      const progress = (battle.currentGame / battle.numGames) * 100;
      progressElement.innerHTML = `
                <div class="progress">
                    <div class="progress-bar" style="width: ${progress}%"></div>
                </div>
                <div style="text-align: center; margin-top: 8px;">
                    Jogo ${battle.currentGame} de ${battle.numGames}
                </div>
            `;
    }
  }

  loadBattleHistory() {
    // Load and display battle history
    console.log("Loading battle history...");
  }

  // ==========================================
  // ANALYSIS METHODS
  // ==========================================

  loadAnalysisData() {
    // Load analysis data
    console.log("Loading analysis data...");
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  showToast(message, type = "info") {
    const container = this.getToastContainer();

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
            <i class="fas fa-${this.getToastIcon(type)}"></i>
            <span>${message}</span>
        `;

    container.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  getToastContainer() {
    let container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    return container;
  }

  getToastIcon(type) {
    const icons = {
      success: "check-circle",
      error: "exclamation-circle",
      warning: "exclamation-triangle",
      info: "info-circle",
    };
    return icons[type] || "info-circle";
  }

  showLoading(message = "Carregando...") {
    let overlay = document.querySelector(".loading-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "loading-overlay";
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <div>${message}</div>
            </div>
        `;
    overlay.style.display = "flex";
  }

  hideLoading() {
    const overlay = document.querySelector(".loading-overlay");
    if (overlay) {
      overlay.style.display = "none";
    }
  }

  // ==========================================
  // API INTEGRATION
  // ==========================================

  async viewGame(gameId) {
    try {
      const game = await this.apiClient.getGame(gameId);
      // Show game viewer modal or navigate to analysis page
      console.log("Viewing game:", game);
    } catch (error) {
      this.showToast("Erro ao carregar partida", "error");
    }
  }

  async downloadPGN(gameId) {
    try {
      const pgn = await this.apiClient.getPGN(gameId);
      this.downloadFile(`game-${gameId}.pgn`, pgn);
    } catch (error) {
      this.showToast("Erro ao baixar PGN", "error");
    }
  }

  downloadFile(filename, content) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  handleGameEnd(result) {
    // Show game end modal
    const modal = document.getElementById("game-result-modal");
    if (modal) {
      // Update modal content based on result
      modal.style.display = "flex";
    }

    this.showToast(`Partida terminada: ${result}`, "info");
  }
}

// ==========================================
// PROFESSIONAL CHESSBOARD CLASS
// ==========================================

class ProfessionalChessboard {
  constructor(containerId) {
    this.board = document.getElementById(containerId);
    this.selectedSquare = null;
    this.isFlipped = false;
    this.currentTheme = "brown";
    this.gamePosition = this.getInitialPosition();
    this.moveHistory = [];
    this.currentMove = 0;
    this.onMove = null; // Callback for when a move is made

    if (this.board) {
      this.initializeBoard();
      this.setupInitialPosition();
      this.addEventListeners();
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
    this.board.innerHTML = "";

    for (let rank = 8; rank >= 1; rank--) {
      for (let file = 0; file < 8; file++) {
        const square = document.createElement("div");
        const fileChar = String.fromCharCode(97 + file); // a-h
        const squareId = `${fileChar}${rank}`;

        const isLight = (rank + file) % 2 !== 0;
        square.className = `square ${isLight ? "light" : "dark"}`;
        square.dataset.square = squareId;

        this.board.appendChild(square);
      }
    }
  }

  setupInitialPosition() {
    // Clear all squares
    document.querySelectorAll(`#${this.board.id} .square`).forEach((square) => {
      square.innerHTML = "";
    });

    // Add pieces to initial position
    Object.entries(this.gamePosition).forEach(([square, pieceData]) => {
      this.placePiece(square, pieceData.piece, pieceData.color);
    });
  }

  placePiece(squareId, piece, color) {
    const square = this.board.querySelector(`[data-square="${squareId}"]`);
    if (!square) return;

    const pieceElement = document.createElement("div");
    pieceElement.className = `piece ${color}`;
    pieceElement.textContent = piece;
    pieceElement.dataset.piece = piece;
    pieceElement.dataset.color = color;
    pieceElement.draggable = true;

    square.appendChild(pieceElement);
  }

  addEventListeners() {
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
      }
    });

    this.board.addEventListener("dragend", (e) => {
      if (e.target.classList.contains("piece")) {
        e.target.classList.remove("dragging");
      }
    });

    this.board.addEventListener("dragover", (e) => {
      e.preventDefault();
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
        this.clearSelection();
      } else {
        this.attemptMove(this.selectedSquare, square);
      }
    } else {
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
    this.showPossibleMoves(square);
  }

  showPossibleMoves(square) {
    const piece = square.querySelector(".piece");
    if (!piece) return;

    const squareId = square.dataset.square;
    const file = squareId.charCodeAt(0) - 97;
    const rank = parseInt(squareId[1]);

    // Simple pawn movement example
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

    piece.classList.add("moving");

    setTimeout(() => {
      if (isCapture) {
        targetPiece.classList.add("captured");
        setTimeout(() => targetPiece.remove(), 300);
      }

      toSquare.appendChild(piece);
      piece.classList.remove("moving");

      this.addToHistory(
        fromSquare.dataset.square,
        toSquare.dataset.square,
        isCapture
      );

      const pieceData = {
        piece: piece.dataset.piece,
        color: piece.dataset.color,
      };
      delete this.gamePosition[fromSquare.dataset.square];
      this.gamePosition[toSquare.dataset.square] = pieceData;

      this.clearSelection();
      this.updateGameStatus();

      // Notify move callback
      if (typeof this.onMove === "function") {
        this.onMove({
          from: fromSquare.dataset.square,
          to: toSquare.dataset.square,
          piece: piece.dataset.piece,
          color: piece.dataset.color,
          isCapture: isCapture,
        });
      }
    }, 250);
  }

  makeMove(from, to) {
    const fromSquare = this.board.querySelector(`[data-square="${from}"]`);
    const toSquare = this.board.querySelector(`[data-square="${to}"]`);

    if (fromSquare && toSquare) {
      this.attemptMove(fromSquare, toSquare);
    }
  }

  addToHistory(from, to, isCapture) {
    this.moveHistory.push({
      from,
      to,
      capture: isCapture,
      timestamp: Date.now(),
    });
    this.currentMove = this.moveHistory.length;
  }

  clearSelection() {
    if (this.selectedSquare) {
      this.selectedSquare.classList.remove("selected");
      this.selectedSquare = null;
    }

    this.board
      .querySelectorAll(".possible-move, .possible-capture")
      .forEach((square) => {
        square.classList.remove("possible-move", "possible-capture");
      });
  }

  updateGameStatus() {
    const statusElement = document.querySelector(".game-status");
    if (statusElement) {
      const moveCount = this.moveHistory.length;
      const isWhiteTurn = moveCount % 2 === 0;
      statusElement.innerHTML = `
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">
                    <i class="fas fa-chess"></i>
                    ${isWhiteTurn ? "Brancas" : "Pretas"} jogam - Lance ${
        Math.floor(moveCount / 2) + 1
      }
                </div>
            `;
    }
  }

  flipBoard() {
    this.isFlipped = !this.isFlipped;
    this.board.style.transform = this.isFlipped
      ? "rotate(180deg)"
      : "rotate(0deg)";

    this.board.querySelectorAll(".piece").forEach((piece) => {
      piece.style.transform = this.isFlipped
        ? "rotate(180deg)"
        : "rotate(0deg)";
    });

    const coordsElements = document.querySelectorAll(".coordinates-external");
    coordsElements.forEach((coord) => {
      coord.style.transform = this.isFlipped
        ? "rotate(180deg)"
        : "rotate(0deg)";
    });
  }

  changeTheme(theme) {
    document.querySelectorAll(".theme-option").forEach((option) => {
      option.classList.remove("active");
    });

    document.querySelector(`.theme-option.${theme}`)?.classList.add("active");

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
}

// ==========================================
// API CLIENT
// ==========================================

class APIClient {
  constructor() {
    this.baseURL = "/api";
  }

  async request(endpoint, options = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  async getAvailableModels() {
    return this.request("/models/available");
  }

  async getRecentGames() {
    return this.request("/games/recent");
  }

  async getStats() {
    return this.request("/games/stats");
  }

  async startBattle(config) {
    return this.request("/games/battle", {
      method: "POST",
      body: JSON.stringify(config),
    });
  }

  async makePlayerMove(move) {
    return this.request("/games/human/move", {
      method: "POST",
      body: JSON.stringify({ move }),
    });
  }

  async getAIMove() {
    return this.request("/games/ai/move");
  }

  async getGame(gameId) {
    return this.request(`/games/${gameId}`);
  }

  async getPGN(gameId) {
    const response = await fetch(`${this.baseURL}/games/${gameId}/pgn`);
    return response.text();
  }
}

// ==========================================
// SOCKET MANAGER
// ==========================================

class SocketManager {
  constructor() {
    this.socket = null;
    this.connect();
  }

  connect() {
    this.socket = io();

    this.socket.on("connect", () => {
      console.log("🔌 Connected to server");
    });

    this.socket.on("game-update", (data) => {
      if (this.onGameUpdate) {
        this.onGameUpdate(data);
      }
    });

    this.socket.on("battle-update", (data) => {
      if (this.onBattleUpdate) {
        this.onBattleUpdate(data);
      }
    });
  }
}

// ==========================================
// GAME MANAGER
// ==========================================

class GameManager {
  constructor() {
    this.currentGame = null;
    this.gameHistory = [];
  }

  startNewGame(config) {
    this.currentGame = {
      id: `game_${Date.now()}`,
      config,
      startTime: new Date(),
      moves: [],
      status: "active",
    };

    return this.currentGame;
  }

  addMove(move) {
    if (this.currentGame) {
      this.currentGame.moves.push({
        ...move,
        timestamp: new Date(),
      });
    }
  }

  endGame(result) {
    if (this.currentGame) {
      this.currentGame.status = "finished";
      this.currentGame.result = result;
      this.currentGame.endTime = new Date();

      this.gameHistory.push(this.currentGame);
      this.currentGame = null;
    }
  }
}

// ==========================================
// GLOBAL FUNCTIONS
// ==========================================

// Global functions for board controls
function goToStart() {
  const playBoard = window.arena?.chessboards?.get("play");
  if (playBoard && playBoard.moveHistory.length > 0) {
    playBoard.currentMove = 0;
    console.log("Going to start");
  }
}

function previousMove() {
  const playBoard = window.arena?.chessboards?.get("play");
  if (playBoard && playBoard.currentMove > 0) {
    playBoard.currentMove--;
    console.log("Previous move");
  }
}

function nextMove() {
  const playBoard = window.arena?.chessboards?.get("play");
  if (playBoard && playBoard.currentMove < playBoard.moveHistory.length) {
    playBoard.currentMove++;
    console.log("Next move");
  }
}

function goToEnd() {
  const playBoard = window.arena?.chessboards?.get("play");
  if (playBoard && playBoard.moveHistory.length > 0) {
    playBoard.currentMove = playBoard.moveHistory.length;
    console.log("Going to end");
  }
}

function flipBoard() {
  const playBoard = window.arena?.chessboards?.get("play");
  if (playBoard) {
    playBoard.flipBoard();
  }
}

function changeTheme(theme) {
  const playBoard = window.arena?.chessboards?.get("play");
  if (playBoard) {
    playBoard.changeTheme(theme);
  }
}

function goToPage(pageName) {
  if (window.arena) {
    window.arena.showPage(pageName);
  }
}

// ==========================================
// INITIALIZATION
// ==========================================

// Initialize application when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  window.arena = new LLMChessArena();
  console.log("✅ LLM Chess Arena application initialized");
});

// Export for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    LLMChessArena,
    ProfessionalChessboard,
    APIClient,
    SocketManager,
    GameManager,
  };
}
