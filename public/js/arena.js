// Arena.js - Lógica para a página de visualização de partidas

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
