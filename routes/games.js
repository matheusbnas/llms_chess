const express = require("express");
const router = express.Router();
const fs = require("fs").promises;
const path = require("path");
const { Chess } = require("chess.js");

const gamesDir = path.join(__dirname, "..");

// Endpoint to list matchup directories
router.get("/list-matchups", async (req, res) => {
  try {
    const allDirents = await fs.readdir(gamesDir, { withFileTypes: true });
    const matchupDirs = allDirents
      .filter((dirent) => dirent.isDirectory() && dirent.name.includes(" vs "))
      .map((dirent) => dirent.name);
    res.json(matchupDirs);
  } catch (error) {
    console.error("Error listing matchups:", error);
    res.status(500).json({ error: "Failed to list matchups" });
  }
});

// Endpoint to list games in a matchup
router.get("/list-games/:matchup", async (req, res) => {
  const { matchup } = req.params;
  const matchupDir = path.join(gamesDir, matchup);

  try {
    const files = await fs.readdir(matchupDir);
    const pgnFiles = files.filter((file) => file.endsWith(".pgn"));
    res.json(pgnFiles);
  } catch (error) {
    console.error(`Error listing games for ${matchup}:`, error);
    res.status(500).json({ error: "Failed to list games" });
  }
});

// Endpoint to get parsed PGN data
router.get("/pgn-data/:matchup/:gameFile", async (req, res) => {
  const { matchup, gameFile } = req.params;
  const filePath = path.join(gamesDir, matchup, gameFile);

  try {
    const pgnData = await fs.readFile(filePath, "utf-8");
    const chess = new Chess();

    // The PGNs have comments that chess.js can't handle, so we remove them.
    const pgnWithoutComments = pgnData.replace(/\{[^}]+\}/g, "").trim();
    chess.loadPgn(pgnWithoutComments);

    const history = chess.history({ verbose: true });

    const fens = [];
    const tempChess = new Chess();
    fens.push(tempChess.fen()); // Initial position

    history.forEach((move) => {
      tempChess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      });
      fens.push(tempChess.fen());
    });

    res.json({
      headers: chess.header(),
      moves: history,
      fens: fens,
      pgn: pgnWithoutComments,
    });
  } catch (error) {
    console.error(`Error reading PGN file ${filePath}:`, error);
    res.status(500).json({ error: `Failed to parse PGN data for ${gameFile}` });
  }
});

module.exports = router;
