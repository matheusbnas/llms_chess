const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs").promises;

const PGN_DIR = path.join(__dirname, "..");

async function getGameDirectories() {
  const entries = await fs.readdir(PGN_DIR, { withFileTypes: true });
  return entries
    .filter((dirent) => dirent.isDirectory() && dirent.name.includes(" vs "))
    .map((dirent) => dirent.name);
}

async function getModelStats() {
  const modelStats = {};
  const gameDirs = await getGameDirectories();

  for (const dir of gameDirs) {
    const pgnFiles = (await fs.readdir(path.join(PGN_DIR, dir))).filter((f) =>
      f.endsWith(".pgn")
    );

    for (const file of pgnFiles) {
      const pgnPath = path.join(PGN_DIR, dir, file);
      const pgn = await fs.readFile(pgnPath, "utf-8");

      const whiteMatch = pgn.match(/\[White "(.*?)"\]/);
      const blackMatch = pgn.match(/\[Black "(.*?)"\]/);
      const resultMatch = pgn.match(/\[Result "(.*?)"\]/);

      if (whiteMatch && blackMatch && resultMatch) {
        const white = whiteMatch[1];
        const black = blackMatch[1];
        const result = resultMatch[1];

        if (!modelStats[white])
          modelStats[white] = {
            model: white,
            wins: 0,
            losses: 0,
            draws: 0,
            total: 0,
          };
        if (!modelStats[black])
          modelStats[black] = {
            model: black,
            wins: 0,
            losses: 0,
            draws: 0,
            total: 0,
          };

        modelStats[white].total++;
        modelStats[black].total++;

        if (result === "1-0") {
          modelStats[white].wins++;
          modelStats[black].losses++;
        } else if (result === "0-1") {
          modelStats[black].wins++;
          modelStats[white].losses++;
        } else if (result === "1/2-1/2") {
          modelStats[white].draws++;
          modelStats[black].draws++;
        }
      }
    }
  }
  return Object.values(modelStats).sort((a, b) => b.wins - a.wins);
}

router.get("/dashboard", async (req, res) => {
  try {
    const modelStats = await getModelStats();
    const totalGames = modelStats.reduce((sum, m) => sum + m.total, 0) / 2;

    res.json({
      totalGames,
      modelStats,
      recentGames: [],
      matchupStats: [],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

router.get("/models", async (req, res) => {
  try {
    const modelStats = await getModelStats();
    res.json(modelStats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch models" });
  }
});

router.get("/recent-games", async (req, res) => {
  res.json([]);
});

router.get("/stats", async (req, res) => {
  try {
    const modelStats = await getModelStats();
    const totalGames = modelStats.reduce((sum, m) => sum + m.total, 0) / 2;
    res.json({
      totalGames,
      totalModels: modelStats.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

module.exports = router;
