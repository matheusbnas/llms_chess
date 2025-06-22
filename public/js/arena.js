// Arena.js - Integração com o backend (baseado no chess_arena_with_judge.py)

async function initializeArenaPage(arena, arenaPgnViewer) {
  if (!arena || !arena.api) {
    console.error("Arena or API not initialized on Arena Page!");
    return;
  }

  console.log("⚔️ Initializing Arena page...");

  const matchupSelector = document.getElementById("arena-matchup-selector");
  const gameSelector = document.getElementById("arena-game-selector");

  // Load matchups (seguindo estrutura do chess_arena_with_judge.py)
  try {
    const matchups = await arena.api.listMatchups();
    matchupSelector.innerHTML =
      "<option value=''>Selecione um confronto</option>";

    matchups.forEach((matchup) => {
      const option = new Option(matchup.replace(" vs ", " ⚔️ "), matchup);
      matchupSelector.add(option);
    });

    console.log("✅ Arena matchups loaded");
  } catch (error) {
    console.error("❌ Failed to load matchups for arena", error);
    matchupSelector.innerHTML = "<option value=''>Erro ao carregar</option>";
  }

  // Event listener for matchup changes (como no sistema de batalhas)
  matchupSelector.addEventListener("change", async (e) => {
    const matchup = e.target.value;
    gameSelector.innerHTML = "<option value=''>Carregando...</option>";

    if (!matchup) {
      gameSelector.innerHTML =
        "<option value=''>Selecione uma partida</option>";
      if (arenaPgnViewer) arenaPgnViewer.clear();
      clearArenaStats();
      return;
    }

    try {
      const games = await arena.api.listGamesInMatchup(matchup);
      gameSelector.innerHTML =
        "<option value=''>Selecione uma partida</option>";

      games.forEach((game, index) => {
        const option = new Option(
          `Partida ${index + 1} - ${game.replace(".pgn", "")}`,
          game
        );
        gameSelector.add(option);
      });

      // Load confronto statistics (como no chess_arena_with_judge.py)
      await loadArenaConfrontoStats(matchup, games, arena);

      console.log(`✅ Arena games loaded for: ${matchup}`);
    } catch (error) {
      console.error(
        "❌ Failed to load games for arena matchup",
        matchup,
        error
      );
      gameSelector.innerHTML = "<option value=''>Erro ao carregar</option>";
    }
  });

  // Event listener for game changes (carregamento específico da arena)
  gameSelector.addEventListener("change", async (e) => {
    const matchup = matchupSelector.value;
    const gameFile = e.target.value;

    if (!matchup || !gameFile) {
      if (arenaPgnViewer) arenaPgnViewer.clear();
      clearArenaGameInfo();
      return;
    }

    try {
      console.log(`🎮 Loading arena game: ${matchup}/${gameFile}`);
      const pgnData = await arena.api.getPgnData(matchup, gameFile);

      if (pgnData && pgnData.pgn) {
        // Load PGN in arena viewer
        if (arenaPgnViewer) {
          arenaPgnViewer.loadPgn(pgnData.pgn);
          console.log("✅ Arena PGN loaded in viewer");
        }

        // Update arena-specific info
        updateArenaGameInfo(pgnData, matchup);
        updateArenaBattleInfo(pgnData);
      } else {
        throw new Error("Invalid PGN data received for arena");
      }
    } catch (error) {
      console.error("❌ Failed to load PGN data for arena", error);
      if (arena && arena.showToast) {
        arena.showToast("Erro ao carregar dados da arena", "error");
      } else {
        alert("Erro ao carregar os dados da arena.");
      }
    }
  });

  // Arena-specific PGN controls (com funcionalidades de arena)
  document.getElementById("arena-pgn-start")?.addEventListener("click", () => {
    if (arenaPgnViewer) arenaPgnViewer.goToMove(0);
    logArenaAction("Navegação para início");
  });

  document.getElementById("arena-pgn-back")?.addEventListener("click", () => {
    if (arenaPgnViewer) arenaPgnViewer.previousMove();
    logArenaAction("Navegação anterior");
  });

  document.getElementById("arena-pgn-next")?.addEventListener("click", () => {
    if (arenaPgnViewer) arenaPgnViewer.nextMove();
    logArenaAction("Navegação próximo");
  });

  document.getElementById("arena-pgn-end")?.addEventListener("click", () => {
    if (arenaPgnViewer && arenaPgnViewer.moves) {
      arenaPgnViewer.goToMove(arenaPgnViewer.moves.length - 1);
    }
    logArenaAction("Navegação para final");
  });

  document.getElementById("arena-pgn-flip")?.addEventListener("click", () => {
    if (arenaPgnViewer) arenaPgnViewer.flipBoard();
    logArenaAction("Tabuleiro virado");
  });

  // Arena battle analysis buttons
  setupArenaBattleControls(arena);

  // Load arena statistics
  await loadArenaGlobalStats(arena);

  console.log("✅ Arena page initialized successfully");
}

// Função para carregar estatísticas do confronto (como resultados das batalhas)
async function loadArenaConfrontoStats(matchup, games, arena) {
  try {
    console.log(`📊 Loading confronto stats for: ${matchup}`);

    let whiteWins = 0,
      blackWins = 0,
      draws = 0;
    const models = matchup.split(" vs ");

    // Analyze a sample of games to get quick stats
    const sampleSize = Math.min(games.length, 10);

    for (let i = 0; i < sampleSize; i++) {
      try {
        const pgnData = await arena.api.getPgnData(matchup, games[i]);
        const result = pgnData.headers?.Result;

        if (result === "1-0") whiteWins++;
        else if (result === "0-1") blackWins++;
        else if (result === "1/2-1/2") draws++;
      } catch (e) {
        console.warn(`Skipping game ${games[i]} for stats`);
      }
    }

    // Update arena confronto display
    updateArenaConfrontoDisplay(
      matchup,
      models,
      whiteWins,
      blackWins,
      draws,
      games.length
    );

    console.log(
      `✅ Confronto stats loaded: ${whiteWins}-${draws}-${blackWins}`
    );
  } catch (error) {
    console.error("❌ Error loading arena confronto stats:", error);
  }
}

// Função para atualizar display do confronto na arena
function updateArenaConfrontoDisplay(
  matchup,
  models,
  whiteWins,
  blackWins,
  draws,
  totalGames
) {
  const confrontoSummary = document.getElementById("arena-confronto-summary");
  if (confrontoSummary) {
    confrontoSummary.style.display = "block";
    confrontoSummary.innerHTML = `
        <div class="arena-confronto-header">
          <h3>🏟️ Arena: ${models[0]} vs ${models[1]}</h3>
          <span class="badge">${totalGames} partidas</span>
        </div>
        <div class="arena-battle-results">
          <div class="battle-stat white-wins">
            <div class="stat-value">${whiteWins}</div>
            <div class="stat-label">Vitórias ${models[0]}</div>
          </div>
          <div class="battle-stat draws">
            <div class="stat-value">${draws}</div>
            <div class="stat-label">Empates</div>
          </div>
          <div class="battle-stat black-wins">
            <div class="stat-value">${blackWins}</div>
            <div class="stat-label">Vitórias ${models[1]}</div>
          </div>
        </div>
        <div class="arena-score">
          Score: ${whiteWins} - ${draws} - ${blackWins}
        </div>
      `;
  }
}

// Função para atualizar informações do jogo na arena
function updateArenaGameInfo(pgnData, matchup) {
  try {
    const headers = pgnData.headers || {};
    const models = matchup.split(" vs ");

    // Update main arena title
    const arenaTitle = document.getElementById("arena-game-title");
    if (arenaTitle) {
      arenaTitle.textContent = `🏟️ ${headers.White || models[0]} vs ${
        headers.Black || models[1]
      }`;
    }

    // Update model vs model display
    const vsDisplay = document.getElementById("arena-vs-display");
    if (vsDisplay) {
      vsDisplay.innerHTML = `
          <div class="arena-model">
            <div class="model-name">${headers.White || models[0]}</div>
            <div class="model-role">Peças Brancas</div>
            <div class="model-indicator white-pieces">♔</div>
          </div>
          <div class="arena-vs">⚔️</div>
          <div class="arena-model">
            <div class="model-name">${headers.Black || models[1]}</div>
            <div class="model-role">Peças Pretas</div>
            <div class="model-indicator black-pieces">♚</div>
          </div>
        `;
    }

    // Update arena game metadata
    const gameMetadata = document.getElementById("arena-game-metadata");
    if (gameMetadata) {
      gameMetadata.innerHTML = `
          <div class="metadata-item">
            <span class="label">🏁 Resultado:</span>
            <span class="value result-${(headers.Result || "*").replace(
              /[^a-zA-Z0-9]/g,
              ""
            )}">${formatArenaResult(headers.Result)}</span>
          </div>
          <div class="metadata-item">
            <span class="label">📖 Abertura:</span>
            <span class="value">${headers.Opening || "Desconhecida"}</span>
          </div>
          <div class="metadata-item">
            <span class="label">🎯 Lances:</span>
            <span class="value">${
              pgnData.moves ? pgnData.moves.length : 0
            }</span>
          </div>
          <div class="metadata-item">
            <span class="label">📅 Data:</span>
            <span class="value">${headers.Date || "Hoje"}</span>
          </div>
        `;
    }

    console.log("✅ Arena game info updated");
  } catch (error) {
    console.error("❌ Error updating arena game info:", error);
  }
}

// Função para atualizar informações da batalha (específico da arena)
function updateArenaBattleInfo(pgnData) {
  try {
    const headers = pgnData.headers || {};
    const moves = pgnData.moves || [];

    // Calculate battle statistics
    const gameLength = moves.length;
    const avgTimePerMove = gameLength > 0 ? "~2.5s" : "-"; // Estimativa
    const complexity =
      gameLength > 40 ? "Alta" : gameLength > 25 ? "Média" : "Baixa";

    // Update battle analysis panel
    const battleAnalysis = document.getElementById("arena-battle-analysis");
    if (battleAnalysis) {
      battleAnalysis.innerHTML = `
          <h4>⚡ Análise da Batalha</h4>
          <div class="battle-stats">
            <div class="battle-stat-item">
              <span class="stat-icon">⏱️</span>
              <span class="stat-text">Tempo médio/lance: ${avgTimePerMove}</span>
            </div>
            <div class="battle-stat-item">
              <span class="stat-icon">🧠</span>
              <span class="stat-text">Complexidade: ${complexity}</span>
            </div>
            <div class="battle-stat-item">
              <span class="stat-icon">🎮</span>
              <span class="stat-text">Tipo: Batalha de IA</span>
            </div>
            <div class="battle-stat-item">
              <span class="stat-icon">🏆</span>
              <span class="stat-text">Vencedor: ${getWinnerFromResult(
                headers.Result,
                headers.White,
                headers.Black
              )}</span>
            </div>
          </div>
        `;
    }

    console.log("✅ Arena battle info updated");
  } catch (error) {
    console.error("❌ Error updating arena battle info:", error);
  }
}

// Função para configurar controles específicos da arena
function setupArenaBattleControls(arena) {
  // Battle analysis button
  const analyzeBtn = document.getElementById("arena-analyze-battle");
  if (analyzeBtn) {
    analyzeBtn.addEventListener("click", () => {
      analyzeBattle(arena);
    });
  }

  // Compare models button
  const compareBtn = document.getElementById("arena-compare-models");
  if (compareBtn) {
    compareBtn.addEventListener("click", () => {
      compareModelsInArena(arena);
    });
  }

  // Start new battle button
  const newBattleBtn = document.getElementById("arena-new-battle");
  if (newBattleBtn) {
    newBattleBtn.addEventListener("click", () => {
      startNewBattle(arena);
    });
  }

  // Export arena data
  const exportBtn = document.getElementById("arena-export-data");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      exportArenaData(arena);
    });
  }
}

// Função para carregar estatísticas globais da arena
async function loadArenaGlobalStats(arena) {
  try {
    console.log("📊 Loading arena global statistics...");

    const stats = await arena.api.getGlobalStats();
    const modelStats = await arena.api.getResultsByModel();

    // Update arena metrics
    updateArenaMetrics(stats);
    updateArenaModelRankings(modelStats);

    console.log("✅ Arena global stats loaded");
  } catch (error) {
    console.error("❌ Error loading arena global stats:", error);
  }
}

// Função para atualizar métricas da arena
function updateArenaMetrics(stats) {
  const metricsContainer = document.getElementById("arena-metrics");
  if (metricsContainer && stats) {
    metricsContainer.innerHTML = `
        <div class="arena-metric">
          <div class="metric-value">${stats.totalGames || 0}</div>
          <div class="metric-label">🎮 Batalhas</div>
        </div>
        <div class="arena-metric">
          <div class="metric-value">${stats.activeModels || 0}</div>
          <div class="metric-label">🤖 Modelos Ativos</div>
        </div>
        <div class="arena-metric">
          <div class="metric-value">${stats.avgMoves || 0}</div>
          <div class="metric-label">📊 Lances Médios</div>
        </div>
        <div class="arena-metric">
          <div class="metric-value">${stats.tournaments || 0}</div>
          <div class="metric-label">🏆 Torneios</div>
        </div>
      `;
  }
}

// Funções utilitárias específicas da arena
function formatArenaResult(result) {
  switch (result) {
    case "1-0":
      return "🏆 Vitória Brancas";
    case "0-1":
      return "🏆 Vitória Pretas";
    case "1/2-1/2":
      return "🤝 Empate";
    default:
      return "⏳ Em andamento";
  }
}

function getWinnerFromResult(result, white, black) {
  switch (result) {
    case "1-0":
      return `🏆 ${white || "Brancas"}`;
    case "0-1":
      return `🏆 ${black || "Pretas"}`;
    case "1/2-1/2":
      return "🤝 Empate";
    default:
      return "⏳ Em andamento";
  }
}

function logArenaAction(action) {
  console.log(`🏟️ Arena Action: ${action}`);
}

// Funções de ação da arena
function analyzeBattle(arena) {
  console.log("🔍 Analyzing battle...");
  if (arena && arena.showToast) {
    arena.showToast("Análise de batalha será implementada", "info");
  }
}

function compareModelsInArena(arena) {
  console.log("⚖️ Comparing models in arena...");
  if (arena && arena.showToast) {
    arena.showToast("Comparação de modelos será implementada", "info");
  }
}

function startNewBattle(arena) {
  console.log("⚔️ Starting new battle...");
  if (arena && arena.showToast) {
    arena.showToast("Nova batalha será implementada", "info");
  }
}

function exportArenaData(arena) {
  console.log("📤 Exporting arena data...");
  if (arena && arena.showToast) {
    arena.showToast("Exportação de dados da arena será implementada", "info");
  }
}

// Funções de limpeza
function clearArenaStats() {
  const confrontoSummary = document.getElementById("arena-confronto-summary");
  if (confrontoSummary) {
    confrontoSummary.style.display = "none";
  }
}

function clearArenaGameInfo() {
  const arenaTitle = document.getElementById("arena-game-title");
  if (arenaTitle) {
    arenaTitle.textContent = "🏟️ Arena - Selecione uma partida";
  }

  const vsDisplay = document.getElementById("arena-vs-display");
  if (vsDisplay) {
    vsDisplay.innerHTML =
      '<div style="color: #888;">Selecione um confronto para ver os modelos</div>';
  }

  const gameMetadata = document.getElementById("arena-game-metadata");
  if (gameMetadata) {
    gameMetadata.innerHTML =
      '<div style="color: #888;">Carregue uma partida para ver as informações</div>';
  }
}

// Exports
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    initializeArenaPage,
    loadArenaConfrontoStats,
    updateArenaConfrontoDisplay,
    updateArenaGameInfo,
    updateArenaBattleInfo,
    setupArenaBattleControls,
    loadArenaGlobalStats,
    updateArenaMetrics,
    formatArenaResult,
    getWinnerFromResult,
    logArenaAction,
    analyzeBattle,
    compareModelsInArena,
    startNewBattle,
    exportArenaData,
    clearArenaStats,
    clearArenaGameInfo,
  };
}
