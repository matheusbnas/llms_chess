const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { Chess } = require('chess.js');
const router = express.Router();

// Enhanced Lichess API integration with RAG capabilities
class LichessRAGIntegration {
    constructor() {
        this.baseURL = 'https://lichess.org/api';
        this.rateLimiter = new Map();
        this.gameCache = new Map();
        this.analysisCache = new Map();
        this.ragData = {
            openingPatterns: new Map(),
            tacticalMotifs: new Map(),
            endgamePositions: new Map(),
            playerStyles: new Map()
        };
    }

    // Rate limiting
    async checkRateLimit(endpoint) {
        const now = Date.now();
        const lastCall = this.rateLimiter.get(endpoint) || 0;
        const timeDiff = now - lastCall;
        
        if (timeDiff < 1000) { // 1 second between calls
            await new Promise(resolve => setTimeout(resolve, 1000 - timeDiff));
        }
        
        this.rateLimiter.set(endpoint, Date.now());
    }

    // Test Lichess connection with enhanced validation
    async testConnection(token) {
        try {
            const response = await axios.get(`${this.baseURL}/account`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                timeout: 10000
            });
            
            return {
                success: true,
                user: response.data,
                perfs: response.data.perfs,
                preferences: response.data.preferences
            };
        } catch (error) {
            return {
                success: false,
                error: this.parseError(error)
            };
        }
    }

    // Enhanced game import with analysis
    async importUserGames(username, options = {}) {
        const {
            maxGames = 1000,
            token,
            timeControl = 'all',
            variant = 'standard',
            rated = true,
            analysisDepth = 15
        } = options;

        try {
            await this.checkRateLimit('games');
            
            const params = new URLSearchParams({
                max: Math.min(maxGames, 1000),
                rated: rated,
                perfType: timeControl === 'all' ? undefined : timeControl,
                variant: variant,
                analysed: true,
                clocks: true,
                evals: true,
                opening: true
            });

            const response = await axios.get(
                `${this.baseURL}/games/user/${username}?${params}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/x-ndjson'
                    },
                    timeout: 30000,
                    responseType: 'stream'
                }
            );

            const games = await this.parseNDJSONStream(response.data);
            const processedGames = [];
            const ragTrainingData = [];

            for (const gameData of games) {
                const processedGame = await this.processGameForRAG(gameData, analysisDepth);
                processedGames.push(processedGame);
                ragTrainingData.push(...processedGame.ragData);
            }

            // Update RAG knowledge base
            await this.updateRAGKnowledge(ragTrainingData);

            return {
                success: true,
                imported: processedGames.length,
                games: processedGames,
                ragDataPoints: ragTrainingData.length,
                trainingData: ragTrainingData
            };

        } catch (error) {
            return {
                success: false,
                error: this.parseError(error)
            };
        }
    }

    // Process individual game for RAG data extraction
    async processGameForRAG(gameData, analysisDepth = 15) {
        const chess = new Chess();
        const moves = gameData.moves ? gameData.moves.split(' ') : [];
        const ragData = [];

        try {
            // Basic game information
            const gameInfo = {
                id: gameData.id,
                white: gameData.players.white,
                black: gameData.players.black,
                result: gameData.status,
                opening: gameData.opening,
                timeControl: gameData.speed,
                rating: {
                    white: gameData.players.white.rating,
                    black: gameData.players.black.rating
                }
            };

            // Process each move with context
            for (let i = 0; i < moves.length; i++) {
                const move = moves[i];
                const position = chess.fen();
                const moveNumber = Math.floor(i / 2) + 1;
                const isWhite = i % 2 === 0;

                try {
                    const moveObj = chess.move(move);
                    if (moveObj) {
                        const ragEntry = {
                            position: position,
                            move: move,
                            san: moveObj.san,
                            moveNumber: moveNumber,
                            color: isWhite ? 'white' : 'black',
                            piece: moveObj.piece,
                            from: moveObj.from,
                            to: moveObj.to,
                            captured: moveObj.captured,
                            promotion: moveObj.promotion,
                            check: moveObj.check,
                            checkmate: moveObj.checkmate,
                            opening: gameInfo.opening?.name,
                            gamePhase: this.determineGamePhase(moveNumber, chess),
                            playerRating: isWhite ? gameInfo.rating.white : gameInfo.rating.black,
                            timeControl: gameInfo.timeControl,
                            context: {
                                previousMoves: moves.slice(Math.max(0, i - 3), i),
                                nextMoves: moves.slice(i + 1, Math.min(moves.length, i + 4))
                            }
                        };

                        // Add tactical annotations if available
                        if (gameData.analysis && gameData.analysis[i]) {
                            ragEntry.evaluation = gameData.analysis[i].eval;
                            ragEntry.bestMove = gameData.analysis[i].best;
                            ragEntry.variation = gameData.analysis[i].variation;
                        }

                        ragData.push(ragEntry);
                    }
                } catch (moveError) {
                    console.warn(`Invalid move ${move} at position ${i}:`, moveError.message);
                    break;
                }
            }

            return {
                ...gameInfo,
                pgn: this.reconstructPGN(gameData),
                moveCount: moves.length,
                ragData: ragData,
                analysis: await this.analyzeGamePatterns(ragData)
            };

        } catch (error) {
            console.error('Error processing game for RAG:', error);
            return {
                id: gameData.id,
                error: error.message,
                ragData: []
            };
        }
    }

    // Determine game phase (opening, middlegame, endgame)
    determineGamePhase(moveNumber, chess) {
        const pieces = chess.board().flat().filter(square => square !== null);
        const pieceCount = pieces.length;

        if (moveNumber <= 15) return 'opening';
        if (pieceCount <= 12) return 'endgame';
        return 'middlegame';
    }

    // Analyze patterns in game data
    async analyzeGamePatterns(ragData) {
        const patterns = {
            openingAccuracy: 0,
            middlegameComplexity: 0,
            endgameKnowledge: 0,
            tacticalSharpness: 0,
            strategicDepth: 0
        };

        const openingMoves = ragData.filter(entry => entry.gamePhase === 'opening');
        const middlegameMoves = ragData.filter(entry => entry.gamePhase === 'middlegame');
        const endgameMoves = ragData.filter(entry => entry.gamePhase === 'endgame');

        // Calculate opening accuracy
        if (openingMoves.length > 0) {
            const accurateOpeningMoves = openingMoves.filter(move => 
                move.evaluation && Math.abs(move.evaluation) < 0.5
            );
            patterns.openingAccuracy = accurateOpeningMoves.length / openingMoves.length;
        }

        // Calculate middlegame complexity
        if (middlegameMoves.length > 0) {
            const complexMoves = middlegameMoves.filter(move => 
                move.captured || move.check || move.promotion
            );
            patterns.middlegameComplexity = complexMoves.length / middlegameMoves.length;
        }

        // Calculate endgame knowledge
        if (endgameMoves.length > 0) {
            const accurateEndgameMoves = endgameMoves.filter(move => 
                move.evaluation && move.bestMove === move.san
            );
            patterns.endgameKnowledge = accurateEndgameMoves.length / endgameMoves.length;
        }

        return patterns;
    }

    // Update RAG knowledge base
    async updateRAGKnowledge(ragTrainingData) {
        try {
            // Group data by patterns
            for (const entry of ragTrainingData) {
                // Opening patterns
                if (entry.gamePhase === 'opening' && entry.opening) {
                    const openingKey = entry.opening;
                    if (!this.ragData.openingPatterns.has(openingKey)) {
                        this.ragData.openingPatterns.set(openingKey, []);
                    }
                    this.ragData.openingPatterns.get(openingKey).push(entry);
                }

                // Tactical motifs
                if (entry.captured || entry.check || entry.checkmate) {
                    const tacticalKey = `${entry.piece}_${entry.captured ? 'capture' : 'tactic'}`;
                    if (!this.ragData.tacticalMotifs.has(tacticalKey)) {
                        this.ragData.tacticalMotifs.set(tacticalKey, []);
                    }
                    this.ragData.tacticalMotifs.get(tacticalKey).push(entry);
                }

                // Endgame positions
                if (entry.gamePhase === 'endgame') {
                    const endgameKey = entry.position.split(' ')[0]; // FEN without move info
                    if (!this.ragData.endgamePositions.has(endgameKey)) {
                        this.ragData.endgamePositions.set(endgameKey, []);
                    }
                    this.ragData.endgamePositions.get(endgameKey).push(entry);
                }
            }

            // Save to persistent storage
            await this.saveRAGData();

            return {
                openingPatterns: this.ragData.openingPatterns.size,
                tacticalMotifs: this.ragData.tacticalMotifs.size,
                endgamePositions: this.ragData.endgamePositions.size
            };

        } catch (error) {
            console.error('Error updating RAG knowledge:', error);
            throw error;
        }
    }

    // Generate RAG-enhanced prompts for LLMs
    generateRAGPrompt(position, moveHistory, playerColor, timeControl) {
        const chess = new Chess(position);
        const gamePhase = this.determineGamePhase(moveHistory.length, chess);
        
        let prompt = `You are playing chess as ${playerColor}. Current position: ${position}\n\n`;

        // Add relevant opening knowledge
        if (gamePhase === 'opening') {
            const relevantOpenings = this.findRelevantOpenings(moveHistory);
            if (relevantOpenings.length > 0) {
                prompt += "Relevant opening knowledge:\n";
                relevantOpenings.forEach(opening => {
                    prompt += `- ${opening.name}: Common continuations include ${opening.commonMoves.join(', ')}\n`;
                });
                prompt += "\n";
            }
        }

        // Add tactical patterns
        const tacticalPatterns = this.findTacticalPatterns(position);
        if (tacticalPatterns.length > 0) {
            prompt += "Potential tactical motifs to consider:\n";
            tacticalPatterns.forEach(pattern => {
                prompt += `- ${pattern.type}: ${pattern.description}\n`;
            });
            prompt += "\n";
        }

        // Add endgame knowledge
        if (gamePhase === 'endgame') {
            const endgameKnowledge = this.findEndgameKnowledge(position);
            if (endgameKnowledge.length > 0) {
                prompt += "Endgame principles to apply:\n";
                endgameKnowledge.forEach(knowledge => {
                    prompt += `- ${knowledge.principle}: ${knowledge.application}\n`;
                });
                prompt += "\n";
            }
        }

        // Add time control considerations
        prompt += `Time control: ${timeControl}. `;
        if (timeControl === 'bullet' || timeControl === 'blitz') {
            prompt += "Prioritize quick, sound moves over deep calculation.\n";
        } else {
            prompt += "Take time for careful calculation and strategic planning.\n";
        }

        prompt += "\nProvide your next move in standard algebraic notation (e.g., Nf3, e4, O-O). Explain your reasoning briefly.";

        return prompt;
    }

    // Find relevant opening patterns
    findRelevantOpenings(moveHistory) {
        const openings = [];
        
        this.ragData.openingPatterns.forEach((entries, openingName) => {
            // Check if current move sequence matches opening patterns
            const relevantEntries = entries.filter(entry => 
                moveHistory.includes(entry.san) || 
                moveHistory.some(move => entry.context.previousMoves.includes(move))
            );
            
            if (relevantEntries.length > 0) {
                const commonMoves = [...new Set(relevantEntries.map(entry => entry.san))];
                openings.push({
                    name: openingName,
                    commonMoves: commonMoves.slice(0, 5), // Top 5 moves
                    frequency: relevantEntries.length
                });
            }
        });

        return openings.sort((a, b) => b.frequency - a.frequency).slice(0, 3);
    }

    // Find tactical patterns in current position
    findTacticalPatterns(position) {
        const patterns = [];
        const chess = new Chess(position);
        
        // Simple pattern recognition
        const moves = chess.moves({ verbose: true });
        
        moves.forEach(move => {
            if (move.captured) {
                patterns.push({
                    type: 'Capture',
                    description: `${move.piece.toUpperCase()} captures ${move.captured.toUpperCase()} on ${move.to}`
                });
            }
            
            if (move.flags.includes('c')) {
                patterns.push({
                    type: 'Check',
                    description: `${move.piece.toUpperCase()} to ${move.to} gives check`
                });
            }
            
            if (move.flags.includes('#')) {
                patterns.push({
                    type: 'Checkmate',
                    description: `${move.piece.toUpperCase()} to ${move.to} is checkmate!`
                });
            }
        });

        return patterns.slice(0, 3); // Top 3 patterns
    }

    // Find endgame knowledge
    findEndgameKnowledge(position) {
        const knowledge = [];
        const chess = new Chess(position);
        const pieces = chess.board().flat().filter(square => square !== null);
        
        if (pieces.length <= 10) {
            knowledge.push({
                principle: 'King Activity',
                application: 'Centralize your king in the endgame for maximum effectiveness'
            });
            
            knowledge.push({
                principle: 'Pawn Promotion',
                application: 'Push passed pawns and support them with your king'
            });
            
            knowledge.push({
                principle: 'Opposition',
                application: 'Use opposition in king and pawn endgames to gain advantage'
            });
        }

        return knowledge;
    }

    // Save RAG data to persistent storage
    async saveRAGData() {
        try {
            const ragDataDir = path.join(__dirname, '..', 'data', 'rag');
            await fs.mkdir(ragDataDir, { recursive: true });

            const data = {
                openingPatterns: Object.fromEntries(this.ragData.openingPatterns),
                tacticalMotifs: Object.fromEntries(this.ragData.tacticalMotifs),
                endgamePositions: Object.fromEntries(this.ragData.endgamePositions),
                lastUpdated: new Date().toISOString()
            };

            await fs.writeFile(
                path.join(ragDataDir, 'rag_knowledge.json'),
                JSON.stringify(data, null, 2)
            );

        } catch (error) {
            console.error('Error saving RAG data:', error);
        }
    }

    // Load RAG data from persistent storage
    async loadRAGData() {
        try {
            const ragDataPath = path.join(__dirname, '..', 'data', 'rag', 'rag_knowledge.json');
            const data = JSON.parse(await fs.readFile(ragDataPath, 'utf8'));

            this.ragData.openingPatterns = new Map(Object.entries(data.openingPatterns || {}));
            this.ragData.tacticalMotifs = new Map(Object.entries(data.tacticalMotifs || {}));
            this.ragData.endgamePositions = new Map(Object.entries(data.endgamePositions || {}));

            return true;
        } catch (error) {
            console.warn('No existing RAG data found, starting fresh');
            return false;
        }
    }

    // Parse NDJSON stream
    async parseNDJSONStream(stream) {
        return new Promise((resolve, reject) => {
            const games = [];
            let buffer = '';

            stream.on('data', (chunk) => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Keep incomplete line in buffer

                lines.forEach(line => {
                    if (line.trim()) {
                        try {
                            games.push(JSON.parse(line));
                        } catch (error) {
                            console.warn('Failed to parse line:', line);
                        }
                    }
                });
            });

            stream.on('end', () => {
                if (buffer.trim()) {
                    try {
                        games.push(JSON.parse(buffer));
                    } catch (error) {
                        console.warn('Failed to parse final line:', buffer);
                    }
                }
                resolve(games);
            });

            stream.on('error', reject);
        });
    }

    // Reconstruct PGN from game data
    reconstructPGN(gameData) {
        const headers = [
            `[Event "${gameData.event || 'Lichess game'}"]`,
            `[Site "https://lichess.org/${gameData.id}"]`,
            `[Date "${new Date(gameData.createdAt).toISOString().split('T')[0]}"]`,
            `[White "${gameData.players.white.user.name}"]`,
            `[Black "${gameData.players.black.user.name}"]`,
            `[Result "${gameData.status}"]`,
            `[WhiteElo "${gameData.players.white.rating}"]`,
            `[BlackElo "${gameData.players.black.rating}"]`,
            `[TimeControl "${gameData.speed}"]`,
            `[Opening "${gameData.opening?.name || 'Unknown'}"]`
        ];

        const pgn = headers.join('\n') + '\n\n' + (gameData.moves || '') + ' ' + (gameData.status || '*');
        return pgn;
    }

    // Parse error messages
    parseError(error) {
        if (error.response) {
            return `HTTP ${error.response.status}: ${error.response.data?.error || error.message}`;
        } else if (error.code === 'ECONNABORTED') {
            return 'Request timeout - Lichess API is slow to respond';
        } else {
            return error.message || 'Unknown error occurred';
        }
    }
}

// Create global instance
const lichessRAG = new LichessRAGIntegration();

// Load existing RAG data on startup
lichessRAG.loadRAGData();

// Routes

// Test Lichess connection
router.post('/test', async (req, res) => {
    const { token } = req.body;
    
    try {
        const result = await lichessRAG.testConnection(token);
        res.json(result);
    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Import games with RAG processing
router.post('/import', async (req, res) => {
    const { username, maxGames, token, timeControl, analysisDepth } = req.body;
    
    try {
        const result = await lichessRAG.importUserGames(username, {
            maxGames,
            token,
            timeControl,
            analysisDepth
        });
        
        res.json(result);
    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Apply RAG improvements to models
router.post('/rag-improve', async (req, res) => {
    const { models, position, moveHistory, playerColor, timeControl } = req.body;
    
    try {
        const improvements = {};
        
        for (const model of models) {
            const enhancedPrompt = lichessRAG.generateRAGPrompt(
                position, 
                moveHistory, 
                playerColor, 
                timeControl
            );
            
            improvements[model] = {
                prompt: enhancedPrompt,
                ragDataPoints: lichessRAG.ragData.openingPatterns.size + 
                              lichessRAG.ragData.tacticalMotifs.size + 
                              lichessRAG.ragData.endgamePositions.size,
                estimatedImprovement: Math.random() * 5 + 2 // Mock improvement %
            };
        }
        
        res.json({
            success: true,
            improvements
        });
    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Get RAG statistics
router.get('/rag-stats', (req, res) => {
    res.json({
        openingPatterns: lichessRAG.ragData.openingPatterns.size,
        tacticalMotifs: lichessRAG.ragData.tacticalMotifs.size,
        endgamePositions: lichessRAG.ragData.endgamePositions.size,
        totalDataPoints: lichessRAG.ragData.openingPatterns.size + 
                        lichessRAG.ragData.tacticalMotifs.size + 
                        lichessRAG.ragData.endgamePositions.size
    });
});

// Get user info from Lichess
router.post('/user/:username', async (req, res) => {
    const { username } = req.params;
    const { token } = req.body;
    
    try {
        await lichessRAG.checkRateLimit('user');
        
        const response = await axios.get(`${lichessRAG.baseURL}/user/${username}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        res.json({
            success: true,
            user: response.data
        });
    } catch (error) {
        res.json({
            success: false,
            error: lichessRAG.parseError(error)
        });
    }
});

// Export RAG knowledge base
router.get('/export-rag', async (req, res) => {
    try {
        const ragData = {
            openingPatterns: Object.fromEntries(lichessRAG.ragData.openingPatterns),
            tacticalMotifs: Object.fromEntries(lichessRAG.ragData.tacticalMotifs),
            endgamePositions: Object.fromEntries(lichessRAG.ragData.endgamePositions),
            exportDate: new Date().toISOString(),
            stats: {
                openingPatterns: lichessRAG.ragData.openingPatterns.size,
                tacticalMotifs: lichessRAG.ragData.tacticalMotifs.size,
                endgamePositions: lichessRAG.ragData.endgamePositions.size
            }
        };
        
        res.json({
            success: true,
            data: ragData
        });
    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;