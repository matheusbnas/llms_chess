const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const path = require("path");
const fs = require("fs").promises;
const { Chess } = require("chess.js");
const axios = require("axios");

// Import routes
const gamesRouter = require("./routes/games");
const modelsRouter = require("./routes/models");
const analysisRouter = require("./routes/analysis");
const lichessRouter = require("./routes/lichess");
const settingsRouter = require("./routes/settings");
const dataRouter = require("./routes/data");

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
app.use(express.static("public"));
app.use("/pages", express.static(path.join(__dirname, "pages")));

// Game state management
class GameManager {
  constructor() {
    this.games = new Map();
    this.battles = new Map();
    this.tournaments = new Map();
    this.modelClients = this.initializeModelClients();
  }

  initializeModelClients() {
    return {
      "GPT-4o": {
        provider: "openai",
        model: "gpt-4o",
        temperature: 0.1,
        active: !!process.env.OPENAI_API_KEY,
      },
      "GPT-4-Turbo": {
        provider: "openai",
        model: "gpt-4-turbo",
        temperature: 0.1,
        active: !!process.env.OPENAI_API_KEY,
      },
      "Gemini-Pro": {
        provider: "google",
        model: "gemini-1.5-pro-latest",
        temperature: 0.1,
        active: !!process.env.GOOGLE_API_KEY,
      },
      "Gemini-1.0-Pro": {
        provider: "google",
        model: "gemini-1.0-pro",
        temperature: 0.1,
        active: !!process.env.GOOGLE_API_KEY,
      },
      "Deepseek-Chat": {
        provider: "deepseek",
        model: "deepseek-chat",
        temperature: 0.1,
        active: !!process.env.DEEPSEEK_API_KEY,
      },
    };
  }

  async makeMove(modelName, position, gameHistory, color) {
    const modelConfig = this.modelClients[modelName];
    if (!modelConfig || !modelConfig.active) {
      throw new Error(`Model ${modelName} not available`);
    }

    const chess = new Chess(position);
    const legalMoves = chess.moves();

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

    return `You are a Chess Grandmaster playing with the ${color} pieces.

Current position: ${position}
Move number: ${moveNumber}
Game history: ${gameHistory.join(" ")}

Here are the legal moves available: ${legalMoves.join(", ")}

Analyze the position and choose the best move. Consider:
- King safety
- Piece development
- Control of the center
- Tactical opportunities
- Positional advantages

You must respond with ONLY the move in standard algebraic notation (SAN) from the legal moves list.
Examples: e4, Nf3, O-O, Qxd5, Rd1+

Your move:`;
  }

  async callOpenAI(modelConfig, prompt) {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
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
        max_tokens: 10,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content.trim();
  }

  async callGoogle(modelConfig, prompt) {
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
          maxOutputTokens: 10,
        },
      }
    );

    return response.data.candidates[0].content.parts[0].text.trim();
  }

  async callDeepSeek(modelConfig, prompt) {
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
        max_tokens: 10,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content.trim();
  }

  extractMove(response, legalMoves) {
    // Remove any extra text and extract move
    const movePattern =
      /([NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQ])?[+#]?|O-O(?:-O)?)/g;
    const matches = response.match(movePattern);

    if (matches) {
      for (const match of matches) {
        if (legalMoves.includes(match)) {
          return match;
        }
      }
    }

    // Try to find exact match in legal moves
    for (const move of legalMoves) {
      if (response.includes(move)) {
        return move;
      }
    }

    return null;
  }

  async playGame(whiteModel, blackModel, opening = "e4") {
    const gameId = `game_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const chess = new Chess();
    const gameHistory = [];
    const moveDetails = [];

    // Apply opening
    try {
      const openingMove = opening.split(".").pop().trim();
      chess.move(openingMove);
      gameHistory.push(openingMove);
      moveDetails.push({
        move: openingMove,
        san: openingMove,
        color: "white",
        model: whiteModel,
        fen: chess.fen(),
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Invalid opening move:", opening);
    }

    let moveCount = 0;
    const maxMoves = 200; // Prevent infinite games

    while (!chess.isGameOver() && moveCount < maxMoves) {
      const currentColor = chess.turn() === "w" ? "white" : "black";
      const currentModel = currentColor === "white" ? whiteModel : blackModel;

      try {
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
            gameId,
            move: moveObj.san,
            fen: chess.fen(),
            turn: chess.turn(),
            gameOver: chess.isGameOver(),
            currentModel,
            moveCount: moveDetails.length,
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
      // Add small delay between moves
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Game finished
    const result = chess.isCheckmate()
      ? chess.turn() === "w"
        ? "0-1"
        : "1-0"
      : chess.isStalemate() || chess.isDraw()
      ? "1/2-1/2"
      : "*";

    const gameData = {
      id: gameId,
      white: whiteModel,
      black: blackModel,
      result,
      moves: gameHistory,
      moveDetails,
      pgn: this.generatePGN(whiteModel, blackModel, result, gameHistory),
      fen: chess.fen(),
      status: "completed",
      startTime: moveDetails[0]?.timestamp,
      endTime: new Date().toISOString(),
      totalMoves: gameHistory.length,
    };

    // Save game
    await this.saveGame(gameData);

    return gameData;
  }

  generatePGN(white, black, result, moves) {
    const date = new Date().toISOString().split("T")[0];
    let pgn = `[Event "LLM Chess Arena"]
[Site "Local"]
[Date "${date}"]
[Round "1"]
[White "${white}"]
[Black "${black}"]
[Result "${result}"]

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

      console.log(`Game saved: ${gameData.id}`);
    } catch (error) {
      console.error("Error saving game:", error);
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
    };

    this.battles.set(battleId, battle);

    // Run games asynchronously
    this.runBattle(battle);

    return battle;
  }

  async runBattle(battle) {
    for (let i = 0; i < battle.numGames; i++) {
      const whiteModel = i % 2 === 0 ? battle.whiteModel : battle.blackModel;
      const blackModel = i % 2 === 0 ? battle.blackModel : battle.whiteModel;

      try {
        const game = await this.playGame(
          whiteModel,
          blackModel,
          battle.opening
        );

        battle.currentGame = i + 1;
        battle.results.push({
          gameNumber: i + 1,
          white: whiteModel,
          black: blackModel,
          result: game.result,
          moves: game.totalMoves,
          gameId: game.id,
        });

        // Update statistics
        if (game.result === "1-0") {
          if (whiteModel === battle.whiteModel)
            battle.whiteWins = (battle.whiteWins || 0) + 1;
          else battle.blackWins = (battle.blackWins || 0) + 1;
        } else if (game.result === "0-1") {
          if (blackModel === battle.blackModel)
            battle.blackWins = (battle.blackWins || 0) + 1;
          else battle.whiteWins = (battle.whiteWins || 0) + 1;
        } else {
          battle.draws = (battle.draws || 0) + 1;
        }

        // Emit battle update
        io.emit("battle-update", battle);
      } catch (error) {
        console.error(`Error in battle game ${i + 1}:`, error);
      }
    }

    battle.status = "completed";
    battle.endTime = new Date().toISOString();
    io.emit("battle-update", battle);
  }
}

const gameManager = new GameManager();

// Routes
app.use("/api/games", gamesRouter);
app.use("/api/models", modelsRouter);
app.use("/api/analysis", analysisRouter);
app.use("/api/lichess", lichessRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/data", dataRouter);

// Enhanced game routes
app.post("/api/games/battle", async (req, res) => {
  try {
    const battle = await gameManager.startBattle(req.body);
    res.json(battle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/models/available", (req, res) => {
  const models = {};
  for (const [name, config] of Object.entries(gameManager.modelClients)) {
    models[name] = config.active;
  }
  res.json(models);
});

// Human vs AI routes
app.post("/api/games/human", async (req, res) => {
  const { opponentModel, playerColor, difficulty } = req.body;

  const gameId = `human_${Date.now()}`;
  const game = {
    id: gameId,
    type: "human_vs_ai",
    human: playerColor,
    ai: opponentModel,
    chess: new Chess(),
    status: "active",
    history: [],
  };

  gameManager.games.set(gameId, game);

  res.json({
    success: true,
    game: {
      id: gameId,
      fen: game.chess.fen(),
      turn: game.chess.turn(),
      status: "active",
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

    res.json({
      success: true,
      move: moveObj.san,
      fen: game.chess.fen(),
      gameOver: game.chess.isGameOver(),
      result: game.chess.isGameOver() ? game.chess.pgn() : null,
    });

    // If it's AI's turn and game is not over
    if (!game.chess.isGameOver() && game.chess.turn() !== game.human[0]) {
      setTimeout(async () => {
        try {
          const aiMove = await gameManager.makeMove(
            game.ai,
            game.chess.fen(),
            game.history,
            game.chess.turn() === "w" ? "white" : "black"
          );

          const aiMoveObj = game.chess.move(aiMove);
          if (aiMoveObj) {
            game.history.push(aiMoveObj.san);

            io.to(id).emit("ai-move", {
              move: aiMoveObj.san,
              fen: game.chess.fen(),
              gameOver: game.chess.isGameOver(),
              result: game.chess.isGameOver() ? game.chess.pgn() : null,
            });
          }
        } catch (error) {
          console.error("AI move error:", error);
        }
      }, 1000);
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join-game", (gameId) => {
    socket.join(gameId);
    console.log(`Client ${socket.id} joined game ${gameId}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Serve the main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 LLM Chess Arena running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log("🔑 Configure your API keys in environment variables:");
  console.log("   - OPENAI_API_KEY");
  console.log("   - GOOGLE_API_KEY");
  console.log("   - DEEPSEEK_API_KEY");
});

module.exports = { app, server, gameManager };
