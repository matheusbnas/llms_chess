const express = require("express");
const router = express.Router();
const fs = require("fs").promises;
const path = require("path");
const { Chess } = require("chess.js");

// Consolidated dashboard data endpoint
router.get("/dashboard", async (req, res) => {
  try {
    const [modelStats, recentGames, matchupStats] = await Promise.all([
      getModelStats(),
      getRecentGames(),
      getMatchupStats(),
    ]);

    const totalGames = recentGames.length;

    res.json({
      modelStats,
      recentGames: recentGames.slice(0, 10), // Last 10 games
      matchupStats,
      totalGames,
    });
  } catch (error) {
    console.error("Error getting dashboard data:", error);
    res.status(500).json({
      error: "Failed to load dashboard data",
      modelStats: [],
      recentGames: [],
      matchupStats: [],
      totalGames: 0,
    });
  }
});

// Get model statistics
async function getModelStats() {
  try {
    const allGames = await getAllGames();
    const stats = {};

    // Initialize stats for known models
    const knownModels = [
      "GPT-4o",
      "GPT-4-Turbo",
      "Gemini-Pro",
      "Gemini-1.0-Pro",
      "Claude-3.5-Sonnet",
      "Deepseek-R1",
    ];
    knownModels.forEach((model) => {
      stats[model] = { wins: 0, losses: 0, draws: 0, total: 0 };
    });

    allGames.forEach((game) => {
      // Initialize if not exists
      if (!stats[game.white]) {
        stats[game.white] = { wins: 0, losses: 0, draws: 0, total: 0 };
      }
      if (!stats[game.black]) {
        stats[game.black] = { wins: 0, losses: 0, draws: 0, total: 0 };
      }

      // Update totals
      stats[game.white].total++;
      stats[game.black].total++;

      // Update results
      if (game.result === "1-0") {
        stats[game.white].wins++;
        stats[game.black].losses++;
      } else if (game.result === "0-1") {
        stats[game.black].wins++;
        stats[game.white].losses++;
      } else if (game.result === "1/2-1/2") {
        stats[game.white].draws++;
        stats[game.black].draws++;
      }
    });

    // Convert to array format with win rate
    return Object.entries(stats)
      .filter(([model, data]) => data.total > 0)
      .map(([model, data]) => ({
        model,
        wins: data.wins,
        losses: data.losses,
        draws: data.draws,
        total: data.total,
        winRate:
          data.total > 0
            ? (((data.wins + 0.5 * data.draws) / data.total) * 100).toFixed(1)
            : 0,
      }))
      .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate));
  } catch (error) {
    console.error("Error getting model stats:", error);
    return [];
  }
}

// Get recent games
async function getRecentGames() {
  try {
    const allGames = await getAllGames();
    return allGames
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 20);
  } catch (error) {
    console.error("Error getting recent games:", error);
    return [];
  }
}

// Get matchup statistics
async function getMatchupStats() {
  try {
    const allGames = await getAllGames();
    const matchups = {};

    allGames.forEach((game) => {
      const matchup = `${game.white} vs ${game.black}`;
      if (!matchups[matchup]) {
        matchups[matchup] = {
          matchup,
          p1: game.white,
          p2: game.black,
          p1_wins: 0,
          p2_wins: 0,
          draws: 0,
          total: 0,
        };
      }

      matchups[matchup].total++;

      if (game.result === "1-0") {
        matchups[matchup].p1_wins++;
      } else if (game.result === "0-1") {
        matchups[matchup].p2_wins++;
      } else {
        matchups[matchup].draws++;
      }
    });

    return Object.values(matchups)
      .filter((m) => m.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  } catch (error) {
    console.error("Error getting matchup stats:", error);
    return [];
  }
}

// Get all games from various sources
async function getAllGames() {
  const allGames = [];

  try {
    // Check games directory (newly created games)
    const gamesDir = path.join(__dirname, "..", "games");
    try {
      const files = await fs.readdir(gamesDir);
      const jsonFiles = files.filter((file) => file.endsWith(".json"));

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(gamesDir, file);
          const content = await fs.readFile(filePath, "utf8");
          const game = JSON.parse(content);

          allGames.push({
            id: game.id,
            white: game.white,
            black: game.black,
            result: game.result,
            moves: game.totalMoves || game.moves?.length || 0,
            date: game.endTime || game.startTime || new Date().toISOString(),
            duration: game.duration || 0,
          });
        } catch (err) {
          // Skip invalid JSON files
        }
      }
    } catch (err) {
      // Games directory doesn't exist yet
    }

    // Check existing matchup directories
    const rootDir = path.join(__dirname, "..");
    try {
      const entries = await fs.readdir(rootDir, { withFileTypes: true });
      const matchupDirs = entries
        .filter(
          (dirent) => dirent.isDirectory() && dirent.name.includes(" vs ")
        )
        .map((dirent) => dirent.name);

      for (const dir of matchupDirs) {
        try {
          const pgnFiles = (await fs.readdir(path.join(rootDir, dir))).filter(
            (f) => f.endsWith(".pgn")
          );

          for (const file of pgnFiles) {
            try {
              const pgnPath = path.join(rootDir, dir, file);
              const pgnContent = await fs.readFile(pgnPath, "utf8");

              const chess = new Chess();
              chess.load_pgn(pgnContent);

              const headers = chess.header();
              const history = chess.history();

              if (headers.White && headers.Black && headers.Result) {
                const gameDate = headers.Date
                  ? new Date(headers.Date.replace(/\./g, "-"))
                  : new Date(0);

                allGames.push({
                  id: `${dir}/${file}`,
                  white: headers.White,
                  black: headers.Black,
                  result: headers.Result,
                  moves: history.length,
                  date: gameDate.toISOString(),
                  duration: 0, // No duration data in PGN
                });
              }
            } catch (e) {
              // Skip invalid PGNs
            }
          }
        } catch (e) {
          // Skip directories that can't be read
        }
      }
    } catch (err) {
      // Root directory issue
    }
  } catch (error) {
    console.error("Error getting all games:", error);
  }

  return allGames;
}

module.exports = router;
