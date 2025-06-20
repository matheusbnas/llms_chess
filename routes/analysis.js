const express = require("express");
const router = express.Router();

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
    "TacticalMaster",
    "StrategicAI",
    "EndgameExpert",
  ];

  const rankings = models
    .map((model, index) => ({
      model,
      elo: Math.floor(Math.random() * 500) + 1300 + (10 - index) * 30,
      games_played: Math.floor(Math.random() * 150) + 30,
      win_rate: Math.random() * 0.5 + 0.25,
      avg_accuracy: Math.random() * 25 + 65,
      recent_form: Array.from({ length: 10 }, () =>
        Math.random() > 0.6 ? "W" : Math.random() > 0.3 ? "L" : "D"
      ).join(""),
      peak_elo: Math.floor(Math.random() * 600) + 1400,
      current_streak: Math.floor(Math.random() * 8),
      last_played: new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
    }))
    .sort((a, b) => b.elo - a.elo);

  res.json(rankings);
});

// Get ELO history
router.get("/elo-history", (req, res) => {
  const { model, days = 30 } = req.query;

  let filteredHistory = eloHistory;

  if (model) {
    filteredHistory = eloHistory.filter((entry) => entry.model === model);
  }

  // Filter by days
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

  filteredHistory = filteredHistory.filter(
    (entry) => new Date(entry.date) >= cutoffDate
  );

  res.json(filteredHistory);
});

// Get detailed stats for a model
router.get("/stats/:model", (req, res) => {
  const model = req.params.model;

  const stats = {
    model,
    total_games: Math.floor(Math.random() * 200) + 50,
    wins: Math.floor(Math.random() * 80) + 20,
    draws: Math.floor(Math.random() * 30) + 5,
    losses: Math.floor(Math.random() * 90) + 25,
    win_rate: Math.random() * 40 + 35,
    avg_accuracy: Math.random() * 25 + 65,
    current_elo: Math.floor(Math.random() * 500) + 1300,
    peak_elo: Math.floor(Math.random() * 600) + 1400,
    games_as_white: Math.floor(Math.random() * 100) + 25,
    games_as_black: Math.floor(Math.random() * 100) + 25,
    by_color: {
      white: {
        wins: Math.floor(Math.random() * 40) + 10,
        draws: Math.floor(Math.random() * 15) + 2,
        losses: Math.floor(Math.random() * 35) + 8,
        accuracy: Math.random() * 25 + 65,
      },
      black: {
        wins: Math.floor(Math.random() * 35) + 8,
        draws: Math.floor(Math.random() * 15) + 2,
        losses: Math.floor(Math.random() * 40) + 12,
        accuracy: Math.random() * 25 + 60,
      },
    },
    by_time_control: {
      bullet: {
        games: Math.floor(Math.random() * 30),
        win_rate: Math.random() * 40 + 30,
      },
      blitz: {
        games: Math.floor(Math.random() * 80) + 20,
        win_rate: Math.random() * 40 + 35,
      },
      rapid: {
        games: Math.floor(Math.random() * 50) + 10,
        win_rate: Math.random() * 40 + 40,
      },
      classical: {
        games: Math.floor(Math.random() * 20) + 5,
        win_rate: Math.random() * 40 + 45,
      },
    },
    opening_repertoire: {
      as_white: [
        { opening: "King's Pawn (1.e4)", frequency: Math.random() * 40 + 30 },
        { opening: "Queen's Pawn (1.d4)", frequency: Math.random() * 30 + 25 },
        { opening: "English (1.c4)", frequency: Math.random() * 20 + 15 },
      ],
      as_black: [
        { opening: "Sicilian Defense", frequency: Math.random() * 30 + 20 },
        { opening: "French Defense", frequency: Math.random() * 25 + 15 },
        {
          opening: "Queen's Gambit Declined",
          frequency: Math.random() * 20 + 10,
        },
      ],
    },
    recent_trend: Array.from({ length: 20 }, () => Math.random() * 30 + 60),
    tactical_stats: {
      blunders_per_game: Math.random() * 2 + 0.5,
      mistakes_per_game: Math.random() * 3 + 1,
      brilliant_moves: Math.floor(Math.random() * 20) + 5,
      best_tactical_rating: Math.floor(Math.random() * 400) + 1200,
    },
    endgame_performance: {
      king_pawn_endgames: Math.random() * 40 + 50,
      piece_endgames: Math.random() * 35 + 45,
      complex_endgames: Math.random() * 30 + 40,
    },
  };

  res.json(stats);
});

// Get opening statistics
router.get("/openings", (req, res) => {
  res.json(openingStats);
});

// Get opening stats by model
router.get("/openings/:model", (req, res) => {
  const model = req.params.model;

  const modelOpeningStats = openingStats.map((opening) => ({
    ...opening,
    model_performance: {
      games_played: Math.floor(Math.random() * 20) + 3,
      win_rate: Math.random() * 0.5 + 0.25,
      avg_accuracy: Math.random() * 25 + 65,
      last_played: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
    },
  }));

  res.json(modelOpeningStats);
});

// Get global statistics
router.get("/global", (req, res) => {
  const stats = {
    totalGames: Math.floor(Math.random() * 1000) + 500,
    activeModels: 8,
    avgGameLength: Math.random() * 20 + 35,
    tournamentsCompleted: Math.floor(Math.random() * 20) + 5,
    totalMoves: Math.floor(Math.random() * 50000) + 20000,
    avgAccuracy: Math.random() * 15 + 70,
    mostActiveModel: "GPT-4o",
    longestGame: Math.floor(Math.random() * 50) + 100,
    shortestGame: Math.floor(Math.random() * 10) + 8,
    popularOpenings: ["1.e4", "1.d4", "1.Nf3"],
    gamesByTimeControl: {
      bullet: Math.floor(Math.random() * 100) + 50,
      blitz: Math.floor(Math.random() * 300) + 200,
      rapid: Math.floor(Math.random() * 200) + 100,
      classical: Math.floor(Math.random() * 100) + 30,
    },
    serverUptime: process.uptime(),
    lastGamePlayed: new Date(
      Date.now() - Math.random() * 60 * 60 * 1000
    ).toISOString(),
  };

  res.json(stats);
});

// Get results by model
router.get("/results-by-model", (req, res) => {
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

  const results = models.map((model) => ({
    model,
    wins: Math.floor(Math.random() * 50) + 20,
    draws: Math.floor(Math.random() * 20) + 5,
    losses: Math.floor(Math.random() * 45) + 15,
    accuracy: Math.random() * 25 + 65,
    elo: Math.floor(Math.random() * 400) + 1300,
  }));

  res.json(results);
});

// Get winrate data
router.get("/winrate", (req, res) => {
  const whiteWins = Math.floor(Math.random() * 200) + 150;
  const blackWins = Math.floor(Math.random() * 180) + 130;
  const draws = Math.floor(Math.random() * 100) + 50;

  const total = whiteWins + blackWins + draws;

  const data = [
    {
      result_type: "White Wins",
      count: whiteWins,
      percentage: ((whiteWins / total) * 100).toFixed(1),
    },
    {
      result_type: "Black Wins",
      count: blackWins,
      percentage: ((blackWins / total) * 100).toFixed(1),
    },
    {
      result_type: "Draws",
      count: draws,
      percentage: ((draws / total) * 100).toFixed(1),
    },
  ];

  res.json(data);
});

// Get performance trends
router.get("/trends", (req, res) => {
  const { model, timeframe = "30d" } = req.query;

  const days = timeframe === "7d" ? 7 : timeframe === "90d" ? 90 : 30;

  const trends = {
    model: model || "all",
    timeframe,
    data: Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));

      return {
        date: date.toISOString().split("T")[0],
        games: Math.floor(Math.random() * 20) + 5,
        avg_accuracy: Math.random() * 20 + 65,
        avg_elo: Math.floor(Math.random() * 100) + 1400,
        wins: Math.floor(Math.random() * 15) + 2,
        losses: Math.floor(Math.random() * 15) + 2,
        draws: Math.floor(Math.random() * 5) + 1,
      };
    }),
  };

  res.json(trends);
});

// Export analysis data
router.get("/export", (req, res) => {
  const { format = "json", model } = req.query;

  let exportData = {
    exported_at: new Date().toISOString(),
    total_analyses: gameAnalyses.size,
    elo_history_points: eloHistory.length,
    opening_stats: openingStats.length,
  };

  if (model) {
    exportData.model = model;
    exportData.model_specific_data = true;
  }

  exportData.analyses = Array.from(gameAnalyses.values());
  exportData.elo_history = eloHistory;
  exportData.opening_statistics = openingStats;

  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=analysis_export.csv"
    );
    // Convert to CSV format (simplified)
    const csv = "Analysis data would be converted to CSV format here";
    res.send(csv);
  } else {
    res.json(exportData);
  }
});

module.exports = router;
