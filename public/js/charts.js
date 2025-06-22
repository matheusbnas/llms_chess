// charts.js - Funções auxiliares para Chart.js

class ChartManager {
  constructor() {
    this.charts = new Map();
  }

  createChart(canvasId, type, data, options) {
    if (this.charts.has(canvasId)) {
      this.charts.get(canvasId).destroy();
    }

    const canvasElement = document.getElementById(canvasId);
    if (!canvasElement) {
      console.error(`Canvas element with id ${canvasId} not found.`);
      return null;
    }

    const ctx = canvasElement.getContext("2d");
    const chart = new Chart(ctx, {
      type,
      data,
      options,
    });

    this.charts.set(canvasId, chart);
    return chart;
  }

  getChart(canvasId) {
    return this.charts.get(canvasId);
  }
}

/**
 * Cria um gráfico de barras.
 * @param {HTMLCanvasElement} canvasElement - O elemento canvas.
 * @param {object} data - Os dados para o gráfico (seguindo a estrutura do Chart.js).
 * @param {string} title - O título do gráfico.
 * @returns {Chart} - A instância do gráfico Chart.js.
 */
function createBarChart(canvasElement, data, title) {
  if (!canvasElement) return null;
  const ctx = canvasElement.getContext("2d");
  if (!ctx) return null;

  return new Chart(ctx, {
    type: "bar",
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: "#ccc",
            font: {
              family: "'Roboto', sans-serif",
            },
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
        },
        x: {
          ticks: {
            color: "#ccc",
            font: {
              family: "'Roboto', sans-serif",
            },
          },
          grid: {
            display: false,
          },
        },
      },
    },
  });
}

/**
 * Cria um gráfico de barras empilhadas horizontal.
 * @param {HTMLCanvasElement} canvasElement - O elemento canvas.
 * @param {object} data - Os dados para o gráfico.
 * @param {string} title - O título do gráfico.
 * @returns {Chart} - A instância do gráfico Chart.js.
 */
function createStackedBarChart(canvasElement, data, title) {
  if (!canvasElement) return null;
  const ctx = canvasElement.getContext("2d");
  if (!ctx) return null;

  // Nomes dos jogadores para as legendas
  const p1Label = data.datasets[0].label;
  const p2Label = data.datasets[1].label;
  data.datasets[0].label = p1Label ? `Vitórias ${p1Label}` : "Vitórias P1";
  data.datasets[1].label = p2Label ? `Vitórias ${p2Label}` : "Vitórias P2";

  return new Chart(ctx, {
    type: "bar",
    data: data,
    options: {
      indexAxis: "y", // Gráfico de barras horizontal
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            color: "#ccc",
            font: {
              family: "'Roboto', sans-serif",
            },
          },
        },
        title: {
          display: false,
        },
      },
      scales: {
        x: {
          stacked: true,
          ticks: {
            color: "#ccc",
            font: {
              family: "'Roboto', sans-serif",
            },
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            color: "#ccc",
            font: {
              family: "'Roboto', sans-serif",
            },
          },
          grid: {
            display: false,
          },
        },
      },
    },
  });
}
