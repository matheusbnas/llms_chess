// ♟️ Enhanced LLM Chess Arena - Core System
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const path = require("path");
const fs = require("fs").promises;
const { Chess } = require("chess.js");
const axios = require("axios");

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

// Enhanced Game Manager with Real-time Visualization
class ChessGameManager {
  constructor() {
    this.activeGames = new Map();
    this.gameHistory = [];
    this.modelClients = this.initializeModels();
    this.judgeModel = "groq"; // Para validação de movimentos
  }

  initializeModels() {
    return {
      "GPT-4o": {
        provider: "openai",
        model: "gpt-4o",
        temperature: 0.1,
        active: !!process.env.OPENAI_API_KEY,
        elo: 1650,
        description: "Modelo mais forte da OpenAI",
      },
      "GPT-4-Turbo": {
        provider: "openai",
        model: "gpt-4-turbo",
        temperature: 0.1,
        active: !!process.env.OPENAI_API_KEY,
        elo: 1600,
        description: "Versão equilibrada e rápida",
      },
      "Gemini-Pro": {
        provider: "google",
        model: "gemini-1.5-pro-latest",
        temperature: 0.1,
        active: !!process.env.GOOGLE_API_KEY,
        elo: 1580,
        description: "Modelo criativo do Google",
      },
      "Gemini-1.0-Pro": {
        provider: "google",
        model: "gemini-1.0-pro",
        temperature: 0.1,
        active: !!process.env.GOOGLE_API_KEY,
        elo: 1520,
        description: "Versão estável do Gemini",
      },
      "Claude-3.5-Sonnet": {
        provider: "anthropic",
        model: "claude-3-5-sonnet-20241022",
        temperature: 0.1,
        active: !!process.env.ANTHROPIC_API_KEY,
        elo: 1680,
        description: "Modelo estratégico da Anthropic",
      },
      "Deepseek-Chat": {
        provider: "deepseek",
        model: "deepseek-chat",
        temperature: 0.1,
        active: !!process.env.DEEPSEEK_API_KEY,
        elo: 1550,
        description: "Modelo de raciocínio lógico",
      },
    };
  }

  // Sistema de prompt baseado no arquivo Python
  createChessPrompt(color, lastMove, history, board, legalMoves) {
    const moveCount = Math.ceil(history.length / 2);

    return `
You are a Chess Grandmaster.
We are currently playing chess. 
You are playing with the ${color} pieces.

Game History: ${history.join(" ")}
Last Move: ${lastMove}
Current Position: ${board.fen()}
Legal Moves: ${legalMoves.join(", ")}

Analyze the position and find the best move.

# OUTPUT
Do not use any special characters. 
Give your response in the following order:

1. Your move, using the following format: My move: "Move" (in the SAN notation, in english).
2. The explanation, in Portuguese, of why you chose the move, in no more than 3 sentences.
    `;
  }

  // Sistema de juiz para validar movimentos (baseado no Python)
  async validateMove(proposedMove, legalMoves) {
    try {
      // Primeiro tenta encontrar exatamente na lista
      if (legalMoves.includes(proposedMove)) {
        return proposedMove;
      }

      // Extrai apenas o movimento da resposta usando regex
      const movePattern = /My move:\s*"([^"]+)"/i;
      const match = proposedMove.match(movePattern);

      if (match) {
        const extractedMove = match[1].trim();
        if (legalMoves.includes(extractedMove)) {
          return extractedMove;
        }
      }

      // Procura por padrões de movimento de xadrez
      const chessPattern =
        /([NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQ])?[+#]?|O-O(?:-O)?)/g;
      const matches = proposedMove.match(chessPattern);

      if (matches) {
        for (const move of matches) {
          if (legalMoves.includes(move)) {
            return move;
          }
        }
      }

      return null;
    } catch (error) {
      console.error("Erro na validação:", error);
      return null;
    }
  }

  // Obter movimento de um modelo LLM
  async getModelMove(modelName, color, lastMove, history, board) {
    const model = this.modelClients[modelName];
    if (!model || !model.active) {
      throw new Error(`Modelo ${modelName} não disponível`);
    }

    const legalMoves = board.moves();
    if (legalMoves.length === 0) {
      throw new Error("Sem movimentos legais disponíveis");
    }

    const prompt = this.createChessPrompt(
      color,
      lastMove,
      history,
      board,
      legalMoves
    );

    try {
      let response;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          response = await this.callModelAPI(model, prompt);
          const validMove = await this.validateMove(response, legalMoves);

          if (validMove) {
            return {
              move: validMove,
              response: response,
              attempts: attempts + 1,
            };
          }

          attempts++;
          console.warn(
            `${modelName} tentativa ${attempts}: movimento inválido`
          );
        } catch (apiError) {
          console.error(`Erro API ${modelName}:`, apiError);
          attempts++;
        }
      }

      // Fallback para movimento aleatório
      const randomMove =
        legalMoves[Math.floor(Math.random() * legalMoves.length)];
      console.warn(
        `${modelName} falhou, usando movimento aleatório: ${randomMove}`
      );

      return {
        move: randomMove,
        response: `Movimento aleatório devido a falha na IA`,
        attempts: maxAttempts,
        fallback: true,
      };
    } catch (error) {
      // Última tentativa: movimento aleatório
      const randomMove =
        legalMoves[Math.floor(Math.random() * legalMoves.length)];
      return {
        move: randomMove,
        response: `Erro: ${error.message}`,
        attempts: maxAttempts,
        error: true,
      };
    }
  }

  // Chamar API do modelo
  async callModelAPI(model, prompt) {
    const timeout = 15000; // 15 segundos

    switch (model.provider) {
      case "openai":
        return await this.callOpenAI(model, prompt, timeout);
      case "google":
        return await this.callGoogle(model, prompt, timeout);
      case "anthropic":
        return await this.callAnthropic(model, prompt, timeout);
      case "deepseek":
        return await this.callDeepSeek(model, prompt, timeout);
      default:
        throw new Error(`Provider ${model.provider} não implementado`);
    }
  }

  async callOpenAI(model, prompt, timeout) {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: model.model,
        messages: [
          {
            role: "system",
            content:
              "You are a chess grandmaster. Always respond with your move in the exact format requested.",
          },
          { role: "user", content: prompt },
        ],
        temperature: model.temperature,
        max_tokens: 200,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout,
      }
    );

    return response.data.choices[0].message.content.trim();
  }

  async callGoogle(model, prompt, timeout) {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model.model}:generateContent?key=${process.env.GOOGLE_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: model.temperature,
          maxOutputTokens: 200,
        },
      },
      { timeout }
    );

    return response.data.candidates[0].content.parts[0].text.trim();
  }

  async callAnthropic(model, prompt, timeout) {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: model.model,
        messages: [{ role: "user", content: prompt }],
        temperature: model.temperature,
        max_tokens: 200,
      },
      {
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        timeout,
      }
    );

    return response.data.content[0].text.trim();
  }

  async callDeepSeek(model, prompt, timeout) {
    const response = await axios.post(
      "https://api.deepseek.com/v1/chat/completions",
      {
        model: model.model,
        messages: [
          {
            role: "system",
            content:
              "You are a chess grandmaster. Always respond with your move in the exact format requested.",
          },
          { role: "user", content: prompt },
        ],
        temperature: model.temperature,
        max_tokens: 200,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout,
      }
    );

    return response.data.choices[0].message.content.trim();
  }

  // Jogar partida entre dois modelos com visualização em tempo real
  async playGame(whiteModel, blackModel, openingMoves = ["e4"]) {
    const gameId = `game_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const chess = new Chess();
    const gameState = {
      id: gameId,
      white: whiteModel,
      black: blackModel,
      status: "playing",
      chess: chess,
      history: [],
      moves: [],
      startTime: new Date(),
      currentMove: 0,
    };

    this.activeGames.set(gameId, gameState);

    try {
      console.log(`🎮 Iniciando partida: ${whiteModel} vs ${blackModel}`);

      // Aplicar movimentos de abertura
      for (const opening of openingMoves) {
        try {
          const moveObj = chess.move(opening);
          if (moveObj) {
            gameState.history.push(moveObj.san);
            gameState.moves.push({
              move: moveObj.san,
              color: moveObj.color === "w" ? "white" : "black",
              model: moveObj.color === "w" ? whiteModel : blackModel,
              fen: chess.fen(),
              timestamp: new Date().toISOString(),
              opening: true,
            });
            gameState.currentMove++;
          }
        } catch (e) {
          console.error("Movimento de abertura inválido:", opening);
          break;
        }
      }

      // Emitir estado inicial
      this.emitGameUpdate(gameState);

      let moveCount = 0;
      const maxMoves = 200;

      while (!chess.isGameOver() && moveCount < maxMoves) {
        const currentColor = chess.turn() === "w" ? "white" : "black";
        const currentModel = currentColor === "white" ? whiteModel : blackModel;
        const lastMove =
          gameState.history.length > 0
            ? gameState.history[gameState.history.length - 1]
            : "Início";

        console.log(`${currentModel} (${currentColor}) pensando...`);

        // Emitir que o modelo está pensando
        io.emit("model-thinking", {
          gameId,
          model: currentModel,
          color: currentColor,
        });

        try {
          const moveResult = await this.getModelMove(
            currentModel,
            currentColor,
            lastMove,
            gameState.history,
            chess
          );

          const moveObj = chess.move(moveResult.move);
          if (moveObj) {
            gameState.history.push(moveObj.san);
            gameState.moves.push({
              move: moveObj.san,
              color: currentColor,
              model: currentModel,
              fen: chess.fen(),
              timestamp: new Date().toISOString(),
              response: moveResult.response,
              attempts: moveResult.attempts,
              fallback: moveResult.fallback || false,
              captured: moveObj.captured || null,
              check: chess.inCheck(),
              checkmate: chess.isCheckmate(),
            });
            gameState.currentMove++;

            console.log(`${currentModel}: ${moveObj.san}`);

            // Emitir movimento em tempo real
            this.emitGameUpdate(gameState);

            // Pequena pausa para melhor visualização
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        } catch (error) {
          console.error(`Erro no movimento de ${currentModel}:`, error);
          break;
        }

        moveCount++;
      }

      // Finalizar jogo
      let result = "*";
      let resultReason = "Jogo em andamento";

      if (chess.isCheckmate()) {
        result = chess.turn() === "w" ? "0-1" : "1-0";
        resultReason = "Xeque-mate";
      } else if (chess.isStalemate()) {
        result = "1/2-1/2";
        resultReason = "Afogamento";
      } else if (chess.isDraw()) {
        result = "1/2-1/2";
        resultReason = "Empate";
      } else if (moveCount >= maxMoves) {
        result = "1/2-1/2";
        resultReason = "Limite de movimentos";
      }

      gameState.status = "finished";
      gameState.result = result;
      gameState.resultReason = resultReason;
      gameState.endTime = new Date();

      // Salvar jogo
      await this.saveGame(gameState);

      // Emitir finalização
      io.emit("game-finished", {
        gameId,
        result,
        resultReason,
        totalMoves: gameState.history.length,
        duration: Math.round((gameState.endTime - gameState.startTime) / 1000),
      });

      console.log(`🏁 Partida finalizada: ${result} - ${resultReason}`);

      return gameState;
    } catch (error) {
      console.error("Erro na partida:", error);
      gameState.status = "error";
      gameState.error = error.message;
      this.emitGameUpdate(gameState);
      throw error;
    } finally {
      // Remover jogo ativo após um tempo
      setTimeout(() => {
        this.activeGames.delete(gameId);
      }, 300000); // 5 minutos
    }
  }

  emitGameUpdate(gameState) {
    const update = {
      gameId: gameState.id,
      white: gameState.white,
      black: gameState.black,
      status: gameState.status,
      fen: gameState.chess.fen(),
      history: gameState.history,
      currentMove: gameState.currentMove,
      turn: gameState.chess.turn(),
      gameOver: gameState.chess.isGameOver(),
      result: gameState.result,
      inCheck: gameState.chess.inCheck(),
      lastMove: gameState.moves[gameState.moves.length - 1],
    };

    io.emit("game-update", update);
  }

  async saveGame(gameState) {
    try {
      const gamesDir = path.join(__dirname, "games");
      await fs.mkdir(gamesDir, { recursive: true });

      const gameData = {
        id: gameState.id,
        white: gameState.white,
        black: gameState.black,
        result: gameState.result,
        resultReason: gameState.resultReason,
        moves: gameState.moves,
        history: gameState.history,
        pgn: this.generatePGN(gameState),
        startTime: gameState.startTime.toISOString(),
        endTime: gameState.endTime ? gameState.endTime.toISOString() : null,
        totalMoves: gameState.history.length,
      };

      // Salvar JSON
      await fs.writeFile(
        path.join(gamesDir, `${gameState.id}.json`),
        JSON.stringify(gameData, null, 2)
      );

      // Salvar PGN
      await fs.writeFile(
        path.join(gamesDir, `${gameState.id}.pgn`),
        gameData.pgn
      );

      this.gameHistory.push(gameData);

      console.log(`✅ Jogo salvo: ${gameState.id}`);
    } catch (error) {
      console.error("Erro ao salvar jogo:", error);
    }
  }

  generatePGN(gameState) {
    const date = new Date().toISOString().split("T")[0].replace(/-/g, ".");

    let pgn = `[Event "LLM Chess Arena"]
[Site "localhost:3000"]
[Date "${date}"]
[Round "1"]
[White "${gameState.white}"]
[Black "${gameState.black}"]
[Result "${gameState.result || "*"}"]
[Termination "${gameState.resultReason || "Unknown"}"]

`;

    for (let i = 0; i < gameState.history.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const whiteMove = gameState.history[i];
      const blackMove = gameState.history[i + 1] || "";
      pgn += `${moveNum}. ${whiteMove}${blackMove ? " " + blackMove : ""}\n`;
    }

    pgn += ` ${gameState.result || "*"}`;
    return pgn;
  }

  getAvailableModels() {
    const models = {};
    for (const [name, config] of Object.entries(this.modelClients)) {
      models[name] = {
        active: config.active,
        elo: config.elo,
        description: config.description,
      };
    }
    return models;
  }

  getGameStats() {
    return {
      totalGames: this.gameHistory.length,
      activeGames: this.activeGames.size,
      activeModels: Object.values(this.modelClients).filter((m) => m.active)
        .length,
      avgMoves:
        this.gameHistory.length > 0
          ? Math.round(
              this.gameHistory.reduce((sum, game) => sum + game.totalMoves, 0) /
                this.gameHistory.length
            )
          : 0,
    };
  }

  async getRecentGames(limit = 10) {
    return this.gameHistory
      .slice(-limit)
      .reverse()
      .map((game) => ({
        id: game.id,
        white: game.white,
        black: game.black,
        result: game.result,
        moves: game.totalMoves,
        date: this.formatDate(game.endTime || game.startTime),
      }));
  }

  formatDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) {
      return "Há poucos minutos";
    } else if (diffHours < 24) {
      return `Há ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
    } else {
      return date.toLocaleDateString("pt-BR");
    }
  }
}

// Instância global do gerenciador
const gameManager = new ChessGameManager();

// API Routes
app.get("/api/models/available", (req, res) => {
  res.json(gameManager.getAvailableModels());
});

app.get("/api/games/stats", (req, res) => {
  res.json(gameManager.getGameStats());
});

app.get("/api/games/recent", async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const games = await gameManager.getRecentGames(limit);
  res.json(games);
});

app.post("/api/games/battle", async (req, res) => {
  try {
    const { whiteModel, blackModel, opening } = req.body;

    if (!whiteModel || !blackModel) {
      return res
        .status(400)
        .json({ error: "Modelos white e black são obrigatórios" });
    }

    const openingMoves = opening
      ? opening.split(" ").filter((m) => m.trim())
      : ["e4"];

    // Iniciar jogo de forma assíncrona
    gameManager
      .playGame(whiteModel, blackModel, openingMoves)
      .catch((error) => {
        console.error("Erro na partida:", error);
        io.emit("game-error", { error: error.message });
      });

    res.json({
      success: true,
      message: "Partida iniciada",
      models: { white: whiteModel, black: blackModel },
    });
  } catch (error) {
    console.error("Erro ao iniciar partida:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/games/:id", async (req, res) => {
  try {
    const gameId = req.params.id;
    const gamePath = path.join(__dirname, "games", `${gameId}.json`);
    const gameContent = await fs.readFile(gamePath, "utf8");
    res.json(JSON.parse(gameContent));
  } catch (error) {
    res.status(404).json({ error: "Jogo não encontrado" });
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
    res.status(404).json({ error: "PGN não encontrado" });
  }
});

// Socket.IO para tempo real
io.on("connection", (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id}`);

  socket.on("join-game", (gameId) => {
    socket.join(gameId);
    console.log(`👥 Cliente ${socket.id} entrou no jogo ${gameId}`);
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Cliente desconectado: ${socket.id}`);
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    models: Object.keys(gameManager.modelClients).length,
    activeGames: gameManager.activeGames.size,
  });
});

// Servir página principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`\n🚀 LLM Chess Arena funcionando na porta ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);

  const activeModels = Object.values(gameManager.modelClients).filter(
    (m) => m.active
  ).length;
  console.log(
    `🤖 Modelos ativos: ${activeModels}/${
      Object.keys(gameManager.modelClients).length
    }`
  );

  console.log(`\n🔑 Configure suas chaves de API:`);
  console.log(
    `   - OPENAI_API_KEY: ${!!process.env.OPENAI_API_KEY ? "✅" : "❌"}`
  );
  console.log(
    `   - GOOGLE_API_KEY: ${!!process.env.GOOGLE_API_KEY ? "✅" : "❌"}`
  );
  console.log(
    `   - ANTHROPIC_API_KEY: ${!!process.env.ANTHROPIC_API_KEY ? "✅" : "❌"}`
  );
  console.log(
    `   - DEEPSEEK_API_KEY: ${!!process.env.DEEPSEEK_API_KEY ? "✅" : "❌"}`
  );
  console.log(`\n🏁 Pronto para batalhas! Use Ctrl+C para parar.\n`);
});

module.exports = { app, server, gameManager };
