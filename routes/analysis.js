const express = require("express");
const router = express.Router();
const fs = require("fs").promises;
const path = require("path");
const { Chess } = require("chess.js");

// Mock database for storing analysis results
let gameAnalyses = new Map();
let eloHistory = [];
let openingStats = [];

// Initialize with some mock data
function initializeMockData() {
  const models = [
    "GPT-4o",
    "GPT-4-Turbo",
    "Gemini-1.5-Pro",
    "Claude-3.5-Sonnet",
    "Llama-3.1-70B",
    "Mixtral-8x7B",
    "Deepseek-R1",
    "ChessGPT-Pro",
  ];

  // Generate ELO history
  models.forEach((model) => {
    let elo = 1400 + Math.random() * 400;
    for (let i = 30; i >= 0; i--) {
      elo += (Math.random() - 0.5) * 40;
      elo = Math.max(1200, Math.min(1900, elo));

      const date = new Date();
      date.setDate(date.getDate() - i);

      eloHistory.push({
        model,
        elo: Math.round(elo),
        date: date.toISOString().split("T")[0],
        games_played: Math.floor(Math.random() * 5) + 1,
      });
    }
  });

  // Generate opening statistics
  const openings = [
    "King's Pawn Opening (1.e4)",
    "Queen's Pawn Opening (1.d4)",
    "English Opening (1.c4)",
    "Réti Opening (1.Nf3)",
    "King's Indian Attack",
    "Nimzo-Larsen Attack (1.b3)",
    "Bird's Opening (1.f4)",
    "Grob's Attack (1.g4)",
    "Sicilian Defense",
    "French Defense",
    "Caro-Kann Defense",
    "Scandinavian Defense",
  ];

  openings.forEach((opening) => {
    openingStats.push({
      opening,
      games_played: Math.floor(Math.random() * 100) + 10,
      win_rate: Math.random() * 0.4 + 0.3,
      avg_accuracy: Math.random() * 20 + 70,
      avg_game_length: Math.random() * 30 + 25,
      white_wins: Math.floor(Math.random() * 40) + 10,
      black_wins: Math.floor(Math.random() * 40) + 10,
      draws: Math.floor(Math.random() * 20) + 5,
    });
  });
}

initializeMockData();

// Get detailed stats for all games
router.get("/stats", async (req, res) => {
  const gameDirectories = [
    "Gemini-Pro vs GPT-4o",
    "gpt-4 vs Deepseek",
    "GPT-4o vs Gemini-Pro",
  ];
  const stats = {};

  const initializePlayerStats = (player) => {
    if (!stats[player]) {
      stats[player] = { wins: 0, losses: 0, draws: 0, games: 0, score: 0 };
    }
  };

  try {
    for (const dir of gameDirectories) {
      const dirPath = path.join(__dirname, "..", dir);
      try {
        const gameFiles = await fs.readdir(dirPath);
        const pgnFiles = gameFiles.filter((f) => f.endsWith(".pgn"));

        for (const pgnFile of pgnFiles) {
          const filePath = path.join(dirPath, pgnFile);
          const pgnData = await fs.readFile(filePath, "utf-8");

          const chess = new Chess();
          try {
            chess.loadPgn(pgnData);
          } catch (e) {
            console.warn(
              `Skipping ${pgnFile} in ${dir} due to invalid PGN: ${e.message}`
            );
            continue;
          }

          const headers = chess.header();
          const whitePlayer = headers.White;
          const blackPlayer = headers.Black;
          const result = headers.Result;

          if (!whitePlayer || !blackPlayer || !result) {
            console.warn(
              `Skipping ${pgnFile} in ${dir} due to missing headers.`
            );
            continue;
          }

          initializePlayerStats(whitePlayer);
          initializePlayerStats(blackPlayer);

          stats[whitePlayer].games++;
          stats[blackPlayer].games++;

          if (result === "1-0") {
            stats[whitePlayer].wins++;
            stats[whitePlayer].score += 1;
            stats[blackPlayer].losses++;
          } else if (result === "0-1") {
            stats[blackPlayer].wins++;
            stats[blackPlayer].score += 1;
            stats[whitePlayer].losses++;
          } else if (result === "1/2-1/2") {
            stats[whitePlayer].draws++;
            stats[whitePlayer].score += 0.5;
            stats[blackPlayer].draws++;
            stats[blackPlayer].score += 0.5;
          }
        }
      } catch (error) {
        if (error.code !== "ENOENT") {
          console.error(`Error processing directory ${dir}:`, error);
        } else {
          console.warn(`Directory ${dir} not found, skipping.`);
        }
      }
    }
    res.json(stats);
  } catch (error) {
    console.error("Error analyzing PGN files:", error);
    res.status(500).json({ error: "Failed to analyze PGN files" });
  }
});

// Analyze specific game
router.get("/game/:id", (req, res) => {
  const gameId = req.params.id;

  // Check if analysis already exists
  if (gameAnalyses.has(gameId)) {
    return res.json(gameAnalyses.get(gameId));
  }

  // Generate new analysis
  const moveCount = Math.floor(Math.random() * 60) + 20;
  const analysis = {
    game_id: gameId,
    total_moves: moveCount,
    white_accuracy: Math.random() * 25 + 65,
    black_accuracy: Math.random() * 25 + 65,
    move_evaluations: Array.from({ length: moveCount }, (_, i) => {
      // Simulate evaluation progression
      const base = (Math.random() - 0.5) * 2;
      const noise = (Math.random() - 0.5) * 0.5;
      return Math.round((base + noise) * 100) / 100;
    }),
    move_accuracies: Array.from(
      { length: moveCount },
      () => Math.random() * 0.4 + 0.6
    ),
    blunders: Math.floor(Math.random() * 6),
    mistakes: Math.floor(Math.random() * 8) + 2,
    inaccuracies: Math.floor(Math.random() * 12) + 3,
    excellent_moves: Math.floor(Math.random() * 8) + 1,
    best_moves: [
      { move_number: 5, san: "Nf3", accuracy: 0.95, evaluation: 0.2 },
      { move_number: 12, san: "O-O", accuracy: 0.92, evaluation: 0.1 },
      { move_number: 18, san: "Qd2", accuracy: 0.89, evaluation: 0.3 },
    ],
    worst_moves: [
      { move_number: 23, san: "Bxf7+", accuracy: 0.25, evaluation: -1.2 },
      { move_number: 31, san: "Qh5", accuracy: 0.18, evaluation: -1.8 },
    ],
    average_evaluation: (Math.random() - 0.5) * 2,
    opening_accuracy: Math.random() * 20 + 80,
    middlegame_accuracy: Math.random() * 25 + 60,
    endgame_accuracy: Math.random() * 30 + 50,
    analysis_timestamp: new Date().toISOString(),
    engine_depth: 18,
    analysis_time: Math.random() * 60 + 30,
  };

  // Store analysis
  gameAnalyses.set(gameId, analysis);

  res.json(analysis);
});

// Analyze position (for real-time analysis)
router.post("/position", (req, res) => {
  const { fen, depth = 15, multiPV = 3 } = req.body;

  if (!fen) {
    return res.status(400).json({ error: "FEN position required" });
  }

  // Simulate Stockfish analysis
  setTimeout(() => {
    const evaluation = (Math.random() - 0.5) * 4;
    const mate =
      Math.random() > 0.95 ? Math.floor(Math.random() * 10) + 1 : null;

    const bestMoves = [
      "Nf3",
      "e4",
      "d4",
      "c4",
      "Nc3",
      "Be2",
      "O-O",
      "Qd2",
      "Bg5",
    ]
      .sort(() => Math.random() - 0.5)
      .slice(0, multiPV);

    res.json({
      fen,
      evaluation: mate ? null : evaluation,
      mate,
      depth,
      best_moves: bestMoves.map((move, index) => ({
        move,
        evaluation: mate ? null : evaluation - index * 0.1,
        pv: [move], // Principal variation
        nodes: Math.floor(Math.random() * 1000000) + 100000,
      })),
      analysis_time: Math.random() * 2 + 0.5,
    });
  }, 500 + Math.random() * 1500);
});

// Compare two models
router.post("/compare", (req, res) => {
  const { model1, model2 } = req.body;

  if (!model1 || !model2) {
    return res
      .status(400)
      .json({ error: "Both models required for comparison" });
  }

  // Generate comparison data
  const totalGames = Math.floor(Math.random() * 50) + 20;
  const model1Wins = Math.floor(Math.random() * (totalGames * 0.6));
  const model2Wins = Math.floor(Math.random() * (totalGames * 0.6));
  const draws = totalGames - model1Wins - model2Wins;

  const comparison = {
    model1,
    model2,
    total_games: totalGames,
    model1_wins: model1Wins,
    model2_wins: model2Wins,
    draws: Math.max(0, draws),
    model1_accuracy: Math.random() * 20 + 70,
    model2_accuracy: Math.random() * 20 + 70,
    model1_avg_moves: Math.random() * 20 + 35,
    model2_avg_moves: Math.random() * 20 + 35,
    model1_error_rate: Math.random() * 10 + 5,
    model2_error_rate: Math.random() * 10 + 5,
    model1_avg_time: Math.random() * 3 + 1,
    model2_avg_time: Math.random() * 3 + 1,
    head_to_head_score: `${model1Wins}-${model2Wins}-${Math.max(0, draws)}`,
    performance_over_time: Array.from({ length: 20 }, (_, i) => [
      {
        game_number: i + 1,
        model: model1,
        accuracy: Math.random() * 20 + 70,
        result:
          Math.random() > 0.5 ? "win" : Math.random() > 0.5 ? "loss" : "draw",
      },
      {
        game_number: i + 1,
        model: model2,
        accuracy: Math.random() * 20 + 70,
        result:
          Math.random() > 0.5 ? "win" : Math.random() > 0.5 ? "loss" : "draw",
      },
    ]).flat(),
    opening_preferences: {
      [model1]: ["1.e4", "1.d4", "1.Nf3"],
      [model2]: ["1.c4", "1.e4", "1.g3"],
    },
    style_analysis: {
      [model1]: {
        aggression: Math.random() * 100,
        tactical: Math.random() * 100,
        positional: Math.random() * 100,
        endgame: Math.random() * 100,
      },
      [model2]: {
        aggression: Math.random() * 100,
        tactical: Math.random() * 100,
        positional: Math.random() * 100,
        endgame: Math.random() * 100,
      },
    },
  };

  res.json(comparison);
});

// Get ELO ratings
router.get("/elo", (req, res) => {
  const models = [
    "GPT-4o",
    "GPT-4-Turbo",
    "Gemini-1.5-Pro",
    "Claude-3.5-Sonnet",
    "Llama-3.1-70B",
    "Mixtral-8x7B",
    "Deepseek-R1",
    "ChessGPT-Pro",
  ];
  let filteredEloHistory = eloHistory;

  if (req.query.models) {
    const selectedModels = req.query.models.split(",");
    filteredEloHistory = eloHistory.filter((entry) =>
      selectedModels.includes(entry.model)
    );
  }

  res.json(filteredEloHistory);
});

// Get opening statistics
router.get("/openings", (req, res) => {
  res.json(openingStats);
});

// Get model performance trends
router.get("/trends/:model", (req, res) => {
  const { model } = req.params;
  const trends = {
    performance_over_time: eloHistory.filter((e) => e.model === model),
    opening_stats: openingStats.slice(0, 3), // Simplified
    win_loss_draw: {
      wins: Math.floor(Math.random() * 20),
      losses: Math.floor(Math.random() * 20),
      draws: Math.floor(Math.random() * 10),
    },
    accuracy_by_phase: {
      opening: Math.random() * 20 + 75,
      middlegame: Math.random() * 20 + 70,
      endgame: Math.random() * 20 + 65,
    },
  };
  res.json(trends);
});

module.exports = router;
