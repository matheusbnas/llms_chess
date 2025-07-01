// ♟️ LLM Chess Arena - API Management

class Api {
  constructor() {
    this.baseURL = window.FASTAPI_BASE_URL || "";
    this.timeout = 30000;
    this.retryAttempts = 3;
    this.retryDelay = 1000;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      timeout: this.timeout,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    let lastError;

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...config,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        console.warn(`API request attempt ${attempt + 1} failed:`, error);
        if (attempt < this.retryAttempts - 1) {
          await this.sleep(this.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError || new Error("API request failed after all retries");
  }

  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: "GET" });
  }

  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // API Endpoints
  async getDashboardData() {
    return this.get("/api/data/dashboard");
  }

  async getAvailableModels() {
    return this.get("/api/models/available");
  }

  async getRecentGames(limit = 10) {
    return this.get("/api/data/recent-games", { limit });
  }

  async getStats() {
    return this.get("/api/data/stats");
  }

  async getSettings() {
    return this.get("/api/settings");
  }

  async getDatabaseStats() {
    return this.get("/api/data/database-stats");
  }

  async getGlobalStats() {
    return this.get("/api/data/global-stats");
  }

  async getResultsByModel() {
    return this.get("/api/data/results-by-model");
  }

  async getWinrateData() {
    return this.get("/api/data/winrate");
  }

  async playGameRealtime(data) {
    return this.post("/api/arena/play-realtime", data);
  }

  async saveGame(data) {
    return this.post("/api/games/save", data);
  }

  async getCurrentBattle() {
    return this.get("/api/arena/current-battle");
  }

  async getBattleResults() {
    return this.get("/api/arena/battle-results");
  }

  async getAllGames() {
    return this.get("/api/games/all");
  }

  async getEloRankings() {
    return this.get("/api/analysis/elo-rankings");
  }

  async getEloHistory() {
    return this.get("/api/analysis/elo-history");
  }

  async getModelStats(model) {
    return this.get("/api/analysis/model-stats", { model });
  }

  async getOpeningStats() {
    return this.get("/api/analysis/opening-stats");
  }

  async testModel(model) {
    return this.post("/api/models/test", { model });
  }

  async exportData() {
    return this.get("/api/data/export");
  }

  async importData(data) {
    return this.post("/api/data/import", data);
  }

  async deleteOldGames(days) {
    return this.post("/api/data/delete-old-games", { days });
  }

  async resetDatabase() {
    return this.post("/api/data/reset-database");
  }

  async testLichessConnection(token) {
    return this.post("/api/lichess/test-connection", { token });
  }

  async getGamePgn(id) {
    return this.get(`/api/games/pgn/${id}`);
  }

  async analyzeGame(id) {
    return this.get(`/api/analysis/game/${id}`);
  }

  async compareModels(model1, model2) {
    return this.post("/api/analysis/compare-models", { model1, model2 });
  }

  async importLichessGames(username, max_games) {
    return this.post("/api/lichess/import-games", { username, max_games });
  }

  async processLichessGames(games) {
    return this.post("/api/analysis/process-lichess-games", { games });
  }

  async applyRagImprovements() {
    return this.post("/api/analysis/apply-rag-improvements");
  }

  async importPgns() {
    return this.post("/api/data/import-pgns");
  }

  async getImportedGames() {
    return this.get("/api/imported-games");
  }

  async getArenaModels() {
    return this.get("/api/arena/models");
  }

  async startArenaBattle(data) {
    return this.post("/api/arena/battle", data);
  }

  async startArenaTournament(data) {
    return this.post("/api/arena/tournament", data);
  }

  async getArenaStatus(params) {
    return this.get("/api/arena/status", params);
  }

  async getArenaSavedGames() {
    return this.get("/api/arena/saved_games");
  }

  async getArenaGame(gameId) {
    return this.get(`/api/arena/game/${gameId}`);
  }
}

window.Api = Api;
window.api = new Api();

async function loadDashboard() {
  const data = await api.getDashboardData();
  // ... renderize os dados
}

// Chame isso ao ativar a aba do dashboard
loadDashboard();
