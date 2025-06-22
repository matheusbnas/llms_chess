// Dashboard.js - Integração com o backend (baseado no chess_comparator.py)

async function initializeDashboardPage(arena, pgnViewer) {
  if (!arena || !arena.api) {
    console.error("Arena or API not initialized on Dashboard Page!");
    return;
  }

  console.log("🏠 Initializing Dashboard page...");

  const matchupSelector = document.getElementById("matchup-selector");
  const gameSelector = document.getElementById("game-selector");

  // Load matchups (seguindo exatamente como no chess_comparator.py)
  try {
    const matchups = await arena.api.listMatchups();
    matchupSelector.innerHTML =
      "<option value=''>Selecione um confronto</option>";

    matchups.forEach((matchup) => {
      const option = new Option(matchup, matchup);
      matchupSelector.add(option);
    });

    console.log("✅ Matchups loaded for dashboard");
  } catch (error) {
    console.error("❌ Failed to load matchups for dashboard", error);
    matchupSelector.innerHTML = "<option value=''>Erro ao carregar</option>";
  }

  // Event listener for matchup changes (como no streamlit)
  matchupSelector.addEventListener("change", async (e) => {
    const matchup = e.target.value;
    gameSelector.innerHTML = "<option value=''>Carregando...</option>";

    if (!matchup) {
      gameSelector.innerHTML =
        "<option value=''>Selecione uma partida</option>";
      if (pgnViewer) pgnViewer.clear();
      return;
    }

    try {
      const games = await arena.api.listGamesInMatchup(matchup);
      gameSelector.innerHTML =
        "<option value=''>Selecione uma partida</option>";

      games.forEach((game) => {
        const option = new Option(game.replace(".pgn", ""), game);
        gameSelector.add(option);
      });

      console.log(`✅ Games loaded for matchup: ${matchup}`);
    } catch (error) {
      console.error("❌ Failed to load games for matchup", matchup, error);
      gameSelector.innerHTML = "<option value=''>Erro ao carregar</option>";
    }
  });

  // Event listener for game changes (carregamento do PGN)
  gameSelector.addEventListener("change", async (e) => {
    const matchup = matchupSelector.value;
    const gameFile = e.target.value;

    if (!matchup || !gameFile) {
      if (pgnViewer) pgnViewer.clear();
      return;
    }

    try {
      console.log(`📥 Loading PGN data: ${matchup}/${gameFile}`);
      const pgnData = await arena.api.getPgnData(matchup, gameFile);

      if (pgnData && pgnData.pgn) {
        // Integração com PgnViewer (como no chess_comparator.py)
        if (pgnViewer) {
          pgnViewer.loadPgn(pgnData.pgn);
          console.log("✅ PGN loaded in viewer");
        }

        // Update dashboard stats se necessário
        updateDashboardGameInfo(pgnData);
      } else {
        throw new Error("Invalid PGN data received for dashboard");
      }
    } catch (error) {
      console.error("❌ Failed to load PGN data for dashboard", error);
      if (arena && arena.showToast) {
        arena.showToast("Erro ao carregar os dados do PGN", "error");
      } else {
        alert("Erro ao carregar os dados do PGN.");
      }
    }
  });

  // PGN controls (como no streamlit com st.button)
  document.getElementById("pgn-start")?.addEventListener("click", () => {
    if (pgnViewer) pgnViewer.goToMove(0);
  });

  document.getElementById("pgn-back")?.addEventListener("click", () => {
    if (pgnViewer) pgnViewer.previousMove();
  });

  document.getElementById("pgn-next")?.addEventListener("click", () => {
    if (pgnViewer) pgnViewer.nextMove();
  });

  document.getElementById("pgn-end")?.addEventListener("click", () => {
    if (pgnViewer && pgnViewer.moves) {
      pgnViewer.goToMove(pgnViewer.moves.length - 1);
    }
  });

  document.getElementById("pgn-flip")?.addEventListener("click", () => {
    if (pgnViewer) pgnViewer.flipBoard();
  });

  // Load recent games and stats (funcionalidade extra do dashboard)
  await loadDashboardStats(arena);

  console.log("✅ Dashboard page initialized successfully");
}

// Função para atualizar informações do jogo no dashboard
function updateDashboardGameInfo(pgnData) {
  try {
    const headers = pgnData.headers || {};

    // Update game info display
    const gameTitle = document.getElementById("dashboard-game-title");
    if (gameTitle) {
      gameTitle.textContent = `${headers.White || "Brancas"} vs ${
        headers.Black || "Pretas"
      }`;
    }

    const gameResult = document.getElementById("dashboard-game-result");
    if (gameResult) {
      gameResult.textContent = headers.Result || "*";
    }

    const gameInfo = document.getElementById("dashboard-game-info");
    if (gameInfo) {
      gameInfo.innerHTML = `
        <div><strong>Abertura:</strong> ${
          headers.Opening || "Desconhecida"
        }</div>
        <div><strong>Data:</strong> ${headers.Date || "N/A"}</div>
        <div><strong>Resultado:</strong> ${headers.Result || "*"}</div>
        <div><strong>Lances:</strong> ${
          pgnData.moves ? pgnData.moves.length : 0
        }</div>
      `;
    }

    console.log("✅ Dashboard game info updated");
  } catch (error) {
    console.error("❌ Error updating dashboard game info:", error);
  }
}

// Função para carregar estatísticas do dashboard
async function loadDashboardStats(arena) {
  try {
    console.log("📊 Loading dashboard statistics...");

    // Load global stats
    const stats = await arena.api.getGlobalStats();

    // Update metrics cards
    const updateMetric = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    };

    updateMetric("total-games", stats.totalGames || 0);
    updateMetric("active-models", stats.activeModels || 0);
    updateMetric("avg-moves", stats.avgMoves || 0);
    updateMetric("tournaments", stats.tournaments || 0);

    // Load recent games
    const recentGames = await arena.api.getRecentGames(10);
    updateRecentGamesTable(recentGames);

    console.log("✅ Dashboard statistics loaded");
  } catch (error) {
    console.error("❌ Error loading dashboard stats:", error);
  }
}

// Função para atualizar tabela de jogos recentes
function updateRecentGamesTable(games) {
  const tableBody = document.getElementById("recent-games-table");
  if (!tableBody || !games) return;

  tableBody.innerHTML = "";

  games.slice(0, 10).forEach((game, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 24px; height: 24px; background: #b8860b; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px;">
            🤖
          </div>
          <strong>${game.White || game.white || "Brancas"}</strong>
        </div>
      </td>
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 24px; height: 24px; background: #666; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px;">
            🤖
          </div>
          <strong>${game.Black || game.black || "Pretas"}</strong>
        </div>
      </td>
      <td>
        <span style="background: #444; padding: 2px 6px; border-radius: 4px;">${
          game.Result || game.result || "*"
        }</span>
      </td>
      <td>
        <span style="font-family: monospace;">${
          game.Moves || game.moves || "-"
        }</span>
      </td>
      <td style="color: #888;">
        ${game.Date || game.date || "Hoje"}
      </td>
      <td>
        <button onclick="viewGameInDashboard('${
          game.id || index
        }')" style="background: #b8860b; color: #000; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
          Ver
        </button>
      </td>
    `;
    tableBody.appendChild(row);
  });

  console.log("✅ Recent games table updated");
}

// Função para visualizar jogo específico
function viewGameInDashboard(gameId) {
  console.log(`👁️ Viewing game ${gameId} in dashboard`);
  // Implementar visualização específica se necessário
  if (window.arena && window.arena.showToast) {
    window.arena.showToast(`Visualizando partida ${gameId}`, "info");
  }
}

// Função para limpar o viewer (como no streamlit quando não há seleção)
function clearDashboardViewer() {
  const pgnViewer = window.dashboardPgnViewer;
  if (pgnViewer && pgnViewer.clear) {
    pgnViewer.clear();
  }

  // Clear game info
  const gameInfo = document.getElementById("dashboard-game-info");
  if (gameInfo) {
    gameInfo.innerHTML =
      '<div style="color: #888;">Selecione uma partida para ver as informações</div>';
  }
}

// Função para exportar dados do dashboard
function exportDashboardData() {
  console.log("📤 Exporting dashboard data...");
  // Implementar exportação se necessário
  if (window.arena && window.arena.showToast) {
    window.arena.showToast(
      "Funcionalidade de exportação será implementada",
      "info"
    );
  }
}

// Auto-refresh functionality (opcional)
let dashboardAutoRefresh = null;

function startDashboardAutoRefresh(interval = 60000) {
  if (dashboardAutoRefresh) {
    clearInterval(dashboardAutoRefresh);
  }

  dashboardAutoRefresh = setInterval(async () => {
    try {
      await loadDashboardStats(window.arena);
      console.log("🔄 Dashboard auto-refreshed");
    } catch (error) {
      console.error("❌ Dashboard auto-refresh failed:", error);
    }
  }, interval);
}

function stopDashboardAutoRefresh() {
  if (dashboardAutoRefresh) {
    clearInterval(dashboardAutoRefresh);
    dashboardAutoRefresh = null;
  }
}

// Exports
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    initializeDashboardPage,
    updateDashboardGameInfo,
    loadDashboardStats,
    updateRecentGamesTable,
    viewGameInDashboard,
    clearDashboardViewer,
    exportDashboardData,
    startDashboardAutoRefresh,
    stopDashboardAutoRefresh,
  };
}
