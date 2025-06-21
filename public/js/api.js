// ♟️ LLM Chess Arena - API Management

class APIManager {
  constructor() {
    this.baseURL = "";
    this.timeout = 30000;
    this.retryAttempts = 3;
    this.retryDelay = 1000;

    // Cache for GET requests
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Core HTTP methods
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

    // Add cache key for GET requests
    const cacheKey = `${config.method || "GET"}_${url}_${JSON.stringify(
      config.body || {}
    )}`;

    // Check cache for GET requests
    if (!config.method || config.method === "GET") {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

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
          throw new APIError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status
          );
        }

        const data = await response.json();

        // Cache successful GET requests
        if (!config.method || config.method === "GET") {
          this.setCache(cacheKey, data);
        }

        return data;
      } catch (error) {
        lastError = error;
        console.warn(`API request attempt ${attempt + 1} failed:`, error);

        // Don't retry on 4xx errors (client errors)
        if (error.status >= 400 && error.status < 500) {
          break;
        }

        // Wait before retry
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

  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  }

  async patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // Cache management
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.cacheTimeout;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clearCache() {
    this.cache.clear();
  }

  // Utility methods
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Custom error class for API errors
class APIError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "APIError";
    this.status = status;
  }
}

// API endpoints and methods
class ChessAPI extends APIManager {
  constructor() {
    super();
  }

  // Health check
  async checkHealth() {
    try {
      return await this.get("/api/health");
    } catch (error) {
      throw new APIError("Server health check failed", 0);
    }
  }

  // Game endpoints
  async getGames(params = {}) {
    return this.get("/api/games", params);
  }

  async getGame(gameId) {
    return this.get(`/api/games/${gameId}`);
  }

  async getRecentGames(limit = 10) {
    return this.get("/api/games/recent", { limit });
  }

  async startBattle(config) {
    return this.post("/api/games/battle", config);
  }

  async startHumanGame(config) {
    return this.post("/api/games/human", config);
  }

  async makeMove(gameId, move) {
    return this.post(`/api/games/human/${gameId}/move`, { move });
  }

  async deleteGame(gameId) {
    return this.delete(`/api/games/${gameId}`);
  }

  // Model endpoints
  async getModels() {
    return this.get("/api/models");
  }

  async getAvailableModels() {
    return this.get("/api/models/available");
  }

  async updateModelConfig(modelName, config) {
    return this.put(`/api/models/${modelName}`, config);
  }

  // Analysis endpoints
  async getGlobalAnalysis() {
    return this.get("/api/analysis/global");
  }

  // Alias for getGlobalStats to match the function name used in main.js
  async getGlobalAnalysis() {
    return this.getGlobalStats();
  }

  async getModelAnalysis(modelName) {
    return this.get(`/api/analysis/models/${modelName}`);
  }

  async getEloRankings() {
    return this.get("/api/analysis/elo");
  }

  async getOpeningAnalysis() {
    return this.get("/api/analysis/openings");
  }

  async analyzeGame(gameId, options = {}) {
    return this.post(`/api/analysis/games/${gameId}`, options);
  }

  async compareModels(model1, model2, options = {}) {
    return this.post("/api/analysis/compare", { model1, model2, ...options });
  }

  // Lichess integration
  async testLichessConnection(token) {
    return this.post("/api/lichess/test", { token });
  }

  async importLichessGames(config) {
    return this.post("/api/lichess/import", config);
  }

  async getLichessUser(username) {
    return this.get(`/api/lichess/user/${username}`);
  }

  // Settings endpoints
  async getSettings() {
    return this.get("/api/settings");
  }

  async updateSettings(settings) {
    return this.put("/api/settings", settings);
  }

  async resetSettings() {
    return this.post("/api/settings/reset");
  }

  // Data management
  async exportData(type = "all") {
    return this.get("/api/data/export", { type });
  }

  async importData(data) {
    return this.post("/api/data/import", data);
  }

  async getStatistics(timeframe = "30d") {
    return this.get("/api/data/statistics", { timeframe });
  }

  // Tournament endpoints
  async createTournament(config) {
    return this.post("/api/tournaments", config);
  }

  async getTournaments() {
    return this.get("/api/tournaments");
  }

  async getTournament(tournamentId) {
    return this.get(`/api/tournaments/${tournamentId}`);
  }

  async joinTournament(tournamentId, modelName) {
    return this.post(`/api/tournaments/${tournamentId}/join`, { modelName });
  }

  async startTournament(tournamentId) {
    return this.post(`/api/tournaments/${tournamentId}/start`);
  }

  // Batch operations
  async batchRequest(requests) {
    return this.post("/api/batch", { requests });
  }

  // File upload
  async uploadPGN(file) {
    const formData = new FormData();
    formData.append("pgn", file);

    return this.request("/api/data/upload/pgn", {
      method: "POST",
      body: formData,
      headers: {}, // Remove Content-Type to let browser set it
    });
  }

  async uploadConfig(file) {
    const formData = new FormData();
    formData.append("config", file);

    return this.request("/api/data/upload/config", {
      method: "POST",
      body: formData,
      headers: {},
    });
  }
}

// Fallback data for offline mode
class FallbackAPI {
  constructor() {
    this.fallbackData = {
      games: this.generateFallbackGames(),
      models: this.generateFallbackModels(),
      analysis: this.generateFallbackAnalysis(),
      rankings: this.generateFallbackRankings(),
    };
  }

  async checkHealth() {
    throw new APIError("Server not available - using offline mode", 0);
  }

  async getGlobalAnalysis() {
    return {
      totalGames: 248,
      activeModels: 8,
      avgGameLength: 42,
      tournamentsCompleted: 12,
      serverUptime: 3600,
      lastGamePlayed: new Date().toISOString(),
    };
  }

  async getRecentGames(limit = 10) {
    return this.fallbackData.games.slice(0, limit);
  }

  async getModels() {
    return this.fallbackData.models;
  }

  async getAvailableModels() {
    const available = {};
    this.fallbackData.models.forEach((model) => {
      available[model.name] = model.available;
    });
    return available;
  }

  async getEloRankings() {
    return this.fallbackData.rankings;
  }

  generateFallbackGames() {
    const models = [
      "GPT-4o",
      "Gemini-Pro",
      "Claude-3.5-Sonnet",
      "GPT-4-Turbo",
      "Deepseek-R1",
    ];
    const results = ["1-0", "0-1", "1/2-1/2"];
    const games = [];

    for (let i = 0; i < 50; i++) {
      const white = models[Math.floor(Math.random() * models.length)];
      let black = models[Math.floor(Math.random() * models.length)];
      while (black === white) {
        black = models[Math.floor(Math.random() * models.length)];
      }

      games.push({
        id: `game_${i + 1}`,
        White: white,
        Black: black,
        Result: results[Math.floor(Math.random() * results.length)],
        Moves: Math.floor(Math.random() * 60) + 20,
        Date: new Date(
          Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        Opening: [
          "Italian Game",
          "Queen's Gambit",
          "Sicilian Defense",
          "English Opening",
        ][Math.floor(Math.random() * 4)],
      });
    }

    return games;
  }

  generateFallbackModels() {
    return [
      { name: "GPT-4o", available: true, elo: 1823, games: 142 },
      { name: "Gemini-Pro", available: true, elo: 1798, games: 128 },
      { name: "Claude-3.5-Sonnet", available: true, elo: 1847, games: 156 },
      { name: "GPT-4-Turbo", available: true, elo: 1756, games: 98 },
      { name: "Deepseek-R1", available: true, elo: 1634, games: 67 },
      { name: "Llama-3.1-70B", available: false, elo: 1689, games: 76 },
    ];
  }

  generateFallbackAnalysis() {
    return {
      accuracy: {
        "GPT-4o": 87.3,
        "Gemini-Pro": 85.1,
        "Claude-3.5-Sonnet": 89.2,
        "GPT-4-Turbo": 84.6,
      },
      blunders: {
        "GPT-4o": 0.8,
        "Gemini-Pro": 1.1,
        "Claude-3.5-Sonnet": 0.6,
        "GPT-4-Turbo": 1.3,
      },
    };
  }

  generateFallbackRankings() {
    return [
      { model: "Claude-3.5-Sonnet", elo: 1847, games: 156, winRate: 68 },
      { model: "GPT-4o", elo: 1823, games: 142, winRate: 64 },
      { model: "Gemini-Pro", elo: 1798, games: 128, winRate: 61 },
      { model: "GPT-4-Turbo", elo: 1756, games: 98, winRate: 58 },
      { model: "Llama-3.1-70B", elo: 1689, games: 76, winRate: 52 },
      { model: "Deepseek-R1", elo: 1634, games: 67, winRate: 49 },
    ];
  }

  // Stub methods for fallback
  async startBattle() {
    throw new APIError("Feature not available offline", 503);
  }
  async startHumanGame() {
    throw new APIError("Feature not available offline", 503);
  }
  async analyzeGame() {
    throw new APIError("Feature not available offline", 503);
  }
  async updateSettings() {
    throw new APIError("Feature not available offline", 503);
  }
}

// Create global API instance
const api = new ChessAPI();
const fallbackAPI = new FallbackAPI();

// Smart API that switches between real and fallback
class SmartAPI {
  constructor() {
    this.useRealAPI = true;
    this.realAPI = api;
    this.fallbackAPI = fallbackAPI;
  }

  async request(method, ...args) {
    if (this.useRealAPI) {
      try {
        return await this.realAPI[method](...args);
      } catch (error) {
        // Switch to fallback on server errors
        if (error.status === 0 || error.status >= 500) {
          console.warn(`Switching to fallback API due to error:`, error);
          this.useRealAPI = false;

          // Try fallback if method exists
          if (typeof this.fallbackAPI[method] === "function") {
            return await this.fallbackAPI[method](...args);
          }
        }
        throw error;
      }
    } else {
      // Use fallback API
      if (typeof this.fallbackAPI[method] === "function") {
        return await this.fallbackAPI[method](...args);
      }
      throw new APIError(`Method ${method} not available in offline mode`, 503);
    }
  }

  // Proxy all API methods
  async checkHealth() {
    return this.request("checkHealth");
  }
  async getGames(params) {
    return this.request("getGames", params);
  }
  async getGame(gameId) {
    return this.request("getGame", gameId);
  }
  async getRecentGames(limit) {
    return this.request("getRecentGames", limit);
  }
  async startBattle(config) {
    return this.request("startBattle", config);
  }
  async startHumanGame(config) {
    return this.request("startHumanGame", config);
  }
  async makeMove(gameId, move) {
    return this.request("makeMove", gameId, move);
  }
  async getModels() {
    return this.request("getModels");
  }
  async getAvailableModels() {
    return this.request("getAvailableModels");
  }
  async getGlobalAnalysis() {
    return this.request("getGlobalAnalysis");
  }
  async getModelAnalysis(modelName) {
    return this.request("getModelAnalysis", modelName);
  }
  async getEloRankings() {
    return this.request("getEloRankings");
  }
  async getOpeningAnalysis() {
    return this.request("getOpeningAnalysis");
  }
  async analyzeGame(gameId, options) {
    return this.request("analyzeGame", gameId, options);
  }
  async compareModels(model1, model2, options) {
    return this.request("compareModels", model1, model2, options);
  }
  async getSettings() {
    return this.request("getSettings");
  }
  async updateSettings(settings) {
    return this.request("updateSettings", settings);
  }
  async exportData(type) {
    return this.request("exportData", type);
  }
  async importData(data) {
    return this.request("importData", data);
  }
  async getStatistics(timeframe) {
    return this.request("getStatistics", timeframe);
  }

  // Force reconnection attempt
  async reconnect() {
    try {
      await this.realAPI.checkHealth();
      this.useRealAPI = true;
      console.log("✅ Reconnected to server API");
      return true;
    } catch (error) {
      console.warn("❌ Reconnection failed");
      return false;
    }
  }

  isOnline() {
    return this.useRealAPI;
  }
}

// Export the smart API instance
window.smartAPI = new SmartAPI();
window.ChessAPI = ChessAPI;
window.APIError = APIError;

// Backward compatibility
window.fetchAPI = async function (endpoint, options = {}) {
  return api.request(endpoint, options);
};
