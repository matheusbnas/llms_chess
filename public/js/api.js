// ♟️ LLM Chess Arena - API Management

class Api {
  constructor() {
    this.baseURL = "";
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
    return this.get("/data/dashboard");
  }

  async getAvailableModels() {
    return this.get("/data/models");
  }

  async getRecentGames() {
    return this.get("/data/recent-games");
  }

  async getStats() {
    return this.get("/data/stats");
  }
}
