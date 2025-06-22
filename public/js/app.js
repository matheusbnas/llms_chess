/**
 * ♟️ LLM Chess Arena - Main Application
 * Professional Chess Application with AI Integration
 */

class LLMChessArena {
  constructor() {
    this.currentPage = "dashboard";
    this.chessboards = new Map();
    this.api = window.smartAPI;
    this.socket = this.setupSocket();
    this.pgnGame = null;
    this.currentPgnMove = 0;
    this.charts = new ChartManager();

    this.init();
  }

  async init() {
    console.log("🚀 Initializing LLM Chess Arena...");

    // Initialize components
    this.setupEventListeners();
    this.initializePages();
    await this.loadInitialData();

    // Show initial page
    this.showPage("dashboard");

    console.log("✅ LLM Chess Arena initialized successfully");
  }

  setupSocket() {
    const socket = io();

    socket.on("connect", () => {
      console.log("🔌 Connected to WebSocket server");
      this.showToast("Conectado ao servidor", "success");
    });

    socket.on("disconnect", () => {
      console.warn("🔌 Disconnected from WebSocket server");
      this.showToast("Desconectado do servidor", "warning");
    });

    socket.on("game-update", (data) => this.handleGameUpdate(data));
    socket.on("battle-update", (data) => this.updateBattleProgress(data));
    socket.on("game-completed", (data) => this.handleGameCompletion(data));

    return socket;
  }

  setupEventListeners() {
    // Navigation
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pageName = btn.dataset.page;
        if (pageName) {
          this.showPage(pageName);
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
            this.showPage("lichess");
            break;
          case "5":
            e.preventDefault();
            this.showPage("rankings");
            break;
          case "6":
            e.preventDefault();
            this.showPage("settings");
            break;
        }
      }
    });
  }

  initializePages() {
    this.pageCache = new Map();
  }

  async loadInitialData() {
    try {
      // Load initial application data
      const [models, games, stats] = await Promise.all([
        this.api.getAvailableModels(),
        this.api.getRecentGames(),
        this.api.getStats(),
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

      const activeBtn = document.querySelector(
        `.nav-btn[data-page="${pageName}"]`
      );
      if (activeBtn) {
        activeBtn.classList.add("active");
      }

      this.currentPage = pageName;
      this.loadPageContent(pageName);

      // Fix for chessboard rendering
      setTimeout(() => {
        if (Utils && Utils.ensureChessboardRendered) {
          Utils.ensureChessboardRendered();
        }
      }, 100);
    }
  }

  async loadPageContent(pageName) {
    if (this.pageCache.has(pageName)) {
      document.getElementById(`${pageName}-page`).innerHTML =
        this.pageCache.get(pageName);
      this.runPageInitializer(pageName);
      return;
    }

    try {
      const response = await fetch(`/pages/${pageName}.html`);
      if (!response.ok) {
        throw new Error(`Failed to load page: ${pageName}`);
      }
      const content = await response.text();
      this.pageCache.set(pageName, content);
      document.getElementById(`${pageName}-page`).innerHTML = content;
      this.runPageInitializer(pageName);
    } catch (error) {
      console.error(`Error loading page ${pageName}:`, error);
      document.getElementById(
        `${pageName}-page`
      ).innerHTML = `<p>Error loading page.</p>`;
    }
  }

  runPageInitializer(pageName) {
    if (pageName === "dashboard") {
      if (!this.dashboardPgnViewer) {
        this.dashboardPgnViewer = new PgnViewer({
          boardId: "pgn-viewer-board",
          movesId: "pgn-viewer-moves",
        });
      }
      initializeDashboardPage(this, this.dashboardPgnViewer);
    }
    if (pageName === "arena") {
      if (!this.arenaPgnViewer) {
        this.arenaPgnViewer = new PgnViewer({
          boardId: "arena-pgn-viewer-board",
          movesId: "arena-pgn-viewer-moves",
        });
      }
      initializeArenaPage(this, this.arenaPgnViewer);
    }
    // Add other page initializers here if needed
    // e.g., if (pageName === 'arena') { initializeArenaPage(); }
  }

  createChart(canvasId, config) {
    return this.charts.createChart(canvasId, config);
  }

  // ==========================================
  // PAGE INITIALIZERS
  // ==========================================

  initializeDashboard() {
    console.log("🏠 Initializing Dashboard...");

    // Defer initialization until PgnViewer is available
    const checkPgnViewer = () => {
      if (typeof PgnViewer !== "undefined") {
        const dashboard = new Dashboard(this.api);
        dashboard.init();
        this.updateDashboardStats();
        this.loadRecentGames();
      } else {
        setTimeout(checkPgnViewer, 100); // Check again shortly
      }
    };

    checkPgnViewer();
  }

  initializeArena() {
    console.log("⚔️ Initializing Arena...");
    if (!this.chessboards.has("arena-live")) {
      try {
        const boardElement = document.getElementById("live-chessboard");
        if (boardElement) {
          this.chessboards.set(
            "arena-live",
            new ProfessionalChessboard("live-chessboard")
          );
        } else {
          console.warn("Live chessboard element not found");
        }
      } catch (error) {
        console.error("Error initializing arena chessboard:", error);
      }
    }
    this.loadBattleHistory();
    this.updateModelSelections(["quick-white-model", "quick-black-model"]);

    // Event Listeners
    document
      .getElementById("start-battle-btn")
      .addEventListener("click", () => this.startArenaBattle());

    // PGN Viewer Logic
    this.initializePgnViewer();
  }

  initializePlay() {
    console.log("🎮 Initializing Play...");
  }

  initializeRankings() {
    console.log("🏆 Initializing Rankings...");
  }

  initializeSettings() {
    console.log("⚙️ Initializing Settings...");
    const settings = new Settings(this.api);
    settings.init();
  }

  initializeAnalysis() {
    console.log("📊 Initializing Analysis...");
    // Initialize analysis components, e.g., load data for charts
    this.loadAnalysisData();
  }

  initializeModelManagement() {
    console.log("🤖 Initializing Model Management...");
  }

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

  updateModelSelections(selectIds) {
    if (!this.models) return;

    selectIds.forEach((id) => {
      const modelSelect = document.getElementById(id);
      if (modelSelect) {
        modelSelect.innerHTML = "";
        Object.entries(this.models).forEach(([name, config]) => {
          if (config.active) {
            const option = document.createElement("option");
            option.value = name;
            option.textContent = name;
            modelSelect.appendChild(option);
          }
        });
      }
    });
  }

  async handlePlayerMove(move) {
    console.log("Player move:", move);

    try {
      const response = await this.api.makePlayerMove(move);
      if (response.success) {
        this.updateMoveHistory(response.history);

        // If AI needs to move
        if (!response.gameOver && response.aiTurn) {
          this.showAIThinking();

          setTimeout(async () => {
            try {
              const aiResponse = await this.api.getAIMove();
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

  async startArenaBattle() {
    const whiteModel = document.getElementById("quick-white-model").value;
    const blackModel = document.getElementById("quick-black-model").value;
    const opening = document.getElementById("quick-opening").value;

    if (!whiteModel || !blackModel) {
      this.showToast("Por favor, selecione ambos os modelos.", "warning");
      return;
    }
    if (whiteModel === blackModel) {
      this.showToast("Os modelos devem ser diferentes.", "warning");
      return;
    }

    try {
      const battle = await this.startBattle({
        whiteModel,
        blackModel,
        opening,
        numGames: 1,
      });
      this.prepareLiveGameUI(battle);
    } catch (error) {
      console.error("Failed to start battle:", error);
    }
  }

  prepareLiveGameUI(battle) {
    const liveBoardDiv = document.getElementById("live-game-board");
    if (liveBoardDiv) {
      liveBoardDiv.style.display = "block";
      document.getElementById(
        "live-game-title"
      ).textContent = `${battle.whiteModel} vs ${battle.blackModel}`;
      document.getElementById("white-player-name").textContent =
        battle.whiteModel;
      document.getElementById("black-player-name").textContent =
        battle.blackModel;

      const statusBadge = document.getElementById("game-status-badge");
      statusBadge.textContent = "Partida Ativa";
      statusBadge.className = "badge badge-success";

      const liveBoard = this.chessboards.get("arena-live");
      if (liveBoard) {
        liveBoard.setupInitialPosition();
      }

      document.getElementById("live-move-history").innerHTML =
        '<div style="color: var(--text-muted); text-align: center;">Aguardando lances...</div>';
      liveBoardDiv.scrollIntoView({ behavior: "smooth" });
    }
  }

  handleGameUpdate(data) {
    console.log("Game update received:", data);
    const liveBoard = this.chessboards.get("arena-live");
    if (liveBoard && this.currentPage === "arena") {
      liveBoard.setPositionFromFen(data.fen);
      document.getElementById(
        "live-game-moves"
      ).textContent = `Lance ${data.moveCount}`;
      const turn = data.turn === "w" ? "brancas" : "pretas";
      document.getElementById("live-game-turn").textContent = `Vez das ${turn}`;

      this.updateLiveMoveHistory(data.history);
    }
  }

  handleGameCompletion(data) {
    console.log("Game completed:", data);
    if (this.currentPage === "arena") {
      this.showToast(`Partida finalizada: ${data.result}`, "info");
      const statusBadge = document.getElementById("game-status-badge");
      statusBadge.textContent = "Partida Finalizada";
      statusBadge.className = "badge badge-secondary";
    }
  }

  updateLiveMoveHistory(moves) {
    const historyElement = document.getElementById("live-move-history");
    if (!historyElement || !moves) return;

    if (moves.length === 0) {
      historyElement.innerHTML = `<div style="color: var(--text-muted); text-align: center;">Aguardando lances...</div>`;
      return;
    }

    let html = "";
    for (let i = 0; i < moves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = moves[i] || "";
      const blackMove = moves[i + 1] || "";

      html += `
        <div style="padding: 2px 4px; border-bottom: 1px solid var(--border-color); font-size: 13px;">
            <span style="color: var(--text-secondary); width: 20px; display: inline-block;">${moveNumber}.</span>
            <span style="margin-right: 12px;">${whiteMove}</span>
            <span>${blackMove}</span>
        </div>`;
    }

    historyElement.innerHTML = html;
    historyElement.scrollTop = historyElement.scrollHeight;
  }

  async startBattle(config) {
    try {
      this.showLoading("Iniciando batalha...");

      const { battle } = await this.api.startBattle(config);

      this.hideLoading();
      this.showToast("Batalha iniciada!", "success");

      // Join battle room
      this.socket.emit("join-battle", battle.id);

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
  // PGN VIEWER METHODS
  // ==========================================

  async initializePgnViewer() {
    const matchupSelect = document.getElementById("pgn-matchup-select");
    const gameSelect = document.getElementById("pgn-game-select");
    const loadPgnBtn = document.getElementById("load-pgn-btn");

    if (!matchupSelect || !gameSelect || !loadPgnBtn) return;

    // Load matchups
    try {
      const matchups = await this.api.request("get", "/games/list-matchups");
      matchupSelect.innerHTML =
        '<option value="">Selecione um confronto</option>';
      matchups.forEach((matchup) => {
        const option = document.createElement("option");
        option.value = matchup;
        option.textContent = matchup;
        matchupSelect.appendChild(option);
      });
    } catch (error) {
      console.error("Failed to load matchups:", error);
      matchupSelect.innerHTML = '<option value="">Erro ao carregar</option>';
    }

    // Event Listeners
    matchupSelect.addEventListener("change", async () => {
      const selectedMatchup = matchupSelect.value;
      gameSelect.innerHTML = '<option value="">Carregando partidas...</option>';
      if (!selectedMatchup) {
        gameSelect.innerHTML =
          '<option value="">Selecione um confronto...</option>';
        return;
      }
      try {
        const games = await this.api.request(
          "get",
          `/games/list-games/${selectedMatchup}`
        );
        gameSelect.innerHTML =
          '<option value="">Selecione uma partida</option>';
        games.forEach((game) => {
          const option = document.createElement("option");
          option.value = game;
          option.textContent = game;
          gameSelect.appendChild(option);
        });
      } catch (error) {
        console.error("Failed to load games:", error);
        gameSelect.innerHTML = '<option value="">Erro ao carregar</option>';
      }
    });

    loadPgnBtn.addEventListener("click", () => {
      const selectedMatchup = matchupSelect.value;
      const selectedGame = gameSelect.value;
      if (selectedMatchup && selectedGame) {
        this.loadPgnGame(selectedMatchup, selectedGame);
      } else {
        this.showToast(
          "Por favor, selecione um confronto e uma partida.",
          "warning"
        );
      }
    });

    // PGN Controls
    document
      .getElementById("pgn-start-btn")
      ?.addEventListener("click", () => this.goToPgnMove(0));
    document
      .getElementById("pgn-prev-btn")
      ?.addEventListener("click", () =>
        this.goToPgnMove(this.currentPgnMove - 1)
      );
    document
      .getElementById("pgn-next-btn")
      ?.addEventListener("click", () =>
        this.goToPgnMove(this.currentPgnMove + 1)
      );
    document
      .getElementById("pgn-end-btn")
      ?.addEventListener("click", () =>
        this.goToPgnMove(this.pgnGame.moves.length)
      );
    document
      .getElementById("pgn-slider")
      ?.addEventListener("input", (e) =>
        this.goToPgnMove(parseInt(e.target.value))
      );
  }

  async loadPgnGame(matchup, gameFile) {
    this.showLoading("Carregando partida PGN...");
    try {
      const gameData = await this.api.request(
        "get",
        `/games/pgn-data/${matchup}/${gameFile}`
      );
      this.pgnGame = gameData;
      this.currentPgnMove = 0;
      this.updatePgnViewer();
      document.getElementById("live-game-board").style.display = "block";
      this.showToast("Partida PGN carregada.", "success");
    } catch (error) {
      console.error("Failed to load PGN data:", error);
      this.showToast("Erro ao carregar dados da partida.", "error");
    } finally {
      this.hideLoading();
    }
  }

  updatePgnViewer() {
    if (!this.pgnGame) return;

    const { headers, moves, fens } = this.pgnGame;
    const totalMoves = moves.length;

    // Update header
    document.getElementById(
      "live-game-title"
    ).textContent = `${headers.White} vs ${headers.Black}`;
    document.getElementById("white-player-name").textContent =
      headers.White || "-";
    document.getElementById("black-player-name").textContent =
      headers.Black || "-";
    document.getElementById(
      "game-status-badge"
    ).textContent = `PGN: ${headers.Result}`;
    document.getElementById("game-status-badge").className = "badge badge-info";

    // Update board
    const board = this.chessboards.get("arena-live");
    if (board) {
      board.setPositionFromFen(fens[this.currentPgnMove]);
    }

    // Update move history
    const historyElement = document.getElementById("live-move-history");
    let html = "";
    for (let i = 0; i < moves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = moves[i] ? moves[i].san : "";
      const blackMove = moves[i + 1] ? moves[i + 1].san : "";

      const isWhiteActive = this.currentPgnMove === i + 1;
      const isBlackActive = this.currentPgnMove === i + 2;

      html += `
              <div style="padding: 2px 4px; border-bottom: 1px solid var(--border-color); font-size: 13px; display: flex;">
                  <span style="color: var(--text-secondary); width: 30px; display: inline-block;">${moveNumber}.</span>
                  <span class="${
                    isWhiteActive ? "active-move" : ""
                  }" style="margin-right: 12px; flex: 1; cursor: pointer;" onclick="app.goToPgnMove(${
        i + 1
      })">${whiteMove}</span>
                  <span class="${
                    isBlackActive ? "active-move" : ""
                  }" style="flex: 1; cursor: pointer;" onclick="app.goToPgnMove(${
        i + 2
      })">${blackMove}</span>
              </div>`;
    }
    historyElement.innerHTML = html;
    historyElement.scrollTop = historyElement.scrollHeight;

    // Update controls
    document.getElementById(
      "pgn-move-counter"
    ).textContent = `${this.currentPgnMove} / ${totalMoves}`;
    const slider = document.getElementById("pgn-slider");
    slider.max = totalMoves;
    slider.value = this.currentPgnMove;
  }

  goToPgnMove(moveNumber) {
    if (!this.pgnGame) return;
    const totalMoves = this.pgnGame.moves.length;
    this.currentPgnMove = Math.max(0, Math.min(moveNumber, totalMoves));
    this.updatePgnViewer();
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
      const game = await this.api.getGame(gameId);
      // Show game viewer modal or navigate to analysis page
      console.log("Viewing game:", game);
      this.showToast(`Visualizando partida ${game.id}`, "info");
    } catch (error) {
      this.showToast("Erro ao carregar partida", "error");
    }
  }

  async downloadPGN(gameId) {
    try {
      const pgn = await this.api.getPGN(gameId);
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

if (typeof ProfessionalChessboard === "undefined") {
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
      document
        .querySelectorAll(`#${this.board.id} .square`)
        .forEach((square) => {
          square.innerHTML = "";
        });

      // Add pieces to initial position
      Object.entries(this.gamePosition).forEach(([square, pieceData]) => {
        this.placePiece(square, pieceData.piece, pieceData.color);
      });
    }

    setPositionFromFen(fen) {
      // Clear all squares first
      document
        .querySelectorAll(`#${this.board.id} .square`)
        .forEach((square) => {
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
  };
}
