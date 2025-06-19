// Advanced Tournament System for LLM Chess Arena
class AdvancedTournamentSystem {
    constructor() {
        this.activeTournaments = new Map();
        this.tournamentHistory = [];
        this.eloSystem = new EloCalculator();
        this.tournamentTypes = {
            'round-robin': 'Round Robin (Todos contra todos)',
            'swiss': 'Sistema Suíço',
            'elimination': 'Eliminatória Simples',
            'double-elimination': 'Eliminatória Dupla',
            'arena': 'Arena de Tempo'
        };
    }

    init() {
        this.setupEventListeners();
        this.loadTournamentHistory();
        this.updateAvailableModels();
    }

    setupEventListeners() {
        // Tournament creation
        const createTournamentBtn = document.getElementById('create-tournament');
        if (createTournamentBtn) {
            createTournamentBtn.addEventListener('click', () => this.showTournamentCreationModal());
        }

        // Quick tournament buttons
        const quickTournamentBtns = document.querySelectorAll('.quick-tournament-btn');
        quickTournamentBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const config = JSON.parse(e.target.dataset.config);
                this.createQuickTournament(config);
            });
        });

        // Tournament management
        const pauseTournamentBtn = document.getElementById('pause-tournament');
        if (pauseTournamentBtn) {
            pauseTournamentBtn.addEventListener('click', () => this.pauseActiveTournament());
        }

        const resumeTournamentBtn = document.getElementById('resume-tournament');
        if (resumeTournamentBtn) {
            resumeTournamentBtn.addEventListener('click', () => this.resumeActiveTournament());
        }

        const stopTournamentBtn = document.getElementById('stop-tournament');
        if (stopTournamentBtn) {
            stopTournamentBtn.addEventListener('click', () => this.stopActiveTournament());
        }

        // Tournament viewing
        const viewTournamentSelect = document.getElementById('view-tournament-select');
        if (viewTournamentSelect) {
            viewTournamentSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.displayTournament(e.target.value);
                }
            });
        }

        // Export options
        const exportTournamentBtn = document.getElementById('export-tournament');
        if (exportTournamentBtn) {
            exportTournamentBtn.addEventListener('click', () => this.exportTournamentResults());
        }
    }

    showTournamentCreationModal() {
        const modal = this.createTournamentModal();
        document.body.appendChild(modal);
        
        // Animate modal in
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            modal.querySelector('.modal-content').style.transform = 'scale(1)';
        });
    }

    createTournamentModal() {
        const modal = document.createElement('div');
        modal.className = 'tournament-creation-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="modal-content large">
                <div class="modal-header">
                    <h2>🏆 Criar Novo Torneio</h2>
                    <button class="modal-close" onclick="this.closest('.tournament-creation-modal').remove()">×</button>
                </div>
                
                <div class="modal-body">
                    <div class="tournament-setup-tabs">
                        <button class="tab-btn active" data-tab="basic">Básico</button>
                        <button class="tab-btn" data-tab="participants">Participantes</button>
                        <button class="tab-btn" data-tab="advanced">Avançado</button>
                        <button class="tab-btn" data-tab="schedule">Cronograma</button>
                    </div>

                    <div class="tab-content">
                        <!-- Basic Tab -->
                        <div id="basic-tab" class="tab-panel active">
                            <div class="setup-section">
                                <h3>ℹ️ Informações Básicas</h3>
                                <div class="form-group">
                                    <label for="tournament-name">Nome do Torneio:</label>
                                    <input type="text" id="tournament-name" placeholder="Ex: Campeonato LLM 2024">
                                </div>
                                
                                <div class="form-group">
                                    <label for="tournament-description">Descrição:</label>
                                    <textarea id="tournament-description" rows="3" placeholder="Breve descrição do torneio..."></textarea>
                                </div>

                                <div class="form-group">
                                    <label for="tournament-type">Tipo de Torneio:</label>
                                    <select id="tournament-type">
                                        <option value="round-robin">Round Robin - Todos contra todos</option>
                                        <option value="swiss">Sistema Suíço - Emparelhamento por rating</option>
                                        <option value="elimination">Eliminatória Simples - Mata-mata</option>
                                        <option value="double-elimination">Eliminatória Dupla - Segunda chance</option>
                                        <option value="arena">Arena de Tempo - Máximo de partidas em tempo limite</option>
                                    </select>
                                </div>

                                <div class="tournament-type-info" id="tournament-type-info">
                                    <p><strong>Round Robin:</strong> Cada participante joga contra todos os outros. Ideal para determinar o melhor jogador de forma justa.</p>
                                </div>
                            </div>
                        </div>

                        <!-- Participants Tab -->
                        <div id="participants-tab" class="tab-panel">
                            <div class="setup-section">
                                <h3>🤖 Seleção de Participantes</h3>
                                <div class="participants-selection">
                                    <div class="available-models">
                                        <h4>Modelos Disponíveis</h4>
                                        <div id="available-models-list" class="models-list"></div>
                                    </div>
                                    
                                    <div class="selection-controls">
                                        <button class="btn btn-secondary" onclick="this.closest('.modal-content').querySelector('#tournamentSystem').selectAllModels()">
                                            Selecionar Todos
                                        </button>
                                        <button class="btn btn-secondary" onclick="this.closest('.modal-content').querySelector('#tournamentSystem').clearSelection()">
                                            Limpar Seleção
                                        </button>
                                        <button class="btn btn-secondary" onclick="this.closest('.modal-content').querySelector('#tournamentSystem').selectTopRated(6)">
                                            Top 6 por Rating
                                        </button>
                                    </div>
                                    
                                    <div class="selected-models">
                                        <h4>Participantes Selecionados (<span id="selected-count">0</span>)</h4>
                                        <div id="selected-models-list" class="models-list selected"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Advanced Tab -->
                        <div id="advanced-tab" class="tab-panel">
                            <div class="setup-section">
                                <h3>⚙️ Configurações Avançadas</h3>
                                
                                <div class="form-group">
                                    <label for="games-per-pairing">Partidas por confronto:</label>
                                    <input type="range" id="games-per-pairing" min="1" max="10" value="2">
                                    <span id="games-per-pairing-value">2</span>
                                </div>

                                <div class="form-group">
                                    <label for="time-control">Controle de tempo:</label>
                                    <select id="time-control">
                                        <option value="unlimited">Sem limite</option>
                                        <option value="bullet">Bullet (1+0)</option>
                                        <option value="blitz" selected>Blitz (5+3)</option>
                                        <option value="rapid">Rapid (15+10)</option>
                                        <option value="classical">Classical (30+0)</option>
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label for="opening-book">Livro de aberturas:</label>
                                    <select id="opening-book">
                                        <option value="none">Nenhum</option>
                                        <option value="basic" selected>Básico (e4, d4, Nf3, c4)</option>
                                        <option value="extended">Estendido (15 aberturas)</option>
                                        <option value="masters">Mestres (Partidas famosas)</option>
                                        <option value="random">Aleatório</option>
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="adjudication-enabled" checked>
                                        <span>Adjudicação automática (encerrar partidas muito longas)</span>
                                    </label>
                                </div>

                                <div class="form-group" id="adjudication-settings">
                                    <label for="max-moves">Máximo de lances por partida:</label>
                                    <input type="number" id="max-moves" min="50" max="500" value="200">
                                </div>

                                <div class="form-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="analysis-enabled" checked>
                                        <span>Análise automática com Stockfish</span>
                                    </label>
                                </div>

                                <div class="form-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="public-viewing">
                                        <span>Permitir visualização pública</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <!-- Schedule Tab -->
                        <div id="schedule-tab" class="tab-panel">
                            <div class="setup-section">
                                <h3>📅 Cronograma</h3>
                                
                                <div class="form-group">
                                    <label for="start-time">Início do torneio:</label>
                                    <input type="datetime-local" id="start-time">
                                </div>

                                <div class="form-group">
                                    <label for="concurrent-games">Partidas simultâneas:</label>
                                    <input type="range" id="concurrent-games" min="1" max="10" value="4">
                                    <span id="concurrent-games-value">4</span>
                                </div>

                                <div class="form-group">
                                    <label for="round-interval">Intervalo entre rodadas (minutos):</label>
                                    <input type="number" id="round-interval" min="0" max="120" value="5">
                                </div>

                                <div class="estimated-duration">
                                    <h4>⏱️ Duração Estimada</h4>
                                    <div id="duration-estimate">
                                        <p class="estimate-text">Calculando...</p>
                                        <div class="estimate-breakdown">
                                            <div class="estimate-item">
                                                <span class="label">Total de partidas:</span>
                                                <span class="value" id="total-games-estimate">-</span>
                                            </div>
                                            <div class="estimate-item">
                                                <span class="label">Rodadas:</span>
                                                <span class="value" id="total-rounds-estimate">-</span>
                                            </div>
                                            <div class="estimate-item">
                                                <span class="label">Tempo estimado:</span>
                                                <span class="value" id="estimated-time">-</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.tournament-creation-modal').remove()">
                        Cancelar
                    </button>
                    <button class="btn btn-primary" onclick="tournamentSystem.createTournamentFromModal()">
                        🚀 Criar Torneio
                    </button>
                </div>
            </div>
        `;

        // Add event listeners for modal interactivity
        this.setupModalEventListeners(modal);
        return modal;
    }

    setupModalEventListeners(modal) {
        // Tab switching
        const tabBtns = modal.querySelectorAll('.tab-btn');
        const tabPanels = modal.querySelectorAll('.tab-panel');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                
                // Update active tab button
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update active tab panel
                tabPanels.forEach(panel => panel.classList.remove('active'));
                modal.querySelector(`#${tabId}-tab`).classList.add('active');
            });
        });

        // Tournament type info
        const typeSelect = modal.querySelector('#tournament-type');
        const typeInfo = modal.querySelector('#tournament-type-info');
        
        typeSelect.addEventListener('change', (e) => {
            const descriptions = {
                'round-robin': 'Cada participante joga contra todos os outros. Ideal para determinar o melhor jogador de forma justa.',
                'swiss': 'Participantes são emparelhados baseado em seu rating e performance. Mais eficiente que round robin.',
                'elimination': 'Mata-mata simples. Quem perde é eliminado. Rápido mas pode não revelar o segundo melhor.',
                'double-elimination': 'Cada jogador pode perder uma vez. Mais justo que eliminação simples.',
                'arena': 'Jogue o máximo de partidas possível dentro do tempo limite. Foco na velocidade.'
            };
            
            typeInfo.innerHTML = `<p><strong>${this.tournamentTypes[e.target.value]}:</strong> ${descriptions[e.target.value]}</p>`;
            this.updateDurationEstimate(modal);
        });

        // Range sliders
        const sliders = ['games-per-pairing', 'concurrent-games'];
        sliders.forEach(sliderId => {
            const slider = modal.querySelector(`#${sliderId}`);
            const valueSpan = modal.querySelector(`#${sliderId}-value`);
            
            slider.addEventListener('input', (e) => {
                valueSpan.textContent = e.target.value;
                this.updateDurationEstimate(modal);
            });
        });

        // Model selection
        this.populateAvailableModels(modal);
    }

    async populateAvailableModels(modal) {
        try {
            const models = await api.getAvailableModels();
            const availableList = modal.querySelector('#available-models-list');
            const selectedList = modal.querySelector('#selected-models-list');
            
            availableList.innerHTML = '';
            
            Object.entries(models).forEach(([name, available]) => {
                if (available) {
                    const modelItem = document.createElement('div');
                    modelItem.className = 'model-item';
                    modelItem.innerHTML = `
                        <div class="model-info">
                            <div class="model-name">${name}</div>
                            <div class="model-stats">
                                <span class="rating">ELO: ${Math.floor(Math.random() * 400) + 1400}</span>
                                <span class="games">Partidas: ${Math.floor(Math.random() * 100) + 20}</span>
                            </div>
                        </div>
                        <button class="btn btn-sm btn-primary" onclick="tournamentSystem.selectModel('${name}')">
                            Adicionar
                        </button>
                    `;
                    availableList.appendChild(modelItem);
                }
            });
        } catch (error) {
            Utils.handleError(error, 'populateAvailableModels');
        }
    }

    selectModel(modelName) {
        const modal = document.querySelector('.tournament-creation-modal');
        const selectedList = modal.querySelector('#selected-models-list');
        const countSpan = modal.querySelector('#selected-count');
        
        // Check if already selected
        if (selectedList.querySelector(`[data-model="${modelName}"]`)) {
            Utils.showToast('Modelo já selecionado', 'warning');
            return;
        }

        const modelItem = document.createElement('div');
        modelItem.className = 'model-item selected';
        modelItem.dataset.model = modelName;
        modelItem.innerHTML = `
            <div class="model-info">
                <div class="model-name">${modelName}</div>
                <div class="model-status">✅ Selecionado</div>
            </div>
            <button class="btn btn-sm btn-danger" onclick="tournamentSystem.deselectModel('${modelName}')">
                Remover
            </button>
        `;
        selectedList.appendChild(modelItem);
        
        // Update count
        const selectedCount = selectedList.children.length;
        countSpan.textContent = selectedCount;
        
        this.updateDurationEstimate(modal);
    }

    deselectModel(modelName) {
        const modal = document.querySelector('.tournament-creation-modal');
        const selectedList = modal.querySelector('#selected-models-list');
        const countSpan = modal.querySelector('#selected-count');
        
        const modelItem = selectedList.querySelector(`[data-model="${modelName}"]`);
        if (modelItem) {
            modelItem.remove();
            
            // Update count
            const selectedCount = selectedList.children.length;
            countSpan.textContent = selectedCount;
            
            this.updateDurationEstimate(modal);
        }
    }

    updateDurationEstimate(modal) {
        const selectedCount = modal.querySelector('#selected-models-list').children.length;
        const tournamentType = modal.querySelector('#tournament-type').value;
        const gamesPerPairing = parseInt(modal.querySelector('#games-per-pairing').value);
        const concurrentGames = parseInt(modal.querySelector('#concurrent-games').value);
        
        if (selectedCount < 2) {
            modal.querySelector('#duration-estimate .estimate-text').textContent = 'Selecione pelo menos 2 participantes';
            return;
        }

        let totalGames = 0;
        let totalRounds = 0;
        
        switch (tournamentType) {
            case 'round-robin':
                totalGames = (selectedCount * (selectedCount - 1)) * gamesPerPairing;
                totalRounds = selectedCount - 1;
                break;
            case 'swiss':
                totalRounds = Math.ceil(Math.log2(selectedCount));
                totalGames = totalRounds * Math.floor(selectedCount / 2) * gamesPerPairing;
                break;
            case 'elimination':
                totalGames = (selectedCount - 1) * gamesPerPairing;
                totalRounds = Math.ceil(Math.log2(selectedCount));
                break;
            case 'double-elimination':
                totalGames = ((selectedCount - 1) * 2 - 1) * gamesPerPairing;
                totalRounds = Math.ceil(Math.log2(selectedCount)) * 2;
                break;
            case 'arena':
                totalGames = selectedCount * 20; // Estimate
                totalRounds = 1;
                break;
        }

        const avgGameTime = 15; // minutes
        const totalTime = Math.ceil((totalGames * avgGameTime) / concurrentGames);
        
        modal.querySelector('#total-games-estimate').textContent = totalGames;
        modal.querySelector('#total-rounds-estimate').textContent = totalRounds;
        modal.querySelector('#estimated-time').textContent = `${Math.floor(totalTime / 60)}h ${totalTime % 60}m`;
        modal.querySelector('#duration-estimate .estimate-text').textContent = `Duração estimada: ${Math.floor(totalTime / 60)}h ${totalTime % 60}m`;
    }

    async createTournamentFromModal() {
        const modal = document.querySelector('.tournament-creation-modal');
        
        // Gather form data
        const config = {
            name: modal.querySelector('#tournament-name').value || 'Torneio LLM',
            description: modal.querySelector('#tournament-description').value || '',
            type: modal.querySelector('#tournament-type').value,
            participants: Array.from(modal.querySelectorAll('#selected-models-list .model-item')).map(item => item.dataset.model),
            gamesPerPairing: parseInt(modal.querySelector('#games-per-pairing').value),
            timeControl: modal.querySelector('#time-control').value,
            openingBook: modal.querySelector('#opening-book').value,
            adjudication: {
                enabled: modal.querySelector('#adjudication-enabled').checked,
                maxMoves: parseInt(modal.querySelector('#max-moves').value)
            },
            analysis: modal.querySelector('#analysis-enabled').checked,
            publicViewing: modal.querySelector('#public-viewing').checked,
            schedule: {
                startTime: modal.querySelector('#start-time').value || new Date().toISOString(),
                concurrentGames: parseInt(modal.querySelector('#concurrent-games').value),
                roundInterval: parseInt(modal.querySelector('#round-interval').value)
            }
        };

        // Validate
        if (config.participants.length < 2) {
            Utils.showToast('Selecione pelo menos 2 participantes', 'warning');
            return;
        }

        modal.remove();
        await this.createTournament(config);
    }

    async createTournament(config) {
        try {
            Utils.showLoading('Criando torneio...');

            // Generate tournament structure
            const tournament = {
                id: `tournament_${Date.now()}`,
                ...config,
                status: 'created',
                currentRound: 0,
                pairings: [],
                standings: this.initializeStandings(config.participants),
                games: [],
                startTime: new Date(config.schedule.startTime),
                createdAt: new Date()
            };

            // Generate pairings based on tournament type
            tournament.pairings = this.generatePairings(tournament);

            // Save tournament
            this.activeTournaments.set(tournament.id, tournament);

            // Create tournament display
            this.displayTournament(tournament.id);

            // Start tournament if scheduled for now
            if (new Date(config.schedule.startTime) <= new Date()) {
                await this.startTournament(tournament.id);
            }

            Utils.hideLoading();
            Utils.showToast(`🏆 Torneio "${config.name}" criado com sucesso!`, 'success');

        } catch (error) {
            Utils.hideLoading();
            Utils.handleError(error, 'createTournament');
        }
    }

    initializeStandings(participants) {
        return participants.map(participant => ({
            participant,
            points: 0,
            games: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            rating: 1500, // Initial rating
            performance: 0,
            buchholz: 0, // Tiebreak system
            sonnenborn: 0 // Another tiebreak system
        }));
    }

    generatePairings(tournament) {
        const pairings = [];
        const participants = [...tournament.participants];

        switch (tournament.type) {
            case 'round-robin':
                return this.generateRoundRobinPairings(participants, tournament.gamesPerPairing);
            case 'swiss':
                return this.generateSwissPairings(participants, tournament.gamesPerPairing);
            case 'elimination':
                return this.generateEliminationPairings(participants, tournament.gamesPerPairing);
            case 'double-elimination':
                return this.generateDoubleEliminationPairings(participants, tournament.gamesPerPairing);
            case 'arena':
                return this.generateArenaPairings(participants, tournament.gamesPerPairing);
            default:
                return this.generateRoundRobinPairings(participants, tournament.gamesPerPairing);
        }
    }

    generateRoundRobinPairings(participants, gamesPerPairing) {
        const rounds = [];
        const n = participants.length;
        
        // If odd number of participants, add a "bye"
        if (n % 2 === 1) {
            participants.push('BYE');
        }

        const totalParticipants = participants.length;
        
        for (let round = 0; round < totalParticipants - 1; round++) {
            const roundPairings = [];
            
            for (let i = 0; i < totalParticipants / 2; i++) {
                const player1 = participants[i];
                const player2 = participants[totalParticipants - 1 - i];
                
                if (player1 !== 'BYE' && player2 !== 'BYE') {
                    for (let game = 0; game < gamesPerPairing; game++) {
                        roundPairings.push({
                            white: game % 2 === 0 ? player1 : player2,
                            black: game % 2 === 0 ? player2 : player1,
                            round: round + 1,
                            game: game + 1,
                            status: 'pending'
                        });
                    }
                }
            }
            
            rounds.push(roundPairings);
            
            // Rotate participants (except the first one)
            const last = participants.pop();
            participants.splice(1, 0, last);
        }
        
        return rounds;
    }

    generateSwissPairings(participants, gamesPerPairing) {
        // Swiss system - pair players with similar scores
        const rounds = [];
        const standings = this.initializeStandings(participants);
        
        const numberOfRounds = Math.ceil(Math.log2(participants.length));
        
        for (let round = 0; round < numberOfRounds; round++) {
            const roundPairings = [];
            
            // Sort by points, then by rating
            standings.sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                return b.rating - a.rating;
            });
            
            const paired = new Set();
            
            for (let i = 0; i < standings.length && paired.size < standings.length - 1; i++) {
                if (paired.has(standings[i].participant)) continue;
                
                // Find best opponent
                for (let j = i + 1; j < standings.length; j++) {
                    if (paired.has(standings[j].participant)) continue;
                    
                    // Check if they haven't played before
                    const hasPlayed = this.havePlayedBefore(standings[i].participant, standings[j].participant, rounds);
                    if (!hasPlayed) {
                        paired.add(standings[i].participant);
                        paired.add(standings[j].participant);
                        
                        for (let game = 0; game < gamesPerPairing; game++) {
                            roundPairings.push({
                                white: game % 2 === 0 ? standings[i].participant : standings[j].participant,
                                black: game % 2 === 0 ? standings[j].participant : standings[i].participant,
                                round: round + 1,
                                game: game + 1,
                                status: 'pending'
                            });
                        }
                        break;
                    }
                }
            }
            
            rounds.push(roundPairings);
        }
        
        return rounds;
    }

    generateEliminationPairings(participants, gamesPerPairing) {
        const rounds = [];
        let currentParticipants = [...participants];
        let roundNumber = 1;
        
        while (currentParticipants.length > 1) {
            const roundPairings = [];
            const nextRoundParticipants = [];
            
            // Shuffle for random pairings
            this.shuffleArray(currentParticipants);
            
            for (let i = 0; i < currentParticipants.length - 1; i += 2) {
                const player1 = currentParticipants[i];
                const player2 = currentParticipants[i + 1];
                
                for (let game = 0; game < gamesPerPairing; game++) {
                    roundPairings.push({
                        white: game % 2 === 0 ? player1 : player2,
                        black: game % 2 === 0 ? player2 : player1,
                        round: roundNumber,
                        game: game + 1,
                        status: 'pending',
                        elimination: true
                    });
                }
                
                // Winner advances (simplified - in real implementation, wait for game results)
                nextRoundParticipants.push(player1); // Placeholder
            }
            
            // If odd number, last player gets a bye
            if (currentParticipants.length % 2 === 1) {
                nextRoundParticipants.push(currentParticipants[currentParticipants.length - 1]);
            }
            
            rounds.push(roundPairings);
            currentParticipants = nextRoundParticipants;
            roundNumber++;
        }
        
        return rounds;
    }

    generateDoubleEliminationPairings(participants, gamesPerPairing) {
        // Double elimination is more complex - implement simplified version
        const winnersBracket = this.generateEliminationPairings(participants, gamesPerPairing);
        const losersBracket = []; // Would need to track losers and create loser bracket
        
        return [...winnersBracket, ...losersBracket];
    }

    generateArenaPairings(participants, gamesPerPairing) {
        // Arena style - random pairings, focus on maximum games
        const rounds = [];
        const maxRounds = 10; // Configurable
        
        for (let round = 0; round < maxRounds; round++) {
            const roundPairings = [];
            const shuffled = [...participants];
            this.shuffleArray(shuffled);
            
            for (let i = 0; i < shuffled.length - 1; i += 2) {
                roundPairings.push({
                    white: shuffled[i],
                    black: shuffled[i + 1],
                    round: round + 1,
                    game: 1,
                    status: 'pending'
                });
            }
            
            rounds.push(roundPairings);
        }
        
        return rounds;
    }

    havePlayedBefore(player1, player2, previousRounds) {
        for (const round of previousRounds) {
            for (const pairing of round) {
                if ((pairing.white === player1 && pairing.black === player2) ||
                    (pairing.white === player2 && pairing.black === player1)) {
                    return true;
                }
            }
        }
        return false;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    async startTournament(tournamentId) {
        const tournament = this.activeTournaments.get(tournamentId);
        if (!tournament) {
            Utils.showToast('Torneio não encontrado', 'error');
            return;
        }

        try {
            tournament.status = 'running';
            tournament.currentRound = 1;
            tournament.actualStartTime = new Date();

            // Start first round
            await this.startRound(tournamentId, 1);

            Utils.showToast(`🚀 Torneio "${tournament.name}" iniciado!`, 'success');
            this.updateTournamentDisplay(tournamentId);

        } catch (error) {
            Utils.handleError(error, 'startTournament');
        }
    }

    async startRound(tournamentId, roundNumber) {
        const tournament = this.activeTournaments.get(tournamentId);
        if (!tournament || roundNumber > tournament.pairings.length) return;

        const roundPairings = tournament.pairings[roundNumber - 1];
        const concurrentGames = tournament.schedule.concurrentGames;

        // Start games in batches
        for (let i = 0; i < roundPairings.length; i += concurrentGames) {
            const batch = roundPairings.slice(i, i + concurrentGames);
            
            // Start all games in current batch
            const gamePromises = batch.map(pairing => this.startTournamentGame(tournamentId, pairing));
            
            // Wait for batch to complete
            await Promise.all(gamePromises);
            
            // Small delay between batches
            if (i + concurrentGames < roundPairings.length) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // Round completed
        await this.completeRound(tournamentId, roundNumber);
    }

    async startTournamentGame(tournamentId, pairing) {
        try {
            const gameConfig = {
                whiteModel: pairing.white,
                blackModel: pairing.black,
                tournamentId: tournamentId,
                round: pairing.round,
                game: pairing.game
            };

            const gameResult = await api.startBattle(gameConfig);
            
            // Update pairing status
            pairing.status = 'playing';
            pairing.gameId = gameResult.id;
            
            // Wait for game completion (simplified)
            return new Promise((resolve) => {
                setTimeout(() => {
                    this.completeGame(tournamentId, pairing, this.simulateGameResult());
                    resolve();
                }, Math.random() * 30000 + 10000); // 10-40 seconds
            });

        } catch (error) {
            console.error('Error starting tournament game:', error);
            pairing.status = 'error';
        }
    }

    simulateGameResult() {
        const results = ['1-0', '0-1', '1/2-1/2'];
        return results[Math.floor(Math.random() * results.length)];
    }

    completeGame(tournamentId, pairing, result) {
        const tournament = this.activeTournaments.get(tournamentId);
        if (!tournament) return;

        pairing.status = 'completed';
        pairing.result = result;
        
        // Update standings
        this.updateStandings(tournament, pairing, result);
        
        // Update display
        this.updateTournamentDisplay(tournamentId);
    }

    updateStandings(tournament, pairing, result) {
        const whiteStanding = tournament.standings.find(s => s.participant === pairing.white);
        const blackStanding = tournament.standings.find(s => s.participant === pairing.black);

        if (!whiteStanding || !blackStanding) return;

        whiteStanding.games++;
        blackStanding.games++;

        switch (result) {
            case '1-0':
                whiteStanding.wins++;
                whiteStanding.points += 1;
                blackStanding.losses++;
                break;
            case '0-1':
                blackStanding.wins++;
                blackStanding.points += 1;
                whiteStanding.losses++;
                break;
            case '1/2-1/2':
                whiteStanding.draws++;
                whiteStanding.points += 0.5;
                blackStanding.draws++;
                blackStanding.points += 0.5;
                break;
        }

        // Update ELO ratings
        this.updateEloRatings(whiteStanding, blackStanding, result);
    }

    updateEloRatings(whiteStanding, blackStanding, result) {
        const K = 32; // ELO K-factor
        const expectedWhite = 1 / (1 + Math.pow(10, (blackStanding.rating - whiteStanding.rating) / 400));
        
        let actualWhite;
        switch (result) {
            case '1-0': actualWhite = 1; break;
            case '0-1': actualWhite = 0; break;
            case '1/2-1/2': actualWhite = 0.5; break;
        }

        const newWhiteRating = whiteStanding.rating + K * (actualWhite - expectedWhite);
        const newBlackRating = blackStanding.rating + K * ((1 - actualWhite) - (1 - expectedWhite));

        whiteStanding.rating = Math.round(newWhiteRating);
        blackStanding.rating = Math.round(newBlackRating);
    }

    async completeRound(tournamentId, roundNumber) {
        const tournament = this.activeTournaments.get(tournamentId);
        if (!tournament) return;

        Utils.showToast(`✅ Rodada ${roundNumber} concluída!`, 'success');

        // Check if tournament is complete
        if (roundNumber >= tournament.pairings.length) {
            await this.completeTournament(tournamentId);
        } else {
            // Wait for round interval, then start next round
            setTimeout(() => {
                this.startRound(tournamentId, roundNumber + 1);
            }, tournament.schedule.roundInterval * 60000);
        }
    }

    async completeTournament(tournamentId) {
        const tournament = this.activeTournaments.get(tournamentId);
        if (!tournament) return;

        tournament.status = 'completed';
        tournament.endTime = new Date();

        // Sort final standings
        tournament.standings.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
            return b.rating - a.rating;
        });

        // Move to history
        this.tournamentHistory.push(tournament);
        
        Utils.showToast(`🏆 Torneio "${tournament.name}" concluído! Vencedor: ${tournament.standings[0].participant}`, 'success');
        
        // Show final results
        this.showTournamentResults(tournamentId);
    }

    displayTournament(tournamentId) {
        const tournament = this.activeTournaments.get(tournamentId) || 
                          this.tournamentHistory.find(t => t.id === tournamentId);
        
        if (!tournament) return;

        const container = document.getElementById('tournament-display');
        if (!container) return;

        container.innerHTML = `
            <div class="tournament-header">
                <h2>🏆 ${tournament.name}</h2>
                <div class="tournament-meta">
                    <span class="tournament-type">${this.tournamentTypes[tournament.type]}</span>
                    <span class="tournament-status status-${tournament.status}">${this.getStatusText(tournament.status)}</span>
                </div>
            </div>

            <div class="tournament-tabs">
                <button class="tab-btn active" data-tab="standings">Classificação</button>
                <button class="tab-btn" data-tab="pairings">Confrontos</button>
                <button class="tab-btn" data-tab="games">Partidas</button>
                <button class="tab-btn" data-tab="statistics">Estatísticas</button>
            </div>

            <div class="tournament-content">
                <div id="standings-tab" class="tab-panel active">
                    ${this.renderStandings(tournament)}
                </div>
                <div id="pairings-tab" class="tab-panel">
                    ${this.renderPairings(tournament)}
                </div>
                <div id="games-tab" class="tab-panel">
                    ${this.renderGames(tournament)}
                </div>
                <div id="statistics-tab" class="tab-panel">
                    ${this.renderStatistics(tournament)}
                </div>
            </div>
        `;

        this.setupTournamentTabSwitching(container);
    }

    renderStandings(tournament) {
        return `
            <div class="standings-table">
                <table>
                    <thead>
                        <tr>
                            <th>Pos</th>
                            <th>Participante</th>
                            <th>Pontos</th>
                            <th>Partidas</th>
                            <th>V</th>
                            <th>E</th>
                            <th>D</th>
                            <th>Rating</th>
                            <th>Performance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tournament.standings.map((standing, index) => `
                            <tr class="${index < 3 ? 'podium' : ''}">
                                <td class="position">
                                    ${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                </td>
                                <td class="participant">${standing.participant}</td>
                                <td class="points">${standing.points}</td>
                                <td class="games">${standing.games}</td>
                                <td class="wins">${standing.wins}</td>
                                <td class="draws">${standing.draws}</td>
                                <td class="losses">${standing.losses}</td>
                                <td class="rating">${standing.rating}</td>
                                <td class="performance">${standing.performance.toFixed(1)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderPairings(tournament) {
        return `
            <div class="pairings-display">
                ${tournament.pairings.map((round, roundIndex) => `
                    <div class="round-section">
                        <h3>Rodada ${roundIndex + 1}</h3>
                        <div class="pairings-grid">
                            ${round.map(pairing => `
                                <div class="pairing-item status-${pairing.status}">
                                    <div class="pairing-players">
                                        <span class="white-player">⚪ ${pairing.white}</span>
                                        <span class="vs">vs</span>
                                        <span class="black-player">⚫ ${pairing.black}</span>
                                    </div>
                                    <div class="pairing-result">
                                        ${pairing.result || this.getStatusText(pairing.status)}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderGames(tournament) {
        const allGames = tournament.pairings.flat().filter(p => p.status === 'completed');
        
        return `
            <div class="games-list">
                <div class="games-header">
                    <h3>Partidas Concluídas (${allGames.length})</h3>
                </div>
                <div class="games-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Rodada</th>
                                <th>Brancas</th>
                                <th>Pretas</th>
                                <th>Resultado</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allGames.map(game => `
                                <tr>
                                    <td>${game.round}</td>
                                    <td>⚪ ${game.white}</td>
                                    <td>⚫ ${game.black}</td>
                                    <td>
                                        <span class="result-badge" style="background-color: ${Utils.getResultColor(game.result)}">
                                            ${Utils.getResultText(game.result)}
                                        </span>
                                    </td>
                                    <td>
                                        <button class="btn btn-sm" onclick="analysis.loadGame('${game.gameId}')">
                                            🔍 Analisar
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderStatistics(tournament) {
        const stats = this.calculateTournamentStatistics(tournament);
        
        return `
            <div class="tournament-statistics">
                <div class="stats-grid">
                    <div class="stat-card">
                        <h4>📊 Estatísticas Gerais</h4>
                        <div class="stat-items">
                            <div class="stat-item">
                                <span class="label">Total de partidas:</span>
                                <span class="value">${stats.totalGames}</span>
                            </div>
                            <div class="stat-item">
                                <span class="label">Duração:</span>
                                <span class="value">${stats.duration}</span>
                            </div>
                            <div class="stat-item">
                                <span class="label">Vitórias das brancas:</span>
                                <span class="value">${stats.whiteWins} (${stats.whiteWinPercentage}%)</span>
                            </div>
                            <div class="stat-item">
                                <span class="label">Empates:</span>
                                <span class="value">${stats.draws} (${stats.drawPercentage}%)</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <h4>🏆 Top Performers</h4>
                        <div class="top-performers">
                            ${tournament.standings.slice(0, 3).map((standing, index) => `
                                <div class="performer">
                                    <span class="position">${index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>
                                    <span class="name">${standing.participant}</span>
                                    <span class="points">${standing.points} pts</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    calculateTournamentStatistics(tournament) {
        const completedGames = tournament.pairings.flat().filter(p => p.status === 'completed');
        const whiteWins = completedGames.filter(g => g.result === '1-0').length;
        const blackWins = completedGames.filter(g => g.result === '0-1').length;
        const draws = completedGames.filter(g => g.result === '1/2-1/2').length;
        
        const duration = tournament.endTime && tournament.actualStartTime ? 
            Math.floor((tournament.endTime - tournament.actualStartTime) / (1000 * 60)) : 0;

        return {
            totalGames: completedGames.length,
            whiteWins,
            blackWins,
            draws,
            whiteWinPercentage: completedGames.length > 0 ? Math.round((whiteWins / completedGames.length) * 100) : 0,
            drawPercentage: completedGames.length > 0 ? Math.round((draws / completedGames.length) * 100) : 0,
            duration: duration > 0 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : 'Em andamento'
        };
    }

    getStatusText(status) {
        const statusTexts = {
            'created': '🔄 Criado',
            'running': '▶️ Em andamento',
            'paused': '⏸️ Pausado',
            'completed': '✅ Concluído',
            'cancelled': '❌ Cancelado',
            'pending': '⏳ Pendente',
            'playing': '🎮 Jogando',
            'error': '❌ Erro'
        };
        return statusTexts[status] || status;
    }

    setupTournamentTabSwitching(container) {
        const tabBtns = container.querySelectorAll('.tab-btn');
        const tabPanels = container.querySelectorAll('.tab-panel');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                tabPanels.forEach(panel => panel.classList.remove('active'));
                container.querySelector(`#${tabId}-tab`).classList.add('active');
            });
        });
    }

    updateTournamentDisplay(tournamentId) {
        // Refresh the current tournament display
        this.displayTournament(tournamentId);
    }

    async loadTournamentHistory() {
        // Load tournament history from storage/API
        try {
            const history = Utils.loadFromStorage('tournamentHistory', []);
            this.tournamentHistory = history;
        } catch (error) {
            console.error('Error loading tournament history:', error);
        }
    }

    async updateAvailableModels() {
        try {
            const models = await api.getAvailableModels();
            // Update model lists in UI
        } catch (error) {
            console.error('Error updating available models:', error);
        }
    }

    destroy() {
        // Cleanup active tournaments
        this.activeTournaments.clear();
        
        // Save tournament history
        Utils.saveToStorage('tournamentHistory', this.tournamentHistory);
    }
}

// ELO Calculator utility class
class EloCalculator {
    constructor(kFactor = 32) {
        this.kFactor = kFactor;
    }

    calculateExpectedScore(ratingA, ratingB) {
        return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    }

    updateRating(currentRating, expectedScore, actualScore) {
        return currentRating + this.kFactor * (actualScore - expectedScore);
    }

    updateRatings(playerA, playerB, result) {
        const expectedA = this.calculateExpectedScore(playerA.rating, playerB.rating);
        const expectedB = 1 - expectedA;

        let actualA, actualB;
        switch (result) {
            case '1-0': // A wins
                actualA = 1;
                actualB = 0;
                break;
            case '0-1': // B wins
                actualA = 0;
                actualB = 1;
                break;
            case '1/2-1/2': // Draw
                actualA = 0.5;
                actualB = 0.5;
                break;
        }

        return {
            playerA: {
                ...playerA,
                rating: Math.round(this.updateRating(playerA.rating, expectedA, actualA))
            },
            playerB: {
                ...playerB,
                rating: Math.round(this.updateRating(playerB.rating, expectedB, actualB))
            }
        };
    }
}

// Create global instance
window.tournamentSystem = new AdvancedTournamentSystem();