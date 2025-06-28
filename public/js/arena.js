// Arena.js - Lógica para a página de visualização de partidas

import { Api } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  // Early exit if required elements are not on the page
  if (!document.getElementById("arena-matchup-select")) {
    return;
  }

  const arena = {
    api: new Api(),
    pgnViewer: null,
    elements: {
      matchupSelect: document.getElementById("arena-matchup-select"),
      gameSelect: document.getElementById("arena-game-select"),
      loadGameBtn: document.getElementById("arena-load-game-btn"),
      mainContent: document.getElementById("arena-main-content"),
      loadingOverlay: document.getElementById("arena-loading-overlay"),
      whitePlayerName: document.getElementById("white-player-name"),
      blackPlayerName: document.getElementById("black-player-name"),
      gameResult: document.getElementById("game-result-display"),
      chessboard: document.getElementById("arena-chessboard"),
      movesList: document.getElementById("arena-moves-list"),
      gameDetailsList: document.getElementById("game-details-list"),
      positionSlider: document.getElementById("arena-position-slider"),
      currentPositionDisplay: document.getElementById(
        "current-position-display"
      ),
    },
    state: {
      matchups: [],
      games: [],
      currentPgn: null,
      isLoading: false,
    },
  };

  initializeArena(arena);
});

async function initializeArena(arena) {
  console.log("⚔️ Initializing Arena...");
  setupEventListeners(arena);

  try {
    const matchups = await arena.api.listMatchups();
    arena.state.matchups = matchups;
    populateMatchupSelector(arena);
    console.log("✅ Matchups loaded");
  } catch (error) {
    console.error("❌ Failed to load matchups", error);
    arena.elements.matchupSelect.innerHTML =
      "<option>Erro ao carregar</option>";
  }
}

function setupEventListeners(arena) {
  const { elements } = arena;

  elements.matchupSelect.addEventListener("change", () =>
    handleMatchupChange(arena)
  );
  elements.gameSelect.addEventListener("change", () => handleGameChange(arena));
  elements.loadGameBtn.addEventListener("click", () => loadSelectedGame(arena));

  // PGN navigation controls
  document
    .getElementById("arena-pgn-start")
    ?.addEventListener("click", () => arena.pgnViewer?.goToMove(0));
  document
    .getElementById("arena-pgn-back")
    ?.addEventListener("click", () => arena.pgnViewer?.previousMove());
  document
    .getElementById("arena-pgn-next")
    ?.addEventListener("click", () => arena.pgnViewer?.nextMove());
  document
    .getElementById("arena-pgn-end")
    ?.addEventListener("click", () => arena.pgnViewer?.goToMove("end"));
  document
    .getElementById("arena-pgn-flip")
    ?.addEventListener("click", () => arena.pgnViewer?.flipBoard());

  const playBtn = document.getElementById("arena-pgn-play");
  if (playBtn) {
    playBtn.addEventListener("click", () => {
      const isPlaying = arena.pgnViewer?.toggleAutoPlay(3000);
      playBtn.innerHTML = isPlaying
        ? '<i class="fas fa-pause"></i>'
        : '<i class="fas fa-play"></i>';
    });
  }

  elements.positionSlider.addEventListener("input", (e) => {
    arena.pgnViewer?.goToMove(parseInt(e.target.value, 10));
  });
}

function populateMatchupSelector(arena) {
  const { matchupSelect } = arena.elements;
  matchupSelect.innerHTML = '<option value="">Selecione um confronto</option>';
  arena.state.matchups.forEach((matchup) => {
    const option = new Option(matchup.replace(/ vs /g, " vs. "), matchup);
    matchupSelect.add(option);
  });
}

async function handleMatchupChange(arena) {
  const { matchupSelect, gameSelect, loadGameBtn } = arena.elements;
  const selectedMatchup = matchupSelect.value;

  gameSelect.innerHTML = '<option value="">Carregando partidas...</option>';
  gameSelect.disabled = true;
  loadGameBtn.disabled = true;

  if (!selectedMatchup) {
    gameSelect.innerHTML = '<option value="">Selecione um confronto</option>';
    return;
  }

  try {
    const games = await arena.api.listGamesInMatchup(selectedMatchup);
    arena.state.games = games;

    gameSelect.innerHTML = '<option value="">Selecione uma partida</option>';
    games.forEach((game, index) => {
      const gameName = `Partida ${index + 1} (${game.replace(".pgn", "")})`;
      const option = new Option(gameName, game);
      gameSelect.add(option);
    });

    gameSelect.disabled = false;
  } catch (error) {
    console.error(`❌ Failed to load games for ${selectedMatchup}`, error);
    gameSelect.innerHTML = "<option>Erro ao carregar</option>";
  }
}

function handleGameChange(arena) {
  const { gameSelect, loadGameBtn } = arena.elements;
  if (gameSelect.value) {
    loadGameBtn.disabled = false;
  } else {
    loadGameBtn.disabled = true;
  }
}

function setLoadingState(arena, isLoading) {
  arena.state.isLoading = isLoading;
  arena.elements.loadingOverlay.style.display = isLoading ? "flex" : "none";
  arena.elements.loadGameBtn.disabled = isLoading;
}

async function loadSelectedGame(arena) {
  const { matchupSelect, gameSelect } = arena.elements;
  const matchup = matchupSelect.value;
  const gameFile = gameSelect.value;

  if (!matchup || !gameFile || arena.state.isLoading) return;

  setLoadingState(arena, true);

  try {
    const pgnData = await arena.api.getPgnData(matchup, gameFile);
    if (!pgnData || !pgnData.pgn) {
      throw new Error("Dados da partida inválidos.");
    }
    arena.state.currentPgn = pgnData;

    renderGame(arena);
  } catch (error) {
    console.error("❌ Failed to load PGN data", error);
    alert(
      "Erro ao carregar a partida. Verifique o console para mais detalhes."
    );
  } finally {
    setLoadingState(arena, false);
  }
}

function renderGame(arena) {
  const { elements, state } = arena;
  const { headers } = state.currentPgn;

  // Show main content
  elements.mainContent.style.display = "block";

  // Update player names and result
  elements.whitePlayerName.textContent = headers.White || "Brancas";
  elements.blackPlayerName.textContent = headers.Black || "Pretas";
  elements.gameResult.textContent = headers.Result || "*";

  // Initialize PGN Viewer
  if (!arena.pgnViewer) {
    arena.pgnViewer = new PgnViewer({
      element: elements.chessboard,
      pgn: state.currentPgn.pgn,
      movesElement: elements.movesList,
      showCoordinates: true,
      showFEN: false,
      theme: "default",
    });
  } else {
    arena.pgnViewer.loadPgn(state.currentPgn.pgn);
  }

  // Update UI based on viewer state
  updateOnMove(arena);

  // Attach listener for move changes
  arena.pgnViewer.on("move", () => updateOnMove(arena));

  // Update game details panel
  renderGameDetails(arena);
}

function updateOnMove(arena) {
  const { pgnViewer, elements } = arena;
  const { positionSlider, currentPositionDisplay } = elements;

  const currentMove = pgnViewer.getCurrentMoveNumber();
  const totalMoves = pgnViewer.getTotalMoves();

  positionSlider.max = totalMoves;
  positionSlider.value = currentMove;
  currentPositionDisplay.textContent = `Lance ${currentMove} / ${totalMoves}`;
}

function renderGameDetails(arena) {
  const { gameDetailsList } = arena.elements;
  const { headers } = arena.state.currentPgn;

  gameDetailsList.innerHTML = ""; // Clear previous details

  const details = {
    Evento: headers.Event || "N/A",
    Site: headers.Site || "N/A",
    Data: headers.Date || "N/A",
    Rodada: headers.Round || "N/A",
    Abertura: headers.Opening || "Desconhecida",
    ECO: headers.ECO || "N/A",
  };

  for (const [key, value] of Object.entries(details)) {
    if (value && value !== "N/A" && value !== "?") {
      const item = document.createElement("div");
      item.className = "detail-item";
      item.innerHTML = `<span class="detail-label">${key}:</span> <span class="detail-value">${value}</span>`;
      gameDetailsList.appendChild(item);
    }
  }
}

async function loadArenaConfig() {
  const models = await api.getAvailableModels();
  renderModelSelectors(models);
}

async function startBattle(config) {
  setLoading(true);
  try {
    const result = await api.playGameRealtime(config);
    renderBattleResult(result);
  } catch (error) {
    showError("Erro ao iniciar batalha: " + error.message);
  } finally {
    setLoading(false);
  }
}

// ♟️ Arena de Batalha LLMs - JS
// Requer que o arquivo api.js já esteja carregado e a classe Api disponível

(function () {
  // Instância da API
  const api = window.api || new Api();

  // Elementos DOM
  const whiteModelSelect = document.getElementById("white-model");
  const blackModelSelect = document.getElementById("black-model");
  const openingSelect = document.getElementById("opening");
  const numGamesSlider = document.getElementById("num-games");
  const numGamesValue = document.getElementById("num-games-value");
  const realtimeSpeedSlider = document.getElementById("realtime-speed");
  const realtimeSpeedValue = document.getElementById("realtime-speed-value");
  const startBattleBtn = document.getElementById("start-battle");
  const startRealtimeBattleBtn = document.getElementById(
    "start-realtime-battle"
  );
  const tournamentModeCheckbox = document.getElementById("tournament-mode");
  const tournamentConfig = document.getElementById("tournament-config");
  const battleConfig = document.getElementById("battle-config");
  const tournamentModelsSelect = document.getElementById("tournament-models");
  const gamesPerPairSlider = document.getElementById("games-per-pair");
  const gamesPerPairValue = document.getElementById("games-per-pair-value");
  const startTournamentBtn = document.getElementById("start-tournament");
  const battleStatusDiv = document.getElementById("battle-status");
  const progressBar = document.getElementById("battle-progress");
  const progressText = document.getElementById("progress-text");
  const resultsTableBody = document.querySelector("#results-table tbody");
  const savedGamesList = document.getElementById("saved-games-list");

  // Atualiza valores dos sliders
  numGamesSlider.addEventListener("input", () => {
    numGamesValue.textContent = numGamesSlider.value;
  });
  realtimeSpeedSlider.addEventListener("input", () => {
    realtimeSpeedValue.textContent = realtimeSpeedSlider.value;
  });
  gamesPerPairSlider.addEventListener("input", () => {
    gamesPerPairValue.textContent = gamesPerPairSlider.value;
  });

  // Alterna entre modo torneio e individual
  tournamentModeCheckbox.addEventListener("change", () => {
    if (tournamentModeCheckbox.checked) {
      tournamentConfig.style.display = "block";
      battleConfig.style.display = "none";
    } else {
      tournamentConfig.style.display = "none";
      battleConfig.style.display = "block";
    }
  });

  // Popular dropdowns de modelos
  async function loadModels() {
    try {
      const data = await api.getArenaModels();
      const models = data.models || [];
      // Limpa e popula selects individuais
      [whiteModelSelect, blackModelSelect].forEach((select) => {
        select.innerHTML = "";
        models.forEach((model) => {
          const opt = document.createElement("option");
          opt.value = model;
          opt.textContent = model;
          select.appendChild(opt);
        });
      });
      // Torneio (multiselect)
      tournamentModelsSelect.innerHTML = "";
      models.forEach((model) => {
        const opt = document.createElement("option");
        opt.value = model;
        opt.textContent = model;
        tournamentModelsSelect.appendChild(opt);
      });
    } catch (err) {
      alert("Erro ao carregar modelos disponíveis.");
    }
  }

  // Iniciar batalha individual
  startBattleBtn.addEventListener("click", async () => {
    const white_model = whiteModelSelect.value;
    const black_model = blackModelSelect.value;
    const opening = openingSelect.value;
    const num_games = parseInt(numGamesSlider.value);
    const realtime_speed = parseFloat(realtimeSpeedSlider.value);
    if (!white_model || !black_model || white_model === black_model) {
      alert("Selecione modelos diferentes para brancas e pretas.");
      return;
    }
    try {
      const res = await api.startArenaBattle({
        white_model,
        black_model,
        opening,
        num_games,
        realtime_speed,
      });
      if (res.battle_id) {
        loadBattleStatus(res.battle_id);
      }
    } catch (err) {
      alert("Erro ao iniciar batalha.");
    }
  });

  // Iniciar batalha em tempo real
  startRealtimeBattleBtn.addEventListener("click", async () => {
    // Pode ser igual ao startBattleBtn, mas pode ser customizado se necessário
    startBattleBtn.click();
  });

  // Iniciar torneio
  startTournamentBtn.addEventListener("click", async () => {
    const selected = Array.from(tournamentModelsSelect.selectedOptions).map(
      (opt) => opt.value
    );
    const games_per_pair = parseInt(gamesPerPairSlider.value);
    if (selected.length < 2) {
      alert("Selecione pelo menos dois modelos para o torneio.");
      return;
    }
    try {
      const res = await api.startArenaTournament({
        models: selected,
        games_per_pair,
      });
      if (res.tournament_id) {
        loadBattleStatus(null, res.tournament_id);
      }
    } catch (err) {
      alert("Erro ao iniciar torneio.");
    }
  });

  // Carregar status da batalha/torneio
  async function loadBattleStatus(battle_id = null, tournament_id = null) {
    try {
      const params = {};
      if (battle_id) params.battle_id = battle_id;
      if (tournament_id) params.tournament_id = tournament_id;
      const status = await api.getArenaStatus(params);
      // Atualiza status
      battleStatusDiv.innerHTML = `🎮 ${status.white} vs ${status.black} | Partida ${status.current_game}/${status.total_games}`;
      progressBar.value = status.current_game / status.total_games;
      progressText.textContent = `Progresso: ${status.current_game} de ${status.total_games}`;
      // Atualiza resultados
      resultsTableBody.innerHTML = "";
      (status.results || []).forEach((r) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${r.game}</td><td>${r.white}</td><td>${r.black}</td><td>${r.result}</td>`;
        resultsTableBody.appendChild(tr);
      });
      // Atualiza tabuleiro (se houver FEN)
      if (status.current_board) {
        renderChessboard(status.current_board);
      }
    } catch (err) {
      battleStatusDiv.innerHTML = "Erro ao carregar status da batalha.";
    }
  }

  // Carregar partidas salvas
  async function loadSavedGames() {
    try {
      const games = await api.getArenaSavedGames();
      savedGamesList.innerHTML = "";
      games.forEach((g) => {
        const li = document.createElement("li");
        li.textContent = `${g.white} vs ${g.black} (${g.date})`;
        li.addEventListener("click", () => loadSavedGame(g.id));
        savedGamesList.appendChild(li);
      });
    } catch (err) {
      savedGamesList.innerHTML = "<li>Erro ao carregar partidas salvas.</li>";
    }
  }

  // Carregar partida salva
  async function loadSavedGame(gameId) {
    try {
      const game = await api.getArenaGame(gameId);
      // Exibir detalhes, lances, etc.
      alert(`Partida carregada: ${game.pgn}`);
      // TODO: Integrar com visualizador de tabuleiro/lances
    } catch (err) {
      alert("Erro ao carregar partida.");
    }
  }

  // Inicialização
  loadModels();
  loadSavedGames();
  // Pode-se chamar loadBattleStatus() se quiser mostrar status ao abrir

  // Expor funções para debug (opcional)
  window.arenaPage = {
    loadModels,
    loadSavedGames,
    loadBattleStatus,
  };
})();

// Integração com chessboard.js
let board = null;

function renderChessboard(fen = "start") {
  if (!window.Chessboard) {
    console.error("Chessboard.js não carregado!");
    return;
  }
  if (board) {
    board.position(fen);
  } else {
    board = Chessboard("chessboard-container", {
      position: fen,
      draggable: false,
      pieceTheme:
        "https://cdn.jsdelivr.net/npm/chessboardjs@1.0.0/dist/img/chesspieces/wikipedia/{piece}.png",
    });
  }
}

// Inicializar tabuleiro ao carregar a página
renderChessboard();
