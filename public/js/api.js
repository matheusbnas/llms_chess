// ♟️ LLM Chess Arena - API Management for FastAPI Backend

class Api {
  constructor() {
    this.baseURL = window.FASTAPI_BASE_URL || "http://localhost:8000";
    this.timeout = window.API_TIMEOUT || 30000;
    this.retryAttempts = 3;
    this.retryDelay = 1000;

    console.log(`🔌 API initialized with base URL: ${this.baseURL}`);
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      timeout: this.timeout,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
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
          const errorText = await response.text();
          throw new Error(
            `HTTP ${response.status}: ${response.statusText} - ${errorText}`
          );
        }

        const result = await response.json();

        if (attempt > 0) {
          console.log(`✅ API request succeeded on attempt ${attempt + 1}`);
        }

        return result;
      } catch (error) {
        lastError = error;
        console.warn(
          `⚠️ API request attempt ${attempt + 1} failed for ${endpoint}:`,
          error.message
        );

        if (attempt < this.retryAttempts - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          console.log(`⏳ Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    console.error(
      `❌ API request failed after ${this.retryAttempts} attempts:`,
      lastError
    );
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

  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ==========================================
  // DASHBOARD ENDPOINTS
  // ==========================================

  async getDashboardData() {
    try {
      return await this.get("/api/data/dashboard");
    } catch (error) {
      console.warn("Dashboard data not available, using fallback");
      return this._getFallbackDashboardData();
    }
  }

  _getFallbackDashboardData() {
    return {
      totalGames: 0,
      modelStats: [],
      recentGames: [],
      matchupStats: [],
    };
  }

  // ==========================================
  // ARENA ENDPOINTS (FastAPI)
  // ==========================================

  async getAvailableModels() {
    return this.get("/api/arena/models");
  }

  async getActiveModels() {
    return this.get("/api/arena/models/active");
  }

  async startBattle(battleConfig) {
    console.log("🚀 Starting battle with config:", battleConfig);
    return this.post("/api/arena/battle", battleConfig);
  }

  async getBattleStatus(battleId) {
    return this.get(`/api/arena/battle/${battleId}/status`);
  }

  async getActiveBattles() {
    return this.get("/api/arena/battles/active");
  }

  // ==========================================
  // HUMAN VS AI GAME ENDPOINTS
  // ==========================================

  async createHumanGame(gameConfig) {
    console.log("🎮 Creating human vs AI game:", gameConfig);
    return this.post("/api/arena/games/human", gameConfig);
  }

  async makeHumanMove(gameId, move) {
    console.log(`♟️ Making move ${move} in game ${gameId}`);
    return this.post(`/api/arena/games/${gameId}/move`, {
      game_id: gameId,
      move: move,
    });
  }

  async getGameState(gameId) {
    return this.get(`/api/arena/games/${gameId}`);
  }

  async getActiveGames() {
    return this.get("/api/arena/games/active");
  }

  async endGame(gameId) {
    return this.delete(`/api/arena/games/${gameId}`);
  }

  // ==========================================
  // ANALYSIS ENDPOINTS
  // ==========================================

  async analyzeGame(gameId) {
    return this.get(`/api/analysis/game/${gameId}`);
  }

  async compareModels(model1, model2) {
    return this.post("/api/analysis/compare-models", {
      model1: model1,
      model2: model2,
    });
  }

  async getEloRankings() {
    return this.get("/api/analysis/elo-rankings");
  }

  async getEloHistory() {
    return this.get("/api/analysis/elo-history");
  }

  async getModelStats(model) {
    return this.get("/api/analysis/model-stats", { model: model });
  }

  async getOpeningStats() {
    return this.get("/api/analysis/opening-stats");
  }

  // ==========================================
  // ARENA STATS ENDPOINTS
  // ==========================================

  async getArenaStats() {
    return this.get("/api/arena/stats");
  }

  // ==========================================
  // SETTINGS ENDPOINTS
  // ==========================================

  async getSettings() {
    try {
      return await this.get("/api/settings");
    } catch (error) {
      console.warn("Settings not available, using defaults");
      return this._getDefaultSettings();
    }
  }

  _getDefaultSettings() {
    return {
      modelParams: {
        temperature: 0.7,
        maxTokens: 1024,
        thinkingTime: 5,
      },
      gameSettings: {
        defaultTimeControl: "blitz",
        autoSaveGames: true,
        showCoordinates: true,
        highlightLastMove: true,
        autoAnalysis: false,
        analysisDepth: 10,
        saveAnalysis: true,
      },
      server_info: {
        version: "1.0.0",
        environment: "dev",
      },
    };
  }

  // ==========================================
  // WEBSOCKET CONNECTION
  // ==========================================

  connectWebSocket() {
    try {
      const wsUrl = this.baseURL.replace("http", "ws") + "/api/arena/ws";
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("🔌 WebSocket connected");
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      this.ws.onclose = () => {
        console.log("🔌 WebSocket disconnected");
        // Attempt to reconnect after 5 seconds
        setTimeout(() => this.connectWebSocket(), 5000);
      };

      this.ws.onerror = (error) => {
        console.error("🔌 WebSocket error:", error);
      };
    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
    }
  }

  handleWebSocketMessage(data) {
    console.log("📨 WebSocket message received:", data);

    switch (data.type) {
      case "battle_update":
        this.onBattleUpdate?.(data);
        break;
      case "move_made":
        this.onMoveMade?.(data);
        break;
      case "battle_finished":
        this.onBattleFinished?.(data);
        break;
      case "battle_error":
        this.onBattleError?.(data);
        break;
      default:
        console.log("Unknown WebSocket message type:", data.type);
    }
  }

  // WebSocket event handlers (can be overridden)
  onBattleUpdate(data) {
    console.log("Battle update:", data);
  }

  onMoveMade(data) {
    console.log("Move made:", data);
  }

  onBattleFinished(data) {
    console.log("Battle finished:", data);
  }

  onBattleError(data) {
    console.error("Battle error:", data);
  }

  // ==========================================
  // HEALTH CHECK
  // ==========================================

  async checkHealth() {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: "GET",
        timeout: 5000,
      });

      if (response.ok) {
        console.log("✅ Backend is healthy");
        return true;
      } else {
        console.warn("⚠️ Backend health check failed");
        return false;
      }
    } catch (error) {
      console.error("❌ Backend health check error:", error);
      return false;
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  async testConnection() {
    console.log("🔍 Testing API connection...");

    try {
      const isHealthy = await this.checkHealth();
      if (isHealthy) {
        console.log("✅ API connection successful");
        return { success: true, message: "Connected to FastAPI backend" };
      } else {
        throw new Error("Health check failed");
      }
    } catch (error) {
      console.error("❌ API connection failed:", error);
      return {
        success: false,
        message: `Failed to connect to FastAPI backend: ${error.message}`,
        baseURL: this.baseURL,
      };
    }
  }

  // Legacy compatibility methods (for existing code)
  async getRecentGames(limit = 10) {
    try {
      const data = await this.getDashboardData();
      return data.recentGames?.slice(0, limit) || [];
    } catch (error) {
      console.warn("Recent games not available");
      return [];
    }
  }

  async getStats() {
    try {
      return await this.getArenaStats();
    } catch (error) {
      console.warn("Stats not available");
      return { total_games: 0, active_models: 0 };
    }
  }

  async getGlobalStats() {
    return this.getStats();
  }

  async getResultsByModel() {
    try {
      const data = await this.getDashboardData();
      return data.modelStats || [];
    } catch (error) {
      return [];
    }
  }

  async getWinrateData() {
    try {
      const data = await this.getDashboardData();
      return data.winrateData || [];
    } catch (error) {
      return [];
    }
  }
}

// Initialize global API instance
window.Api = Api;
window.api = new Api();

// Test connection on load
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🔌 Testing API connection...");

  const connectionTest = await window.api.testConnection();

  if (connectionTest.success) {
    console.log("✅ API ready");
    // Connect WebSocket
    window.api.connectWebSocket();
  } else {
    console.error("❌ API connection failed:", connectionTest.message);

    // Show connection error toast
    if (typeof showToast === "function") {
      showToast(`Erro de conexão: ${connectionTest.message}`, "error", 10000);
    }
  }
});

// Export for modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = Api;
}
