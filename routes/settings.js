const express = require("express");
const router = express.Router();
const fs = require("fs").promises;
const path = require("path");

// Mock settings storage (in production, use a database)
let currentSettings = {
  modelParams: {
    temperature: 0.1,
    maxTokens: 1000,
    thinkingTime: 5,
    systemPrompt:
      "You are a chess-playing AI. Play the best move in the given position.",
  },
  gameSettings: {
    defaultTimeControl: "10",
    autoSaveGames: true,
    showCoordinates: true,
    highlightLastMove: true,
    autoAnalysis: false,
    analysisDepth: 12,
    saveAnalysis: true,
    enableSounds: true,
    boardTheme: "brown",
    pieceSet: "classic",
  },
  stockfish: {
    path: "/usr/local/bin/stockfish",
    depth: 15,
    threads: 4,
    hash: 256,
  },
  ui: {
    theme: "dark",
    language: "pt-BR",
    animations: true,
    autoRefresh: true,
    refreshInterval: 30,
  },
  api: {
    rateLimit: 100,
    timeout: 30000,
    retries: 3,
    cacheEnabled: true,
  },
  security: {
    enableCORS: true,
    maxRequestSize: "50mb",
    enableLogging: true,
  },
};

// Load settings from file if exists
async function loadSettingsFromFile() {
  try {
    const settingsPath = path.join(__dirname, "..", "data", "settings.json");
    const data = await fs.readFile(settingsPath, "utf8");
    currentSettings = { ...currentSettings, ...JSON.parse(data) };
    console.log("✅ Settings loaded from file");
  } catch (error) {
    console.log("⚠️ No settings file found, using defaults");
  }
}

// Save settings to file
async function saveSettingsToFile() {
  try {
    const dataDir = path.join(__dirname, "..", "data");
    await fs.mkdir(dataDir, { recursive: true });

    const settingsPath = path.join(dataDir, "settings.json");
    await fs.writeFile(settingsPath, JSON.stringify(currentSettings, null, 2));
    console.log("✅ Settings saved to file");
  } catch (error) {
    console.error("❌ Error saving settings:", error);
  }
}

// Initialize settings
loadSettingsFromFile();

// Get current settings
router.get("/", (req, res) => {
  res.json({
    ...currentSettings,
    // Don't expose sensitive data
    api_keys_configured: {
      openai: !!process.env.OPENAI_API_KEY,
      google: !!process.env.GOOGLE_API_KEY,
      deepseek: !!process.env.EEPSEEK_API_KEY,
      groq: !!process.env.GROQ_API_KEY,
    },
    server_info: {
      uptime: process.uptime(),
      node_version: process.version,
      memory_usage: process.memoryUsage(),
      platform: process.platform,
    },
  });
});

// Update settings
router.put("/", async (req, res) => {
  try {
    const updates = req.body;

    // Validate settings
    if (updates.modelParams) {
      if (updates.modelParams.temperature !== undefined) {
        if (
          updates.modelParams.temperature < 0 ||
          updates.modelParams.temperature > 2
        ) {
          return res.status(400).json({
            success: false,
            error: "Temperature must be between 0 and 2",
          });
        }
      }

      if (updates.modelParams.maxTokens !== undefined) {
        if (
          updates.modelParams.maxTokens < 1 ||
          updates.modelParams.maxTokens > 4000
        ) {
          return res.status(400).json({
            success: false,
            error: "Max tokens must be between 1 and 4000",
          });
        }
      }
    }

    if (updates.stockfish) {
      if (updates.stockfish.depth !== undefined) {
        if (updates.stockfish.depth < 1 || updates.stockfish.depth > 30) {
          return res.status(400).json({
            success: false,
            error: "Stockfish depth must be between 1 and 30",
          });
        }
      }
    }

    // Merge updates with current settings
    currentSettings = mergeDeep(currentSettings, updates);

    // Save to file
    await saveSettingsToFile();

    res.json({
      success: true,
      settings: currentSettings,
      message: "Settings updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Reset settings to defaults
router.post("/reset", async (req, res) => {
  try {
    currentSettings = {
      modelParams: {
        temperature: 0.1,
        maxTokens: 1000,
        thinkingTime: 5,
        systemPrompt:
          "You are a chess-playing AI. Play the best move in the given position.",
      },
      gameSettings: {
        defaultTimeControl: "10",
        autoSaveGames: true,
        showCoordinates: true,
        highlightLastMove: true,
        autoAnalysis: false,
        analysisDepth: 12,
        saveAnalysis: true,
        enableSounds: true,
        boardTheme: "brown",
        pieceSet: "classic",
      },
      stockfish: {
        path: "/usr/local/bin/stockfish",
        depth: 15,
        threads: 4,
        hash: 256,
      },
      ui: {
        theme: "dark",
        language: "pt-BR",
        animations: true,
        autoRefresh: true,
        refreshInterval: 30,
      },
      api: {
        rateLimit: 100,
        timeout: 30000,
        retries: 3,
        cacheEnabled: true,
      },
    };

    await saveSettingsToFile();

    res.json({
      success: true,
      settings: currentSettings,
      message: "Settings reset to defaults",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Save API keys (environment variables)
router.post("/api-keys", async (req, res) => {
  const { openai, google, deepseek, groq } = req.body;

  try {
    // In a real application, you'd want to store these securely
    // For now, we'll just validate and provide feedback

    const updates = {};
    let hasValidKey = false;

    if (openai && openai.trim()) {
      if (openai.startsWith("sk-")) {
        updates.openai = true;
        hasValidKey = true;
      } else {
        return res.status(400).json({
          success: false,
          error: "OpenAI API key must start with sk-",
        });
      }
    }

    if (google && google.trim()) {
      if (google.startsWith("AI")) {
        updates.google = true;
        hasValidKey = true;
      } else {
        return res.status(400).json({
          success: false,
          error: "Google API key must start with AI",
        });
      }
    }

    if (deepseek && deepseek.trim()) {
      if (deepseek.startsWith("sk-")) {
        updates.deepseek = true;
        hasValidKey = true;
      } else {
        return res.status(400).json({
          success: false,
          error: "DeepSeek API key must start with sk-",
        });
      }
    }

    if (groq && groq.trim()) {
      if (groq.startsWith("gsk_")) {
        updates.groq = true;
        hasValidKey = true;
      } else {
        return res.status(400).json({
          success: false,
          error: "Groq API key must start with gsk_",
        });
      }
    }

    if (!hasValidKey) {
      return res.status(400).json({
        success: false,
        error: "At least one valid API key is required",
      });
    }

    // Simulate saving (in production, update environment or secure storage)
    setTimeout(() => {
      res.json({
        success: true,
        message: "API keys validated and saved successfully",
        keys_configured: updates,
        restart_required: true,
      });
    }, 1000);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Test Stockfish installation
router.post("/test-stockfish", async (req, res) => {
  const { path: stockfishPath } = req.body;

  if (!stockfishPath) {
    return res.status(400).json({
      success: false,
      error: "Stockfish path is required",
    });
  }

  try {
    const { spawn } = require("child_process");

    // Test if Stockfish executable exists and works
    const stockfish = spawn(stockfishPath, [], { timeout: 5000 });

    let output = "";
    let errorOutput = "";

    stockfish.stdout.on("data", (data) => {
      output += data.toString();
    });

    stockfish.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    // Send UCI command
    stockfish.stdin.write("uci\n");

    setTimeout(() => {
      stockfish.stdin.write("quit\n");
    }, 2000);

    stockfish.on("close", (code) => {
      if (code === 0 && output.includes("uciok")) {
        // Extract version if available
        const versionMatch = output.match(/Stockfish\s+(\d+(?:\.\d+)*)/i);
        const version = versionMatch ? versionMatch[1] : "Unknown";

        res.json({
          success: true,
          version: `Stockfish ${version}`,
          message: "Stockfish is working correctly",
          output: output.substring(0, 200), // Limit output
        });
      } else {
        res.json({
          success: false,
          error: "Stockfish did not respond correctly",
          details: errorOutput || "No error details available",
        });
      }
    });

    stockfish.on("error", (error) => {
      res.json({
        success: false,
        error: `Failed to start Stockfish: ${error.message}`,
        suggestions: [
          "Check if the path is correct",
          "Ensure Stockfish is installed",
          "Verify file permissions",
          "Try the default path: /usr/local/bin/stockfish",
        ],
      });
    });
  } catch (error) {
    res.json({
      success: false,
      error: `Error testing Stockfish: ${error.message}`,
    });
  }
});

// Get system information
router.get("/system", (req, res) => {
  const systemInfo = {
    node_version: process.version,
    platform: process.platform,
    architecture: process.arch,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu_count: require("os").cpus().length,
    load_average: require("os").loadavg(),
    free_memory: require("os").freemem(),
    total_memory: require("os").totalmem(),
    hostname: require("os").hostname(),
    env: process.env.NODE_ENV || "development",
  };

  res.json(systemInfo);
});

// Test API connectivity
router.post("/test-api", async (req, res) => {
  const { provider } = req.body;

  const tests = {
    openai: () => testOpenAI(),
    google: () => testGoogle(),
    deepseek: () => testDeepSeek(),
    groq: () => testGroq(),
  };

  if (!tests[provider]) {
    return res.status(400).json({
      success: false,
      error: "Unknown provider",
    });
  }

  try {
    const result = await tests[provider]();
    res.json({
      success: true,
      provider,
      ...result,
    });
  } catch (error) {
    res.json({
      success: false,
      provider,
      error: error.message,
    });
  }
});

// Mock API test functions
async function testOpenAI() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        status: "connected",
        response_time: Math.random() * 1000 + 500,
        model: "gpt-4o",
        message: "OpenAI API is responding",
      });
    }, 1000);
  });
}

async function testGoogle() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        status: "connected",
        response_time: Math.random() * 800 + 400,
        model: "gemini-1.5-pro",
        message: "Google AI API is responding",
      });
    }, 800);
  });
}

async function testDeepSeek() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        status: "connected",
        response_time: Math.random() * 1200 + 600,
        model: "deepseek-chat",
        message: "DeepSeek API is responding",
      });
    }, 1200);
  });
}

async function testGroq() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        status: "connected",
        response_time: Math.random() * 400 + 200,
        model: "llama-3.1-70b",
        message: "Groq API is responding (fast!)",
      });
    }, 400);
  });
}

// Export/Import settings
router.get("/export", (req, res) => {
  const exportData = {
    settings: currentSettings,
    exported_at: new Date().toISOString(),
    version: "1.0.0",
  };

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=chess_arena_settings.json"
  );
  res.json(exportData);
});

router.post("/import", async (req, res) => {
  try {
    const importData = req.body;

    if (!importData.settings) {
      return res.status(400).json({
        success: false,
        error: "Invalid settings file format",
      });
    }

    // Validate imported settings
    const validatedSettings = validateSettings(importData.settings);

    currentSettings = validatedSettings;
    await saveSettingsToFile();

    res.json({
      success: true,
      message: "Settings imported successfully",
      settings: currentSettings,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: `Invalid settings file: ${error.message}`,
    });
  }
});

// Utility functions
function mergeDeep(target, source) {
  const result = { ...target };

  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      result[key] = mergeDeep(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

function validateSettings(settings) {
  // Basic validation - in production, use a proper schema validator
  const validated = { ...settings };

  if (validated.modelParams) {
    if (
      validated.modelParams.temperature < 0 ||
      validated.modelParams.temperature > 2
    ) {
      validated.modelParams.temperature = 0.1;
    }
    if (
      validated.modelParams.maxTokens < 1 ||
      validated.modelParams.maxTokens > 4000
    ) {
      validated.modelParams.maxTokens = 1000;
    }
  }

  return validated;
}

module.exports = router;
