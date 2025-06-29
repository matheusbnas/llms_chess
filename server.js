require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const path = require("path");
const fs = require("fs").promises;
const { Chess } = require("chess.js");
const axios = require("axios");

// Import routes
const analysisRoutes = require("./routes/analysis");
const lichessRoutes = require("./routes/lichess");
const settingsRoutes = require("./routes/settings");
const gamesRoutes = require("./routes/games");
const dataRoutes = require("./routes/data");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Serve pages directory
app.use(
  "/pages",
  express.static(path.join(__dirname, "pages"), {
    setHeaders: (res, path) => {
      if (path.endsWith(".html")) {
        res.setHeader("Content-Type", "text/html");
      }
    },
  })
);

// API Routes
app.use("/analysis", analysisRoutes);
app.use("/lichess", lichessRoutes);
app.use("/settings", settingsRoutes);
app.use("/games", gamesRoutes);
app.use("/data", dataRoutes);

// Catch-all route for SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Enhanced Game Manager with Professional Chessboard Support
class GameManager {
  constructor() {
    this.games = new Map();
    this.battles = new Map();
    this.tournaments = new Map();
    this.modelClients = this.initializeModelClients();
    this.gameStats = {
      totalGames: 0,
      activeGames: 0,
      completedGames: 0,
      totalMoves: 0,
      averageGameDuration: 0,
    };
  }

  initializeModelClients() {
    return {
      "GPT-4o": {
        provider: "openai",
        model: "gpt-4o",
        temperature: 0.1,
        active: !!process.env.OPENAI_API_KEY,
        rating: 1850,
        description: "Mais forte modelo disponível",
      },
      "GPT-4-Turbo": {
        provider: "openai",
        model: "gpt-4-turbo",
        temperature: 0.1,
        active: !!process.env.OPENAI_API_KEY,
        rating: 1780,
        description: "Equilibrado e versátil",
      },
      "Gemini-Pro": {
        provider: "google",
        model: "gemini-1.5-pro-latest",
        temperature: 0.1,
        active: !!process.env.GOOGLE_API_KEY,
        rating: 1750,
        description: "Criativo e inovador",
      },
      "Gemini-1.0-Pro": {
        provider: "google",
        model: "gemini-1.0-pro",
        temperature: 0.1,
        active: !!process.env.GOOGLE_API_KEY,
        rating: 1720,
        description: "Modelo estável",
      },
      "Claude-3.5-Sonnet": {
        provider: "anthropic",
        model: "claude-3-5-sonnet-20241022",
        temperature: 0.1,
        active: !!process.env.ANTHROPIC_API_KEY,
        rating: 1820,
        description: "Estratégico e analítico",
      },
      "Deepseek-R1": {
        provider: "deepseek",
        model: "deepseek-r1",
        temperature: 0.1,
        active: !!process.env.DEEPSEEK_API_KEY,
        rating: 1680,
        description: "Modelo experimental",
      },
    };
  }

  async getGameDirectories() {
    const rootDir = __dirname;
    try {
      const entries = await fs.readdir(rootDir, { withFileTypes: true });
      return entries
        .filter(
          (dirent) => dirent.isDirectory() && dirent.name.includes(" vs ")
        )
        .map((dirent) => dirent.name);
    } catch (error) {
      console.error("Failed to read game directories:", error);
      return [];
    }
  }

  async makeMove(modelName, position, gameHistory, color) {
    const modelConfig = this.modelClients[modelName];
    if (!modelConfig || !modelConfig.active) {
      throw new Error(`Model ${modelName} not available`);
    }

    const chess = new Chess(position);
    const legalMoves = chess.moves();

    if (legalMoves.length === 0) {
      throw new Error("No legal moves available");
    }

    const prompt = this.createChessPrompt(
      position,
      gameHistory,
      color,
      legalMoves
    );

    try {
      let response;
      switch (modelConfig.provider) {
        case "openai":
          response = await this.callOpenAI(modelConfig, prompt);
          break;
        case "google":
          response = await this.callGoogle(modelConfig, prompt);
          break;
        case "anthropic":
          response = await this.callAnthropic(modelConfig, prompt);
          break;
        case "deepseek":
          response = await this.callDeepSeek(modelConfig, prompt);
          break;
        default:
          throw new Error(`Provider ${modelConfig.provider} not implemented`);
      }

      const move = this.extractMove(response, legalMoves);

      if (!move) {
        // Fallback to random legal move
        const randomMove =
          legalMoves[Math.floor(Math.random() * legalMoves.length)];
        console.warn(
          `${modelName} didn't provide valid move, using random: ${randomMove}`
        );
        return randomMove;
      }

      return move;
    } catch (error) {
      console.error(`Error getting move from ${modelName}:`, error);
      // Fallback to random legal move
      const randomMove =
        legalMoves[Math.floor(Math.random() * legalMoves.length)];
      return randomMove;
    }
  }

  createChessPrompt(position, gameHistory, color, legalMoves) {
    const chess = new Chess(position);
    const moveNumber = Math.floor(gameHistory.length / 2) + 1;
    const inCheck = chess.inCheck() ? " (You are in check!)" : "";

    return `You are a Chess Grandmaster playing with the ${color} pieces${inCheck}.
We are currently playing chess.

I will give you the last move, the history of the game so far, the
actual board position and you must analyze the position and find the best move.

Current position (FEN): ${position}
Move number: ${moveNumber}
Game history: ${gameHistory.join(" ")}

Your legal moves: ${legalMoves.join(", ")}

Analyze the position and choose the best move. Consider:
- King safety and threats
- Piece development and coordination  
- Control of the center
- Tactical opportunities (pins, forks, discovered attacks)
- Positional advantages (pawn structure, piece activity)
- Endgame principles if applicable

# OUTPUT
Do not use any special characters.
Give your response in the following order:

1. Your move, using the following format: My move: "Move" (in the SAN notation, in english).
2. The explanation, in Portuguese, of why you chose the move, in no more than 3 sentences.`;
  }

  async callOpenAI(modelConfig, prompt) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: modelConfig.model,
        messages: [
          {
            role: "system",
            content:
              "You are a chess grandmaster. Respond only with the chess move in standard algebraic notation. No explanations, just the move.",
          },
          { role: "user", content: prompt },
        ],
        temperature: modelConfig.temperature,
        max_tokens: 50,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: process.env.API_TIMEOUT || 30000,
      }
    );

    if (!response.data.choices || !response.data.choices[0]) {
      throw new Error("Invalid response from OpenAI API");
    }

    return response.data.choices[0].message.content.trim();
  }

  async callGoogle(modelConfig, prompt) {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("Google API key not configured");
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelConfig.model}:generateContent?key=${process.env.GOOGLE_API_KEY}`,
      {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: modelConfig.temperature,
          maxOutputTokens: 50,
        },
      },
      {
        timeout: process.env.API_TIMEOUT || 30000,
      }
    );

    if (
      !response.data.candidates ||
      !response.data.candidates[0] ||
      !response.data.candidates[0].content ||
      !response.data.candidates[0].content.parts[0]
    ) {
      throw new Error("Invalid response from Google API");
    }

    return response.data.candidates[0].content.parts[0].text.trim();
  }

  async callAnthropic(modelConfig, prompt) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("Anthropic API key not configured");
    }

    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: modelConfig.model,
        messages: [{ role: "user", content: prompt }],
        temperature: modelConfig.temperature,
        max_tokens: 50,
      },
      {
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        timeout: process.env.API_TIMEOUT || 30000,
      }
    );

    if (!response.data.content || !response.data.content[0]) {
      throw new Error("Invalid response from Anthropic API");
    }

    return response.data.content[0].text.trim();
  }

  async callDeepSeek(modelConfig, prompt) {
    if (!process.env.DEEPSEEK_API_KEY) {
      throw new Error("DeepSeek API key not configured");
    }

    const response = await axios.post(
      "https://api.deepseek.com/v1/chat/completions",
      {
        model: modelConfig.model,
        messages: [
          {
            role: "system",
            content:
              "You are a chess grandmaster. Respond only with the chess move in standard algebraic notation.",
          },
          { role: "user", content: prompt },
        ],
        temperature: modelConfig.temperature,
        max_tokens: 50,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: process.env.API_TIMEOUT || 30000,
      }
    );

    if (!response.data.choices || !response.data.choices[0]) {
      throw new Error("Invalid response from DeepSeek API");
    }

    return response.data.choices[0].message.content.trim();
  }

  extractMove(response, legalMoves) {
    // Try to find the move in "My move: '...'"
    const moveMatch = response.match(/My move: "([^"]+)"/);
    if (moveMatch && moveMatch[1]) {
      const parsedMove = moveMatch[1].trim();
      if (legalMoves.includes(parsedMove)) {
        return parsedMove;
      }
    }

    // Fallback to previous extraction logic
    // Clean up the response
    const cleanResponse = response.replace(/[^\w\-+=\s]/g, "").trim();

    // Try exact match first
    for (const move of legalMoves) {
      if (cleanResponse.includes(move)) {
        return move;
      }
    }

    // Try pattern matching for chess moves
    const movePattern =
      /([NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQ])?[+#]?|O-O(?:-O)?)/g;
    const matches = cleanResponse.match(movePattern);

    if (matches) {
      for (const match of matches) {
        if (legalMoves.includes(match)) {
          return match;
        }
      }
    }

    return null;
  }

  async playGame(whiteModel, blackModel, opening = "e4", gameId = null) {
    const id =
      gameId || `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const chess = new Chess();
    const gameHistory = [];
    const moveDetails = [];
    const startTime = new Date();

    // Apply opening if provided
    if (opening && opening !== "random") {
      try {
        const openingMoves = opening.split(" ").filter((move) => move.trim());
        for (const move of openingMoves) {
          const moveObj = chess.move(move.trim());
          if (moveObj) {
            gameHistory.push(moveObj.san);
            moveDetails.push({
              move: move.trim(),
              san: moveObj.san,
              color: moveObj.color === "w" ? "white" : "black",
              model: moveObj.color === "w" ? whiteModel : blackModel,
              fen: chess.fen(),
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (e) {
        console.error("Invalid opening moves:", opening, e);
      }
    }

    let moveCount = 0;
    const maxMoves = 200; // Prevent infinite games

    while (!chess.isGameOver() && moveCount < maxMoves) {
      const currentColor = chess.turn() === "w" ? "white" : "black";
      const currentModel = currentColor === "white" ? whiteModel : blackModel;

      try {
        console.log(`${currentModel} (${currentColor}) thinking...`);

        const move = await this.makeMove(
          currentModel,
          chess.fen(),
          gameHistory,
          currentColor
        );

        const moveObj = chess.move(move);

        if (moveObj) {
          gameHistory.push(moveObj.san);
          moveDetails.push({
            move: move,
            san: moveObj.san,
            color: currentColor,
            model: currentModel,
            fen: chess.fen(),
            timestamp: new Date().toISOString(),
            captured: moveObj.captured || null,
            check: chess.inCheck(),
            checkmate: chess.isCheckmate(),
          });

          // Emit real-time update
          io.emit("game-update", {
            gameId: id,
            move: moveObj.san,
            fen: chess.fen(),
            turn: chess.turn(),
            gameOver: chess.isGameOver(),
            currentModel,
            moveCount: moveDetails.length,
            history: gameHistory,
          });

          console.log(`${currentModel} (${currentColor}): ${moveObj.san}`);
        } else {
          console.error(`Invalid move ${move} by ${currentModel}`);
          break;
        }
      } catch (error) {
        console.error(`Error in move by ${currentModel}:`, error);
        break;
      }

      moveCount++;
      // Add small delay between moves for better UX
      await new Promise((resolve) =>
        setTimeout(resolve, process.env.MOVE_DELAY || 2000)
      );
    }

    // Determine game result
    let result = "*";
    let resultReason = "Game in progress";

    if (chess.isCheckmate()) {
      result = chess.turn() === "w" ? "0-1" : "1-0";
      resultReason = "Checkmate";
    } else if (chess.isStalemate()) {
      result = "1/2-1/2";
      resultReason = "Stalemate";
    } else if (chess.isDraw()) {
      result = "1/2-1/2";
      resultReason = "Draw";
    } else if (moveCount >= maxMoves) {
      result = "1/2-1/2";
      resultReason = "Move limit reached";
    }

    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000); // seconds

    const gameData = {
      id,
      white: whiteModel,
      black: blackModel,
      result,
      resultReason,
      moves: gameHistory,
      moveDetails,
      pgn: this.generatePGN(
        whiteModel,
        blackModel,
        result,
        gameHistory,
        resultReason
      ),
      fen: chess.fen(),
      status: "completed",
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: duration,
      totalMoves: gameHistory.length,
      opening: opening || "Unknown",
    };

    // Update stats
    this.updateGameStats(gameData);

    // Save game
    await this.saveGame(gameData);

    // Emit final update
    io.emit("game-completed", gameData);

    return gameData;
  }

  updateGameStats(gameData) {
    this.gameStats.totalGames++;
    this.gameStats.completedGames++;
    this.gameStats.totalMoves += gameData.totalMoves;

    // Update average duration
    this.gameStats.averageGameDuration = Math.round(
      (this.gameStats.averageGameDuration + gameData.duration) / 2
    );
  }

  generatePGN(white, black, result, moves, resultReason) {
    const date = new Date().toISOString().split("T")[0].replace(/-/g, ".");
    let pgn = `[Event "LLM Chess Arena"]
[Site "localhost:3000"]
[Date "${date}"]
[Round "1"]
[White "${white}"]
[Black "${black}"]
[Result "${result}"]
[Termination "${resultReason}"]

`;

    for (let i = 0; i < moves.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const whiteMove = moves[i];
      const blackMove = moves[i + 1] || "";
      pgn += `${moveNum}. ${whiteMove}${blackMove ? " " + blackMove : ""}\n`;
    }

    pgn += ` ${result}`;
    return pgn;
  }

  async saveGame(gameData) {
    try {
      // Create games directory if it doesn't exist
      const gamesDir = path.join(__dirname, "games");
      await fs.mkdir(gamesDir, { recursive: true });

      // Save as JSON
      const jsonPath = path.join(gamesDir, `${gameData.id}.json`);
      await fs.writeFile(jsonPath, JSON.stringify(gameData, null, 2));

      // Save as PGN
      const pgnPath = path.join(gamesDir, `${gameData.id}.pgn`);
      await fs.writeFile(pgnPath, gameData.pgn);

      console.log(`✅ Game saved: ${gameData.id} (${gameData.result})`);
    } catch (error) {
      console.error("❌ Error saving game:", error);
    }
  }

  async getRecentGames(limit = 10) {
    try {
      const matchupDirs = await this.getGameDirectories();
      const allGames = [];

      for (const dir of matchupDirs) {
        try {
          const pgnFiles = (await fs.readdir(path.join(__dirname, dir))).filter(
            (f) => f.endsWith(".pgn")
          );

          for (const file of pgnFiles) {
            try {
              const pgnPath = path.join(__dirname, dir, file);
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
                  duration: this.formatDuration(null), // No duration data in PGN
                  date: this.formatDate(gameDate.toISOString()),
                  rawDate: gameDate,
                });
              }
            } catch (e) {
              // Gracefully skip invalid PGNs
            }
          }
        } catch (e) {
          // Gracefully skip directories that can't be read
        }
      }

      // Also check the 'games' directory for newly played games (JSON files)
      try {
        const gamesDir = path.join(__dirname, "games");
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
              moves: game.totalMoves,
              duration: this.formatDuration(game.duration),
              date: this.formatDate(game.endTime),
              rawDate: new Date(game.endTime),
            });
          } catch (error) {
            // Skip broken JSON files
          }
        }
      } catch (err) {
        if (err.code !== "ENOENT") {
          console.error("Error reading recent games from 'games' dir:", err);
        }
        // Ignore if 'games' dir doesn't exist yet
      }

      allGames.sort((a, b) => b.rawDate - a.rawDate);

      return allGames.slice(0, limit).map((g) => {
        const { rawDate, ...rest } = g; // Don't return rawDate to frontend
        return rest;
      });
    } catch (error) {
      console.error("Error getting recent games:", error);
      return [];
    }
  }

  formatDuration(seconds) {
    if (seconds === null || seconds === undefined) {
      return "N/A";
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  formatDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays === 0) {
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `Há ${diffMins} minutos`;
      }
      return `Hoje, ${date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else if (diffDays === 1) {
      return `Ontem, ${date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else {
      return date.toLocaleDateString("pt-BR");
    }
  }

  async startBattle(config) {
    const battleId = `battle_${Date.now()}`;
    const battle = {
      id: battleId,
      ...config,
      currentGame: 0,
      results: [],
      status: "running",
      startTime: new Date().toISOString(),
      whiteWins: 0,
      blackWins: 0,
      draws: 0,
    };

    this.battles.set(battleId, battle);

    // Run battle asynchronously
    this.runBattle(battle);

    return battle;
  }

  async runBattle(battle) {
    console.log(
      `🔥 Starting battle: ${battle.whiteModel} vs ${battle.blackModel}`
    );

    for (let i = 0; i < battle.numGames; i++) {
      // Alternate colors each game
      const whiteModel = i % 2 === 0 ? battle.whiteModel : battle.blackModel;
      const blackModel = i % 2 === 0 ? battle.blackModel : battle.whiteModel;

      try {
        console.log(
          `🎮 Game ${i + 1}/${battle.numGames}: ${whiteModel} vs ${blackModel}`
        );

        const game = await this.playGame(
          whiteModel,
          blackModel,
          battle.opening,
          `${battle.id}_game_${i + 1}`
        );

        battle.currentGame = i + 1;
        battle.results.push({
          gameNumber: i + 1,
          white: whiteModel,
          black: blackModel,
          result: game.result,
          moves: game.totalMoves,
          duration: game.duration,
          gameId: game.id,
        });

        // Update statistics
        if (game.result === "1-0") {
          if (whiteModel === battle.whiteModel) {
            battle.whiteWins++;
          } else {
            battle.blackWins++;
          }
        } else if (game.result === "0-1") {
          if (blackModel === battle.blackModel) {
            battle.blackWins++;
          } else {
            battle.whiteWins++;
          }
        } else {
          battle.draws++;
        }

        // Emit battle update
        io.emit("battle-update", {
          ...battle,
          progress: (battle.currentGame / battle.numGames) * 100,
        });

        console.log(`✅ Game ${i + 1} completed: ${game.result}`);
      } catch (error) {
        console.error(`❌ Error in battle game ${i + 1}:`, error);
      }
    }

    battle.status = "completed";
    battle.endTime = new Date().toISOString();

    console.log(
      `🏁 Battle completed: ${battle.whiteModel} ${battle.whiteWins}-${battle.draws}-${battle.blackWins} ${battle.blackModel}`
    );

    io.emit("battle-completed", battle);
  }
}

const gameManager = new GameManager();

// Routes
app.use("/api/analysis", analysisRoutes);
app.use("/api/lichess", lichessRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/games", gamesRoutes);
app.use("/api/data", dataRoutes);

// Enhanced API endpoints
app.post("/api/games/battle", async (req, res) => {
  try {
    const config = {
      whiteModel: req.body.whiteModel || "GPT-4o",
      blackModel: req.body.blackModel || "Gemini-Pro",
      numGames: parseInt(req.body.numGames) || 1,
      opening: req.body.opening || "e4",
      timeControl: req.body.timeControl || "unlimited",
    };

    const battle = await gameManager.startBattle(config);
    res.json({ success: true, battle });
  } catch (error) {
    console.error("Error starting battle:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/models/available", (req, res) => {
  const models = {};
  for (const [name, config] of Object.entries(gameManager.modelClients)) {
    models[name] = {
      active: config.active,
      rating: config.rating,
      description: config.description,
    };
  }
  res.json(models);
});

app.get("/api/games/recent", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const games = await gameManager.getRecentGames(limit);
    res.json(games);
  } catch (error) {
    console.error("Error getting recent games:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/games/stats", (req, res) => {
  res.json({
    ...gameManager.gameStats,
    activeModels: Object.values(gameManager.modelClients).filter(
      (m) => m.active
    ).length,
    tournaments: gameManager.battles.size,
    avgMoves: Math.round(
      gameManager.gameStats.totalMoves /
        Math.max(gameManager.gameStats.totalGames, 1)
    ),
  });
});

app.get("/api/games/list-matchups", async (req, res) => {
  try {
    const gamesDir = __dirname;
    const entries = await fs.readdir(gamesDir, { withFileTypes: true });
    const directories = entries
      .filter((dirent) => dirent.isDirectory() && dirent.name.includes(" vs "))
      .map((dirent) => dirent.name);
    res.json(directories);
  } catch (error) {
    console.error("Error listing matchups:", error);
    res.status(500).json({ error: "Failed to list game matchups." });
  }
});

app.get("/api/games/list-games/:matchup", async (req, res) => {
  try {
    const matchup = req.params.matchup;
    // Basic validation to prevent directory traversal
    if (matchup.includes("..")) {
      return res.status(400).json({ error: "Invalid matchup name" });
    }
    const matchupDir = path.join(__dirname, matchup);
    const files = await fs.readdir(matchupDir);
    const pgnFiles = files.filter((file) => file.endsWith(".pgn"));
    res.json(pgnFiles);
  } catch (error) {
    console.error("Error listing games:", error);
    res.status(500).json({ error: "Failed to list games for the matchup." });
  }
});

app.get("/api/games/pgn-data/:matchup/:file", async (req, res) => {
  try {
    const { matchup, file } = req.params;

    // Basic validation to prevent directory traversal
    if (matchup.includes("..") || file.includes("..")) {
      return res.status(400).json({ error: "Invalid path" });
    }
    if (!file.endsWith(".pgn")) {
      return res
        .status(400)
        .json({ error: "Invalid file type. Must be a PGN file." });
    }

    const pgnPath = path.join(__dirname, matchup, file);
    const pgnContent = await fs.readFile(pgnPath, "utf8");

    const chess = new Chess();
    chess.load_pgn(pgnContent);

    const history = chess.history({ verbose: true });
    const fens = ["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"];
    const tempGame = new Chess();
    history.forEach((move) => {
      tempGame.move(move);
      fens.push(tempGame.fen());
    });

    res.json({
      headers: chess.header(),
      moves: history,
      fens: fens,
      pgn: pgnContent,
      comments: chess.get_comments(),
    });
  } catch (error) {
    console.error(`Error reading PGN file ${req.params.file}:`, error);
    res.status(404).json({ error: "PGN data not found." });
  }
});

// Human vs AI game endpoints
app.post("/api/games/human", async (req, res) => {
  const { opponentModel, playerColor, difficulty, timeControl } = req.body;

  const gameId = `human_${Date.now()}`;
  const game = {
    id: gameId,
    type: "human_vs_ai",
    humanColor: playerColor || "white",
    aiModel: opponentModel || "Gemini-Pro",
    difficulty: difficulty || "advanced",
    timeControl: timeControl || "blitz",
    chess: new Chess(),
    status: "active",
    history: [],
    startTime: new Date().toISOString(),
  };

  gameManager.games.set(gameId, game);

  res.json({
    success: true,
    game: {
      id: gameId,
      fen: game.chess.fen(),
      turn: game.chess.turn(),
      status: "active",
      humanColor: game.humanColor,
      aiModel: game.aiModel,
    },
  });
});

app.post("/api/games/human/:id/move", async (req, res) => {
  const { id } = req.params;
  const { move } = req.body;

  const game = gameManager.games.get(id);
  if (!game) {
    return res.status(404).json({ error: "Game not found" });
  }

  try {
    const moveObj = game.chess.move(move);
    if (!moveObj) {
      return res.status(400).json({ error: "Invalid move" });
    }

    game.history.push(moveObj.san);

    const gameOver = game.chess.isGameOver();
    let result = null;

    if (gameOver) {
      if (game.chess.isCheckmate()) {
        result = game.chess.turn() === "w" ? "0-1" : "1-0";
      } else {
        result = "1/2-1/2";
      }
    }

    res.json({
      success: true,
      move: moveObj.san,
      fen: game.chess.fen(),
      gameOver,
      result,
      history: game.history,
      turn: game.chess.turn(),
    });

    // If it's AI's turn and game is not over
    if (!gameOver) {
      const aiColor = game.humanColor === "white" ? "black" : "white";
      const currentTurn = game.chess.turn() === "w" ? "white" : "black";

      if (currentTurn === aiColor) {
        setTimeout(async () => {
          try {
            const aiMove = await gameManager.makeMove(
              game.aiModel,
              game.chess.fen(),
              game.history,
              aiColor
            );

            const aiMoveObj = game.chess.move(aiMove);
            if (aiMoveObj) {
              game.history.push(aiMoveObj.san);

              const aiGameOver = game.chess.isGameOver();
              let aiResult = null;

              if (aiGameOver) {
                if (game.chess.isCheckmate()) {
                  aiResult = game.chess.turn() === "w" ? "0-1" : "1-0";
                } else {
                  aiResult = "1/2-1/2";
                }
                game.status = "completed";
              }

              io.to(id).emit("ai-move", {
                move: aiMoveObj.san,
                fen: game.chess.fen(),
                gameOver: aiGameOver,
                result: aiResult,
                history: game.history,
                turn: game.chess.turn(),
              });
            }
          } catch (error) {
            console.error("AI move error:", error);
            io.to(id).emit("ai-error", { error: "AI move failed" });
          }
        }, process.env.MOVE_DELAY || 2000); // Configurable delay for AI thinking
      }
    } else {
      game.status = "completed";
    }
  } catch (error) {
    console.error("Move error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Game viewing and PGN download
app.get("/api/games/:id", async (req, res) => {
  try {
    const gameId = req.params.id;
    const gamePath = path.join(__dirname, "games", `${gameId}.json`);
    const gameContent = await fs.readFile(gamePath, "utf8");
    const game = JSON.parse(gameContent);
    res.json(game);
  } catch (error) {
    res.status(404).json({ error: "Game not found" });
  }
});

app.get("/api/games/:id/pgn", async (req, res) => {
  try {
    const gameId = req.params.id;
    const pgnPath = path.join(__dirname, "games", `${gameId}.pgn`);
    const pgnContent = await fs.readFile(pgnPath, "utf8");

    res.setHeader("Content-Type", "application/x-chess-pgn");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${gameId}.pgn"`
    );
    res.send(pgnContent);
  } catch (error) {
    res.status(404).json({ error: "PGN not found" });
  }
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on("join-game", (gameId) => {
    socket.join(gameId);
    console.log(`👥 Client ${socket.id} joined game ${gameId}`);
  });

  socket.on("join-battle", (battleId) => {
    socket.join(battleId);
    console.log(`⚔️ Client ${socket.id} joined battle ${battleId}`);
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Serve the main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    models: Object.keys(gameManager.modelClients).length,
    activeGames: gameManager.games.size,
    activeBattles: gameManager.battles.size,
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("❌ Server error:", error);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    message: `Route ${req.method} ${req.path} not found`,
  });
});

app.get("/api/data/dashboard", async (req, res) => {
  try {
    // Model stats
    const modelStats = await (async () => {
      const stats = {};
      const gameDirs = await gameManager.getGameDirectories();
      for (const dir of gameDirs) {
        const pgnFiles = (await fs.readdir(path.join(__dirname, dir))).filter(
          (f) => f.endsWith(".pgn")
        );
        for (const file of pgnFiles) {
          const pgnPath = path.join(__dirname, dir, file);
          const pgn = await fs.readFile(pgnPath, "utf-8");
          const whiteMatch = pgn.match(/\[White \"(.*?)\"\]/);
          const blackMatch = pgn.match(/\[Black \"(.*?)\"\]/);
          const resultMatch = pgn.match(/\[Result \"(.*?)\"\]/);
          if (whiteMatch && blackMatch && resultMatch) {
            const white = whiteMatch[1];
            const black = blackMatch[1];
            const result = resultMatch[1];
            if (!stats[white])
              stats[white] = {
                model: white,
                wins: 0,
                losses: 0,
                draws: 0,
                total: 0,
              };
            if (!stats[black])
              stats[black] = {
                model: black,
                wins: 0,
                losses: 0,
                draws: 0,
                total: 0,
              };
            stats[white].total++;
            stats[black].total++;
            if (result === "1-0") {
              stats[white].wins++;
              stats[black].losses++;
            } else if (result === "0-1") {
              stats[black].wins++;
              stats[white].losses++;
            } else if (result === "1/2-1/2") {
              stats[white].draws++;
              stats[black].draws++;
            }
          }
        }
      }
      return Object.values(stats).sort((a, b) => b.wins - a.wins);
    })();
    const totalGames = modelStats.reduce((sum, m) => sum + m.total, 0) / 2;
    const recentGames = await gameManager.getRecentGames(10);

    // Matchup stats
    const matchupStatsMap = {};
    const gameDirs = await gameManager.getGameDirectories();
    for (const dir of gameDirs) {
      const pgnFiles = (await fs.readdir(path.join(__dirname, dir))).filter(
        (f) => f.endsWith(".pgn")
      );
      let p1 = null,
        p2 = null,
        p1_wins = 0,
        p2_wins = 0,
        draws = 0,
        total = 0;
      for (const file of pgnFiles) {
        const pgnPath = path.join(__dirname, dir, file);
        const pgn = await fs.readFile(pgnPath, "utf-8");
        const whiteMatch = pgn.match(/\[White \"(.*?)\"\]/);
        const blackMatch = pgn.match(/\[Black \"(.*?)\"\]/);
        const resultMatch = pgn.match(/\[Result \"(.*?)\"\]/);
        if (whiteMatch && blackMatch && resultMatch) {
          const white = whiteMatch[1];
          const black = blackMatch[1];
          const result = resultMatch[1];
          if (!p1 || !p2) {
            p1 = white;
            p2 = black;
          }
          if (result === "1-0") p1_wins++;
          else if (result === "0-1") p2_wins++;
          else if (result === "1/2-1/2") draws++;
          total++;
        }
      }
      if (p1 && p2 && total > 0) {
        matchupStatsMap[dir] = {
          matchup: dir,
          p1,
          p2,
          p1_wins,
          p2_wins,
          draws,
          total,
        };
      }
    }
    const matchupStats = Object.values(matchupStatsMap);

    res.json({
      totalGames,
      modelStats,
      recentGames,
      matchupStats,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

app.get("/api/data/database-stats", async (req, res) => {
  try {
    // Contar partidas e modelos únicos
    const rootDir = __dirname;
    const dirs = (await fs.readdir(rootDir, { withFileTypes: true }))
      .filter((d) => d.isDirectory() && d.name.includes(" vs "))
      .map((d) => d.name);
    let totalGames = 0;
    const modelsSet = new Set();
    for (const dir of dirs) {
      const files = (await fs.readdir(path.join(rootDir, dir))).filter((f) =>
        f.endsWith(".pgn")
      );
      totalGames += files.length;
      for (const file of files) {
        const pgn = await fs.readFile(path.join(rootDir, dir, file), "utf8");
        const white = (pgn.match(/\[White \"(.*?)\"\]/) || [])[1];
        const black = (pgn.match(/\[Black \"(.*?)\"\]/) || [])[1];
        if (white) modelsSet.add(white);
        if (black) modelsSet.add(black);
      }
    }
    // Calcular tamanho do diretório de dados
    let dbSize = 0;
    for (const dir of dirs) {
      const files = await fs.readdir(path.join(rootDir, dir));
      for (const file of files) {
        const stats = await fs.stat(path.join(rootDir, dir, file));
        dbSize += stats.size;
      }
    }
    res.json({
      total_games: totalGames,
      unique_models: modelsSet.size,
      db_size_mb: dbSize / 1024 / 1024,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch database stats" });
  }
});

const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const MAX_PORT = DEFAULT_PORT + 10;

function startServer(port) {
  server.listen(port, () => {
    console.log(`\n🚀 LLM Chess Arena running on port ${port}`);
    console.log(`📊 Dashboard: http://localhost:${port}`);
    console.log(`\n🔑 Configure your API keys in environment variables:`);
    console.log(
      `   - OPENAI_API_KEY: ${
        !!process.env.OPENAI_API_KEY ? "✅ Set" : "❌ Not set"
      }`
    );
    console.log(
      `   - GOOGLE_API_KEY: ${
        !!process.env.GOOGLE_API_KEY ? "✅ Set" : "❌ Not set"
      }`
    );
    console.log(
      `   - ANTHROPIC_API_KEY: ${
        !!process.env.ANTHROPIC_API_KEY ? "✅ Set" : "❌ Not set"
      }`
    );
    console.log(
      `   - DEEPSEEK_API_KEY: ${
        !!process.env.DEEPSEEK_API_KEY ? "✅ Set" : "❌ Not set"
      }`
    );

    const activeModels = Object.values(gameManager.modelClients).filter(
      (m) => m.active
    ).length;
    console.log(
      `\n🤖 Active AI models: ${activeModels}/$${
        Object.keys(gameManager.modelClients).length
      }`
    );
    console.log(`\n🏁 Ready to battle! Use Ctrl+C to stop.\n`);
  });
}

let currentPort = DEFAULT_PORT;
function tryListen(port) {
  server.once("error", (err) => {
    if (err.code === "EADDRINUSE") {
      if (port < MAX_PORT) {
        console.warn(`⚠️  Porta ${port} em uso. Tentando porta ${port + 1}...`);
        currentPort = port + 1;
        tryListen(currentPort);
      } else {
        console.error(
          `❌ Nenhuma porta disponível entre ${DEFAULT_PORT} e ${MAX_PORT}`
        );
        process.exit(1);
      }
    } else {
      console.error("Erro ao iniciar o servidor:", err);
      process.exit(1);
    }
  });
  startServer(port);
}

tryListen(currentPort);

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("\n🛑 Received SIGTERM. Graceful shutdown...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("\n🛑 Received SIGINT. Graceful shutdown...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

module.exports = { app, server, gameManager };
