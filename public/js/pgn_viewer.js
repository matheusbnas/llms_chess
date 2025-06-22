// ♟️ PGN Viewer - Sistema de Visualização de Partidas (baseado no chess_comparator.py)
class PGNViewer {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.chessboard = null;
        this.currentGame = null;
        this.currentMove = 0;
        this.maxMoves = 0;
        this.moves = [];
        this.fens = [];
        this.gameHeaders = {};
        this.autoPlay = false;
        this.autoPlaySpeed = 1000; // ms between moves
        this.autoPlayInterval = null;
        
        this.init();
    }

    init() {
        this.createUI();
        this.setupEventListeners();
        this.loadAvailableGames();
        console.log('🎮 PGN Viewer initialized');
    }

    createUI() {
        this.container.innerHTML = `
            <div class="pgn-viewer">
                <!-- Game Selection -->
                <div class="game-selection card mb-16">
                    <div class="card-header">
                        <h3 class="card-title">
                            <i class="fas fa-chess"></i>
                            Selecionar Partida
                        </h3>
                    </div>
                    <div class="d-flex gap-16">
                        <div class="form-group" style="flex: 1;">
                            <label class="form-label">Confronto</label>
                            <select class="form-control" id="matchup-select">
                                <option value="">Carregando confrontos...</option>
                            </select>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label class="form-label">Partida</label>
                            <select class="form-control" id="game-select">
                                <option value="">Selecione um confronto...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">&nbsp;</label>
                            <button class="btn btn-primary" id="load-game-btn">
                                <i class="fas fa-play"></i>
                                Carregar
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Game Display -->
                <div class="game-display d-grid" style="grid-template-columns: 1fr 400px; gap: 24px;">
                    <!-- Chessboard Area -->
                    <div class="board-area">
                        <!-- Game Info -->
                        <div class="game-info card mb-16" id="game-info" style="display: none;">
                            <div class="card-header">
                                <h3 class="card-title" id="game-title">Partida</h3>
                                <div class="d-flex gap-8">
                                    <span class="badge badge-info" id="game-result">*</span>
                                    <span class="badge badge-secondary" id="game-moves">0 lances</span>
                                </div>
                            </div>
                            <div class="d-flex justify-between">
                                <div>
                                    <strong id="white-player">Brancas</strong>
                                    <div style="color: var(--text-secondary); font-size: 12px;" id="white-rating">-</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="font-size: 24px;">vs</div>
                                </div>
                                <div style="text-align: right;">
                                    <strong id="black-player">Pretas</strong>
                                    <div style="color: var(--text-secondary); font-size: 12px;" id="black-rating">-</div>
                                </div>
                            </div>
                        </div>

                        <!-- Chessboard -->
                        <div class="chessboard-wrapper">
                            <div class="chessboard-container">
                                <!-- Coordenadas externas -->
                                <div class="coordinates-external coord-files-top">
                                    <div class="coord-label">a</div><div class="coord-label">b</div>
                                    <div class="coord-label">c</div><div class="coord-label">d</div>
                                    <div class="coord-label">e</div><div class="coord-label">f</div>
                                    <div class="coord-label">g</div><div class="coord-label">h</div>
                                </div>
                                
                                <div class="coordinates-external coord-ranks-left">
                                    <div class="coord-label">8</div><div class="coord-label">7</div>
                                    <div class="coord-label">6</div><div class="coord-label">5</div>
                                    <div class="coord-label">4</div><div class="coord-label">3</div>
                                    <div class="coord-label">2</div><div class="coord-label">1</div>
                                </div>
                                
                                <div class="chessboard" id="pgn-chessboard"></div>
                                
                                <div class="coordinates-external coord-ranks-right">
                                    <div class="coord-label">8</div><div class="coord-label">7</div>
                                    <div class="coord-label">6</div><div class="coord-label">5</div>
                                    <div class="coord-label">4</div><div class="coord-label">3</div>
                                    <div class="coord-label">2</div><div class="coord-label">1</div>
                                </div>
                                
                                <div class="coordinates-external coord-files-bottom">
                                    <div class="coord-label">a</div><div class="coord-label">b</div>
                                    <div class="coord-label">c</div><div class="coord-label">d</div>
                                    <div class="coord-label">e</div><div class="coord-label">f</div>
                                    <div class="coord-label">g</div><div class="coord-label">h</div>
                                </div>
                            </div>
                        </div>

                        <!-- Navigation Controls -->
                        <div class="navigation-controls card mt-16" id="nav-controls" style="display: none;">
                            <div class="d-flex justify-center align-center gap-8">
                                <button class="control-btn" id="first-btn" title="Primeiro lance">
                                    <i class="fas fa-step-backward"></i>
                                </button>
                                <button class="control-btn" id="prev-btn" title="Lance anterior">
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                                <button class="control-btn" id="play-btn" title="Auto-play">
                                    <i class="fas fa-play"></i>
                                </button>
                                <button class="control-btn" id="next-btn" title="Próximo lance">
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                                <button class="control-btn" id="last-btn" title="Último lance">
                                    <i class="fas fa-step-forward"></i>
                                </button>
                                <button class="control-btn" id="flip-btn" title="Virar tabuleiro">
                                    <i class="fas fa-refresh"></i>
                                </button>
                            </div>
                            
                            <!-- Move Slider -->
                            <div class="move-slider mt-16">
                                <input type="range" id="move-slider" min="0" max="0" value="0" class="slider">
                                <div class="d-flex justify-between mt-4">
                                    <span style="font-size: 12px;">Lance 0</span>
                                    <span style="font-size: 12px;" id="current-move-display">Lance 0 de 0</span>
                                    <span style="font-size: 12px;" id="max-moves-display">Lance 0</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Game Analysis Panel -->
                    <div class="analysis-panel">
                        <!-- Move History -->
                        <div class="card mb-16">
                            <div class="card-header">
                                <h4 class="card-title">
                                    <i class="fas fa-history"></i>
                                    Histórico
                                </h4>
                                <span class="badge badge-primary" id="move-count">0 lances</span>
                            </div>
                            <div id="move-history" style="max-height: 300px; overflow-y: auto; font-family: var(--font-mono); font-size: 13px;">
                                <div style="color: var(--text-muted); text-align: center; padding: 20px;">
                                    Carregue uma partida para ver o histórico
                                </div>
                            </div>
                        </div>

                        <!-- Current Move Info -->
                        <div class="card mb-16" id="move-info" style="display: none;">
                            <div class="card-header">
                                <h4 class="card-title">
                                    <i class="fas fa-info-circle"></i>
                                    Lance Atual
                                </h4>
                            </div>
                            <div id="current-move-info">
                                <div><strong id="current-move-san">-</strong></div>
                                <div style="color: var(--text-secondary); font-size: 12px;" id="current-move-details">-</div>
                                <div class="mt-8" id="move-comment" style="font-style: italic; color: var(--text-muted);"></div>
                            </div>
                        </div>

                        <!-- Game Stats -->
                        <div class="card">
                            <div class="card-header">
                                <h4 class="card-title">
                                    <i class="fas fa-chart-bar"></i>
                                    Estatísticas
                                </h4>
                            </div>
                            <div id="game-stats">
                                <div class="d-flex justify-between mb-8">
                                    <span>Abertura:</span>
                                    <span id="opening-name">-</span>
                                </div>
                                <div class="d-flex justify-between mb-8">
                                    <span>Duração:</span>
                                    <span id="game-duration">-</span>
                                </div>
                                <div class="d-flex justify-between mb-8">
                                    <span>Data:</span>
                                    <span id="game-date">-</span>
                                </div>
                                <div class="d-flex justify-between">
                                    <span>Evento:</span>
                                    <span id="game-event">-</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Game selection
        document.getElementById('matchup-select').addEventListener('change', () => {
            this.loadGamesForMatchup();
        });

        document.getElementById('load-game-btn').addEventListener('click', () => {
            this.loadSelectedGame();
        });

        // Navigation controls
        document.getElementById('first-btn').addEventListener('click', () => {
            this.goToMove(0);
        });

        document.getElementById('prev-btn').addEventListener('click', () => {
            this.goToMove(this.currentMove - 1);
        });

        document.getElementById('play-btn').addEventListener('click', () => {
            this.toggleAutoPlay();
        });

        document.getElementById('next-btn').addEventListener('click', () => {
            this.goToMove(this.currentMove + 1);
        });

        document.getElementById('last-btn').addEventListener('click', () => {
            this.goToMove(this.maxMoves);
        });

        document.getElementById('flip-btn').addEventListener('click', () => {
            if (this.chessboard) {
                this.chessboard.flip();
            }
        });

        // Move slider
        document.getElementById('move-slider').addEventListener('input', (e) => {
            this.goToMove(parseInt(e.target.value));
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.currentGame) return;
            
            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.goToMove(this.currentMove - 1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.goToMove(this.currentMove + 1);
                    break;
                case 'Home':
                    e.preventDefault();
                    this.goToMove(0);
                    break;
                case 'End':
                    e.preventDefault();
                    this.goToMove(this.maxMoves);
                    break;
                case ' ':
                    e.preventDefault();
                    this.toggleAutoPlay();
                    break;
            }
        });
    }

    async loadAvailableGames() {
        try {
            const response = await fetch('/api/games/list-matchups');
            const matchups = await response.json();
            
            const matchupSelect = document.getElementById('matchup-select');
            matchupSelect.innerHTML = '<option value="">Selecione um confronto</option>';
            
            matchups.forEach(matchup => {
                const option = document.createElement('option');
                option.value = matchup;
                option.textContent = matchup;
                matchupSelect.appendChild(option);
            });
            
            console.log('✅ Available matchups loaded');
        } catch (error) {
            console.error('❌ Error loading matchups:', error);
        }
    }

    async loadGamesForMatchup() {
        const matchup = document.getElementById('matchup-select').value;
        const gameSelect = document.getElementById('game-select');
        
        if (!matchup) {
            gameSelect.innerHTML = '<option value="">Selecione um confronto...</option>';
            return;
        }

        try {
            gameSelect.innerHTML = '<option value="">Carregando partidas...</option>';
            
            const response = await fetch(`/api/games/list-games/${matchup}`);
            const games = await response.json();
            
            gameSelect.innerHTML = '<option value="">Selecione uma partida</option>';
            
            games.forEach(game => {
                const option = document.createElement('option');
                option.value = game;
                option.textContent = game.replace('.pgn', '');
                gameSelect.appendChild(option);
            });
            
            console.log(`✅ Games loaded for ${matchup}`);
        } catch (error) {
            console.error('❌ Error loading games:', error);
            gameSelect.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    }

    async loadSelectedGame() {
        const matchup = document.getElementById('matchup-select').value;
        const gameFile = document.getElementById('game-select').value;
        
        if (!matchup || !gameFile) {
            if (window.arena) {
                window.arena.showToast('Selecione um confronto e uma partida', 'warning');
            }
            return;
        }

        try {
            if (window.arena) {
                window.arena.showLoading('Carregando partida...');
            }

            const response = await fetch(`/api/games/pgn-data/${matchup}/${gameFile}`);
            const gameData = await response.json();
            
            this.currentGame = gameData;
            this.moves = gameData.moves || [];
            this.fens = gameData.fens || [];
            this.gameHeaders = gameData.headers || {};
            this.maxMoves = this.moves.length;
            this.currentMove = 0;

            // Initialize chessboard if not exists
            if (!this.chessboard) {
                this.chessboard = new ProfessionalChessboard('pgn-chessboard', {
                    interactive: false,
                    showCoordinates: true
                });
            }

            // Update UI
            this.updateGameInfo();
            this.updateMoveHistory();
            this.updateNavigationControls();
            this.goToMove(0);

            // Show game elements
            document.getElementById('game-info').style.display = 'block';
            document.getElementById('nav-controls').style.display = 'block';
            document.getElementById('move-info').style.display = 'block';

            if (window.arena) {
                window.arena.hideLoading();
                window.arena.showToast('Partida carregada com sucesso!', 'success');
            }

            console.log('✅ Game loaded successfully');

        } catch (error) {
            console.error('❌ Error loading game:', error);
            if (window.arena) {
                window.arena.hideLoading();
                window.arena.showToast('Erro ao carregar partida', 'error');
            }
        }
    }

    updateGameInfo() {
        if (!this.currentGame) return;

        const headers = this.gameHeaders;
        
        document.getElementById('game-title').textContent = 
            `${headers.White || 'Brancas'} vs ${headers.Black || 'Pretas'}`;
        
        document.getElementById('game-result').textContent = headers.Result || '*';
        document.getElementById('game-moves').textContent = `${this.maxMoves} lances`;
        
        document.getElementById('white-player').textContent = headers.White || 'Brancas';
        document.getElementById('black-player').textContent = headers.Black || 'Pretas';
        document.getElementById('white-rating').textContent = headers.WhiteElo || '-';
        document.getElementById('black-rating').textContent = headers.BlackElo || '-';
        
        // Stats
        document.getElementById('opening-name').textContent = headers.Opening || '-';
        document.getElementById('game-duration').textContent = this.formatDuration(headers.TimeControl) || '-';
        document.getElementById('game-date').textContent = this.formatDate(headers.Date) || '-';
        document.getElementById('game-event').textContent = headers.Event || 'LLM Chess Arena';
    }

    updateMoveHistory() {
        if (!this.moves || this.moves.length === 0) return;

        const historyElement = document.getElementById('move-history');
        let html = '';

        for (let i = 0; i < this.moves.length; i += 2) {
            const moveNumber = Math.floor(i / 2) + 1;
            const whiteMove = this.moves[i] ? this.moves[i].san : '';
            const blackMove = this.moves[i + 1] ? this.moves[i + 1].san : '';
            
            const isWhiteActive = this.currentMove === i + 1;
            const isBlackActive = this.currentMove === i + 2;

            html += `
                <div style="padding: 4px 8px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center;">
                    <span style="color: var(--text-secondary); width: 30px; display: inline-block;">${moveNumber}.</span>
                    <span class="${isWhiteActive ? 'active-move' : ''}" 
                          style="margin-right: 12px; flex: 1; cursor: pointer; padding: 2px 4px; border-radius: 3px; ${isWhiteActive ? 'background: var(--lichess-blue); color: white;' : ''}" 
                          onclick="pgnViewer.goToMove(${i + 1})">${whiteMove}</span>
                    <span class="${isBlackActive ? 'active-move' : ''}" 
                          style="flex: 1; cursor: pointer; padding: 2px 4px; border-radius: 3px; ${isBlackActive ? 'background: var(--lichess-blue); color: white;' : ''}" 
                          onclick="pgnViewer.goToMove(${i + 2})">${blackMove}</span>
                </div>`;
        }

        historyElement.innerHTML = html;
        document.getElementById('move-count').textContent = `${this.moves.length} lances`;
    }

    updateNavigationControls() {
        const slider = document.getElementById('move-slider');
        slider.max = this.maxMoves;
        slider.value = this.currentMove;
        
        document.getElementById('current-move-display').textContent = 
            `Lance ${this.currentMove} de ${this.maxMoves}`;
        document.getElementById('max-moves-display').textContent = 
            `Lance ${this.maxMoves}`;

        // Update buttons state
        document.getElementById('first-btn').disabled = this.currentMove === 0;
        document.getElementById('prev-btn').disabled = this.currentMove === 0;
        document.getElementById('next-btn').disabled = this.currentMove >= this.maxMoves;
        document.getElementById('last-btn').disabled = this.currentMove >= this.maxMoves;
    }

    goToMove(moveNumber) {
        if (!this.currentGame) return;
        
        this.currentMove = Math.max(0, Math.min(moveNumber, this.maxMoves));
        
        // Update board position
        if (this.chessboard && this.fens[this.currentMove]) {
            this.chessboard.setPositionFromFen(this.fens[this.currentMove]);
            
            // Highlight last move
            if (this.currentMove > 0 && this.moves[this.currentMove - 1]) {
                const move = this.moves[this.currentMove - 1];
                this.chessboard.highlightLastMove(move.from, move.to);
            } else {
                this.chessboard.highlightLastMove(null, null);
            }
        }
        
        // Update current move info
        this.updateCurrentMoveInfo();
        
        // Update controls
        this.updateNavigationControls();
        
        // Update history highlighting
        this.updateMoveHistory();
    }

    updateCurrentMoveInfo() {
        if (this.currentMove === 0) {
            document.getElementById('current-move-san').textContent = 'Posição inicial';
            document.getElementById('current-move-details').textContent = 'Início da partida';
            document.getElementById('move-comment').textContent = '';
            return;
        }

        const move = this.moves[this.currentMove - 1];
        if (move) {
            document.getElementById('current-move-san').textContent = move.san;
            
            const moveNumber = Math.ceil(this.currentMove / 2);
            const color = this.currentMove % 2 === 1 ? 'Brancas' : 'Pretas';
            document.getElementById('current-move-details').textContent = 
                `${moveNumber}. ${color} - ${move.from || ''} → ${move.to || ''}`;
            
            // Show comment if available
            const comment = move.comment || '';
            document.getElementById('move-comment').textContent = comment;
        }
    }

    toggleAutoPlay() {
        if (this.autoPlay) {
            this.stopAutoPlay();
        } else {
            this.startAutoPlay();
        }
    }

    startAutoPlay() {
        if (!this.currentGame || this.currentMove >= this.maxMoves) return;
        
        this.autoPlay = true;
        document.getElementById('play-btn').innerHTML = '<i class="fas fa-pause"></i>';
        
        this.autoPlayInterval = setInterval(() => {
            if (this.currentMove >= this.maxMoves) {
                this.stopAutoPlay();
                return;
            }
            
            this.goToMove(this.currentMove + 1);
        }, this.autoPlaySpeed);
    }

    stopAutoPlay() {
        this.autoPlay = false;
        document.getElementById('play-btn').innerHTML = '<i class="fas fa-play"></i>';
        
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
    }

    // Utility methods
    formatDuration(timeControl) {
        if (!timeControl) return '-';
        return timeControl;
    }

    formatDate(dateStr) {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr.replace(/\./g, '-'));
            return date.toLocaleDateString('pt-BR');
        } catch {
            return dateStr;
        }
    }

    destroy() {
        this.stopAutoPlay();
        if (this.chessboard) {
            this.chessboard.destroy();
        }
    }
}

// Inicializar globalmente
window.PGNViewer = PGNViewer;

// Instância global para uso nos controles
let pgnViewer = null;

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    const viewerContainer = document.getElementById('pgn-viewer-container');
    if (viewerContainer) {
        pgnViewer = new PGNViewer('pgn-viewer-container');
        window.pgnViewer = pgnViewer;
    }
});
