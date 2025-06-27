class Rankings {
  constructor() {
    this.api = window.smartAPI;
    this.tabs = document.querySelectorAll("#rankings-page .tab-btn");
    this.tabContents = document.querySelectorAll("#rankings-page .tab-content");
    this.statsLoaded = false;
  }

  init() {
    this.setupEventListeners();
    // Activate the first tab by default
    if (this.tabs.length > 0) {
      this.switchTab(this.tabs[0].dataset.tab);
    }
  }

  setupEventListeners() {
    this.tabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.switchTab(btn.dataset.tab);
      });
    });
  }

  async switchTab(tabId) {
    // Deactivate all tabs and content
    this.tabs.forEach((tab) => tab.classList.remove("active"));
    this.tabContents.forEach((content) => content.classList.remove("active"));

    // Activate the selected tab and content
    const button = document.querySelector(`.tab-btn[data-tab='${tabId}']`);
    const content = document.querySelector(`.tab-content[data-tab='${tabId}']`);

    if (button) {
      button.classList.add("active");
    }
    if (content) {
      content.classList.add("active");
    }

    // Load stats if the performance tab is selected and stats are not yet loaded
    if (tabId === "performance" && !this.statsLoaded) {
      await this.loadHeadToHeadStats();
      this.statsLoaded = true;
    }
  }

  async loadHeadToHeadStats() {
    try {
      const stats = await this.api.getStats();
      const tableBody = document.getElementById("head-to-head-stats-body");

      if (!stats || !tableBody) {
        console.warn("Could not load stats or find table body.");
        tableBody.innerHTML =
          '<tr><td colspan="6">Estatísticas não disponíveis.</td></tr>';
        return;
      }

      // Consolidate GPT-4 stats
      const consolidatedStats = {};
      for (const player in stats) {
        const key = player.toLowerCase().includes("gpt-4") ? "GPT-4" : player;
        if (!consolidatedStats[key]) {
          consolidatedStats[key] = {
            wins: 0,
            losses: 0,
            draws: 0,
            games: 0,
            score: 0,
          };
        }
        consolidatedStats[key].wins += stats[player].wins;
        consolidatedStats[key].losses += stats[player].losses;
        consolidatedStats[key].draws += stats[player].draws;
        consolidatedStats[key].games += stats[player].games;
        consolidatedStats[key].score += stats[player].score;
      }

      const sortedPlayers = Object.keys(consolidatedStats).sort(
        (a, b) => consolidatedStats[b].score - consolidatedStats[a].score
      );

      tableBody.innerHTML = ""; // Clear existing rows
      sortedPlayers.forEach((player) => {
        const data = consolidatedStats[player];
        const row = `
          <tr>
            <td><i class="fas fa-robot"></i> ${player}</td>
            <td>${data.wins}</td>
            <td>${data.losses}</td>
            <td>${data.draws}</td>
            <td>${data.games}</td>
            <td><strong>${data.score}</strong></td>
          </tr>
        `;
        tableBody.innerHTML += row;
      });
    } catch (error) {
      console.error("Failed to load head-to-head stats:", error);
      const tableBody = document.getElementById("head-to-head-stats-body");
      if (tableBody) {
        tableBody.innerHTML =
          '<tr><td colspan="6">Erro ao carregar estatísticas.</td></tr>';
      }
    }
  }

  async loadRankings() {
    const rankings = await this.api.getEloRankings();
    const eloHistory = await this.api.getEloHistory();
    this.renderRankingsTable(rankings);
    this.renderEloHistoryChart(eloHistory);
  }

  async loadModelStats(model) {
    const stats = await this.api.getModelStats(model);
    this.renderModelStats(stats);
  }

  async loadOpeningStats() {
    const openingStats = await this.api.getOpeningStats();
    this.renderOpeningStatsTable(openingStats);
  }
}
