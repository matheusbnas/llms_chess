import { Api } from "./api.js";
window.api = new Api();

class Settings {
  constructor() {
    this.currentSettings = {};
  }

  init() {
    this.loadSettings();
    this.setupTabs();
    this.setupEventListeners();
    this.loadDatabaseStats();
  }

  setupTabs() {
    this.tabs = document.querySelectorAll("#settings-page .tab-btn");
    this.tabContents = document.querySelectorAll("#settings-page .tab-content");

    // Limpa event listeners antigos (caso de re-render)
    this.tabs.forEach((btn) => {
      btn.replaceWith(btn.cloneNode(true));
    });
    this.tabs = document.querySelectorAll("#settings-page .tab-btn");

    // Adiciona atributos ARIA
    this.tabs.forEach((btn, idx) => {
      btn.setAttribute("role", "tab");
      btn.setAttribute("tabindex", idx === 0 ? "0" : "-1");
      btn.setAttribute(
        "aria-selected",
        btn.classList.contains("active") ? "true" : "false"
      );
      btn.setAttribute("aria-controls", `${btn.dataset.tab}-tab`);
    });
    this.tabContents.forEach((content) => {
      content.setAttribute("role", "tabpanel");
      content.setAttribute(
        "aria-labelledby",
        `${content.id.replace("-tab", "")}-tab-btn`
      );
    });

    // Clique do mouse
    this.tabs.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        this.switchTab(btn.dataset.tab, true);
      });
    });

    // Navegação por teclado
    this.tabs.forEach((btn, idx) => {
      btn.addEventListener("keydown", (e) => {
        let newIdx = null;
        if (e.key === "ArrowRight") {
          newIdx = (idx + 1) % this.tabs.length;
        } else if (e.key === "ArrowLeft") {
          newIdx = (idx - 1 + this.tabs.length) % this.tabs.length;
        } else if (e.key === "Home") {
          newIdx = 0;
        } else if (e.key === "End") {
          newIdx = this.tabs.length - 1;
        } else if (e.key === "Enter" || e.key === " ") {
          this.switchTab(btn.dataset.tab, true);
          return;
        }
        if (newIdx !== null) {
          this.tabs[newIdx].focus();
        }
      });
    });

    // Inicializa aba pelo hash da URL
    const hash = window.location.hash;
    let initialTab = this.tabs[0]?.dataset.tab;
    if (hash && hash.startsWith("#tab=")) {
      const tabFromHash = hash.replace("#tab=", "");
      if ([...this.tabs].some((btn) => btn.dataset.tab === tabFromHash)) {
        initialTab = tabFromHash;
      }
    }
    this.switchTab(initialTab, false);
  }

  switchTab(tabId, updateHash = false) {
    this.tabs.forEach((tab, idx) => {
      const isActive = tab.dataset.tab === tabId;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
      tab.setAttribute("tabindex", isActive ? "0" : "-1");
      if (isActive) tab.focus();
    });
    this.tabContents.forEach((content) => {
      content.classList.toggle("active", content.id === `${tabId}-tab`);
    });
    if (updateHash) {
      window.location.hash = `tab=${tabId}`;
    }
  }

  setupEventListeners() {
    // API Keys
    const saveKeysBtn = document.getElementById("save-api-keys");
    if (saveKeysBtn) {
      saveKeysBtn.addEventListener("click", () => this.saveAPIKeys());
    }

    // Model testing
    const testModelBtn = document.getElementById("test-model");
    if (testModelBtn) {
      testModelBtn.addEventListener("click", () => this.testSelectedModel());
    }

    // Lichess connection
    const connectLichessBtn = document.getElementById("connect-lichess");
    if (connectLichessBtn) {
      connectLichessBtn.addEventListener("click", () =>
        this.connectToLichess()
      );
    }

    // Data management
    const exportDataBtn = document.getElementById("export-data");
    if (exportDataBtn) {
      exportDataBtn.addEventListener("click", () => this.exportData());
    }

    const importDataBtn = document.getElementById("import-data");
    if (importDataBtn) {
      importDataBtn.addEventListener("click", () => this.importData());
    }

    const clearOldGamesBtn = document.getElementById("clear-old-games");
    if (clearOldGamesBtn) {
      clearOldGamesBtn.addEventListener("click", () => this.clearOldGames());
    }

    const resetDatabaseBtn = document.getElementById("reset-database");
    if (resetDatabaseBtn) {
      resetDatabaseBtn.addEventListener("click", () => this.resetDatabase());
    }

    // Range sliders
    this.setupRangeSliders();

    document
      .getElementById("lichess-token-form")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        // lógica de conexão aqui
      });
  }

  setupRangeSliders() {
    const sliders = [
      "temperature",
      "max-tokens",
      "thinking-time",
      "analysis-depth",
    ];

    sliders.forEach((sliderId) => {
      const slider = document.getElementById(sliderId);
      if (slider) {
        slider.addEventListener("input", (e) => {
          const valueSpan = document.getElementById(sliderId + "-value");
          if (valueSpan) {
            valueSpan.textContent = e.target.value;
          }
        });
      }
    });
  }

  async loadSettings() {
    try {
      const settings = await api.getSettings();
      this.currentSettings = settings;
      this.populateSettingsForm(settings);

      // Exibir informações do servidor se disponíveis
      if (settings.server_info) {
        this.displayServerInfo(settings.server_info);
      }

      // Load available models for testing
      const models = await api.getAvailableModels();
      this.updateTestModelSelector(models);
    } catch (error) {
      Utils.handleError(error, "loadSettings");
    }
  }

  populateSettingsForm(settings) {
    // Model parameters
    if (settings.modelParams) {
      const temperature = document.getElementById("temperature");
      if (temperature) {
        temperature.value = settings.modelParams.temperature || 0.1;
        document.getElementById("temperature-value").textContent =
          temperature.value;
      }

      const maxTokens = document.getElementById("max-tokens");
      if (maxTokens) {
        maxTokens.value = settings.modelParams.maxTokens || 1000;
        document.getElementById("max-tokens-value").textContent =
          maxTokens.value;
      }

      const thinkingTime = document.getElementById("thinking-time");
      if (thinkingTime) {
        thinkingTime.value = settings.modelParams.thinkingTime || 5;
        document.getElementById("thinking-time-value").textContent =
          thinkingTime.value;
      }
    }

    // Game settings
    if (settings.gameSettings) {
      const defaultTimeControl = document.getElementById(
        "default-time-control"
      );
      if (defaultTimeControl) {
        defaultTimeControl.value =
          settings.gameSettings.defaultTimeControl || "10";
      }

      const autoSaveGames = document.getElementById("auto-save-games");
      if (autoSaveGames) {
        autoSaveGames.checked = settings.gameSettings.autoSaveGames !== false;
      }

      const showCoordinates = document.getElementById("show-coordinates");
      if (showCoordinates) {
        showCoordinates.checked =
          settings.gameSettings.showCoordinates !== false;
      }

      const highlightLastMove = document.getElementById("highlight-last-move");
      if (highlightLastMove) {
        highlightLastMove.checked =
          settings.gameSettings.highlightLastMove !== false;
      }

      const autoAnalysis = document.getElementById("auto-analysis");
      if (autoAnalysis) {
        autoAnalysis.checked = settings.gameSettings.autoAnalysis === true;
      }

      const analysisDepth = document.getElementById("analysis-depth");
      if (analysisDepth) {
        analysisDepth.value = settings.gameSettings.analysisDepth || 12;
        document.getElementById("analysis-depth-value").textContent =
          analysisDepth.value;
      }

      const saveAnalysis = document.getElementById("save-analysis");
      if (saveAnalysis) {
        saveAnalysis.checked = settings.gameSettings.saveAnalysis !== false;
      }
    }
  }

  displayServerInfo(serverInfo) {
    const serverInfoDiv = document.getElementById("server-info");
    if (!serverInfoDiv) return;
    serverInfoDiv.innerHTML = `
      <div style="background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); padding: 24px 20px; margin-top: 8px; text-align: center;">
        <div style="font-size: 2.2rem; margin-bottom: 8px; color: #764ba2;">
          <i class="fas fa-server"></i>
        </div>
        <h4 style="font-weight: 700; color: #333; margin-bottom: 12px;">Informações do Servidor</h4>
        <ul style="list-style: none; padding: 0; margin: 0; font-size: 1.08rem; color: #444;">
          <li style="margin-bottom: 6px;"><i class='fab fa-node-js' style='color:#6cc24a; margin-right:6px;'></i><strong>Node.js:</strong> ${
            serverInfo.node_version
          }</li>
          <li style="margin-bottom: 6px;"><i class='fas fa-desktop' style='color:#007bff; margin-right:6px;'></i><strong>Plataforma:</strong> ${
            serverInfo.platform
          }</li>
          <li style="margin-bottom: 6px;"><i class='fas fa-clock' style='color:#ff9800; margin-right:6px;'></i><strong>Uptime:</strong> ${Utils.formatDuration(
            serverInfo.uptime
          )}</li>
          <li><i class='fas fa-memory' style='color:#9c27b0; margin-right:6px;'></i><strong>Memória:</strong> ${(
            serverInfo.memory_usage.rss /
            1024 /
            1024
          ).toFixed(1)} MB</li>
        </ul>
      </div>
    `;
  }

  updateTestModelSelector(models) {
    const testModelSelect = document.getElementById("test-model-select");
    if (testModelSelect) {
      testModelSelect.innerHTML =
        '<option value="">Selecione um modelo...</option>';
      Object.entries(models).forEach(([name, available]) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = `${available ? "🟢" : "🔴"} ${name}`;
        option.disabled = !available;
        testModelSelect.appendChild(option);
      });
    }
  }

  async saveAPIKeys() {
    const keys = {
      openai: document.getElementById("openai-key").value,
      google: document.getElementById("google-key").value,
      deepseek: document.getElementById("deepseek-key").value,
      groq: document.getElementById("groq-key").value,
    };

    // Check if at least one key is provided
    const hasKeys = Object.values(keys).some((key) => key.trim() !== "");
    if (!hasKeys) {
      Utils.showToast("Forneça pelo menos uma chave de API", "warning");
      return;
    }

    try {
      Utils.showLoading("Salvando chaves de API...");

      const result = await api.saveAPIKeys(keys);

      Utils.hideLoading();

      if (result.success) {
        Utils.showToast("✅ Chaves de API salvas com sucesso!", "success");
        Utils.showToast(
          "🔄 Reinicie a aplicação para aplicar as mudanças",
          "info",
          8000
        );
      } else {
        Utils.showToast(
          "❌ Erro ao salvar chaves: " + (result.error || "Erro desconhecido"),
          "error"
        );
      }
    } catch (error) {
      Utils.hideLoading();
      Utils.handleError(error, "saveAPIKeys");
    }
  }

  async testSelectedModel() {
    const modelSelect = document.getElementById("test-model-select");
    if (!modelSelect || !modelSelect.value) {
      Utils.showToast("Selecione um modelo para testar", "warning");
      return;
    }

    const modelName = modelSelect.value;

    try {
      Utils.showLoading("Testando modelo...");

      const result = await api.testModel(modelName);

      Utils.hideLoading();

      const testResults = document.getElementById("test-results");
      if (testResults) {
        if (result.success) {
          testResults.innerHTML = `
                        <div class="test-success">
                            <h4>✅ Modelo ${modelName} funcionando corretamente!</h4>
                            <p>Tempo de resposta: ${
                              result.response_time?.toFixed(2) || 0
                            }s</p>
                            <p>Resposta: ${result.response || "N/A"}</p>
                        </div>
                    `;
          Utils.showToast("✅ Teste do modelo bem-sucedido!", "success");
        } else {
          testResults.innerHTML = `
                        <div class="test-error">
                            <h4>❌ Erro no modelo ${modelName}</h4>
                            <p>${result.error || "Erro desconhecido"}</p>
                        </div>
                    `;
          Utils.showToast("❌ Teste do modelo falhou", "error");
        }
      }
    } catch (error) {
      Utils.hideLoading();
      Utils.handleError(error, "testSelectedModel");
    }
  }

  async connectToLichess() {
    const token = document.getElementById("settings-lichess-token").value;

    if (!token) {
      Utils.showToast("Insira o token do Lichess", "warning");
      return;
    }

    try {
      Utils.showLoading("Conectando ao Lichess...");

      const result = await api.testLichessConnection(token);

      Utils.hideLoading();

      if (result.success) {
        Utils.showToast("✅ Conectado ao Lichess com sucesso!", "success");
      } else {
        Utils.showToast(
          "❌ Erro na conexão: " + (result.error || "Token inválido"),
          "error"
        );
      }
    } catch (error) {
      Utils.hideLoading();
      Utils.handleError(error, "connectToLichess");
    }
  }

  async loadDatabaseStats() {
    try {
      const stats = await api.getDatabaseStats();
      this.displayDatabaseStats(stats);
    } catch (error) {
      Utils.handleError(error, "loadDatabaseStats");
    }
  }

  displayDatabaseStats(stats) {
    const statsContainer = document.getElementById("db-stats");
    if (statsContainer) {
      statsContainer.innerHTML = `
                <div class="metric-card">
                    <div class="metric-icon">🎮</div>
                    <div class="metric-content">
                        <h3>${stats.total_games || 0}</h3>
                        <p>Total de Partidas</p>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon">🤖</div>
                    <div class="metric-content">
                        <h3>${stats.unique_models || 0}</h3>
                        <p>Modelos Únicos</p>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon">💾</div>
                    <div class="metric-content">
                        <h3>${(stats.db_size_mb || 0).toFixed(1)} MB</h3>
                        <p>Tamanho do BD</p>
                    </div>
                </div>
            `;
    }
  }

  async exportData() {
    try {
      Utils.showLoading("Exportando dados...");

      const data = await api.exportData();

      Utils.hideLoading();

      // Create and download file
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `llm_chess_data_${timestamp}.json`;

      Utils.downloadFile(
        JSON.stringify(data, null, 2),
        filename,
        "application/json"
      );
      Utils.showToast("✅ Dados exportados com sucesso!", "success");
    } catch (error) {
      Utils.hideLoading();
      Utils.handleError(error, "exportData");
    }
  }

  async importData() {
    const fileInput = document.getElementById("import-file");
    if (!fileInput || !fileInput.files.length) {
      Utils.showToast("Selecione um arquivo para importar", "warning");
      return;
    }

    const file = fileInput.files[0];

    try {
      Utils.showLoading("Importando dados...");

      const fileContent = await Utils.readFile(file);
      const data = JSON.parse(fileContent);

      const result = await api.importData(data);

      Utils.hideLoading();

      if (result.success) {
        Utils.showToast("✅ Dados importados com sucesso!", "success");
        this.loadDatabaseStats(); // Refresh stats
      } else {
        Utils.showToast(
          "❌ Erro na importação: " + (result.error || "Erro desconhecido"),
          "error"
        );
      }
    } catch (error) {
      Utils.hideLoading();

      if (error instanceof SyntaxError) {
        Utils.showToast("❌ Arquivo JSON inválido", "error");
      } else {
        Utils.handleError(error, "importData");
      }
    }
  }

  async clearOldGames() {
    const confirmed = document.getElementById("confirm-clear-old");
    if (!confirmed || !confirmed.checked) {
      Utils.showToast(
        "Confirme a operação marcando a caixa de seleção",
        "warning"
      );
      return;
    }

    if (
      !confirm(
        "Tem certeza que deseja deletar partidas antigas (>30 dias)? Esta operação é irreversível!"
      )
    ) {
      return;
    }

    try {
      Utils.showLoading("Removendo partidas antigas...");

      const result = await api.clearOldGames(30);

      Utils.hideLoading();

      if (result.success) {
        Utils.showToast(
          `✅ ${result.deleted || 0} partidas antigas removidas`,
          "success"
        );
        this.loadDatabaseStats(); // Refresh stats
      } else {
        Utils.showToast(
          "❌ Erro ao remover partidas: " +
            (result.error || "Erro desconhecido"),
          "error"
        );
      }
    } catch (error) {
      Utils.hideLoading();
      Utils.handleError(error, "clearOldGames");
    }
  }

  async resetDatabase() {
    const confirmInput = document.querySelector(
      "input[placeholder=\"Digite 'CONFIRMAR' para prosseguir:\"]"
    );
    if (!confirmInput || confirmInput.value !== "CONFIRMAR") {
      Utils.showToast(
        'Digite "CONFIRMAR" para prosseguir com o reset',
        "warning"
      );
      return;
    }

    if (
      !confirm(
        "ATENÇÃO: Esta operação irá deletar TODOS os dados permanentemente! Tem certeza absoluta?"
      )
    ) {
      return;
    }

    try {
      Utils.showLoading("Resetando banco de dados...");

      const result = await api.resetDatabase();

      Utils.hideLoading();

      if (result.success) {
        Utils.showToast("✅ Banco de dados resetado com sucesso!", "success");
        Utils.showToast("🔄 Reinicie a aplicação", "info", 8000);
        this.loadDatabaseStats(); // Refresh stats
      } else {
        Utils.showToast(
          "❌ Erro ao resetar: " + (result.error || "Erro desconhecido"),
          "error"
        );
      }
    } catch (error) {
      Utils.hideLoading();
      Utils.handleError(error, "resetDatabase");
    }
  }

  async saveSettings() {
    const settings = {
      modelParams: {
        temperature: parseFloat(document.getElementById("temperature").value),
        maxTokens: parseInt(document.getElementById("max-tokens").value),
        thinkingTime: parseInt(document.getElementById("thinking-time").value),
      },
      gameSettings: {
        defaultTimeControl: document.getElementById("default-time-control")
          .value,
        autoSaveGames: document.getElementById("auto-save-games").checked,
        showCoordinates: document.getElementById("show-coordinates").checked,
        highlightLastMove: document.getElementById("highlight-last-move")
          .checked,
        autoAnalysis: document.getElementById("auto-analysis").checked,
        analysisDepth: parseInt(
          document.getElementById("analysis-depth").value
        ),
        saveAnalysis: document.getElementById("save-analysis").checked,
      },
    };

    try {
      Utils.showLoading("Salvando configurações...");

      const result = await api.updateSettings(settings);

      Utils.hideLoading();

      if (result.success) {
        this.currentSettings = settings;
        Utils.showToast("✅ Configurações salvas com sucesso!", "success");
      } else {
        Utils.showToast(
          "❌ Erro ao salvar: " + (result.error || "Erro desconhecido"),
          "error"
        );
      }
    } catch (error) {
      Utils.hideLoading();
      Utils.handleError(error, "saveSettings");
    }
  }

  destroy() {
    // Cleanup if needed
  }
}

// Make Settings available globally
window.Settings = Settings;

document.addEventListener("DOMContentLoaded", function () {
  const settings = new Settings();
  settings.init();
});

async function importPgns() {
  setLoading(true);
  try {
    const result = await api.importPgns();
    showSuccess(`${result.imported_games} partidas importadas!`);
    // Se quiser mostrar uma amostra, adicione aqui
  } catch (error) {
    showError("Erro ao importar PGNs: " + error.message);
  } finally {
    setLoading(false);
  }
}
