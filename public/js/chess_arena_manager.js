// ♟️ Chess Arena Manager - Sistema de Competição entre LLMs
class ChessArenaManager {
    constructor() {
        this.currentBattle = null;
        this.battles = new Map();
        this.gameHistory = [];
        this.socket = null;
        this.judges = new Map(); // Sistema de árbitros
        this.models = {
            "GPT-4o": { active: true, rating: 1850 },
            "GPT-4-Turbo": { active: true, rating: 1780 },
            "Gemini-Pro": { active: true, rating: 1750 },
            "Gemini-1.0-Pro": { active: true, rating: 1720 },
            "Claude-3.5-Sonnet": { active: true, rating: 1820 },
            "Deepseek-R1": { active: true, rating: 1680 }
        };
        
        this.init();
    }

    init() {
        this.setupSocket();
        this.setupJudgeSystem();
        console.log('♟️ Chess Arena Manager initialized');
    }

    setupSocket() {
        if (typeof io !== 'undefined') {
            this.socket = io();
            
            this.socket.on('game-update', (data) => {
                this.handleGameUpdate(data);
            });
            
            this.socket.on('battle-update', (data) => {
                this.handleBattleUpdate(data);
            });
            
            this.socket.on('game-completed', (data) => {
                this.handleGameCompleted(data);
            });
            
            console.log('🔌 Socket.IO connected');
        }
    }

    setupJudgeSystem() {
        // Sistema de árbitro para validar movimentos (baseado no Python)
        this.judgePrompt = `
You are a professional chess arbiter, working on a LLM's Chess Competition.

Your job is to parse last player's move and ensure that all chess moves are valid and correctly formatted in 
Standard Algebraic Notation (SAN) for processing by the chess.js library.

### Input:
- Last player's move
- List of valid moves in SAN

### Output:
- Return the corresponding move in the list of valid SAN moves.
- If the proposed move is not in the valid moves list, must respond with "None"

### Your turn:
- Proposed move: {proposed_move}
- List of valid moves: {valid_moves}

You should only respond the valid move, without the move number, nothing more.
Your response:
        `;
    }

    // Iniciar batalha entre modelos (baseado no chess_arena_with_judge.py)
    async startBattle(config) {
        const battleId = `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const battle = {
            id: battleId,
            whiteModel: config.whiteModel,
            blackModel: config.blackModel,
            numGames: config.numGames || 1,
            openings: config.openings || ["1. e4", "1. d4", "1. c4", "1. Nf3"],
            currentGame: 0,
            results: [],
            status: 'running',
            startTime: new Date().toISOString(),
            whiteWins: 0,
            blackWins: 0,
            draws: 0
        };

        this.battles.set(battleId, battle);
        this.currentBattle = battle;

        // Emit battle start
        if (this.socket) {
            this.socket.emit('battle-started', battle);
        }

        // Executar batalha
        this.runBattle(battle);

        return battle;
    }

    async runBattle(battle) {
        console.log(`🔥 Starting battle: ${battle.whiteModel} vs ${battle.blackModel}`);

        for (const opening of battle.openings) {
            for (let gameNum = 1; gameNum <= battle.numGames; gameNum++) {
                // Alternar cores a cada jogo
                const whiteModel = gameNum % 2 === 1 ? battle.whiteModel : battle.blackModel;
                const blackModel = gameNum % 2 === 1 ? battle.blackModel : battle.whiteModel;

                try {
                    console.log(`🎮 Game ${gameNum}: ${whiteModel} vs ${blackModel} - Opening: ${opening}`);

                    const game = await this.playGameBetweenModels(
                        whiteModel, 
                        blackModel, 
                        opening,
                        `${battle.id}_game_${battle.currentGame + 1}`
                    );

                    battle.currentGame++;
                    battle.results.push({
                        gameNumber: battle.currentGame,
                        white: whiteModel,
                        black: blackModel,
                        result: game.result,
                        moves: game.totalMoves,
                        duration: game.duration,
                        opening: opening,
                        pgn: game.pgn,
                        gameId: game.id
                    });

                    // Atualizar estatísticas
                    this.updateBattleStats(battle, game, whiteModel, blackModel);

                    // Emit update
                    if (this.socket) {
                        this.socket.emit('battle-update', {
                            ...battle,
                            progress: (battle.currentGame / (battle.numGames * battle.openings.length)) * 100
                        });
                    }

                    console.log(`✅ Game ${battle.currentGame} completed: ${game.result}`);

                    // Pausa entre jogos
                    await this.sleep(2000);

                } catch (error) {
                    console.error(`❌ Error in game ${gameNum}:`, error);
                }
            }
        }

        battle.status = 'completed';
        battle.endTime = new Date().toISOString();

        // Salvar resultados
        await this.saveBattleResults(battle);

        console.log(`🏁 Battle completed: ${battle.whiteModel} ${battle.whiteWins}-${battle.draws}-${battle.blackWins} ${battle.blackModel}`);

        if (this.socket) {
            this.socket.emit('battle-completed', battle);
        }

        return battle;
    }

    async playGameBetweenModels(whiteModel, blackModel, opening, gameId) {
        const chess = new Chess();
        const gameHistory = [];
        const moveDetails = [];
        const startTime = new Date();

        // Aplicar abertura
        if (opening && opening !== "random") {
            try {
                const openingMove = opening.split(" ")[1]; // ex: "1. e4" -> "e4"
                if (openingMove) {
                    const moveObj = chess.move(openingMove);
                    if (moveObj) {
                        gameHistory.push(moveObj.san);
                        moveDetails.push({
                            move: openingMove,
                            san: moveObj.san,
                            color: 'white',
                            model: whiteModel,
                            fen: chess.fen(),
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            } catch (e) {
                console.error('Invalid opening:', opening, e);
            }
        }

        let moveCount = 0;
        const maxMoves = 200;

        while (!chess.isGameOver() && moveCount < maxMoves) {
            const currentColor = chess.turn() === 'w' ? 'white' : 'black';
            const currentModel = currentColor === 'white' ? whiteModel : blackModel;

            try {
                console.log(`${currentModel} (${currentColor}) thinking...`);

                // Obter movimento do modelo
                const move = await this.getModelMove(
                    currentModel,
                    chess.fen(),
                    gameHistory,
                    currentColor
                );

                // Validar movimento com árbitro
                const validatedMove = await this.validateMove(move, chess.moves());

                if (validatedMove && validatedMove !== "None") {
                    const moveObj = chess.move(validatedMove);

                    if (moveObj) {
                        gameHistory.push(moveObj.san);
                        moveDetails.push({
                            move: validatedMove,
                            san: moveObj.san,
                            color: currentColor,
                            model: currentModel,
                            fen: chess.fen(),
                            timestamp: new Date().toISOString(),
                            captured: moveObj.captured || null,
                            check: chess.inCheck(),
                            checkmate: chess.isCheckmate()
                        });

                        // Emit real-time update
                        if (this.socket) {
                            this.socket.emit('game-update', {
                                gameId: gameId,
                                move: moveObj.san,
                                fen: chess.fen(),
                                turn: chess.turn(),
                                gameOver: chess.isGameOver(),
                                currentModel,
                                moveCount: moveDetails.length,
                                history: gameHistory
                            });
                        }

                        console.log(`${currentModel} (${currentColor}): ${moveObj.san}`);
                    } else {
                        console.error(`Invalid move ${validatedMove} by ${currentModel}`);
                        break;
                    }
                } else {
                    console.error(`No valid move from ${currentModel}, using random`);
                    // Movimento aleatório como fallback
                    const randomMove = chess.moves()[Math.floor(Math.random() * chess.moves().length)];
                    const moveObj = chess.move(randomMove);
                    
                    if (moveObj) {
                        gameHistory.push(moveObj.san);
                        moveDetails.push({
                            move: randomMove,
                            san: moveObj.san,
                            color: currentColor,
                            model: currentModel + " (random)",
                            fen: chess.fen(),
                            timestamp: new Date().toISOString()
                        });
                    }
                }

            } catch (error) {
                console.error(`Error in move by ${currentModel}:`, error);
                break;
            }

            moveCount++;
            await this.sleep(1000); // Pausa entre movimentos
        }

        // Determinar resultado
        let result = "*";
        let resultReason = "Game in progress";

        if (chess.isCheckmate()) {
            result = chess.turn() === 'w' ? '0-1' : '1-0';
            resultReason = "Checkmate";
        } else if (chess.isStalemate()) {
            result = '1/2-1/2';
            resultReason = "Stalemate";
        } else if (chess.isDraw()) {
            result = '1/2-1/2';
            resultReason = "Draw";
        } else if (moveCount >= maxMoves) {
            result = '1/2-1/2';
            resultReason = "Move limit reached";
        }

        const endTime = new Date();
        const duration = Math.round((endTime - startTime) / 1000);

        const gameData = {
            id: gameId,
            white: whiteModel,
            black: blackModel,
            result,
            resultReason,
            moves: gameHistory,
            moveDetails,
            pgn: this.generatePGN(whiteModel, blackModel, result, gameHistory, resultReason),
            fen: chess.fen(),
            status: 'completed',
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            duration: duration,
            totalMoves: gameHistory.length
        };

        // Salvar jogo
        await this.saveGameData(gameData);

        return gameData;
    }

    async getModelMove(modelName, fen, gameHistory, color) {
        // Simular chamada para modelo LLM
        try {
            const response = await fetch('/api/models/move', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: modelName,
                    fen: fen,
                    history: gameHistory,
                    color: color
                })
            });

            const data = await response.json();
            return data.move;

        } catch (error) {
            console.error(`Error getting move from ${modelName}:`, error);
            // Fallback: movimento aleatório
            const chess = new Chess(fen);
            const legalMoves = chess.moves();
            return legalMoves[Math.floor(Math.random() * legalMoves.length)];
        }
    }

    async validateMove(proposedMove, validMoves) {
        // Sistema de árbitro para validar movimento (baseado no Python)
        
        // Limpeza básica
        const cleanMove = proposedMove.replace(/[^\w\-+=\s]/g, '').trim();
        
        // Tentar match exato primeiro
        for (const move of validMoves) {
            if (cleanMove.includes(move) || move === cleanMove) {
                return move;
            }
        }

        // Tentar extrair movimento usando regex
        const movePattern = /([NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQ])?[+#]?|O-O(?:-O)?)/g;
        const matches = cleanMove.match(movePattern);

        if (matches) {
            for (const match of matches) {
                if (validMoves.includes(match)) {
                    return match;
                }
            }
        }

        console.warn(`No valid move found for: ${proposedMove}`);
        return "None";
    }

    updateBattleStats(battle, game, whiteModel, blackModel) {
        if (game.result === '1-0') {
            if (whiteModel === battle.whiteModel) {
                battle.whiteWins++;
            } else {
                battle.blackWins++;
            }
        } else if (game.result === '0-1') {
            if (blackModel === battle.blackModel) {
                battle.blackWins++;
            } else {
                battle.whiteWins++;
            }
        } else {
            battle.draws++;
        }
    }

    generatePGN(white, black, result, moves, resultReason) {
        const date = new Date().toISOString().split('T')[0].replace(/-/g, '.');
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
            const blackMove = moves[i + 1] || '';
            pgn += `${moveNum}. ${whiteMove}${blackMove ? ' ' + blackMove : ''}\n`;
        }

        pgn += ` ${result}`;
        return pgn;
    }

    async saveGameData(gameData) {
        try {
            const response = await fetch('/api/games/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gameData)
            });

            if (response.ok) {
                console.log(`✅ Game saved: ${gameData.id}`);
            } else {
                console.error('❌ Failed to save game');
            }
        } catch (error) {
            console.error('❌ Error saving game:', error);
        }
    }

    async saveBattleResults(battle) {
        try {
            const response = await fetch('/api/battles/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(battle)
            });

            if (response.ok) {
                console.log(`✅ Battle results saved: ${battle.id}`);
            }
        } catch (error) {
            console.error('❌ Error saving battle results:', error);
        }
    }

    // Event handlers
    handleGameUpdate(data) {
        console.log('Game update received:', data);
        
        // Atualizar UI do jogo em andamento
        if (window.arena && window.arena.chessboards.has('arena-live')) {
            const liveBoard = window.arena.chessboards.get('arena-live');
            liveBoard.setPositionFromFen(data.fen);
            
            if (data.lastMove) {
                liveBoard.highlightLastMove(data.lastMove.from, data.lastMove.to);
            }
        }

        // Atualizar histórico de movimentos
        this.updateLiveMoveHistory(data.history);
    }

    handleBattleUpdate(data) {
        console.log('Battle update received:', data);
        
        // Atualizar progresso da batalha
        const progressElement = document.getElementById('battle-progress');
        if (progressElement) {
            progressElement.innerHTML = `
                <div class="progress-bar" style="width: ${data.progress}%"></div>
                <div>Jogo ${data.currentGame} - ${data.whiteWins}W ${data.draws}D ${data.blackWins}L</div>
            `;
        }
    }

    handleGameCompleted(data) {
        console.log('Game completed:', data);
        
        if (window.arena) {
            window.arena.showToast(`Partida finalizada: ${data.result}`, 'info');
        }
    }

    updateLiveMoveHistory(moves) {
        const historyElement = document.getElementById('live-move-history');
        if (!historyElement || !moves) return;

        let html = '';
        for (let i = 0; i < moves.length; i += 2) {
            const moveNumber = Math.floor(i / 2) + 1;
            const whiteMove = moves[i] || '';
            const blackMove = moves[i + 1] || '';

            html += `
                <div style="padding: 2px 4px; border-bottom: 1px solid var(--border-color); font-size: 13px;">
                    <span style="color: var(--text-secondary); width: 20px; display: inline-block;">${moveNumber}.</span>
                    <span style="margin-right: 12px;">${whiteMove}</span>
                    <span>${blackMove}</span>
                </div>`;
        }

        historyElement.innerHTML = html;
        historyElement.scrollTop = historyElement.scrollHeight;
    }

    // Utility methods
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getAvailableModels() {
        return Object.keys(this.models).filter(model => this.models[model].active);
    }

    getBattleStats() {
        return {
            totalBattles: this.battles.size,
            currentBattle: this.currentBattle?.id || null,
            gamesPlayed: this.gameHistory.length
        };
    }
}

// Tornar disponível globalmente
window.ChessArenaManager = ChessArenaManager;
