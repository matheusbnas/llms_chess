// ♟️ Arena Manager - Professional Chess Arena with FastAPI Integration

class ArenaManager {
  constructor() {
    this.api = window.api;
    this.currentBattle = null;
    this.battlePollingInterval = null;
    this.chessboard = null;
    this.wsConnected = false;
    this.moveExplanations = [];

    // DOM elements cache
    this.elements = {};

    console.log("🏗️ ArenaManager constructor called");
  }

  async init() {
    console.log("🚀 Initializing Arena Manager...");

    // Cache DOM elements
    this.cacheElements();

    // Setup event listeners
    this.setupEventListeners();

    // Load available models
    await this.loadAvailableModels();

    // Initialize chessboard
    this.initializeChessboard();

    // Initialize UI state
    this.initializeUI();

    console.log("✅ Arena Manager initialized successfully");
  }

  cacheElements() {
    const elementIds = [
      "white-model",
      "black-model",
      "start-battle",
      "opening",
      "num-games",
      "num-games-value",
      "realtime-speed",
      "realtime-speed-value",
      "battle-status",
      "progress-container",
      "progress-fill",
      "progress-text",
      "arena-chessboard",
      "top-model-name",
      "bottom-model-name",
      "move-list-content",
      "results-card",
      "results-tbody",
      "white-model-card",
      "black-model-card",
    ];

    elementIds.forEach((id) => {
      this.elements[id] = document.getElementById(id);
    });

    console.log("📦 DOM elements cached");
  }

  setupEventListeners() {
    // Slider value updates
    if (this.elements["num-games"]) {
      this.elements["num-games"].addEventListener("input", (e) => {
        if (this.elements["num-games-value"]) {
          this.elements["num-games-value"].textContent = e.target.value;
        }
      });
    }

    if (this.elements["realtime-speed"]) {
      this.elements["realtime-speed"].addEventListener("input", (e) => {
        if (this.elements["realtime-speed-value"]) {
          this.elements["realtime-speed-value"].textContent =
            e.target.value + "s";
        }
      });
    }

    // Start battle button
    if (this.elements["start-battle"]) {
      this.elements["start-battle"].addEventListener("click", () => {
        console.log("🚀 Start Battle button clicked");
        this.startBattle();
      });
    }

    // Model selection changes
    if (this.elements["white-model"]) {
      this.elements["white-model"].addEventListener("change", () => {
        this.updateModelCards();
      });
    }

    if (this.elements["black-model"]) {
      this.elements["black-model"].addEventListener("change", () => {
        this.updateModelCards();
      });
    }

    console.log("👂 Event listeners setup complete");
  }

  async loadAvailableModels() {
    try {
      console.log("📥 Loading available models...");

      const response = await this.api.getAvailableModels();
      const models = response.models || {};

      this.populateModelSelectors(models);
      this.updateModelCards();

      console.log("✅ Models loaded:", Object.keys(models));

      if (Object.keys(models).length === 0) {
        this.showToast("Nenhum modelo disponível", "warning");
      }
    } catch (error) {
      console.error("❌ Error loading models:", error);
      this.showToast("Erro ao carregar modelos", "error");

      // Use fallback models for development
      this.populateModelSelectors(this.getFallbackModels());
    }
  }

  getFallbackModels() {
    return {
      "GPT-4o": { active: true, rating: 1850 },
      "GPT-4-Turbo": { active: true, rating: 1780 },
      "Gemini-Pro": { active: true, rating: 1750 },
      "Claude-3.5-Sonnet": { active: true, rating: 1820 },
      "Deepseek-R1": { active: true, rating: 1680 },
    };
  }

  populateModelSelectors(models) {
    const activeModels = Object.entries(models).filter(
      ([name, config]) => config.active
    );

    // Populate white model selector
    if (this.elements["white-model"]) {
      this.elements["white-model"].innerHTML = "";
      activeModels.forEach(([name, config]) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = `${name} (${config.rating || "???"})`;
        this.elements["white-model"].appendChild(option);
      });
    }

    // Populate black model selector
    if (this.elements["black-model"]) {
      this.elements["black-model"].innerHTML = "";
      activeModels.forEach(([name, config]) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = `${name} (${config.rating || "???"})`;
        this.elements["black-model"].appendChild(option);
      });

      // Select different model for black
      if (activeModels.length > 1) {
        this.elements["black-model"].selectedIndex = 1;
      }
    }
  }

  updateModelCards() {
    if (this.elements["white-model-card"] && this.elements["white-model"]) {
      const whiteModel = this.elements["white-model"].value;
      const nameEl =
        this.elements["white-model-card"].querySelector(".model-name");
      if (nameEl) nameEl.textContent = whiteModel;
    }

    if (this.elements["black-model-card"] && this.elements["black-model"]) {
      const blackModel = this.elements["black-model"].value;
      const nameEl =
        this.elements["black-model-card"].querySelector(".model-name");
      if (nameEl) nameEl.textContent = blackModel;
    }

    // Update board player names
    if (this.elements["top-model-name"] && this.elements["black-model"]) {
      this.elements["top-model-name"].textContent =
        this.elements["black-model"].value;
    }

    if (this.elements["bottom-model-name"] && this.elements["white-model"]) {
      this.elements["bottom-model-name"].textContent =
        this.elements["white-model"].value;
    }
  }

  initializeChessboard() {
    if (!this.elements["arena-chessboard"]) {
      console.warn("⚠️ Chessboard container not found");
      return;
    }

    try {
      // Check if chessboard.js is available
      if (typeof Chessboard === "undefined") {
        console.error("❌ Chessboard.js library not loaded");
        this.createFallbackBoard();
        return;
      }

      // Initialize professional chessboard
      this.chessboard = new ProfessionalChessboard("arena-chessboard", {
        draggable: false, // Arena is view-only
        interactive: false,
        showNotation: true,
        boardTheme: "brown",
        onMove: (move, fen) => {
          console.log("♟️ Move made:", move.san);
        },
        onGameEnd: (result) => {
          console.log("🏁 Game ended:", result);
        },
      });

      console.log("✅ Professional chessboard initialized");
    } catch (error) {
      console.error("❌ Error initializing chessboard:", error);
      this.createFallbackBoard();
    }
  }

  createFallbackBoard() {
    console.log("🔧 Creating fallback chessboard...");

    const boardContainer = this.elements["arena-chessboard"];
    if (!boardContainer) return;

    boardContainer.innerHTML = "";
    boardContainer.style.cssText = `
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          width: 400px;
          height: 400px;
          border: 2px solid #8b4513;
          margin: 0 auto;
      `;

    // Create 64 squares
    for (let rank = 8; rank >= 1; rank--) {
      for (let file = 0; file < 8; file++) {
        const square = document.createElement("div");
        const isLight = (rank + file) % 2 !== 0;

        square.style.cssText = `
                  background-color: ${isLight ? "#f0d9b5" : "#b58863"};
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 2rem;
                  user-select: none;
              `;

        const fileChar = String.fromCharCode(97 + file);
        square.dataset.square = `${fileChar}${rank}`;

        boardContainer.appendChild(square);
      }
    }

    this.setupFallbackPosition();
  }

  setupFallbackPosition() {
    const pieces = {
      a8: "♜",
      b8: "♞",
      c8: "♝",
      d8: "♛",
      e8: "♚",
      f8: "♝",
      g8: "♞",
      h8: "♜",
      a7: "♟",
      b7: "♟",
      c7: "♟",
      d7: "♟",
      e7: "♟",
      f7: "♟",
      g7: "♟",
      h7: "♟",
      a2: "♙",
      b2: "♙",
      c2: "♙",
      d2: "♙",
      e2: "♙",
      f2: "♙",
      g2: "♙",
      h2: "♙",
      a1: "♖",
      b1: "♘",
      c1: "♗",
      d1: "♕",
      e1: "♔",
      f1: "♗",
      g1: "♘",
      h1: "♖",
    };

    Object.entries(pieces).forEach(([square, piece]) => {
      const squareEl = document.querySelector(`[data-square="${square}"]`);
      if (squareEl) {
        squareEl.textContent = piece;
      }
    });
  }

  initializeUI() {
    // Set initial slider values
    if (this.elements["num-games"] && this.elements["num-games-value"]) {
      this.elements["num-games-value"].textContent =
        this.elements["num-games"].value;
    }

    if (
      this.elements["realtime-speed"] &&
      this.elements["realtime-speed-value"]
    ) {
      this.elements["realtime-speed-value"].textContent =
        this.elements["realtime-speed"].value + "s";
    }

    // Hide results initially
    if (this.elements["results-card"]) {
      this.elements["results-card"].style.display = "none";
    }

    // Hide progress initially
    if (this.elements["progress-container"]) {
      this.elements["progress-container"].style.display = "none";
    }
  }

  async startBattle() {
    const whiteModel = this.elements["white-model"]?.value;
    const blackModel = this.elements["black-model"]?.value;
    const opening = this.elements["opening"]?.value || "1. e4";
    const numGames = parseInt(this.elements["num-games"]?.value || "1");
    const realtimeSpeed = parseFloat(
      this.elements["realtime-speed"]?.value || "1.0"
    );

    // Validation
    if (!whiteModel || !blackModel) {
      this.showToast("Selecione ambos os modelos", "warning");
      return;
    }

    if (whiteModel === blackModel) {
      this.showToast("Os modelos devem ser diferentes", "warning");
      return;
    }

    try {
      this.showLoading("Iniciando batalha...");

      const battleConfig = {
        white_model: whiteModel,
        black_model: blackModel,
        opening: opening,
        num_games: numGames,
        realtime_speed: realtimeSpeed,
      };

      console.log("🚀 Starting battle with config:", battleConfig);

      const response = await this.api.startBattle(battleConfig);

      if (response.battle_id) {
        this.currentBattle = {
          id: response.battle_id,
          whiteModel: whiteModel,
          blackModel: blackModel,
          numGames: numGames,
          currentGame: 0,
        };

        this.showBattleInProgress();
        this.startBattlePolling();
        this.showToast("Batalha iniciada!", "success");

        // Reset board and show it
        this.resetChessboard();
        this.showArenaBoard();
      } else {
        throw new Error("Resposta inválida do servidor");
      }
    } catch (error) {
      console.error("❌ Error starting battle:", error);
      this.showToast(`Erro ao iniciar batalha: ${error.message}`, "error");
    } finally {
      this.hideLoading();
    }
  }

  startBattlePolling() {
    if (this.battlePollingInterval) {
      clearInterval(this.battlePollingInterval);
    }

    this.battlePollingInterval = setInterval(async () => {
      if (!this.currentBattle) {
        clearInterval(this.battlePollingInterval);
        return;
      }

      try {
        const status = await this.api.getBattleStatus(this.currentBattle.id);
        this.updateBattleStatus(status);

        if (status.status === "finished" || status.status === "error") {
          clearInterval(this.battlePollingInterval);
          this.currentBattle = null;
        }
      } catch (error) {
        console.error("❌ Error polling battle status:", error);
        clearInterval(this.battlePollingInterval);
      }
    }, 2000);
  }

  updateBattleStatus(status) {
    if (!status) return;

    console.log("📊 Updating battle status:", status);

    // Update progress bar
    this.updateProgressBar(status);

    // Update battle status display
    this.updateBattleStatusDisplay(status);

    // Update chessboard
    if (status.current_board) {
      this.updateChessboard(status.current_board);
    }

    // Update move list
    if (status.current_moves) {
      this.updateMoveList(status.current_moves);
    }

    // Update results table
    if (status.results) {
      this.updateResultsTable(status.results);
    }
  }

  updateProgressBar(status) {
    if (!this.elements["progress-container"] || !this.elements["progress-fill"])
      return;

    this.elements["progress-container"].style.display = "block";

    const progress =
      status.total_games > 0
        ? (status.current_game / status.total_games) * 100
        : 0;

    this.elements["progress-fill"].style.width = `${progress}%`;

    if (this.elements["progress-text"]) {
      this.elements["progress-text"].textContent = `${
        status.current_game || 0
      } / ${status.total_games || 0} partidas`;
    }
  }

  updateBattleStatusDisplay(status) {
    if (!this.elements["battle-status"]) return;

    let statusTitle = "Batalha em Andamento";
    let statusIcon = "fas fa-chess";

    if (status.status === "finished") {
      statusTitle = "Batalha Finalizada";
      statusIcon = "fas fa-flag-checkered";
    } else if (status.status === "error") {
      statusTitle = "Erro na Batalha";
      statusIcon = "fas fa-exclamation-triangle";
    }

    this.elements["battle-status"].innerHTML = `
          <div class="status-icon">
              <i class="${statusIcon}"></i>
          </div>
          <div class="status-content">
              <div class="status-title">${statusTitle}</div>
              <div class="status-description">
                  ${status.white_model || "Brancas"} vs ${
      status.black_model || "Pretas"
    }
              </div>
          </div>
      `;

    this.elements["battle-status"].style.display = "flex";
  }

  updateChessboard(fen) {
    if (this.chessboard && this.chessboard.setPosition) {
      this.chessboard.setPosition(fen);
    } else if (this.elements["arena-chessboard"]) {
      // Fallback: just log the FEN
      console.log("📋 Board position (FEN):", fen);
    }
  }

  updateMoveList(moves) {
    if (!this.elements["move-list-content"]) return;

    if (!moves || moves.length === 0) {
      this.elements["move-list-content"].innerHTML = `
              <div class="empty-moves">
                  <i class="fas fa-chess-pawn"></i>
                  <p>Aguardando lances</p>
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
              <div class="move-pair">
                  <span class="move-number">${moveNumber}.</span>
                  <span class="white-move">${whiteMove}</span>
                  <span class="black-move">${blackMove}</span>
              </div>
          `;
    }

    this.elements["move-list-content"].innerHTML = html;
    this.elements["move-list-content"].scrollTop =
      this.elements["move-list-content"].scrollHeight;
  }

  updateResultsTable(results) {
    if (!this.elements["results-tbody"]) return;

    this.elements["results-tbody"].innerHTML = "";

    results.forEach((result, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
              <td>${index + 1}</td>
              <td>${result.white || "-"}</td>
              <td>${result.black || "-"}</td>
              <td>
                  <span class="result-badge ${this.getResultClass(
                    result.result
                  )}">
                      ${result.result || "-"}
                  </span>
              </td>
              <td>${result.moves || "-"}</td>
              <td>${result.duration || "-"}</td>
          `;
      this.elements["results-tbody"].appendChild(row);
    });

    if (this.elements["results-card"]) {
      this.elements["results-card"].style.display = "block";
    }
  }

  getResultClass(result) {
    switch (result) {
      case "1-0":
        return "result-white-win";
      case "0-1":
        return "result-black-win";
      case "1/2-1/2":
        return "result-draw";
      default:
        return "";
    }
  }

  handleBattleUpdate(data) {
    if (data.battle_state) {
      this.updateBattleStatus(data.battle_state);
    }

    if (data.current_board) {
      this.updateChessboard(data.current_board);
    }

    if (data.current_moves) {
      this.updateMoveList(data.current_moves);
    }
  }

  handleBattleFinished(data) {
    this.showToast("Batalha finalizada!", "success");

    if (data.battle_state) {
      this.updateBattleStatus(data.battle_state);
    }

    this.currentBattle = null;

    if (this.battlePollingInterval) {
      clearInterval(this.battlePollingInterval);
    }
  }

  handleBattleError(data) {
    this.showToast(`Erro na batalha: ${data.error}`, "error");
    this.currentBattle = null;

    if (this.battlePollingInterval) {
      clearInterval(this.battlePollingInterval);
    }
  }

  showMoveExplanation(move, explanation) {
    console.log(`💭 ${move}: ${explanation}`);

    // Store explanation
    this.moveExplanations.push({ move, explanation, timestamp: Date.now() });

    // Show as toast
    this.showToast(`${move}: ${explanation}`, "info", 5000);
  }

  showBattleInProgress() {
    // Enable battle status display
    if (this.elements["battle-status"]) {
      this.elements["battle-status"].style.display = "flex";
    }

    // Show progress container
    if (this.elements["progress-container"]) {
      this.elements["progress-container"].style.display = "block";
    }
  }

  resetChessboard() {
    if (this.chessboard && this.chessboard.startPosition) {
      this.chessboard.startPosition();
    } else {
      this.setupFallbackPosition();
    }
  }

  showArenaBoard() {
    const chessboardContainer = document.getElementById(
      "arena-chessboard-container"
    );
    const moveList = document.getElementById("arena-move-list");

    if (chessboardContainer) {
      chessboardContainer.style.display = "flex";
    }

    if (moveList) {
      moveList.style.display = "block";
    }
  }

  showLoading(message = "Carregando...") {
    console.log("⏳ Loading:", message);
    // You can implement a loading overlay here
  }

  hideLoading() {
    console.log("✅ Loading finished");
    // Hide loading overlay
  }

  showToast(message, type = "info", duration = 3000) {
    if (typeof showToast === "function") {
      showToast(message, type, duration);
    } else {
      console.log(`Toast (${type}): ${message}`);
    }
  }

  destroy() {
    if (this.battlePollingInterval) {
      clearInterval(this.battlePollingInterval);
    }

    if (this.chessboard && this.chessboard.destroy) {
      this.chessboard.destroy();
    }

    this.currentBattle = null;
    this.elements = {};

    console.log("🧹 ArenaManager destroyed");
  }
}

// Initialize Arena Manager
function initializeArena() {
  console.log("🎮 Initializing Arena...");

  // Wait for DOM to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      window.arenaManager = new ArenaManager();
      window.arenaManager.init();
    });
  } else {
    window.arenaManager = new ArenaManager();
    window.arenaManager.init();
  }
}

// Make functions globally available
window.ArenaManager = ArenaManager;
window.initializeArena = initializeArena;

// Auto-initialize if we're on the arena page
if (document.getElementById("start-battle")) {
  initializeArena();
}
