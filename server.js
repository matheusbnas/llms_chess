const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

// Import route modules
const gameRoutes = require("./routes/games");
const modelRoutes = require("./routes/models");
const analysisRoutes = require("./routes/analysis");
const lichessRoutes = require("./routes/lichess");
const settingsRoutes = require("./routes/settings");
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
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// API Routes
app.use("/api/games", gameRoutes);
app.use("/api/models", modelRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/lichess", lichessRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/data", dataRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Serve main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Handle 404 for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({
    error: "API endpoint not found",
    path: req.originalUrl,
    method: req.method,
  });
});

// Serve SPA for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Socket.IO for real-time updates
let connectedUsers = 0;
let activeGames = new Map();
let activeTournaments = new Map();

io.on("connection", (socket) => {
  connectedUsers++;
  console.log(`🔌 User connected: ${socket.id} (Total: ${connectedUsers})`);

  // Send current stats to new user
  socket.emit("server-stats", {
    connectedUsers,
    activeGames: activeGames.size,
    activeTournaments: activeTournaments.size,
  });

  // Game events
  socket.on("join-game", (gameId) => {
    socket.join(`game-${gameId}`);

    if (!activeGames.has(gameId)) {
      activeGames.set(gameId, {
        id: gameId,
        players: [],
        spectators: 0,
        createdAt: new Date(),
      });
    }

    const game = activeGames.get(gameId);
    game.spectators++;

    console.log(`👀 User ${socket.id} joined game ${gameId}`);
    socket.emit("game-joined", { gameId, spectators: game.spectators });
    socket
      .to(`game-${gameId}`)
      .emit("spectator-joined", { spectators: game.spectators });
  });

  socket.on("leave-game", (gameId) => {
    socket.leave(`game-${gameId}`);

    if (activeGames.has(gameId)) {
      const game = activeGames.get(gameId);
      game.spectators = Math.max(0, game.spectators - 1);
      socket
        .to(`game-${gameId}`)
        .emit("spectator-left", { spectators: game.spectators });
    }
  });

  socket.on("move-made", (data) => {
    console.log(`♟️ Move made in game ${data.gameId}: ${data.move}`);
    socket.to(`game-${data.gameId}`).emit("move-update", {
      ...data,
      timestamp: new Date(),
    });
  });

  socket.on("game-finished", (data) => {
    console.log(`🏁 Game ${data.gameId} finished: ${data.result}`);
    io.to(`game-${data.gameId}`).emit("game-ended", {
      ...data,
      timestamp: new Date(),
    });

    // Clean up game after 5 minutes
    setTimeout(() => {
      activeGames.delete(data.gameId);
    }, 5 * 60 * 1000);
  });

  // Tournament events
  socket.on("join-tournament", (tournamentId) => {
    socket.join(`tournament-${tournamentId}`);

    if (!activeTournaments.has(tournamentId)) {
      activeTournaments.set(tournamentId, {
        id: tournamentId,
        participants: [],
        spectators: 0,
        createdAt: new Date(),
      });
    }

    const tournament = activeTournaments.get(tournamentId);
    tournament.spectators++;

    console.log(`🏆 User ${socket.id} joined tournament ${tournamentId}`);
    socket.emit("tournament-joined", {
      tournamentId,
      spectators: tournament.spectators,
    });
  });

  socket.on("tournament-update", (data) => {
    console.log(`📊 Tournament ${data.tournamentId} update`);
    io.to(`tournament-${data.tournamentId}`).emit("tournament-status-update", {
      ...data,
      timestamp: new Date(),
    });
  });

  // Battle events
  socket.on("join-battle", (battleId) => {
    socket.join(`battle-${battleId}`);
    console.log(`⚔️ User ${socket.id} joined battle ${battleId}`);
  });

  socket.on("battle-update", (data) => {
    io.to(`battle-${data.battleId}`).emit("battle-progress", {
      ...data,
      timestamp: new Date(),
    });
  });

  // Chat events
  socket.on("chat-message", (data) => {
    const message = {
      id: Date.now(),
      user: data.user || "Anonymous",
      message: data.message,
      timestamp: new Date(),
      socketId: socket.id,
    };

    if (data.gameId) {
      io.to(`game-${data.gameId}`).emit("chat-message", message);
    } else if (data.tournamentId) {
      io.to(`tournament-${data.tournamentId}`).emit("chat-message", message);
    } else {
      io.emit("global-chat-message", message);
    }
  });

  // Analysis events
  socket.on("start-analysis", (data) => {
    console.log(`🔍 Analysis started for game ${data.gameId}`);
    socket.emit("analysis-started", { gameId: data.gameId });
  });

  socket.on("analysis-complete", (data) => {
    socket.emit("analysis-result", {
      ...data,
      timestamp: new Date(),
    });
  });

  // Error handling
  socket.on("error", (error) => {
    console.error(`❌ Socket error from ${socket.id}:`, error);
    socket.emit("error-occurred", {
      message: "An error occurred",
      timestamp: new Date(),
    });
  });

  // Disconnect handling
  socket.on("disconnect", (reason) => {
    connectedUsers = Math.max(0, connectedUsers - 1);
    console.log(
      `🔌 User disconnected: ${socket.id} (Reason: ${reason}, Total: ${connectedUsers})`
    );

    // Clean up user from games and tournaments
    activeGames.forEach((game, gameId) => {
      if (game.spectators > 0) {
        game.spectators--;
        socket
          .to(`game-${gameId}`)
          .emit("spectator-left", { spectators: game.spectators });
      }
    });

    activeTournaments.forEach((tournament, tournamentId) => {
      if (tournament.spectators > 0) {
        tournament.spectators--;
        socket
          .to(`tournament-${tournamentId}`)
          .emit("spectator-left", { spectators: tournament.spectators });
      }
    });

    // Broadcast updated stats
    io.emit("server-stats", {
      connectedUsers,
      activeGames: activeGames.size,
      activeTournaments: activeTournaments.size,
    });
  });
});

// Cleanup old data periodically
setInterval(() => {
  const now = new Date();
  const maxAge = 60 * 60 * 1000; // 1 hour

  activeGames.forEach((game, gameId) => {
    if (now - game.createdAt > maxAge && game.spectators === 0) {
      activeGames.delete(gameId);
      console.log(`🧹 Cleaned up inactive game: ${gameId}`);
    }
  });

  activeTournaments.forEach((tournament, tournamentId) => {
    if (now - tournament.createdAt > maxAge && tournament.spectators === 0) {
      activeTournaments.delete(tournamentId);
      console.log(`🧹 Cleaned up inactive tournament: ${tournamentId}`);
    }
  });
}, 30 * 60 * 1000); // Run every 30 minutes

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "localhost";

server.listen(PORT, () => {
  console.log(`🚀 LLM Chess Arena running on http://${HOST}:${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} in your browser`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`⚡ Socket.IO enabled for real-time updates`);

  // Check for API keys
  const apiKeys = {
    OPENAI: !!process.env.OPENAI_API_KEY,
    GOOGLE: !!process.env.GOOGLE_API_KEY,
    DEEPSEEK: !!process.env.EEPSEEK_API_KEY,
    GROQ: !!process.env.GROQ_API_KEY,
  };

  console.log("🔑 API Keys status:", apiKeys);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("🛑 SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

module.exports = { app, server, io };
