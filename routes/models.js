const express = require("express");
const router = express.Router();

// Modelos disponíveis expandidos
const availableModels = {
  // OpenAI Models
  "GPT-4o": true,
  "GPT-4o-mini": true,
  "GPT-4-Turbo": true,
  "GPT-4": true,
  "GPT-3.5-Turbo": true,

  // Google Models
  "Gemini-1.5-Pro": true,
  "Gemini-1.5-Flash": true,
  "Gemini-Pro": true,
  "Gemini-1.0-Pro": true,

  // Anthropic Models
  "Claude-3.5-Sonnet": true,
  "Claude-3-Opus": true,
  "Claude-3-Sonnet": true,
  "Claude-3-Haiku": true,

  // DeepSeek Models
  "Deepseek-Chat": true,
  "Deepseek-Coder": true,
  "Deepseek-R1": true,

  // Meta Models (via Groq)
  "Llama-3.1-405B": true,
  "Llama-3.1-70B": true,
  "Llama-3.1-8B": true,
  "Llama-3-70B": true,
  "Llama-3-8B": true,

  // Mistral Models (via Groq)
  "Mixtral-8x7B": true,
  "Mixtral-8x22B": true,
  "Mistral-7B": true,

  // Other Models
  "Qwen-2.5-72B": true,
  "Command-R-Plus": true,
  "Yi-34B": true,
  "CodeLlama-34B": true,

  // Chess-specific models (simulated)
  "ChessGPT-Pro": true,
  TacticalMaster: true,
  StrategicAI: true,
  EndgameExpert: true,
};

// Model capabilities and descriptions
const modelInfo = {
  "GPT-4o": {
    provider: "OpenAI",
    strength: 1650,
    style: "Balanced",
    description: "Latest OpenAI model with excellent reasoning",
  },
  "GPT-4o-mini": {
    provider: "OpenAI",
    strength: 1550,
    style: "Fast",
    description: "Compact version of GPT-4o, faster responses",
  },
  "GPT-4-Turbo": {
    provider: "OpenAI",
    strength: 1620,
    style: "Aggressive",
    description: "Powerful reasoning with creative play",
  },
  "GPT-4": {
    provider: "OpenAI",
    strength: 1600,
    style: "Solid",
    description: "Strong foundation model",
  },
  "GPT-3.5-Turbo": {
    provider: "OpenAI",
    strength: 1450,
    style: "Quick",
    description: "Fast and reliable for rapid games",
  },
  "Gemini-1.5-Pro": {
    provider: "Google",
    strength: 1640,
    style: "Analytical",
    description: "Google's most advanced model",
  },
  "Gemini-1.5-Flash": {
    provider: "Google",
    strength: 1500,
    style: "Speed",
    description: "Ultra-fast responses",
  },
  "Gemini-Pro": {
    provider: "Google",
    strength: 1580,
    style: "Strategic",
    description: "Strong positional understanding",
  },
  "Claude-3.5-Sonnet": {
    provider: "Anthropic",
    strength: 1680,
    style: "Precise",
    description: "Exceptional accuracy and calculation",
  },
  "Claude-3-Opus": {
    provider: "Anthropic",
    strength: 1700,
    style: "Deep",
    description: "Most powerful Claude model",
  },
  "Claude-3-Sonnet": {
    provider: "Anthropic",
    strength: 1630,
    style: "Balanced",
    description: "Well-rounded performance",
  },
  "Deepseek-Chat": {
    provider: "DeepSeek",
    strength: 1520,
    style: "Logical",
    description: "Strong logical reasoning",
  },
  "Deepseek-R1": {
    provider: "DeepSeek",
    strength: 1650,
    style: "Reasoning",
    description: "Advanced reasoning capabilities",
  },
  "Llama-3.1-405B": {
    provider: "Meta/Groq",
    strength: 1720,
    style: "Powerful",
    description: "Largest open-source model",
  },
  "Llama-3.1-70B": {
    provider: "Meta/Groq",
    strength: 1600,
    style: "Strong",
    description: "Excellent performance",
  },
  "Mixtral-8x7B": {
    provider: "Mistral/Groq",
    strength: 1580,
    style: "Dynamic",
    description: "Mixture of experts architecture",
  },
  "ChessGPT-Pro": {
    provider: "Chess.com",
    strength: 1800,
    style: "Master",
    description: "Specialized chess AI",
  },
  TacticalMaster: {
    provider: "Custom",
    strength: 1750,
    style: "Tactical",
    description: "Excels at combinations and tactics",
  },
  StrategicAI: {
    provider: "Custom",
    strength: 1680,
    style: "Positional",
    description: "Strong positional understanding",
  },
  EndgameExpert: {
    provider: "Custom",
    strength: 1650,
    style: "Endgame",
    description: "Specialized in endgame play",
  },
};

// Get available models
router.get("/available", (req, res) => {
  res.json(availableModels);
});

// Get all models with info
router.get("/", (req, res) => {
  const models = Object.keys(availableModels).map((name) => ({
    name,
    available: availableModels[name],
    ...(modelInfo[name] || {
      provider: "Unknown",
      strength: 1500,
      style: "Unknown",
    }),
  }));

  res.json(models);
});

// Test model
router.post("/test", (req, res) => {
  const { modelName } = req.body;

  if (!availableModels.hasOwnProperty(modelName)) {
    return res.json({
      success: false,
      error: "Model not found",
    });
  }

  if (!availableModels[modelName]) {
    return res.json({
      success: false,
      error: "Model not available",
    });
  }

  // Simulate test with different response times based on model
  const responseTime =
    modelInfo[modelName]?.style === "Speed"
      ? 0.3
      : modelInfo[modelName]?.style === "Fast"
      ? 0.5
      : Math.random() * 2 + 0.8;

  const testMoves = ["e4", "d4", "Nf3", "c4", "g3", "b3", "f4"];
  const testMove = testMoves[Math.floor(Math.random() * testMoves.length)];

  setTimeout(() => {
    res.json({
      success: true,
      response_time: responseTime,
      response: testMove,
      model_info: modelInfo[modelName] || {},
    });
  }, responseTime * 1000);
});

// Get model stats
router.get("/:name/stats", (req, res) => {
  const modelName = req.params.name;

  if (!availableModels.hasOwnProperty(modelName)) {
    return res.status(404).json({ error: "Model not found" });
  }

  const baseStrength = modelInfo[modelName]?.strength || 1500;
  const variation = 50;

  const stats = {
    model: modelName,
    games_played: Math.floor(Math.random() * 150) + 20,
    wins: Math.floor(Math.random() * 60) + 10,
    draws: Math.floor(Math.random() * 30) + 5,
    losses: Math.floor(Math.random() * 60) + 5,
    avg_accuracy: Math.random() * 25 + 65,
    current_elo:
      baseStrength + Math.floor(Math.random() * variation * 2 - variation),
    style: modelInfo[modelName]?.style || "Unknown",
    provider: modelInfo[modelName]?.provider || "Unknown",
  };

  res.json(stats);
});

// Update model config
router.put("/:name/config", (req, res) => {
  const modelName = req.params.name;
  const config = req.body;

  if (!availableModels.hasOwnProperty(modelName)) {
    return res.status(404).json({ error: "Model not found" });
  }

  res.json({
    success: true,
    model: modelName,
    config,
    message: "Model configuration updated successfully",
  });
});

// Get model rankings
router.get("/rankings", (req, res) => {
  const rankings = Object.keys(availableModels)
    .filter((name) => availableModels[name])
    .map((name) => {
      const baseStrength = modelInfo[name]?.strength || 1500;
      return {
        model: name,
        elo: baseStrength + Math.floor(Math.random() * 100 - 50),
        games: Math.floor(Math.random() * 100) + 20,
        winRate: Math.random() * 40 + 35,
        style: modelInfo[name]?.style,
        provider: modelInfo[name]?.provider,
      };
    })
    .sort((a, b) => b.elo - a.elo);

  res.json(rankings);
});

module.exports = router;
