console.log("Testando arena.js");

// ♟️ Arena.js - Lógica corrigida para a página de arena de batalhas

// Garantir que a API esteja disponível
if (!window.api) {
  window.api = new Api();
}

class ArenaManager {
  constructor() {
    this.api = window.api;
    this.currentBattle = null;
    this.battleInterval = null;
    this.chessboard = null;
    this.elements = {
      // Model selectors
      whiteModel: document.getElementById("white-model"),
      blackModel: document.getElementById("black-model"),

      // Battle controls
      startBattleBtn: document.getElementById("start-battle"),

      // Configuration
      opening: document.getElementById("opening"),
      numGames: document.getElementById("num-games"),
      numGamesValue: document.getElementById("num-games-value"),
      realtimeSpeed: document.getElementById("realtime-speed"),
      realtimeSpeedValue: document.getElementById("realtime-speed-value"),

      // Battle status
      battleStatus: document.getElementById("battle-status"),
      progressContainer: document.getElementById("progress-container"),
      progressFill: document.getElementById("progress-fill"),
      progressText: document.getElementById("progress-text"),

      // Chessboard
      arenaChessboard: document.getElementById("arena-chessboard"),
      topModelName: document.getElementById("top-model-name"),
      bottomModelName: document.getElementById("bottom-model-name"),

      // Move list
      moveListContent: document.getElementById("move-list-content"),

      // Results
      resultsCard: document.getElementById("results-card"),
      resultsTable: document.getElementById("results-table"),
      resultsTbody: document.getElementById("results-tbody"),
    };

    console.log("Construtor ArenaManager chamado");
    this.init();
  }

  init() {
    console.log("🏁 Inicializando Arena Manager...");
    this.setupEventListeners();
    this.loadAvailableModels();
    this.initializeChessboard();
    this.updateSliderValues();
    this.updateModelCards();
    console.log("✅ Arena Manager inicializado");
  }

  setupEventListeners() {
    // Sliders para mostrar valores
    if (this.elements.numGames) {
      this.elements.numGames.addEventListener("input", () => {
        if (this.elements.numGamesValue) {
          this.elements.numGamesValue.textContent =
            this.elements.numGames.value;
        }
      });
    }

    if (this.elements.realtimeSpeed) {
      this.elements.realtimeSpeed.addEventListener("input", () => {
        if (this.elements.realtimeSpeedValue) {
          this.elements.realtimeSpeedValue.textContent =
            this.elements.realtimeSpeed.value + "s";
        }
      });
    }

    // Botão de iniciar batalha
    if (this.elements.startBattleBtn) {
      this.elements.startBattleBtn.addEventListener("click", () => {
        console.log(
          "[ArenaManager] Clique no botão Iniciar Batalha (listener)"
        );
        this.showToast("Iniciando batalha...", "info");
        this.startBattle();
      });
    }

    // Botão de torneio
    if (this.elements.startTournamentBtn) {
      this.elements.startTournamentBtn.addEventListener("click", () => {
        console.log(
          "[ArenaManager] Clique no botão Iniciar Torneio (listener)"
        );
        this.showToast("Iniciando torneio...", "info");
        this.startTournament();
      });
    }

    // Seleção de modelos
    if (this.elements.whiteModel && this.elements.blackModel) {
      this.elements.whiteModel.addEventListener("change", () => {
        console.log("[ArenaManager] Troca de modelo das brancas");
        this.updateModelCards();
      });
      this.elements.blackModel.addEventListener("change", () => {
        console.log("[ArenaManager] Troca de modelo das pretas");
        this.updateModelCards();
      });
    }
  }

  updateSliderValues() {
    // Atualizar valores iniciais dos sliders
    if (this.elements.numGames && this.elements.numGamesValue) {
      this.elements.numGamesValue.textContent = this.elements.numGames.value;
    }
    if (this.elements.realtimeSpeed && this.elements.realtimeSpeedValue) {
      this.elements.realtimeSpeedValue.textContent =
        this.elements.realtimeSpeed.value + "s";
    }
  }

  async loadAvailableModels() {
    try {
      console.log("📥 Carregando modelos disponíveis...");
      const response = await this.api.get("/api/arena/models");
      const models = response.models || {};

      this.populateModelSelectors(models);
      this.updateModelCards();
      console.log("✅ Modelos carregados:", Object.keys(models));
    } catch (error) {
      console.error("❌ Erro ao carregar modelos:", error);
      this.showError("Erro ao carregar modelos disponíveis");
    }
  }

  populateModelSelectors(models) {
    const modelList = Object.keys(models).filter((model) => models[model]);

    // Popular selector das brancas
    if (this.elements.whiteModel) {
      this.elements.whiteModel.innerHTML = "";
      modelList.forEach((model) => {
        const option = document.createElement("option");
        option.value = model;
        option.textContent = model;
        this.elements.whiteModel.appendChild(option);
      });
    }

    // Popular selector das pretas
    if (this.elements.blackModel) {
      this.elements.blackModel.innerHTML = "";
      modelList.forEach((model) => {
        const option = document.createElement("option");
        option.value = model;
        option.textContent = model;
        this.elements.blackModel.appendChild(option);
      });

      // Selecionar modelo diferente para as pretas
      if (modelList.length > 1) {
        this.elements.blackModel.selectedIndex = 1;
      }
    }


  updateModelCards() {
    console.log("[ArenaManager] updateModelCards chamado");
    const whiteModelCard = document.getElementById("white-model-card");
    const blackModelCard = document.getElementById("black-model-card");

    if (whiteModelCard && this.elements.whiteModel) {
      const modelName = this.elements.whiteModel.value;
      console.log(
        "[ArenaManager] Atualizando card das brancas para:",
        modelName
      );
      whiteModelCard.querySelector(".model-name").textContent = modelName;
    }

    if (blackModelCard && this.elements.blackModel) {
      const modelName = this.elements.blackModel.value;
      console.log(
        "[ArenaManager] Atualizando card das pretas para:",
        modelName
      );
      blackModelCard.querySelector(".model-name").textContent = modelName;
    }

    // Atualizar nomes no tabuleiro
    if (this.elements.topModelName && this.elements.blackModel) {
      this.elements.topModelName.textContent = this.elements.blackModel.value;
    }
    if (this.elements.bottomModelName && this.elements.whiteModel) {
      this.elements.bottomModelName.textContent =
        this.elements.whiteModel.value;
    }
  }

  initializeChessboard() {
    if (!this.elements.arenaChessboard) {
      console.warn("⚠️ Elemento do tabuleiro não encontrado");
      return;
    }

    try {
      // Criar as 64 casas do tabuleiro
      this.elements.arenaChessboard.innerHTML = "";

      for (let rank = 8; rank >= 1; rank--) {
        for (let file = 0; file < 8; file++) {
          const square = document.createElement("div");
          const fileChar = String.fromCharCode(97 + file); // a-h
          const squareId = `${fileChar}${rank}`;

          const isLight = (rank + file) % 2 !== 0;
          square.className = `square ${isLight ? "light" : "dark"}`;
          square.dataset.square = squareId;

          this.elements.arenaChessboard.appendChild(square);
        }
      }

      this.setupInitialPosition();
      console.log("✅ Tabuleiro inicializado");
    } catch (error) {
      console.error("❌ Erro ao inicializar tabuleiro:", error);
    }
  }

  setupInitialPosition() {
    const initialPosition = {
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

    Object.entries(initialPosition).forEach(([square, piece]) => {
      this.placePiece(square, piece);
    });
  }

  placePiece(squareId, piece) {
    const square = this.elements.arenaChessboard.querySelector(
      `[data-square="${squareId}"]`
    );
    if (square) {
      square.innerHTML = `<div class="piece">${piece}</div>`;
    }
  }

  async startBattle() {
    console.log("Método startBattle chamado");
    const whiteModel = this.elements.whiteModel?.value;
    const blackModel = this.elements.blackModel?.value;
    const opening = this.elements.opening?.value || "1. e4";
    const numGames = parseInt(this.elements.numGames?.value || "1");
    const realtimeSpeed = parseFloat(
      this.elements.realtimeSpeed?.value || "1.0"
    );

    // Validações
    if (!whiteModel || !blackModel) {
      this.showError("Selecione ambos os modelos");
      return;
    }

    if (whiteModel === blackModel) {
      this.showError("Os modelos devem ser diferentes");
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

      console.log(
        "[ArenaManager] Enviando requisição para iniciar batalha:",
        battleConfig
      );

      const response = await this.api.post("/api/arena/battle", battleConfig);

      console.log("[ArenaManager] Resposta do backend:", response);

      if (response.battle_id) {
        this.currentBattle = {
          id: response.battle_id,
          whiteModel: whiteModel,
          blackModel: blackModel,
          numGames: numGames,
          currentGame: 0,
        };

        this.showBattleStatus();
        this.startBattlePolling();
        this.showSuccess("Batalha iniciada!");
      } else {
        throw new Error("Resposta inválida do servidor");
      }
    } catch (error) {
      console.error("[ArenaManager] Erro ao iniciar batalha:", error);
      this.showError("Erro ao iniciar batalha: " + error.message);
    } finally {
      this.hideLoading();
    }
  }


  startBattlePolling() {
    if (this.battleInterval) {
      clearInterval(this.battleInterval);
    }

    this.battleInterval = setInterval(async () => {
      if (!this.currentBattle) {
        clearInterval(this.battleInterval);
        return;
      }

      try {
        const status = await this.api.get("/api/arena/status", {
          battle_id: this.currentBattle.id,
        });

        this.updateBattleStatus(status);

        if (status.status === "finished" || status.status === "error") {
          clearInterval(this.battleInterval);
          this.currentBattle = null;
        }
      } catch (error) {
        console.error("❌ Erro ao verificar status:", error);
        clearInterval(this.battleInterval);
      }
    }, 2000);
  }

  startTournamentPolling() {
    if (this.battleInterval) {
      clearInterval(this.battleInterval);
    }

    this.battleInterval = setInterval(async () => {
      if (!this.currentBattle) {
        clearInterval(this.battleInterval);
        return;
      }

      try {
        const status = await this.api.get("/api/arena/status", {
        });

        this.updateTournamentStatus(status);

        if (status.status === "finished" || status.status === "error") {
          clearInterval(this.battleInterval);
          this.currentBattle = null;
        }
      } catch (error) {
        console.error("❌ Erro ao verificar status do torneio:", error);
        clearInterval(this.battleInterval);
      }
    }, 3000);
  }

  updateBattleStatus(status) {
    if (!status) return;

    // Atualizar barra de progresso
    if (this.elements.progressContainer && this.elements.progressFill) {
      this.elements.progressContainer.style.display = "block";
      const progress =
        status.total_games > 0
          ? (status.current_game / status.total_games) * 100
          : 0;
      this.elements.progressFill.style.width = `${progress}%`;
    }

    if (this.elements.progressText) {
      this.elements.progressText.textContent = `${status.current_game || 0} / ${
        status.total_games || 0
      } partidas`;
    }

    // Atualizar status da batalha
    if (this.elements.battleStatus) {
      const statusContent = `
              <div class="status-icon">
                  <i class="fas fa-chess"></i>
              </div>
              <div class="status-content">
                  <div class="status-title">
                      Batalha em Andamento
                  </div>
                  <div class="status-description">
                      ${status.white || "Brancas"} vs ${
        status.black || "Pretas"
      }
                  </div>
              </div>
          `;
      this.elements.battleStatus.innerHTML = statusContent;
    }

    // Atualizar tabuleiro se houver posição atual
    if (status.current_board) {
      this.updateChessboardFromFEN(status.current_board);
    }

    // Atualizar lista de lances
    if (status.current_moves && this.elements.moveListContent) {
      this.updateMoveList(status.current_moves);
    }

    // Atualizar resultados
    if (status.results && this.elements.resultsTbody) {
      this.updateResultsTable(status.results);
      if (this.elements.resultsCard) {
        this.elements.resultsCard.style.display = "block";
      }
    }
  }

  updateTournamentStatus(status) {
    if (!status) return;

    // Atualizar progresso do torneio
    if (this.elements.progressContainer && this.elements.progressFill) {
      this.elements.progressContainer.style.display = "block";
      const progress =
        status.total_matches > 0
          ? (status.current_match / status.total_matches) * 100
          : 0;
      this.elements.progressFill.style.width = `${progress}%`;
    }

    if (this.elements.progressText) {
      this.elements.progressText.textContent = `${
        status.current_match || 0
      } / ${status.total_matches || 0} confrontos`;
    }

    // Atualizar status
    if (this.elements.battleStatus) {
      const statusContent = `
              <div class="status-icon">
                  <i class="fas fa-trophy"></i>
              </div>
              <div class="status-content">
                  <div class="status-title">
                      Torneio em Andamento
                  </div>
                  <div class="status-description">
                      ${
                        status.models
                          ? status.models.join(" vs ")
                          : "Todos vs Todos"
                      }
                  </div>
              </div>
          `;
      this.elements.battleStatus.innerHTML = statusContent;
    }

    // Atualizar resultados do torneio
    if (status.results && this.elements.resultsTbody) {
      this.updateResultsTable(status.results);
      if (this.elements.resultsCard) {
        this.elements.resultsCard.style.display = "block";
      }
    }
  }

  updateChessboardFromFEN(fen) {
    // Implementação simplificada para atualizar o tabuleiro baseado no FEN
    // Em uma implementação completa, você usaria uma biblioteca como chess.js
    console.log("🏁 Atualizando tabuleiro com FEN:", fen);
  }

  updateMoveList(moves) {
    if (!moves || !this.elements.moveListContent) return;

    if (moves.length === 0) {
      this.elements.moveListContent.innerHTML = `
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

    this.elements.moveListContent.innerHTML = html;
  }

  updateResultsTable(results) {
    if (!results || !this.elements.resultsTbody) return;

    this.elements.resultsTbody.innerHTML = "";

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
      this.elements.resultsTbody.appendChild(row);
    });
  }

  getResultClass(result) {
    if (result === "1-0") return "result-white-win";
    if (result === "0-1") return "result-black-win";
    if (result === "1/2-1/2") return "result-draw";
    return "";
  }

  showBattleStatus() {
    if (this.elements.battleStatus) {
      this.elements.battleStatus.style.display = "block";
    }
    if (this.elements.progressContainer) {
      this.elements.progressContainer.style.display = "block";
    }
  }

  showLoading(message) {
    console.log("⏳", message);
    // Adicionar indicador visual de loading se necessário
  }

  hideLoading() {
    console.log("✅ Loading finalizado");
    // Remover indicador visual de loading se necessário
  }

  showSuccess(message) {
    console.log("✅", message);
    this.showToast(message, "success");
  }

  showError(message) {
    console.error("❌", message);
    this.showToast(message, "error");
  }

  showToast(message, type = "info") {
    // Implementação simples de toast
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 20px;
          border-radius: 8px;
          color: white;
          font-weight: 500;
          z-index: 1000;
          opacity: 0;
          transition: opacity 0.3s ease;
      `;

    if (type === "success") {
      toast.style.backgroundColor = "#10b981";
    } else if (type === "error") {
      toast.style.backgroundColor = "#ef4444";
    } else {
      toast.style.backgroundColor = "#3b82f6";
    }

    document.body.appendChild(toast);

    // Fade in
    setTimeout(() => {
      toast.style.opacity = "1";
    }, 100);

    // Fade out e remover
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", () => {
  console.log("Arena.js carregado!");
  if (document.getElementById("start-battle")) {
    window.arenaManager = new ArenaManager();
    console.log("ArenaManager inicializado!");
  }
});

// Compatibilidade com o código legado
window.startBattle = () => {
  if (window.arenaManager) {
    window.arenaManager.startBattle();
  }
};

window.startTournament = () => {
  if (window.arenaManager) {
    window.arenaManager.startTournament();
  }
};

// ♟️ Complemento JavaScript para Arena - Garantir que o tabuleiro apareça
// Adicionar este código no final do arena.js existente ou como arquivo separado

// Função para forçar a exibição do tabuleiro quando uma batalha começar
function showChessboard() {
  const chessboardContainer = document.getElementById(
    "arena-chessboard-container"
  );
  const moveList = document.getElementById("arena-move-list");

  if (chessboardContainer) {
    chessboardContainer.style.display = "flex";
    console.log("✅ Tabuleiro exibido");
  }

  if (moveList) {
    moveList.style.display = "block";
    console.log("✅ Lista de lances exibida");
  }
}

// Função para ocultar o tabuleiro quando não há batalha
function hideChessboard() {
  const chessboardContainer = document.getElementById(
    "arena-chessboard-container"
  );
  const moveList = document.getElementById("arena-move-list");

  if (chessboardContainer) {
    chessboardContainer.style.display = "none";
  }

  if (moveList) {
    moveList.style.display = "none";
  }
}

// Garantir que o tabuleiro seja inicializado corretamente
document.addEventListener("DOMContentLoaded", function () {
  // Verificar se estamos na página da arena
  if (!document.getElementById("start-battle")) {
    return;
  }

  console.log("🏁 Inicializando complemento da arena...");

  // Mostrar tabuleiro por padrão para teste
  setTimeout(() => {
    showChessboard();
  }, 1000);

  // Sobrescrever a função startBattle se o ArenaManager não estiver disponível
  if (!window.arenaManager && !window.startBattle) {
    window.startBattle = function () {
      console.log("🚀 Iniciando batalha (fallback)...");

      const whiteModel =
        document.getElementById("white-model")?.value || "GPT-4o";
      const blackModel =
        document.getElementById("black-model")?.value || "Gemini-Pro";

      if (whiteModel === blackModel) {
        alert("Os modelos devem ser diferentes!");
        return;
      }

      // Mostrar status de batalha
      updateBattleStatus("Batalha iniciada!", `${whiteModel} vs ${blackModel}`);

      // Mostrar tabuleiro
      showChessboard();

      // Simular uma partida para teste
      simulateGameForTesting(whiteModel, blackModel);
    };
  }
});

// Função para atualizar o status da batalha
function updateBattleStatus(title, description) {
  const battleStatus = document.getElementById("battle-status");
  if (battleStatus) {
    battleStatus.innerHTML = `
          <div class="status-icon">
              <i class="fas fa-chess"></i>
          </div>
          <div class="status-content">
              <div class="status-title">${title}</div>
              <div class="status-description">${description}</div>
          </div>
      `;
    battleStatus.style.display = "flex";
  }
}

// Função para atualizar os nomes dos modelos no tabuleiro
function updateModelNames(whiteModel, blackModel) {
  const topModelName = document.getElementById("top-model-name");
  const bottomModelName = document.getElementById("bottom-model-name");

  if (topModelName) {
    topModelName.textContent = blackModel; // Pretas ficam em cima
  }

  if (bottomModelName) {
    bottomModelName.textContent = whiteModel; // Brancas ficam em baixo
  }
}

// Função para colocar uma peça no tabuleiro
function placePieceOnBoard(square, piece) {
  const squareElement = document.querySelector(`[data-square="${square}"]`);
  if (squareElement) {
    squareElement.innerHTML = `<div class="piece">${piece}</div>`;
  }
}

// Função para limpar o tabuleiro
function clearBoard() {
  const squares = document.querySelectorAll(".arena-chessboard .square");
  squares.forEach((square) => {
    square.innerHTML = "";
    square.classList.remove("last-move");
  });
}

// Função para configurar posição inicial do tabuleiro
function setupInitialPosition() {
  console.log("🏁 Configurando posição inicial do tabuleiro...");

  const initialPosition = {
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

  // Limpar tabuleiro primeiro
  clearBoard();

  // Colocar peças
  Object.entries(initialPosition).forEach(([square, piece]) => {
    placePieceOnBoard(square, piece);
  });

  console.log("✅ Posição inicial configurada");
}

// Função para simular uma partida (apenas para teste)
function simulateGameForTesting(whiteModel, blackModel) {
  console.log("🎮 Simulando partida para teste...");

  updateModelNames(whiteModel, blackModel);
  setupInitialPosition();

  // Simular alguns lances
  const sampleMoves = [
    { from: "e2", to: "e4", piece: "♙" },
    { from: "e7", to: "e5", piece: "♟" },
    { from: "g1", to: "f3", piece: "♘" },
    { from: "b8", to: "c6", piece: "♞" },
  ];

  let moveIndex = 0;
  const moveInterval = setInterval(() => {
    if (moveIndex >= sampleMoves.length) {
      clearInterval(moveInterval);
      updateBattleStatus("Partida Finalizada", "Resultado: 1-0 (teste)");
      return;
    }

    const move = sampleMoves[moveIndex];

    // Remover peça da casa de origem
    const fromSquare = document.querySelector(`[data-square="${move.from}"]`);
    if (fromSquare) {
      fromSquare.innerHTML = "";
    }

    // Colocar peça na casa de destino
    placePieceOnBoard(move.to, move.piece);

    // Destacar último lance
    document.querySelectorAll(".arena-chessboard .square").forEach((sq) => {
      sq.classList.remove("last-move");
    });
    const fromEl = document.querySelector(`[data-square="${move.from}"]`);
    const toEl = document.querySelector(`[data-square="${move.to}"]`);
    if (fromEl) fromEl.classList.add("last-move");
    if (toEl) toEl.classList.add("last-move");

    // Atualizar lista de lances
    updateMoveList(moveIndex + 1, sampleMoves.slice(0, moveIndex + 1));

    moveIndex++;
  }, 2000);
}

// Função para atualizar a lista de lances
function updateMoveList(currentMove, moves) {
  const moveListContent = document.getElementById("move-list-content");
  if (!moveListContent) return;

  let html = "";
  for (let i = 0; i < moves.length; i += 2) {
    const moveNumber = Math.floor(i / 2) + 1;
    const whiteMove = moves[i] ? `${moves[i].from}-${moves[i].to}` : "";
    const blackMove = moves[i + 1]
      ? `${moves[i + 1].from}-${moves[i + 1].to}`
      : "";

    html += `
          <div class="move-pair">
              <span class="move-number">${moveNumber}.</span>
              <span class="move white">${whiteMove}</span>
              <span class="move black">${blackMove}</span>
          </div>
      `;
  }

  moveListContent.innerHTML = html;
}

// Garantir que o tabuleiro seja criado se não existir
function ensureChessboardExists() {
  const chessboard = document.getElementById("arena-chessboard");
  if (!chessboard) {
    console.warn("⚠️ Tabuleiro não encontrado no DOM");
    return false;
  }

  // Verificar se o tabuleiro tem as 64 casas
  const squares = chessboard.querySelectorAll(".square");
  if (squares.length !== 64) {
    console.log("🔧 Criando casas do tabuleiro...");

    chessboard.innerHTML = "";

    // Criar as 64 casas
    for (let rank = 8; rank >= 1; rank--) {
      for (let file = 0; file < 8; file++) {
        const square = document.createElement("div");
        const fileChar = String.fromCharCode(97 + file); // a-h
        const squareId = `${fileChar}${rank}`;

        const isLight = (rank + file) % 2 !== 0;
        square.className = `square ${isLight ? "light" : "dark"}`;
        square.dataset.square = squareId;

        chessboard.appendChild(square);
      }
    }

    console.log("✅ Tabuleiro criado com 64 casas");
  }

  return true;
}

// Expor funções globalmente para debug
window.arenaDebug = {
  showChessboard,
  hideChessboard,
  setupInitialPosition,
  clearBoard,
  simulateGameForTesting,
  ensureChessboardExists,
};
