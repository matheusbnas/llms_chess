// ♟️ LLM Chess Arena - Charts Management

class ChartManager {
  constructor() {
    this.charts = new Map();
    this.defaultColors = [
      "#759900", // Lichess Green
      "#3893e8", // Lichess Blue
      "#8b4513", // Lichess Brown
      "#f39c12", // Orange
      "#e74c3c", // Red
      "#9b59b6", // Purple
      "#27ae60", // Success Green
      "#95a5a6", // Gray
    ];
    this.darkTheme = {
      color: "#ffffff",
      backgroundColor: "transparent",
      gridColor: "rgba(255, 255, 255, 0.1)",
      tickColor: "#ffffff",
    };
  }

  // Create or update a chart
  createChart(canvasId, config) {
    // Check if Chart.js is available
    if (typeof Chart === "undefined") {
      console.error("Chart.js is not loaded");
      return null;
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.error(`Canvas element ${canvasId} not found`);
      return null;
    }

    // Destroy existing chart if it exists
    if (this.charts.has(canvasId)) {
      this.charts.get(canvasId).destroy();
    }

    // Apply dark theme defaults
    const chartConfig = this.applyDarkTheme(config);

    // Create new chart
    const chart = new Chart(canvas, chartConfig);
    this.charts.set(canvasId, chart);

    return chart;
  }

  // Apply dark theme styling
  applyDarkTheme(config) {
    const darkConfig = JSON.parse(JSON.stringify(config)); // Deep clone

    // Apply dark theme to plugins
    if (!darkConfig.options) darkConfig.options = {};
    if (!darkConfig.options.plugins) darkConfig.options.plugins = {};
    if (!darkConfig.options.plugins.legend)
      darkConfig.options.plugins.legend = {};
    if (!darkConfig.options.plugins.tooltip)
      darkConfig.options.plugins.tooltip = {};

    // Legend styling
    darkConfig.options.plugins.legend.labels = {
      color: this.darkTheme.color,
      ...darkConfig.options.plugins.legend.labels,
    };

    // Tooltip styling
    darkConfig.options.plugins.tooltip = {
      backgroundColor: "rgba(38, 36, 33, 0.9)",
      titleColor: this.darkTheme.color,
      bodyColor: this.darkTheme.color,
      borderColor: "rgba(255, 255, 255, 0.1)",
      borderWidth: 1,
      ...darkConfig.options.plugins.tooltip,
    };

    // Scale styling
    if (darkConfig.options.scales) {
      Object.keys(darkConfig.options.scales).forEach((scaleKey) => {
        const scale = darkConfig.options.scales[scaleKey];
        if (scale.ticks) {
          scale.ticks.color = this.darkTheme.tickColor;
        }
        if (scale.grid) {
          scale.grid.color = this.darkTheme.gridColor;
        }
      });
    }

    return darkConfig;
  }

  // Performance Results Chart
  createPerformanceChart(canvasId, data) {
    const config = {
      type: "bar",
      data: {
        labels: data.models || [
          "GPT-4o",
          "Gemini-Pro",
          "Claude-3.5",
          "GPT-4-Turbo",
          "Deepseek-R1",
        ],
        datasets: [
          {
            label: "Vitórias",
            data: data.wins || [45, 38, 52, 34, 28],
            backgroundColor: this.defaultColors[0],
            borderRadius: 4,
          },
          {
            label: "Derrotas",
            data: data.losses || [25, 32, 18, 36, 42],
            backgroundColor: this.defaultColors[4],
            borderRadius: 4,
          },
          {
            label: "Empates",
            data: data.draws || [12, 18, 15, 20, 16],
            backgroundColor: this.defaultColors[7],
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            position: "top",
          },
          tooltip: {
            callbacks: {
              footer: (tooltipItems) => {
                const total = tooltipItems.reduce(
                  (sum, item) => sum + item.parsed.y,
                  0
                );
                return `Total: ${total} jogos`;
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: {
              display: false,
            },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: {
              stepSize: 10,
            },
          },
        },
      },
    };

    return this.createChart(canvasId, config);
  }

  // Win Rate Distribution Chart
  createWinRateChart(canvasId, data) {
    const config = {
      type: "doughnut",
      data: {
        labels: data.labels || [
          "Vitórias Brancas",
          "Vitórias Pretas",
          "Empates",
        ],
        datasets: [
          {
            data: data.values || [168, 132, 89],
            backgroundColor: [
              this.defaultColors[0],
              this.defaultColors[4],
              this.defaultColors[7],
            ],
            borderWidth: 2,
            borderColor: "rgba(255, 255, 255, 0.1)",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "60%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 20,
              usePointStyle: true,
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.parsed * 100) / total).toFixed(1);
                return `${context.label}: ${context.parsed} (${percentage}%)`;
              },
            },
          },
        },
      },
    };

    return this.createChart(canvasId, config);
  }

  // ELO Evolution Chart
  createEloChart(canvasId, data) {
    const config = {
      type: "line",
      data: data || this.generateEloHistoryData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            position: "top",
          },
          tooltip: {
            callbacks: {
              title: (tooltipItems) => {
                return `Data: ${tooltipItems[0].label}`;
              },
              label: (context) => {
                return `${context.dataset.label}: ${context.parsed.y} ELO`;
              },
            },
          },
        },
        scales: {
          x: {
            display: true,
            grid: {
              display: false,
            },
          },
          y: {
            display: true,
            min: 1400,
            max: 2000,
            ticks: {
              stepSize: 100,
            },
          },
        },
        elements: {
          line: {
            tension: 0.4,
            borderWidth: 3,
          },
          point: {
            radius: 0,
            hoverRadius: 6,
          },
        },
      },
    };

    return this.createChart(canvasId, config);
  }

  // Opening Performance Chart
  createOpeningChart(canvasId, data) {
    const config = {
      type: "bar",
      data: {
        labels: data.openings || [
          "1.e4",
          "1.d4",
          "1.Nf3",
          "1.c4",
          "Sicilian",
          "French",
        ],
        datasets: [
          {
            label: "Win Rate %",
            data: data.winRates || [58, 52, 55, 49, 45, 48],
            backgroundColor: this.defaultColors[1],
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `Win Rate: ${context.parsed.y}%`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
          },
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: (value) => `${value}%`,
            },
          },
        },
      },
    };

    return this.createChart(canvasId, config);
  }

  // Accuracy Radar Chart
  createAccuracyChart(canvasId, data) {
    const config = {
      type: "radar",
      data: {
        labels: data.categories || [
          "Abertura",
          "Meio-jogo",
          "Final",
          "Tática",
          "Estratégia",
        ],
        datasets: data.models || [
          {
            label: "GPT-4o",
            data: [89, 87, 82, 85, 88],
            borderColor: this.defaultColors[0],
            backgroundColor: this.defaultColors[0] + "33",
            borderWidth: 2,
          },
          {
            label: "Gemini-Pro",
            data: [85, 83, 79, 88, 84],
            borderColor: this.defaultColors[1],
            backgroundColor: this.defaultColors[1] + "33",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            grid: {
              color: this.darkTheme.gridColor,
            },
            angleLines: {
              color: this.darkTheme.gridColor,
            },
            pointLabels: {
              color: this.darkTheme.color,
            },
            ticks: {
              color: this.darkTheme.tickColor,
              backdropColor: "transparent",
            },
          },
        },
        plugins: {
          legend: {
            position: "top",
          },
        },
        elements: {
          line: {
            borderWidth: 3,
          },
          point: {
            radius: 4,
            hoverRadius: 6,
          },
        },
      },
    };

    return this.createChart(canvasId, config);
  }

  // Color Performance Chart
  createColorPerformanceChart(canvasId, data) {
    const config = {
      type: "bar",
      data: {
        labels: data.models || [
          "GPT-4o",
          "Gemini-Pro",
          "Claude-3.5",
          "GPT-4-Turbo",
        ],
        datasets: [
          {
            label: "Brancas %",
            data: data.whitePerformance || [62, 58, 65, 55],
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            borderColor: "rgba(255, 255, 255, 1)",
            borderWidth: 1,
          },
          {
            label: "Pretas %",
            data: data.blackPerformance || [48, 52, 58, 45],
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            borderColor: "rgba(0, 0, 0, 1)",
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
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.dataset.label}: ${context.parsed.y}%`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
          },
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: (value) => `${value}%`,
            },
          },
        },
      },
    };

    return this.createChart(canvasId, config);
  }

  // Time Series Chart (generic)
  createTimeSeriesChart(canvasId, data, options = {}) {
    const config = {
      type: "line",
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            position: "top",
          },
        },
        scales: {
          x: {
            type: "time",
            time: {
              tooltipFormat: "DD/MM/YYYY",
              displayFormats: {
                day: "DD/MM",
                week: "DD/MM",
                month: "MMM YYYY",
              },
            },
            grid: {
              display: false,
            },
          },
          y: {
            beginAtZero: options.beginAtZero || false,
          },
        },
        elements: {
          line: {
            tension: 0.4,
            borderWidth: 2,
          },
          point: {
            radius: 0,
            hoverRadius: 4,
          },
        },
        ...options,
      },
    };

    return this.createChart(canvasId, config);
  }

  // Generate sample ELO history data
  generateEloHistoryData() {
    const models = ["GPT-4o", "Gemini-Pro", "Claude-3.5"];
    const labels = [];
    const datasets = [];

    // Generate 30 days of data
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(
        date.toLocaleDateString("pt-BR", { month: "short", day: "numeric" })
      );
    }

    models.forEach((model, index) => {
      const data = [];
      let elo = 1500 + Math.random() * 200;

      for (let i = 0; i < 30; i++) {
        elo += (Math.random() - 0.5) * 30;
        elo = Math.max(1200, Math.min(1900, elo));
        data.push(Math.round(elo));
      }

      datasets.push({
        label: model,
        data: data,
        borderColor: this.defaultColors[index],
        backgroundColor: this.defaultColors[index] + "33",
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 6,
      });
    });

    return { labels, datasets };
  }

  // Update chart data
  updateChart(canvasId, newData) {
    const chart = this.charts.get(canvasId);
    if (!chart) {
      console.warn(`Chart ${canvasId} not found`);
      return;
    }

    // Update data
    if (newData.labels) {
      chart.data.labels = newData.labels;
    }
    if (newData.datasets) {
      chart.data.datasets = newData.datasets;
    }

    // Trigger update with animation
    chart.update("active");
  }

  // Destroy a specific chart
  destroyChart(canvasId) {
    const chart = this.charts.get(canvasId);
    if (chart) {
      chart.destroy();
      this.charts.delete(canvasId);
    }
  }

  // Destroy all charts
  destroyAllCharts() {
    this.charts.forEach((chart, canvasId) => {
      chart.destroy();
    });
    this.charts.clear();
  }

  // Resize all charts
  resizeAllCharts() {
    this.charts.forEach((chart) => {
      chart.resize();
    });
  }

  // Export chart as image
  exportChart(canvasId, filename) {
    const chart = this.charts.get(canvasId);
    if (!chart) {
      console.warn(`Chart ${canvasId} not found`);
      return;
    }

    const url = chart.toBase64Image();
    const link = document.createElement("a");
    link.download = filename || `chart_${canvasId}.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Get chart instance
  getChart(canvasId) {
    return this.charts.get(canvasId);
  }

  // Check if chart exists
  hasChart(canvasId) {
    return this.charts.has(canvasId);
  }

  // Get all chart instances
  getAllCharts() {
    return Array.from(this.charts.values());
  }
}

// Create global chart manager instance
const chartManager = new ChartManager();

// Export for global use
window.chartManager = chartManager;
window.ChartManager = ChartManager;

// Convenience functions
window.createChart = (canvasId, config) =>
  chartManager.createChart(canvasId, config);
window.updateChart = (canvasId, newData) =>
  chartManager.updateChart(canvasId, newData);
window.destroyChart = (canvasId) => chartManager.destroyChart(canvasId);

// Auto-resize charts on window resize
window.addEventListener(
  "resize",
  Utils.debounce(() => {
    chartManager.resizeAllCharts();
  }, 250)
);
