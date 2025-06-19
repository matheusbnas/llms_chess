// Enhanced Human vs AI Chess System
class EnhancedHumanVsAI {
    constructor() {
        this.currentGame = null;
        this.gameBoard = null;
        this.gameHistory = [];
        this.timeControl = null;
        this.playerColor = 'white';
        this.aiOpponent = null;
        this.difficulty = 'intermediate';
        this.hintsUsed = 0;
        this.gameAnalysis = {
            playerAccuracy: 0,
            aiAccuracy: 0,
            blunders: [],
            brilliantMoves: [],
            gamePhase: 'opening'
        };
        this.soundEnabled = true;
        this.animationsEnabled = true;
    }

    init() {
        this.setupEventListeners();
        this.initializeBoard();
        this.loadUserPreferences();
        this.updateAvailableModels();
    }

    setupEventListeners() {
        // Game setup
        const newGameBtn = document.getElementById('new-game');
        if (newGameBtn) {
            newGameBtn.addEventListener('click', () => this.showGameSetupModal());
        }

        // Quick start buttons
        const quickStartButtons = document.querySelectorAll('.quick-start-btn');
        quickStartButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const config = JSON.parse(e.target.dataset.config);
                this.startNewGame(config);
            });
        });

        // Game controls
        const resignBtn = document.getElementById('resign-game');
        if (resignBtn) {
            resignBtn.addEventListener('click', () => this.resignGame());
        }

        const drawOfferBtn = document.getElementById('offer-draw');
        if (drawOfferBtn) {
            drawOfferBtn.addEventListener('click', () => this.offerDraw());
        }

        const undoBtn = document.getElementById('undo-move');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => this.undoLastMove());
        }

        const hintBtn = document.getElementById('get-hint');
        if (hintBtn) {
            hintBtn.addEventListener('click', () => this.getAdvancedHint());
        }

        const analysisBtn = document.getElementById('toggle-analysis');
        if (analysisBtn) {
            analysisBtn.addEventListener('click', () => this.toggleRealTimeAnalysis());
        }

        // Settings
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            soundToggle.addEventListener('change', (e) => {
                this.soundEnabled = e.target.checked;
                this.saveUserPreferences();
            });
        }

        const animationToggle = document.getElementById('animation-toggle');
        if (animationToggle) {
            animationToggle.addEventListener('change', (e) => {
                this.animationsEnabled = e.target.checked;
                this.saveUserPreferences();
            });
        }

        // Move input methods
        const moveInput = document.getElementById('move-input');
        if (moveInput) {
            moveInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleTextMove(moveInput.value);
                }
            });
        }

        // Drag and drop
        this.setupDragAndDrop();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    initializeBoard() {
        const boardContainer = document.getElementById('human-vs-ai-board');
        if (boardContainer) {
            this.gameBoard = new ChessBoard('human-vs-ai-board', {
                draggable: true,
                showCoordinates: true,
                showPossibleMoves: true,
                animationSpeed: this.animationsEnabled ? 250 : 0
            });

            this.gameBoard.onMove((move) => {
                if (this.isPlayerTurn()) {
                    this.handlePlayerMove(move);
                }
            });

            this.gameBoard.onGetPossibleMoves = (square) => {
                return this.getPossibleMoves(square);
            };
        }
    }

    async showGameSetupModal() {
        const modal = this.createGameSetupModal();
        document.body.appendChild(modal);
        
        // Animate modal in
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            modal.querySelector('.modal-content').style.transform = 'scale(1)';
        });
    }

    createGameSetupModal() {
        const modal = document.createElement('div');
        modal.className = 'game-setup-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>🎮 Configurar Nova Partida</h2>
                    <button class="modal-close" onclick="this.closest('.game-setup-modal').remove()">×</button>
                </div>
                
                <div class="modal-body">
                    <div class="setup-section">
                        <h3>🤖 Oponente IA</h3>
                        <select id="modal-opponent" class="setup-input">
                            <option value="GPT-4o">GPT-4o (Mais Forte)</option>
                            <option value="GPT-4-Turbo">GPT-4-Turbo (Equilibrado)</option>
                            <option value="Gemini-Pro">Gemini-Pro (Criativo)</option>
                            <option value="Claude-3">Claude-3 (Estratégico)</option>
                        </select>
                    </div>

                    <div class="setup-section">
                        <h3>⚪⚫ Sua Cor</h3>
                        <div class="color-selector">
                            <label class="color-option">
                                <input type="radio" name="modal-color" value="white" checked>
                                <div class="color-preview white">♔</div>
                                <span>Brancas</span>
                            </label>
                            <label class="color-option">
                                <input type="radio" name="modal-color" value="black">
                                <div class="color-preview black">♚</div>
                                <span>Pretas</span>
                            </label>
                            <label class="color-option">
                                <input type="radio" name="modal-color" value="random">
                                <div class="color-preview random">🎲</div>
                                <span>Aleatório</span>
                            </label>
                        </div>
                    </div>

                    <div class="setup-section">
                        <h3>🎯 Dificuldade</h3>
                        <div class="difficulty-slider">
                            <input type="range" id="modal-difficulty" min="1" max="10" value="5" class="slider">
                            <div class="difficulty-labels">
                                <span>Iniciante</span>
                                <span>Intermediário</span>
                                <span>Avançado</span>
                                <span>Mestre</span>
                                <span>Grandmaster</span>
                            </div>
                            <div class="difficulty-description">
                                <span id="difficulty-desc">Nível intermediário - Equilibrio entre desafio e diversão</span>
                            </div>
                        </div>
                    </div>

                    <div class="setup-section">
                        <h3>⏱️ Controle de Tempo</h3>
                        <div class="time-controls">
                            <label class="time-option">
                                <input type="radio" name="modal-time" value="unlimited" checked>
                                <span>Sem limite</span>
                            </label>
                            <label class="time-option">
                                <input type="radio" name="modal-time" value="bullet">
                                <span>Bullet (1+0)</span>
                            </label>
                            <label class="time-option">
                                <input type="radio" name="modal-time" value="blitz">
                                <span>Blitz (5+3)</span>
                            </label>
                            <label class="time-option">
                                <input type="radio" name="modal-time" value="rapid">
                                <span>Rapid (15+10)</span>
                            </label>
                            <label class="time-option">
                                <input type="radio" name="modal-time" value="classical">
                                <span>Classical (30+0)</span>
                            </label>
                        </div>
                    </div>

                    <div class="setup-section">
                        <h3>🔧 Opções Avançadas</h3>
                        <div class="advanced-options">
                            <label class="option-checkbox">
                                <input type="checkbox" id="modal-analysis" checked>
                                <span>Análise em tempo real</span>
                            </label>
                            <label class="option-checkbox">
                                <input type="checkbox" id="modal-hints">
                                <span>Permitir dicas</span>
                            </label>
                            <label class="option-checkbox">
                                <input type="checkbox" id="modal-undo">
                                <span>Permitir desfazer jogadas</span>
                            </label>
                            <label class="option-checkbox">
                                <input type="checkbox" id="modal-opening-book" checked>
                                <span>Usar livro de aberturas</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.game-setup-modal').remove()">
                        Cancelar
                    </button>
                    <button class="btn btn-primary" onclick="humanVsAI.startGameFromModal()">
                        🚀 Iniciar Partida
                    </button>
                </div>
            </div>
        `;

        // Add event listeners for modal interactivity
        const difficultySlider = modal.querySelector('#modal-difficulty');
        const difficultyDesc = modal.querySelector('#difficulty-desc');
        
        difficultySlider.addEventListener('input', (e) => {
            const descriptions = [
                "Muito fácil - IA comete erros frequentes",
                "Fácil - IA joga casualmente",
                "Iniciante - Bom para aprender",
                "Intermediário - Equilibrio entre desafio e diversão",
                "Avançado - IA joga seriamente",
                "Difícil - Requer conhecimento sólido",
                "Muito difícil - Apenas para experientes",
                "Expert - IA quase perfeita",
                "Mestre - Extremamente desafiador",
                "Grandmaster - Máxima dificuldade"
            ];
            difficultyDesc.textContent = descriptions[e.target.value - 1];
        });

        return modal;
    }

    async startGameFromModal() {
        const modal = document.querySelector('.game-setup-modal');
        const config = {
            opponent: modal.querySelector('#modal-opponent').value,
            playerColor: modal.querySelector('input[name="modal-color"]:checked').value,
            difficulty: parseInt(modal.querySelector('#modal-difficulty').value),
            timeControl: modal.querySelector('input[name="modal-time"]:checked').value,
            options: {
                realTimeAnalysis: modal.querySelector('#modal-analysis').checked,
                hintsAllowed: modal.querySelector('#modal-hints').checked,
                undoAllowed: modal.querySelector('#modal-undo').checked,
                openingBook: modal.querySelector('#modal-opening-book').checked
            }
        };

        modal.remove();
        await this.startNewGame(config);
    }

    async startNewGame(config) {
        try {
            Utils.showLoading('Iniciando nova partida...');

            // Determine colors
            let playerColor = config.playerColor;
            if (playerColor === 'random') {
                playerColor = Math.random() > 0.5 ? 'white' : 'black';
            }

            // Create game configuration
            const gameConfig = {
                opponent: config.opponent,
                playerColor: playerColor,
                difficulty: config.difficulty || 5,
                timeControl: config.timeControl || 'unlimited',
                options: config.options || {}
            };

            // Start game via API
            const response = await api.startHumanGame(gameConfig);
            
            if (response.success) {
                this.currentGame = response.game;
                this.playerColor = playerColor;
                this.aiOpponent = config.opponent;
                this.difficulty = config.difficulty;
                
                // Setup board
                this.setupGameBoard();
                this.updateGameInterface();
                this.startTimeControl(config.timeControl);
                
                // If AI plays first
                if (playerColor === 'black') {
                    setTimeout(() => this.requestAIMove(), 1000);
                }

                Utils.hideLoading();
                Utils.showToast(`🎮 Nova partida iniciada contra ${config.opponent}!`, 'success');
            } else {
                throw new Error(response.error || 'Erro ao iniciar partida');
            }

        } catch (error) {
            Utils.hideLoading();
            Utils.handleError(error, 'startNewGame');
        }
    }

    setupGameBoard() {
        if (!this.gameBoard || !this.currentGame) return;

        // Set initial position
        this.gameBoard.setPosition(this.currentGame.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        
        // Flip board if player is black
        if (this.playerColor === 'black') {
            this.gameBoard.flip();
        }

        // Clear previous highlights
        this.gameBoard.clearHighlights();
        
        // Initialize game history
        this.gameHistory = [];
        this.hintsUsed = 0;
    }

    updateGameInterface() {
        // Update game status
        const statusElement = document.getElementById('game-status-display');
        if (statusElement) {
            statusElement.innerHTML = `
                <div class="game-info-card">
                    <div class="player-info">
                        <div class="player ${this.playerColor}">
                            <div class="player-avatar">👤</div>
                            <div class="player-details">
                                <span class="player-name">Você</span>
                                <span class="player-color">${this.playerColor === 'white' ? 'Brancas' : 'Pretas'}</span>
                            </div>
                        </div>
                        <div class="vs-divider">VS</div>
                        <div class="player ${this.playerColor === 'white' ? 'black' : 'white'}">
                            <div class="player-avatar">🤖</div>
                            <div class="player-details">
                                <span class="player-name">${this.aiOpponent}</span>
                                <span class="player-color">${this.playerColor === 'white' ? 'Pretas' : 'Brancas'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="game-meta">
                        <div class="meta-item">
                            <span class="meta-label">Dificuldade:</span>
                            <span class="meta-value">${this.getDifficultyName(this.difficulty)}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Controle:</span>
                            <span class="meta-value">${this.getTimeControlName(this.currentGame.timeControl)}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        // Update move history
        this.updateMoveHistory();
        
        // Update evaluation if enabled
        if (this.currentGame.options?.realTimeAnalysis) {
            this.updatePositionEvaluation();
        }
    }

    async handlePlayerMove(move) {
        if (!this.isPlayerTurn() || !this.currentGame) return;

        try {
            // Validate move locally first
            if (!this.isValidMove(move)) {
                Utils.showToast('Lance inválido!', 'error');
                return;
            }

            // Show move animation if enabled
            if (this.animationsEnabled) {
                this.gameBoard.animateMove(move.from, move.to);
            }

            // Play sound effect
            if (this.soundEnabled) {
                this.playMoveSound(move);
            }

            // Send move to server
            const response = await api.makeHumanMove(this.currentGame.id, move.san);
            
            if (response.success) {
                // Update game state
                this.currentGame = response.game;
                this.gameHistory.push({
                    move: move,
                    san: move.san,
                    timestamp: Date.now(),
                    player: 'human'
                });

                // Update board position
                this.gameBoard.setPosition(response.fen);
                this.gameBoard.highlightMove(move.from, move.to);

                // Update interface
                this.updateGameInterface();
                
                // Check for game end
                if (this.currentGame.status === 'finished') {
                    this.handleGameEnd();
                    return;
                }

                // Request AI move
                setTimeout(() => this.requestAIMove(), 500);

            } else {
                Utils.showToast(response.error || 'Erro ao processar lance', 'error');
            }

        } catch (error) {
            Utils.handleError(error, 'handlePlayerMove');
        }
    }

    async requestAIMove() {
        if (!this.currentGame || this.isPlayerTurn()) return;

        try {
            // Show thinking indicator
            this.showAIThinking();

            // Request move from AI
            const response = await api.getAIMove(this.currentGame.id);
            
            // Hide thinking indicator
            this.hideAIThinking();

            if (response.success) {
                // Update game state
                this.currentGame = response.game;
                this.gameHistory.push({
                    move: response.move,
                    san: response.move.san,
                    timestamp: Date.now(),
                    player: 'ai',
                    thinkingTime: response.thinkingTime
                });

                // Animate AI move
                if (this.animationsEnabled && response.move.from && response.move.to) {
                    this.gameBoard.animateMove(response.move.from, response.move.to);
                }

                // Update board
                this.gameBoard.setPosition(response.fen);
                this.gameBoard.highlightMove(response.move.from, response.move.to);

                // Play sound
                if (this.soundEnabled) {
                    this.playMoveSound(response.move);
                }

                // Update interface
                this.updateGameInterface();

                // Show move notification
                Utils.showToast(`🤖 ${this.aiOpponent} jogou: ${response.move.san}`, 'info', 3000);

                // Check for game end
                if (this.currentGame.status === 'finished') {
                    this.handleGameEnd();
                }

            } else {
                Utils.showToast('Erro na resposta da IA', 'error');
            }

        } catch (error) {
            this.hideAIThinking();
            Utils.handleError(error, 'requestAIMove');
        }
    }

    async getAdvancedHint() {
        if (!this.currentGame || !this.isPlayerTurn()) {
            Utils.showToast('Não é possível obter dica agora', 'warning');
            return;
        }

        try {
            Utils.showLoading('Analisando posição...');

            const response = await api.getAdvancedHint(this.currentGame.id);
            
            Utils.hideLoading();

            if (response.success) {
                this.hintsUsed++;
                
                // Show comprehensive hint modal
                this.showHintModal(response.hint);
                
                // Highlight suggested squares if provided
                if (response.hint.suggestedMoves) {
                    response.hint.suggestedMoves.forEach(move => {
                        this.gameBoard.highlightSquare(move.from, 'hint-from');
                        this.gameBoard.highlightSquare(move.to, 'hint-to');
                    });
                }

            } else {
                Utils.showToast('Não foi possível obter dica', 'warning');
            }

        } catch (error) {
            Utils.hideLoading();
            Utils.handleError(error, 'getAdvancedHint');
        }
    }

    showHintModal(hint) {
        const modal = document.createElement('div');
        modal.className = 'hint-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>💡 Dica Estratégica</h2>
                    <button class="modal-close" onclick="this.closest('.hint-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="hint-section">
                        <h3>🎯 Melhor Lance</h3>
                        <div class="best-move">
                            <span class="move-notation">${hint.bestMove}</span>
                            <span class="move-evaluation">${hint.evaluation > 0 ? '+' : ''}${hint.evaluation}</span>
                        </div>
                    </div>
                    
                    <div class="hint-section">
                        <h3>📝 Explicação</h3>
                        <p class="hint-explanation">${hint.explanation}</p>
                    </div>

                    ${hint.alternatives ? `
                        <div class="hint-section">
                            <h3>🔄 Alternativas</h3>
                            <div class="alternative-moves">
                                ${hint.alternatives.map(alt => `
                                    <div class="alternative-move">
                                        <span class="move">${alt.move}</span>
                                        <span class="eval">${alt.evaluation}</span>
                                        <span class="reason">${alt.reason}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${hint.warnings ? `
                        <div class="hint-section warning">
                            <h3>⚠️ Cuidados</h3>
                            <ul class="hint-warnings">
                                ${hint.warnings.map(warning => `<li>${warning}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <div class="hints-used">Dicas usadas: ${this.hintsUsed}</div>
                    <button class="btn btn-primary" onclick="this.closest('.hint-modal').remove()">
                        Entendi
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Auto-remove highlights after 10 seconds
        setTimeout(() => {
            this.gameBoard.clearHighlights();
        }, 10000);
    }

    isPlayerTurn() {
        if (!this.currentGame) return false;
        
        const currentPlayer = this.currentGame.currentTurn || 'white';
        return currentPlayer === this.playerColor;
    }

    isValidMove(move) {
        // Basic validation - in real implementation, use chess.js
        return move && move.from && move.to && move.san;
    }

    getPossibleMoves(square) {
        // Return possible moves for the piece on the given square
        // In real implementation, use chess.js to get legal moves
        return [];
    }

    showAIThinking() {
        const thinkingIndicator = document.createElement('div');
        thinkingIndicator.id = 'ai-thinking';
        thinkingIndicator.className = 'thinking-indicator';
        thinkingIndicator.innerHTML = `
            <div class="thinking-content">
                <div class="thinking-spinner"></div>
                <span>🤖 ${this.aiOpponent} está pensando...</span>
            </div>
        `;

        const boardContainer = document.querySelector('.chessboard-container');
        if (boardContainer) {
            boardContainer.appendChild(thinkingIndicator);
        }
    }

    hideAIThinking() {
        const thinkingIndicator = document.getElementById('ai-thinking');
        if (thinkingIndicator) {
            thinkingIndicator.remove();
        }
    }

    playMoveSound(move) {
        if (!this.soundEnabled) return;

        let soundType = 'move';
        if (move.captured) soundType = 'capture';
        if (move.check) soundType = 'check';
        if (move.checkmate) soundType = 'checkmate';
        if (move.castle) soundType = 'castle';

        // Play sound (implement with Web Audio API or audio elements)
        this.playSound(soundType);
    }

    playSound(type) {
        // Implementation would use actual audio files
        const audio = new Audio(`/sounds/${type}.mp3`);
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore errors if audio fails
    }

    updateMoveHistory() {
        const historyElement = document.getElementById('move-history-list');
        if (!historyElement) return;

        historyElement.innerHTML = '';

        for (let i = 0; i < this.gameHistory.length; i += 2) {
            const moveNumber = Math.floor(i / 2) + 1;
            const whiteMove = this.gameHistory[i];
            const blackMove = this.gameHistory[i + 1];

            const moveElement = document.createElement('div');
            moveElement.className = 'move-pair';
            moveElement.innerHTML = `
                <span class="move-number">${moveNumber}.</span>
                <span class="white-move ${whiteMove.player === 'human' ? 'player-move' : 'ai-move'}">${whiteMove.san}</span>
                ${blackMove ? `<span class="black-move ${blackMove.player === 'human' ? 'player-move' : 'ai-move'}">${blackMove.san}</span>` : ''}
            `;

            historyElement.appendChild(moveElement);
        }

        // Scroll to bottom
        historyElement.scrollTop = historyElement.scrollHeight;
    }

    getDifficultyName(level) {
        const names = {
            1: 'Muito Fácil', 2: 'Fácil', 3: 'Iniciante',
            4: 'Intermediário', 5: 'Intermediário+', 6: 'Avançado',
            7: 'Difícil', 8: 'Expert', 9: 'Mestre', 10: 'Grandmaster'
        };
        return names[level] || 'Desconhecido';
    }

    getTimeControlName(timeControl) {
        const names = {
            unlimited: 'Sem limite',
            bullet: 'Bullet (1+0)',
            blitz: 'Blitz (5+3)',
            rapid: 'Rapid (15+10)',
            classical: 'Classical (30+0)'
        };
        return names[timeControl] || timeControl;
    }

    handleGameEnd() {
        const result = this.currentGame.result;
        let message = '';
        
        if (result === '1-0') {
            message = this.playerColor === 'white' ? '🎉 Você venceu!' : '😔 Você perdeu.';
        } else if (result === '0-1') {
            message = this.playerColor === 'black' ? '🎉 Você venceu!' : '😔 Você perdeu.';
        } else {
            message = '🤝 Empate!';
        }

        Utils.showToast(message, 'info', 10000);
        
        // Show game summary modal
        setTimeout(() => this.showGameSummary(), 1000);
    }

    showGameSummary() {
        // Implementation for post-game analysis and summary
        const modal = document.createElement('div');
        modal.className = 'game-summary-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>📊 Resumo da Partida</h2>
                </div>
                <div class="modal-body">
                    <div class="game-result">
                        <h3>${this.getGameResultText()}</h3>
                    </div>
                    <div class="game-stats">
                        <div class="stat-item">
                            <span class="stat-label">Lances jogados:</span>
                            <span class="stat-value">${this.gameHistory.length}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Dicas usadas:</span>
                            <span class="stat-value">${this.hintsUsed}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Duração:</span>
                            <span class="stat-value">${this.getGameDuration()}</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.game-summary-modal').remove()">
                        Fechar
                    </button>
                    <button class="btn btn-primary" onclick="humanVsAI.showGameSetupModal()">
                        Nova Partida
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    getGameResultText() {
        const result = this.currentGame.result;
        if (result === '1-0') {
            return this.playerColor === 'white' ? 'Vitória!' : 'Derrota';
        } else if (result === '0-1') {
            return this.playerColor === 'black' ? 'Vitória!' : 'Derrota';
        }
        return 'Empate';
    }

    getGameDuration() {
        if (this.gameHistory.length === 0) return '0:00';
        
        const start = this.gameHistory[0].timestamp;
        const end = this.gameHistory[this.gameHistory.length - 1].timestamp;
        const duration = Math.floor((end - start) / 1000);
        
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    loadUserPreferences() {
        const prefs = Utils.loadFromStorage('humanVsAIPrefs', {
            soundEnabled: true,
            animationsEnabled: true,
            autoFlip: true,
            showCoordinates: true
        });

        this.soundEnabled = prefs.soundEnabled;
        this.animationsEnabled = prefs.animationsEnabled;
    }

    saveUserPreferences() {
        const prefs = {
            soundEnabled: this.soundEnabled,
            animationsEnabled: this.animationsEnabled
        };

        Utils.saveToStorage('humanVsAIPrefs', prefs);
    }

    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'n':
                    e.preventDefault();
                    this.showGameSetupModal();
                    break;
                case 'z':
                    e.preventDefault();
                    this.undoLastMove();
                    break;
                case 'h':
                    e.preventDefault();
                    this.getAdvancedHint();
                    break;
            }
        }

        // Arrow keys for move navigation
        if (e.key === 'ArrowLeft') {
            this.navigateMove(-1);
        } else if (e.key === 'ArrowRight') {
            this.navigateMove(1);
        }
    }

    async updateAvailableModels() {
        try {
            const models = await api.getAvailableModels();
            const select = document.getElementById('modal-opponent');
            if (select) {
                select.innerHTML = '';
                Object.entries(models).forEach(([name, available]) => {
                    if (available) {
                        const option = document.createElement('option');
                        option.value = name;
                        option.textContent = name;
                        select.appendChild(option);
                    }
                });
            }
        } catch (error) {
            console.error('Failed to load models:', error);
        }
    }

    destroy() {
        if (this.gameBoard) {
            this.gameBoard.destroy();
        }
    }
}

// Create global instance
window.humanVsAI = new EnhancedHumanVsAI();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => humanVsAI.init());
} else {
    humanVsAI.init();
}