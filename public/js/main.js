// ♟️ LLM Chess Arena - Main Application
class ChessArena {
  constructor() {
    this.currentPage = "dashboard";
    this.socket = null;
    this.charts = {};
    this.games = new Map();
    this.tournaments = new Map();

    this.init();
  }

  async init() {
    console.log("🚀 Initializing Chess Arena...");

    // Setup core functionality
    this.setupNavigation();
    this.setupEventListeners();

    // Check server health
    try {
      await this.checkServerHealth();
      this.connectWebSocket();
    } catch (error) {
      console.warn("Server not ready, using offline mode");
      this.showToast("Modo offline - dados limitados disponíveis", "warning");
    }

    // Load initial page
    await this.showPage("dashboard");

    console.log("✅ Chess Arena initialized successfully");
  }

  // Server Health Check
  async checkServerHealth() {
    try {
      const response = await fetch("/api/health", {
        method: "GET",
        timeout: 5000,
      });

      if (response.ok) {
        console.log("✅ Server is healthy");
        return true;
      }
      throw new Error("Server health check failed");
    } catch (error) {
      console.warn("⚠️ Server health check failed:", error);
      throw error;
    }
  }

  // Navigation Management
  setupNavigation() {
    const navButtons = document.querySelectorAll(".nav-btn");

    navButtons.forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const page = btn.dataset.page;

        if (page && page !== this.currentPage) {
          await this.showPage(page);

          // Update active nav button
          navButtons.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
        }
      });
    });
  }

  async showPage(pageId) {
    try {
      this.showLoading(`Carregando ${pageId}...`);

      // Load page content
      const content = await this.loadPage(pageId);

      // Update page content
      const container = document.getElementById("page-content");
      if (container) {
        container.innerHTML = content;
        this.currentPage = pageId;

        // Initialize page-specific functionality
        await this.initializePage(pageId);
      }

      this.hideLoading();
    } catch (error) {
      console.error(`Error loading page ${pageId}:`, error);
      this.showToast(`Erro ao carregar página: ${pageId}`, "error");
      this.hideLoading();
    }
  }

  async loadPage(pageId) {
    try {
      const response = await fetch(`/pages/${pageId}.html`);
      if (!response.ok) {
        throw new Error(`Failed to load page: ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      console.error(`Could not load page ${pageId}:`, error);
      return '<div class="text-center p-32"><h2>Página não encontrada</h2><p>Verifique se o arquivo existe em /pages e se o servidor está configurado corretamente.</p></div>';
    }
  }

  async initializePage(pageId) {
    switch (pageId) {
      case "dashboard":
        await this.initializeDashboard();
        break;
      case "arena":
        await this.initializeArena();
        break;
      case "play":
        await this.initializePlay();
        break;
      case "analysis":
        await this.initializeAnalysis();
        break;
      case "rankings":
        await this.initializeRankings();
        break;
      case "settings":
        await this.initializeSettings();
        break;
    }
  }

  async initializeDashboard() {
    console.log("Initializing dashboard...");
    this.initializeCharts();
    await this.loadDashboardData();
  }

  async loadDashboardData() {
    try {
      const metrics = await window.smartAPI.getGlobalAnalysis();
      const games = await window.smartAPI.getRecentGames(10);
      this.updateMetrics(metrics);
      this.updateRecentGamesTable(games.slice(0, 10));
      this.updateCharts(metrics.modelPerformance, metrics.winLossDraw);
    } catch (error) {
      console.error("Failed to load dashboard data", error);
      this.showToast("Falha ao carregar dados do dashboard", "error");
      console.error('Failed to load dashboard data:', error);
    }
  }

  updateMetrics(metrics) {
    this.animateNumber(
      document.getElementById("total-games"),
      metrics.totalGames
    );
    this.animateNumber(
      document.getElementById("active-models"),
      metrics.activeModels
    );
    this.animateNumber(document.getElementById("avg-moves"), metrics.avgMoves);
    this.animateNumber(
      document.getElementById("tournaments"),
      metrics.totalTournaments
    );
  }

  animateNumber(element, targetValue) {
    if (!element) return;
    const startValue = parseInt(element.innerText) || 0;
    const duration = 1500;
    const startTime = performance.now();

    const update = (currentTime) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      const currentValue = Math.floor(
        progress * (targetValue - startValue) + startValue
      );
      element.innerText = currentValue;

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };
    requestAnimationFrame(update);
  }

  initializeCharts() {
    this.initResultsChart();
    this.initWinrateChart();
  }

  initResultsChart() {
    const ctx = document.getElementById("results-chart")?.getContext("2d");
    if (!ctx) return;

    if (this.charts.results) this.charts.results.destroy();

    this.charts.results = new Chart(ctx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Vitórias",
            data: [],
            backgroundColor: "rgba(75, 192, 192, 0.6)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
          },
          {
            label: "Derrotas",
            data: [],
            backgroundColor: "rgba(255, 99, 132, 0.6)",
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 1,
          },
          {
            label: "Empates",
            data: [],
            backgroundColor: "rgba(201, 203, 207, 0.6)",
            borderColor: "rgba(201, 203, 207, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: getComputedStyle(document.documentElement)
                .getPropertyValue("--text-secondary")
                .trim(),
            },
          },
          x: {
            ticks: {
              color: getComputedStyle(document.documentElement)
                .getPropertyValue("--text-secondary")
                .trim(),
            },
          },
        },
        plugins: {
          legend: {
            labels: {
              color: getComputedStyle(document.documentElement)
                .getPropertyValue("--text-primary")
                .trim(),
            },
          },
        },
      },
    });
  }

  initWinrateChart() {
    const ctx = document.getElementById("winrate-chart")?.getContext("2d");
    if (!ctx) return;

    if (this.charts.winrate) this.charts.winrate.destroy();

    this.charts.winrate = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Vitórias", "Derrotas", "Empates"],
        datasets: [
          {
            data: [],
            backgroundColor: [
              "rgba(75, 192, 192, 0.7)",
              "rgba(255, 99, 132, 0.7)",
              "rgba(201, 203, 207, 0.7)",
            ],
            borderColor: [
              "rgba(75, 192, 192, 1)",
              "rgba(255, 99, 132, 1)",
              "rgba(201, 203, 207, 1)",
            ],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: {
              color: getComputedStyle(document.documentElement)
                .getPropertyValue("--text-primary")
                .trim(),
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                let label = context.label || "";
                if (label) {
                  label += ": ";
                }
                if (context.parsed !== null) {
                  label += context.parsed + "%";
                }
                return label;
              },
            },
          },
        },
      },
    });
  }

  updateCharts(modelPerformance, winLossDraw) {
    if (this.charts.results) {
      const labels = modelPerformance.map((m) => m.model);
      const wins = modelPerformance.map((m) => m.wins);
      const losses = modelPerformance.map((m) => m.losses);
      const draws = modelPerformance.map((m) => m.draws);

      this.charts.results.data.labels = labels;
      this.charts.results.data.datasets[0].data = wins;
      this.charts.results.data.datasets[1].data = losses;
      this.charts.results.data.datasets[2].data = draws;
      this.charts.results.update();
    }

    if (this.charts.winrate) {
      this.charts.winrate.data.datasets[0].data = [
        winLossDraw.wins,
        winLossDraw.losses,
        winLossDraw.draws,
      ];
      this.charts.winrate.update();
    }
  }

  connectWebSocket() {
    this.socket = io({
      transports: ["websocket"],
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    this.socket.on("connect", () => {
      console.log("🔌 Connected to WebSocket server");
      this.showToast("Conectado ao servidor", "success");
    });

    this.socket.on("disconnect", () => {
      console.log("🔌 Disconnected from WebSocket server");
      this.showToast("Desconectado do servidor", "warning");
    });

    this.socket.on("connect_error", (err) => {
      console.error("WebSocket connection error:", err);
      this.showToast("Erro de conexão com o servidor", "error");
    });

    this.socket.on("game-update", (data) => {
      console.log("Game update received:", data);
      // Handle real-time game updates
    });

    this.socket.on("battle-update", (data) => {
      console.log("Battle update:", data);
      if (this.currentPage === "arena") {
        // Update arena UI
      }
    });

    this.socket.on("new-game", (game) => {
      if (this.currentPage === "dashboard") {
        this.loadDashboardData();
      }
    });
  }

  setupEventListeners() {
    // Global event listener for actions
    document.addEventListener("click", this.handleGlobalClick.bind(this));

    // Keyboard shortcuts
    document.addEventListener(
      "keydown",
      this.handleKeyboardShortcuts.bind(this)
    );

    // Window resize
    window.addEventListener("resize", this.handleResize.bind(this));
  }

  handleGlobalClick(e) {
    const actionElement = e.target.closest("[data-action]");
    if (actionElement) {
      const action = actionElement.dataset.action;
      this.handleAction(action, actionElement);
    }
  }

  handleAction(action, element) {
    switch (action) {
      case "view-game":
        this.viewGame(element.dataset.gameId);
        break;
      case "start-battle":
        this.startBattle();
        break;
      case "export-data":
        this.exportData(element.dataset.type);
        break;
      // Add other actions here
    }
  }

  handleKeyboardShortcuts(e) {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case "1":
          e.preventDefault();
          this.showPage("dashboard");
          break;
        case "2":
          e.preventDefault();
          this.showPage("arena");
          break;
        case "3":
          e.preventDefault();
          this.showPage("play");
          break;
        case "d":
          e.preventDefault();
          // Toggle dark/light mode
          break;
      }
    }
  }

  handleResize() {
    // Debounce resize events
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      Object.values(this.charts).forEach((chart) => chart.resize());
    }, 250);
  }

  showLoading(message = "Carregando...") {
    const overlay = document.getElementById("loading-overlay");
    const text = document.getElementById("loading-text");
    if (overlay) {
      if (text) text.innerText = message;
      overlay.style.display = "flex";
    }
  }

  hideLoading() {
    const overlay = document.getElementById("loading-overlay");
    if (overlay) overlay.style.display = "none";
  }

  showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const iconClass = {
      info: "fas fa-info-circle",
      success: "fas fa-check-circle",
      warning: "fas fa-exclamation-triangle",
      error: "fas fa-times-circle",
    }[type];

    toast.innerHTML = `<i class="${iconClass}"></i><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("show");
      setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 500);
      }, 5000);
    }, 100);
  }

  async initializeArena() {
    console.log("Arena page initialized");
  }
  async initializePlay() {
    console.log("Play page initialized");
  }
  async initializeAnalysis() {
    console.log("Analysis page initialized");
  }
  async initializeRankings() {
    console.log("Rankings page initialized");
  }
  async initializeSettings() {
    console.log("Settings page initialized");
  }

  updateRecentGamesTable(games) {
    // Implementation needed
  }
  viewGame(gameId) {
    console.log(`Viewing game ${gameId}`);
  }
  startBattle() {
    console.log("Starting battle");
  }
  exportData(type) {
    console.log(`Exporting ${type}`);
  }
}

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  window.chessArena = new ChessArena();
});