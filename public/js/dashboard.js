// Dashboard.js - Lógica para a página de dashboard

function initializeDashboardPage(app) {
  const dashboard = {
    elements: {
      loadingOverlay: document.getElementById("dashboard-loading-overlay"),
      refreshBtn: document.getElementById("refresh-dashboard-btn"),
      totalGamesMetric: document.getElementById("total-games-metric"),
      totalModelsMetric: document.getElementById("total-models-metric"),
      topModelMetric: document.getElementById("top-model-metric"),
      modelPerformanceChart: document.getElementById("model-performance-chart"),
      matchupResultsChart: document.getElementById("matchup-results-chart"),
      leaderboardTable: document
        .getElementById("leaderboard-table")
        ?.querySelector("tbody"),
      recentGamesList: document.getElementById("recent-games-list"),
    },
    charts: {
      modelChart: null,
      matchupChart: null,
    },
    app: app,
  };

  if (dashboard.elements.refreshBtn) {
    initializeDashboard(dashboard);
  }
}

function initializeDashboard(dashboard) {
  console.log("📊 Initializing Dashboard...");
  const data = dashboard.app.dashboardData;

  if (data) {
    updateGlobalMetrics(dashboard, data);
    updateModelPerformanceChart(dashboard, data.modelStats);
    updateMatchupResultsChart(dashboard, data.matchupStats);
    updateLeaderboard(dashboard, data.modelStats);
    updateRecentGames(dashboard, data.recentGames);
    setLoading(dashboard, false);
  } else {
    console.error("Dashboard data not found in app instance.");
    setLoading(dashboard, false);
  }

  dashboard.elements.refreshBtn.addEventListener("click", async () => {
    setLoading(dashboard, true);
    await dashboard.app.loadInitialData(); // Reload data in the main app
    initializeDashboard(dashboard); // Re-initialize dashboard with new data
    setLoading(dashboard, false);
  });
}

function setLoading(dashboard, isLoading) {
  dashboard.elements.loadingOverlay.style.display = isLoading ? "flex" : "none";
  if (dashboard.elements.refreshBtn) {
    dashboard.elements.refreshBtn.disabled = isLoading;
    const icon = dashboard.elements.refreshBtn.querySelector("i");
    if (icon) {
      icon.classList.toggle("fa-spin", isLoading);
    }
  }
}

function updateGlobalMetrics(dashboard, data) {
  const { totalGames, modelStats } = data;
  dashboard.elements.totalGamesMetric.textContent = totalGames || 0;
  dashboard.elements.totalModelsMetric.textContent = modelStats.length || 0;

  if (modelStats.length > 0) {
    const topModel = modelStats.reduce((prev, current) =>
      prev.wins > current.wins ? prev : current
    );
    dashboard.elements.topModelMetric.textContent = topModel.model;
  } else {
    dashboard.elements.topModelMetric.textContent = "N/A";
  }
}

function updateModelPerformanceChart(dashboard, modelStats) {
  if (!dashboard.elements.modelPerformanceChart) return;

  const labels = modelStats.map((m) => m.model);
  const winsData = modelStats.map((m) => m.wins);

  const chartData = {
    labels: labels,
    datasets: [
      {
        label: "Vitórias",
        data: winsData,
        backgroundColor: getChartColors(labels.length),
        borderColor: getChartColors(labels.length, true),
        borderWidth: 1,
      },
    ],
  };

  if (dashboard.charts.modelChart) {
    dashboard.charts.modelChart.data = chartData;
    dashboard.charts.modelChart.update();
  } else {
    dashboard.charts.modelChart = createBarChart(
      dashboard.elements.modelPerformanceChart,
      chartData,
      "Ranking de Modelos por Vitórias"
    );
  }
}

function updateMatchupResultsChart(dashboard, matchupStats) {
  if (!dashboard.elements.matchupResultsChart) return;

  const labels = matchupStats.map((m) => m.matchup);
  const p1Wins = matchupStats.map((m) => m.p1_wins);
  const p2Wins = matchupStats.map((m) => m.p2_wins);
  const draws = matchupStats.map((m) => m.draws);

  const chartData = {
    labels: labels,
    datasets: [
      {
        label: matchupStats[0]?.p1 || "Jogador 1",
        data: p1Wins,
        backgroundColor: "rgba(54, 162, 235, 0.7)",
      },
      {
        label: matchupStats[0]?.p2 || "Jogador 2",
        data: p2Wins,
        backgroundColor: "rgba(255, 99, 132, 0.7)",
      },
      {
        label: "Empates",
        data: draws,
        backgroundColor: "rgba(201, 203, 207, 0.7)",
      },
    ],
  };

  if (dashboard.charts.matchupChart) {
    dashboard.charts.matchupChart.destroy();
  }

  dashboard.charts.matchupChart = createStackedBarChart(
    dashboard.elements.matchupResultsChart,
    chartData,
    "Resultados por Confronto"
  );
}

function updateLeaderboard(dashboard, modelStats) {
  const { leaderboardTable } = dashboard.elements;
  if (!leaderboardTable) return;

  leaderboardTable.innerHTML = ""; // Clear existing data

  modelStats.forEach((model, index) => {
    const winRate =
      model.total > 0
        ? (((model.wins + 0.5 * model.draws) / model.total) * 100).toFixed(1)
        : 0;
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${index + 1}</td>
            <td class="model-name-cell">${model.model}</td>
            <td>${model.total}</td>
            <td class="wins">${model.wins}</td>
            <td class="draws">${model.draws}</td>
            <td class="losses">${model.losses}</td>
            <td>
                <div class="win-rate-bar-container">
                    <div class="win-rate-bar" style="width: ${winRate}%;"></div>
                    <span>${winRate}%</span>
                </div>
            </td>
        `;
    leaderboardTable.appendChild(row);
  });
}

function updateRecentGames(dashboard, recentGames) {
  const { recentGamesList } = dashboard.elements;
  if (!recentGamesList) return;

  recentGamesList.innerHTML = "";

  if (recentGames.length === 0) {
    recentGamesList.innerHTML = `<li class="empty-state">Nenhuma partida recente encontrada.</li>`;
    return;
  }

  recentGames.forEach((game) => {
    const li = document.createElement("li");
    li.className = "recent-game-item";

    let resultHtml = `<span class="result-draw">${game.result}</span>`;
    if (game.result === "1-0") {
      resultHtml = `<span class="result-win">${game.white}</span> venceu`;
    } else if (game.result === "0-1") {
      resultHtml = `<span class="result-win">${game.black}</span> venceu`;
    }

    let dateStr = "Data desconhecida";
    if (game.date && typeof game.date === "string") {
      try {
        dateStr = new Date(game.date.replace(/\./g, "-")).toLocaleDateString();
      } catch (e) {
        dateStr = game.date;
      }
    }

    li.innerHTML = `
            <div class="game-matchup">
                <span class="player">${game.white}</span>
                <span class="vs">vs</span>
                <span class="player">${game.black}</span>
            </div>
            <div class="game-result">
                ${resultHtml}
            </div>
            <div class="game-date">
                ${dateStr}
            </div>
        `;
    recentGamesList.appendChild(li);
  });
}

// Utility for chart colors
function getChartColors(numColors, isBorder = false) {
  const colors = [
    "rgba(255, 99, 132, 0.8)",
    "rgba(54, 162, 235, 0.8)",
    "rgba(255, 206, 86, 0.8)",
    "rgba(75, 192, 192, 0.8)",
    "rgba(153, 102, 255, 0.8)",
    "rgba(255, 159, 64, 0.8)",
    "rgba(199, 199, 199, 0.8)",
    "rgba(83, 102, 255, 0.8)",
  ];
  const borders = [
    "rgba(255, 99, 132, 1)",
    "rgba(54, 162, 235, 1)",
    "rgba(255, 206, 86, 1)",
    "rgba(75, 192, 192, 1)",
    "rgba(153, 102, 255, 1)",
    "rgba(255, 159, 64, 1)",
    "rgba(199, 199, 199, 1)",
    "rgba(83, 102, 255, 1)",
  ];
  const selected = isBorder ? borders : colors;
  return Array.from(
    { length: numColors },
    (_, i) => selected[i % selected.length]
  );
}

async function loadDashboard() {
  try {
    setLoading(true);
    const stats = await api.getGlobalStats();
    const results = await api.getResultsByModel();
    const winrate = await api.getWinrateData();
    const recentGames = await api.getRecentGames();

    renderStats(stats);
    renderResultsChart(results);
    renderWinratePie(winrate);
    renderRecentGamesTable(recentGames);
  } catch (error) {
    showError("Erro ao carregar dashboard: " + error.message);
  } finally {
    setLoading(false);
  }
}
