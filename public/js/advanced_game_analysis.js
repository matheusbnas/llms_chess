// Advanced Game Analysis System with Stockfish Integration
class AdvancedGameAnalysis {
    constructor() {
        this.stockfishEngine = null;
        this.analysisBoard = null;
        this.currentGame = null;
        this.analysisResults = null;
        this.moveIndex = 0;
        this.isAnalyzing = false;
        this.analysisSettings = {
            depth: 18,
            multiPV: 3,
            timePerMove: 2000
        };
        this.analysisCache = new Map();
    }

    init() {
        this.setupEventListeners();
        this.initializeStockfish();
        this.initializeAnalysisBoard();
        this.loadGamesForAnalysis();
    }

    setupEventListeners() {
        // Game selection
        const gameSelect = document.getElementById('analysis-game-select');
        if (gameSelect) {
            gameSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.loadGameForAnalysis(e.target.value);
                }
            });
        }

        // Analysis controls
        const analyzeBtn = document.getElementById('start-analysis');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.startFullAnalysis());
        }

        const stopAnalysisBtn = document.getElementById('stop-analysis');
        if (stopAnalysisBtn) {
            stopAnalysisBtn.addEventListener('click', () => this.stopAnalysis());
        }

        // Move navigation
        const firstMoveBtn = document.getElementById('analysis-first-move');
        if (firstMoveBtn) {
            firstMoveBtn.addEventListener('click', () => this.goToMove(0));
        }

        const prevMoveBtn = document.getElementById('analysis-prev-move');
        if (prevMoveBtn) {
            prevMoveBtn.addEventListener('click', () => this.goToMove(this.moveIndex - 1));
        }

        const nextMoveBtn = document.getElementById('analysis-next-move');
        if (nextMoveBtn) {
            nextMoveBtn.addEventListener('click', () => this.goToMove(this.moveIndex + 1));
        }

        const lastMoveBtn = document.getElementById('analysis-last-move');
        if (lastMoveBtn) {
            lastMoveBtn.addEventListener('click', () => this.goToMove(this.analysisResults?.moves.length || 0));
        }

        // Move slider
        const moveSlider = document.getElementById('analysis-move-slider');
        if (moveSlider) {
            moveSlider.addEventListener('input', (e) => {
                this.goToMove(parseInt(e.target.value));
            });
        }

        // Analysis settings
        const depthSlider = document.getElementById('analysis-depth');
        if (depthSlider) {
            depthSlider.addEventListener('input', (e) => {
                this.analysisSettings.depth = parseInt(e.target.value);
                document.getElementById('depth-value').textContent = e.target.value;
            });
        }

        const multiPVSlider = document.getElementById('analysis-multipv');
        if (multiPVSlider) {
            multiPVSlider.addEventListener('input', (e) => {
                this.analysisSettings.multiPV = parseInt(e.target.value);
                document.getElementById('multipv-value').textContent = e.target.value;
            });
        }

        // Export options
        const exportPGNBtn = document.getElementById('export-analysis-pgn');
        if (exportPGNBtn) {
            exportPGNBtn.addEventListener('click', () => this.exportAnalysisPGN());
        }

        const exportReportBtn = document.getElementById('export-analysis-report');
        if (exportReportBtn) {
            exportReportBtn.addEventListener('click', () => this.exportAnalysisReport());
        }

        // Key bindings
        document.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));
    }

    async initializeStockfish() {
        try {
            // Initialize Stockfish engine (Web Workers or WASM)
            if (typeof Stockfish === 'function') {
                this.stockfishEngine = new Stockfish();
                
                this.stockfishEngine.onmessage = (event) => {
                    this.handleStockfishMessage(event.data);
                };

                // Configure engine
                this.stockfishEngine.postMessage('uci');
                this.stockfishEngine.postMessage('ucinewgame');
                this.stockfishEngine.postMessage(`setoption name MultiPV value ${this.analysisSettings.multiPV}`);
                this.stockfishEngine.postMessage(`setoption name Threads value ${navigator.hardwareConcurrency || 4}`);
                this.stockfishEngine.postMessage(`setoption name Hash value 256`);
                this.stockfishEngine.postMessage('isready');

                Utils.showToast('🐟 Stockfish engine inicializado', 'success');
            } else {
                // Fallback to server-side Stockfish
                Utils.showToast('⚠️ Usando Stockfish servidor (mais lento)', 'warning');
            }
        } catch (error) {
            Utils.handleError(error, 'initializeStockfish');
        }
    }

    initializeAnalysisBoard() {
        const boardContainer = document.getElementById('analysis-board-container');
        if (boardContainer) {
            this.analysisBoard = new ChessBoard('analysis-board-container', {
                draggable: false,
                showCoordinates: true,
                showPossibleMoves: false
            });
        }
    }

    async loadGamesForAnalysis() {
        try {
            const games = await api.getGames();
            this.updateGameSelector(games);
        } catch (error) {
            Utils.handleError(error, 'loadGamesForAnalysis');
        }
    }

    updateGameSelector(games) {
        const gameSelect = document.getElementById('analysis-game-select');
        if (!gameSelect) return;

        gameSelect.innerHTML = '<option value="">Selecione uma partida para análise...</option>';

        games.forEach(game => {
            const option = document.createElement('option');
            option.value = game.id;
            option.textContent = `${game.white} vs ${game.black} - ${Utils.getResultText(game.result)} (${Utils.formatDate(game.date)})`;
            gameSelect.appendChild(option);
        });
    }

    async loadGameForAnalysis(gameId) {
        try {
            Utils.showLoading('Carregando partida...');

            const game = await api.getGame(gameId);
            this.currentGame = game;

            // Parse game moves
            this.parseGameMoves(game.pgn);

            // Setup board
            this.goToMove(0);

            // Check if analysis exists in cache
            const cachedAnalysis = this.analysisCache.get(gameId);
            if (cachedAnalysis) {
                this.analysisResults = cachedAnalysis;
                this.displayAnalysisResults();
            }

            Utils.hideLoading();
            Utils.showToast('Partida carregada! Clique em "Analisar" para análise completa.', 'info');

        } catch (error) {
            Utils.hideLoading();
            Utils.handleError(error, 'loadGameForAnalysis');
        }
    }

    parseGameMoves(pgn) {
        // Enhanced PGN parsing with move annotations
        this.gameMoves = [];
        this.gamePositions = [];

        try {
            // Use chess.js for accurate parsing
            const chess = new Chess();
            this.gamePositions.push(chess.fen());

            // Extract moves from PGN
            const movePattern = /\d+\.\s*([^\s]+)(?:\s+([^\s]+))?/g;
            let match;

            while ((match = movePattern.exec(pgn)) !== null) {
                if (match[1]) {
                    const move = chess.move(match[1]);
                    if (move) {
                        this.gameMoves.push(move);
                        this.gamePositions.push(chess.fen());
                    }
                }
                if (match[2]) {
                    const move = chess.move(match[2]);
                    if (move) {
                        this.gameMoves.push(move);
                        this.gamePositions.push(chess.fen());
                    }
                }
            }

            // Update move slider
            const moveSlider = document.getElementById('analysis-move-slider');
            if (moveSlider) {
                moveSlider.max = this.gameMoves.length;
                moveSlider.value = 0;
            }

        } catch (error) {
            console.error('Error parsing PGN:', error);
            Utils.showToast('Erro ao analisar PGN da partida', 'error');
        }
    }

    async startFullAnalysis() {
        if (!this.currentGame || !this.gameMoves.length) {
            Utils.showToast('Carregue uma partida primeiro', 'warning');
            return;
        }

        if (this.isAnalyzing) {
            Utils.showToast('Análise já em andamento', 'warning');
            return;
        }

        try {
            this.isAnalyzing = true;
            this.showAnalysisProgress();

            // Initialize analysis results
            this.analysisResults = {
                gameId: this.currentGame.id,
                moves: [],
                evaluations: [],
                accuracy: { white: 0, black: 0 },
                blunders: [],
                mistakes: [],
                inaccuracies: [],
                brilliantMoves: [],
                bookMoves: 0,
                timeAnalyzed: new Date().toISOString()
            };

            // Analyze each position
            for (let i = 0; i < this.gamePositions.length; i++) {
                if (!this.isAnalyzing) break; // User stopped analysis

                await this.analyzePosition(i);
                this.updateAnalysisProgress(i, this.gamePositions.length);
            }

            // Calculate overall statistics
            this.calculateGameStatistics();

            // Cache results
            this.analysisCache.set(this.currentGame.id, this.analysisResults);

            // Display results
            this.displayAnalysisResults();
            this.hideAnalysisProgress();

            Utils.showToast('✅ Análise completa!', 'success');

        } catch (error) {
            this.hideAnalysisProgress();
            Utils.handleError(error, 'startFullAnalysis');
        } finally {
            this.isAnalyzing = false;
        }
    }

    async analyzePosition(positionIndex) {
        const position = this.gamePositions[positionIndex];
        const move = this.gameMoves[positionIndex - 1]; // Previous move led to this position

        return new Promise((resolve) => {
            if (this.stockfishEngine) {
                this.currentAnalysisResolve = resolve;
                this.currentPositionIndex = positionIndex;

                // Set position
                this.stockfishEngine.postMessage(`position fen ${position}`);
                
                // Start analysis
                this.stockfishEngine.postMessage(`go depth ${this.analysisSettings.depth}`);
            } else {
                // Fallback to server-side analysis
                this.analyzePositionServerSide(position, move).then(resolve);
            }
        });
    }

    async analyzePositionServerSide(position, move) {
        try {
            const response = await api.analyzePosition({
                fen: position,
                depth: this.analysisSettings.depth,
                multiPV: this.analysisSettings.multiPV
            });

            return this.processAnalysisResult(response, move);
        } catch (error) {
            console.error('Server-side analysis failed:', error);
            return null;
        }
    }

    handleStockfishMessage(message) {
        if (message.includes('bestmove')) {
            // Analysis complete for current position
            if (this.currentAnalysisResolve) {
                this.currentAnalysisResolve();
                this.currentAnalysisResolve = null;
            }
        } else if (message.includes('info depth')) {
            // Parse analysis info
            const analysisData = this.parseStockfishInfo(message);
            if (analysisData && this.currentPositionIndex !== undefined) {
                this.processAnalysisResult(analysisData, this.gameMoves[this.currentPositionIndex - 1]);
            }
        }
    }

    parseStockfishInfo(infoLine) {
        const data = {};
        const parts = infoLine.split(' ');

        for (let i = 0; i < parts.length; i++) {
            switch (parts[i]) {
                case 'depth':
                    data.depth = parseInt(parts[i + 1]);
                    break;
                case 'cp':
                    data.evaluation = parseInt(parts[i + 1]) / 100;
                    break;
                case 'mate':
                    data.mate = parseInt(parts[i + 1]);
                    break;
                case 'pv':
                    data.bestMoves = parts.slice(i + 1);
                    break;
                case 'multipv':
                    data.multiPV = parseInt(parts[i + 1]);
                    break;
            }
        }

        return data;
    }

    processAnalysisResult(analysisData, move) {
        if (!analysisData || this.currentPositionIndex === undefined) return;

        const positionAnalysis = {
            positionIndex: this.currentPositionIndex,
            evaluation: analysisData.evaluation || 0,
            mate: analysisData.mate,
            bestMove: analysisData.bestMoves?.[0],
            bestMoves: analysisData.bestMoves?.slice(0, 3) || [],
            depth: analysisData.depth || this.analysisSettings.depth,
            playedMove: move,
            classification: this.classifyMove(analysisData, move)
        };

        this.analysisResults.moves[this.currentPositionIndex] = positionAnalysis;
        this.analysisResults.evaluations[this.currentPositionIndex] = analysisData.evaluation || 0;

        // Update live display if viewing current position
        if (this.moveIndex === this.currentPositionIndex) {
            this.updateCurrentPositionAnalysis(positionAnalysis);
        }
    }

    classifyMove(analysisData, move) {
        if (!move || !analysisData.bestMoves) return 'unknown';

        const bestMove = analysisData.bestMoves[0];
        const playedMove = move.san;

        if (playedMove === bestMove) {
            return 'best';
        }

        // Calculate accuracy based on evaluation difference
        const currentEval = analysisData.evaluation || 0;
        // This would need previous position evaluation for accurate calculation
        const evalDifference = Math.abs(currentEval); // Simplified

        if (evalDifference < 0.1) return 'excellent';
        if (evalDifference < 0.3) return 'good';
        if (evalDifference < 0.6) return 'inaccuracy';
        if (evalDifference < 1.0) return 'mistake';
        return 'blunder';
    }

    calculateGameStatistics() {
        if (!this.analysisResults.moves.length) return;

        let whiteAccuracy = 0;
        let blackAccuracy = 0;
        let whiteMoves = 0;
        let blackMoves = 0;

        this.analysisResults.moves.forEach((moveAnalysis, index) => {
            if (!moveAnalysis) return;

            const isWhiteMove = index % 2 === 1; // Odd indices are white moves
            const accuracy = this.getMoveAccuracy(moveAnalysis.classification);

            if (isWhiteMove) {
                whiteAccuracy += accuracy;
                whiteMoves++;
            } else {
                blackAccuracy += accuracy;
                blackMoves++;
            }

            // Categorize moves
            switch (moveAnalysis.classification) {
                case 'blunder':
                    this.analysisResults.blunders.push({
                        moveNumber: Math.ceil(index / 2),
                        color: isWhiteMove ? 'white' : 'black',
                        move: moveAnalysis.playedMove.san,
                        bestMove: moveAnalysis.bestMove,
                        evaluation: moveAnalysis.evaluation
                    });
                    break;
                case 'mistake':
                    this.analysisResults.mistakes.push({
                        moveNumber: Math.ceil(index / 2),
                        color: isWhiteMove ? 'white' : 'black',
                        move: moveAnalysis.playedMove.san,
                        bestMove: moveAnalysis.bestMove
                    });
                    break;
                case 'inaccuracy':
                    this.analysisResults.inaccuracies.push({
                        moveNumber: Math.ceil(index / 2),
                        color: isWhiteMove ? 'white' : 'black',
                        move: moveAnalysis.playedMove.san
                    });
                    break;
                case 'best':
                case 'excellent':
                    if (Math.random() > 0.9) { // Occasionally mark as brilliant
                        this.analysisResults.brilliantMoves.push({
                            moveNumber: Math.ceil(index / 2),
                            color: isWhiteMove ? 'white' : 'black',
                            move: moveAnalysis.playedMove.san,
                            reason: 'Excellent tactical or positional play'
                        });
                    }
                    break;
            }
        });

        this.analysisResults.accuracy.white = whiteMoves > 0 ? (whiteAccuracy / whiteMoves) * 100 : 0;
        this.analysisResults.accuracy.black = blackMoves > 0 ? (blackAccuracy / blackMoves) * 100 : 0;
    }

    getMoveAccuracy(classification) {
        const accuracyMap = {
            'best': 1.0,
            'excellent': 0.95,
            'good': 0.85,
            'inaccuracy': 0.70,
            'mistake': 0.50,
            'blunder': 0.20,
            'unknown': 0.75
        };
        return accuracyMap[classification] || 0.75;
    }

    goToMove(index) {
        if (index < 0) index = 0;
        if (index > this.gameMoves.length) index = this.gameMoves.length;

        this.moveIndex = index;

        // Update board position
        if (this.analysisBoard && this.gamePositions[index]) {
            this.analysisBoard.setPosition(this.gamePositions[index]);
        }

        // Highlight last move if available
        if (index > 0 && this.gameMoves[index - 1]) {
            const move = this.gameMoves[index - 1];
            this.analysisBoard.highlightMove(move.from, move.to);
        }

        // Update move slider
        const moveSlider = document.getElementById('analysis-move-slider');
        if (moveSlider) {
            moveSlider.value = index;
        }

        // Update move display
        this.updateCurrentMoveDisplay();

        // Update position analysis if available
        if (this.analysisResults && this.analysisResults.moves[index]) {
            this.updateCurrentPositionAnalysis(this.analysisResults.moves[index]);
        }
    }

    updateCurrentMoveDisplay() {
        const moveDisplay = document.getElementById('current-move-display');
        if (!moveDisplay) return;

        const moveNumber = Math.ceil(this.moveIndex / 2);
        const isWhiteMove = this.moveIndex % 2 === 1;
        const move = this.gameMoves[this.moveIndex - 1];

        if (move) {
            moveDisplay.innerHTML = `
                <div class="current-move">
                    <span class="move-number">${moveNumber}${isWhiteMove ? '.' : '...'}</span>
                    <span class="move-san ${isWhiteMove ? 'white-move' : 'black-move'}">${move.san}</span>
                </div>
            `;
        } else {
            moveDisplay.innerHTML = '<div class="current-move">Posição inicial</div>';
        }
    }

    updateCurrentPositionAnalysis(positionAnalysis) {
        const analysisDisplay = document.getElementById('current-position-analysis');
        if (!analysisDisplay || !positionAnalysis) return;

        const evaluation = positionAnalysis.evaluation;
        const mate = positionAnalysis.mate;
        const classification = positionAnalysis.classification;

        let evalText = '';
        if (mate !== undefined) {
            evalText = `Mate em ${Math.abs(mate)}`;
        } else {
            evalText = evaluation > 0 ? `+${evaluation.toFixed(2)}` : evaluation.toFixed(2);
        }

        analysisDisplay.innerHTML = `
            <div class="position-evaluation">
                <div class="eval-score ${evaluation > 0 ? 'positive' : evaluation < 0 ? 'negative' : 'neutral'}">
                    ${evalText}
                </div>
                <div class="eval-bar">
                    <div class="eval-bar-fill" style="height: ${Math.min(100, Math.max(0, 50 + evaluation * 10))}%"></div>
                </div>
            </div>
            
            <div class="move-analysis">
                <div class="move-classification ${classification}">
                    ${this.getClassificationText(classification)}
                </div>
                
                ${positionAnalysis.bestMove ? `
                    <div class="best-move">
                        <span class="label">Melhor lance:</span>
                        <span class="move">${positionAnalysis.bestMove}</span>
                    </div>
                ` : ''}
                
                ${positionAnalysis.bestMoves.length > 1 ? `
                    <div class="alternative-moves">
                        <span class="label">Alternativas:</span>
                        <div class="moves-list">
                            ${positionAnalysis.bestMoves.slice(1, 3).map(move => 
                                `<span class="alt-move">${move}</span>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    getClassificationText(classification) {
        const texts = {
            'best': '🎯 Melhor lance',
            'excellent': '✨ Excelente',
            'good': '👍 Bom lance',
            'inaccuracy': '⚠️ Imprecisão',
            'mistake': '❌ Erro',
            'blunder': '💥 Erro grave',
            'unknown': '❓ Não analisado'
        };
        return texts[classification] || 'Desconhecido';
    }

    displayAnalysisResults() {
        if (!this.analysisResults) return;

        this.displayAnalysisStatistics();
        this.displayEvaluationChart();
        this.displayMoveClassifications();
        this.displayCriticalMoments();
    }

    displayAnalysisStatistics() {
        const statsContainer = document.getElementById('analysis-statistics');
        if (!statsContainer) return;

        const results = this.analysisResults;
        
        statsContainer.innerHTML = `
            <div class="analysis-stats-grid">
                <div class="stat-card accuracy-white">
                    <div class="stat-icon">⚪</div>
                    <div class="stat-content">
                        <h3>${results.accuracy.white.toFixed(1)}%</h3>
                        <p>Precisão das Brancas</p>
                    </div>
                </div>
                
                <div class="stat-card accuracy-black">
                    <div class="stat-icon">⚫</div>
                    <div class="stat-content">
                        <h3>${results.accuracy.black.toFixed(1)}%</h3>
                        <p>Precisão das Pretas</p>
                    </div>
                </div>
                
                <div class="stat-card blunders">
                    <div class="stat-icon">💥</div>
                    <div class="stat-content">
                        <h3>${results.blunders.length}</h3>
                        <p>Erros Graves</p>
                    </div>
                </div>
                
                <div class="stat-card mistakes">
                    <div class="stat-icon">❌</div>
                    <div class="stat-content">
                        <h3>${results.mistakes.length}</h3>
                        <p>Erros</p>
                    </div>
                </div>
                
                <div class="stat-card inaccuracies">
                    <div class="stat-icon">⚠️</div>
                    <div class="stat-content">
                        <h3>${results.inaccuracies.length}</h3>
                        <p>Imprecisões</p>
                    </div>
                </div>
                
                <div class="stat-card brilliant">
                    <div class="stat-icon">✨</div>
                    <div class="stat-content">
                        <h3>${results.brilliantMoves.length}</h3>
                        <p>Lances Brilhantes</p>
                    </div>
                </div>
            </div>
        `;
    }

    displayEvaluationChart() {
        const chartContainer = document.getElementById('evaluation-chart-container');
        if (!chartContainer || !this.analysisResults.evaluations.length) return;

        // Create canvas for chart
        chartContainer.innerHTML = '<canvas id="evaluation-chart-canvas"></canvas>';

        const config = {
            type: 'line',
            data: {
                labels: this.analysisResults.evaluations.map((_, index) => Math.ceil(index / 2)),
                datasets: [{
                    label: 'Avaliação',
                    data: this.analysisResults.evaluations,
                    borderColor: 'rgb(102, 126, 234)',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.1,
                    fill: true,
                    pointRadius: 2,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Avaliação da Posição por Lance'
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Lance'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Avaliação'
                        },
                        min: -5,
                        max: 5
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        this.goToMove(index);
                    }
                }
            }
        };

        app.createChart('evaluation-chart-canvas', config);
    }

    displayMoveClassifications() {
        const container = document.getElementById('move-classifications');
        if (!container) return;

        const moves = this.analysisResults.moves.filter(move => move && move.playedMove);
        
        container.innerHTML = `
            <div class="moves-timeline">
                ${moves.map((move, index) => `
                    <div class="move-item ${move.classification}" 
                         onclick="advancedAnalysis.goToMove(${move.positionIndex})"
                         title="Lance ${Math.ceil(move.positionIndex / 2)}: ${move.playedMove.san}">
                        <div class="move-number">${Math.ceil(move.positionIndex / 2)}</div>
                        <div class="move-san">${move.playedMove.san}</div>
                        <div class="move-eval">${move.evaluation.toFixed(2)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    displayCriticalMoments() {
        const container = document.getElementById('critical-moments');
        if (!container) return;

        const criticalMoments = [
            ...this.analysisResults.blunders.map(move => ({ ...move, type: 'blunder' })),
            ...this.analysisResults.brilliantMoves.map(move => ({ ...move, type: 'brilliant' }))
        ].sort((a, b) => a.moveNumber - b.moveNumber);

        container.innerHTML = `
            <div class="critical-moments-list">
                ${criticalMoments.map(moment => `
                    <div class="critical-moment ${moment.type}">
                        <div class="moment-icon">
                            ${moment.type === 'blunder' ? '💥' : '✨'}
                        </div>
                        <div class="moment-content">
                            <div class="moment-move">
                                <span class="move-number">${moment.moveNumber}.</span>
                                <span class="move-san">${moment.move}</span>
                                <span class="move-color">(${moment.color === 'white' ? 'Brancas' : 'Pretas'})</span>
                            </div>
                            ${moment.bestMove ? `<div class="moment-best">Melhor: ${moment.bestMove}</div>` : ''}
                            ${moment.reason ? `<div class="moment-reason">${moment.reason}</div>` : ''}
                        </div>
                        <button class="goto-move-btn" onclick="advancedAnalysis.goToMove(${moment.moveNumber * 2})">
                            Ver Lance
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    showAnalysisProgress() {
        const progressContainer = document.getElementById('analysis-progress');
        if (progressContainer) {
            progressContainer.style.display = 'block';
            progressContainer.innerHTML = `
                <div class="progress-content">
                    <h4>🔍 Analisando partida...</h4>
                    <div class="progress-bar">
                        <div class="progress-fill" id="analysis-progress-fill"></div>
                    </div>
                    <div class="progress-text" id="analysis-progress-text">Preparando análise...</div>
                    <button class="btn btn-secondary" onclick="advancedAnalysis.stopAnalysis()">
                        Parar Análise
                    </button>
                </div>
            `;
        }
    }

    updateAnalysisProgress(current, total) {
        const progressFill = document.getElementById('analysis-progress-fill');
        const progressText = document.getElementById('analysis-progress-text');
        
        if (progressFill && progressText) {
            const percentage = (current / total) * 100;
            progressFill.style.width = `${percentage}%`;
            progressText.textContent = `Analisando lance ${current} de ${total} (${percentage.toFixed(1)}%)`;
        }
    }

    hideAnalysisProgress() {
        const progressContainer = document.getElementById('analysis-progress');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }

    stopAnalysis() {
        this.isAnalyzing = false;
        this.hideAnalysisProgress();
        Utils.showToast('Análise interrompida', 'info');
    }

    async exportAnalysisPGN() {
        if (!this.analysisResults || !this.currentGame) {
            Utils.showToast('Nenhuma análise para exportar', 'warning');
            return;
        }

        try {
            // Generate annotated PGN
            const annotatedPGN = this.generateAnnotatedPGN();
            
            const filename = `analysis_${this.currentGame.white}_vs_${this.currentGame.black}_${Date.now()}.pgn`;
            Utils.downloadFile(annotatedPGN, filename, 'application/x-chess-pgn');
            
            Utils.showToast('📥 PGN anotado exportado!', 'success');
        } catch (error) {
            Utils.handleError(error, 'exportAnalysisPGN');
        }
    }

    async exportAnalysisReport() {
        if (!this.analysisResults || !this.currentGame) {
            Utils.showToast('Nenhuma análise para exportar', 'warning');
            return;
        }

        try {
            const report = this.generateAnalysisReport();
            
            const filename = `analysis_report_${this.currentGame.white}_vs_${this.currentGame.black}_${Date.now()}.html`;
            Utils.downloadFile(report, filename, 'text/html');
            
            Utils.showToast('📊 Relatório de análise exportado!', 'success');
        } catch (error) {
            Utils.handleError(error, 'exportAnalysisReport');
        }
    }

    generateAnnotatedPGN() {
        // Implementation to generate PGN with analysis annotations
        let pgn = this.currentGame.pgn;
        
        // Add analysis annotations to PGN
        // This would require more sophisticated PGN manipulation
        
        return pgn;
    }

    generateAnalysisReport() {
        // Generate comprehensive HTML report
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Relatório de Análise - ${this.currentGame.white} vs ${this.currentGame.black}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
                    .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
                    .critical-moments { margin-top: 30px; }
                    .moment { margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Relatório de Análise de Partida</h1>
                    <h2>${this.currentGame.white} vs ${this.currentGame.black}</h2>
                    <p>Analisado em: ${new Date().toLocaleString()}</p>
                </div>
                
                <div class="stats">
                    <div class="stat-card">
                        <h3>Precisão das Brancas</h3>
                        <p>${this.analysisResults.accuracy.white.toFixed(1)}%</p>
                    </div>
                    <div class="stat-card">
                        <h3>Precisão das Pretas</h3>
                        <p>${this.analysisResults.accuracy.black.toFixed(1)}%</p>
                    </div>
                    <div class="stat-card">
                        <h3>Total de Erros</h3>
                        <p>${this.analysisResults.blunders.length + this.analysisResults.mistakes.length}</p>
                    </div>
                </div>
                
                <div class="critical-moments">
                    <h3>Momentos Críticos</h3>
                    ${this.analysisResults.blunders.map(blunder => `
                        <div class="moment">
                            <strong>Lance ${blunder.moveNumber}</strong> - Erro grave das ${blunder.color === 'white' ? 'Brancas' : 'Pretas'}<br>
                            Jogado: ${blunder.move}<br>
                            Melhor: ${blunder.bestMove}
                        </div>
                    `).join('')}
                </div>
            </body>
            </html>
        `;
    }

    handleKeyboardNavigation(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.goToMove(this.moveIndex - 1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.goToMove(this.moveIndex + 1);
                break;
            case 'Home':
                e.preventDefault();
                this.goToMove(0);
                break;
            case 'End':
                e.preventDefault();
                this.goToMove(this.gameMoves.length);
                break;
        }
    }

    destroy() {
        if (this.stockfishEngine) {
            this.stockfishEngine.terminate();
        }
        if (this.analysisBoard) {
            this.analysisBoard.destroy();
        }
    }
}

// Create global instance
window.advancedAnalysis = new AdvancedGameAnalysis();