from fastapi import APIRouter, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import os
import asyncio
import json
import time
import uuid
from datetime import datetime
import sqlite3
import threading
from enum import Enum
from pathlib import Path
from fastapi_backend.pgn_utils import parse_pgn
from fastapi_backend.models_manager import ModelManager
from fastapi_backend.analysis import GameAnalyzer
from fastapi_backend.lichess_api import LichessAPI
from fastapi_backend.pgn_importer import PGNImporter
from fastapi_backend.human_game_utils import HumanGameUtils
from fastapi_backend.game_engine import GameEngine

router = APIRouter(prefix="/api/arena", tags=["arena"])

# --- Modelos de dados melhorados ---


class GameStatus(str, Enum):
    WAITING = "waiting"
    PLAYING = "playing"
    FINISHED = "finished"
    ERROR = "error"


class BattleRequest(BaseModel):
    white_model: str = Field(...,
                             description="Modelo que jogará com as peças brancas")
    black_model: str = Field(...,
                             description="Modelo que jogará com as peças pretas")
    opening: str = Field("1. e4", description="Abertura a ser usada")
    num_games: int = Field(1, ge=1, le=20, description="Número de partidas")
    realtime_speed: float = Field(
        1.0, ge=0.1, le=10.0, description="Velocidade em segundos por lance")


class HumanGameRequest(BaseModel):
    opponent_model: str = Field(..., description="Modelo oponente")
    player_color: str = Field(
        "white", pattern="^(white|black)$", description="Cor do jogador humano")
    difficulty: str = Field("advanced", description="Nível de dificuldade")
    time_control: str = Field("blitz", description="Controle de tempo")


class MoveRequest(BaseModel):
    game_id: str = Field(..., description="ID da partida")
    move: str = Field(..., description="Lance em notação algébrica")


class GameResponse(BaseModel):
    id: str
    status: GameStatus
    white_player: str
    black_player: str
    current_fen: str
    move_history: List[str]
    result: Optional[str] = None
    created_at: datetime
    updated_at: datetime

# --- Sistema de modelos disponíveis ---


AVAILABLE_MODELS = {
    "GPT-4o": {
        "active": True,
        "rating": 1850,
        "provider": "openai",
        "model_id": "gpt-4o",
        "description": "Modelo mais avançado da OpenAI"
    },
    "GPT-4-Turbo": {
        "active": True,
        "rating": 1780,
        "provider": "openai",
        "model_id": "gpt-4-turbo",
        "description": "Versão otimizada do GPT-4"
    },
    "Gemini-Pro": {
        "active": True,
        "rating": 1750,
        "provider": "google",
        "model_id": "gemini-pro",
        "description": "Modelo avançado da Google"
    },
    "Claude-3.5-Sonnet": {
        "active": True,
        "rating": 1820,
        "provider": "anthropic",
        "model_id": "claude-3-5-sonnet-20241022",
        "description": "Modelo estratégico da Anthropic"
    },
    "Deepseek-R1": {
        "active": True,
        "rating": 1680,
        "provider": "deepseek",
        "model_id": "deepseek-chat",
        "description": "Modelo experimental da DeepSeek"
    }
}

# --- Gerenciamento de estado em memória ---


class GameState:
    def __init__(self, game_id: str, white_player: str, black_player: str):
        self.id = game_id
        self.status = GameStatus.WAITING
        self.white_player = white_player
        self.black_player = black_player
        self.current_fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        self.move_history = []
        self.result = None
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
        self.current_turn = "white"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "status": self.status,
            "white_player": self.white_player,
            "black_player": self.black_player,
            "current_fen": self.current_fen,
            "move_history": self.move_history,
            "result": self.result,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "current_turn": self.current_turn
        }


class BattleState:
    def __init__(self, battle_id: str, config: BattleRequest):
        self.id = battle_id
        self.config = config
        self.status = GameStatus.WAITING
        self.current_game = 0
        self.games = []
        self.results = []
        self.created_at = datetime.now()
        self.updated_at = datetime.now()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "status": self.status,
            "white_model": self.config.white_model,
            "black_model": self.config.black_model,
            "current_game": self.current_game,
            "total_games": self.config.num_games,
            "results": self.results,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }


# Armazenamento em memória
active_games: Dict[str, GameState] = {}
active_battles: Dict[str, BattleState] = {}
connected_clients: List[WebSocket] = []

# Locks para thread safety
games_lock = threading.Lock()
battles_lock = threading.Lock()

# --- WebSocket para atualizações em tempo real ---


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    try:
        while True:
            # Manter conexão viva
            await websocket.receive_text()
    except WebSocketDisconnect:
        connected_clients.remove(websocket)


async def broadcast_update(data: Dict[str, Any]):
    """Envia atualizações para todos os clientes conectados"""
    if connected_clients:
        message = json.dumps(data)
        for client in connected_clients.copy():
            try:
                await client.send_text(message)
            except:
                connected_clients.remove(client)

# --- Endpoints principais ---


@router.get("/models")
async def get_available_models():
    """Lista todos os modelos disponíveis"""
    return {"models": AVAILABLE_MODELS}


@router.get("/models/active")
async def get_active_models():
    """Lista apenas modelos ativos"""
    active_models = {
        name: config for name, config in AVAILABLE_MODELS.items()
        if config["active"]
    }
    return {"models": active_models}


@router.post("/battle")
async def start_battle(request: BattleRequest):
    """Inicia uma batalha entre dois modelos"""

    # Validações
    if request.white_model == request.black_model:
        raise HTTPException(
            status_code=400,
            detail="Os modelos devem ser diferentes"
        )

    if request.white_model not in AVAILABLE_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"Modelo '{request.white_model}' não disponível"
        )

    if request.black_model not in AVAILABLE_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"Modelo '{request.black_model}' não disponível"
        )

    # Criar nova batalha
    battle_id = str(uuid.uuid4())
    battle = BattleState(battle_id, request)

    with battles_lock:
        active_battles[battle_id] = battle

    # Iniciar processamento em background
    asyncio.create_task(process_battle(battle))

    return {
        "battle_id": battle_id,
        "status": "started",
        "message": f"Batalha iniciada: {request.white_model} vs {request.black_model}"
    }


@router.get("/battle/{battle_id}/status")
async def get_battle_status(battle_id: str):
    """Obtém o status de uma batalha específica"""
    with battles_lock:
        battle = active_battles.get(battle_id)

    if not battle:
        raise HTTPException(status_code=404, detail="Batalha não encontrada")

    return battle.to_dict()


@router.get("/battles/active")
async def get_active_battles():
    """Lista todas as batalhas ativas"""
    with battles_lock:
        battles = [battle.to_dict() for battle in active_battles.values()]

    return {"battles": battles}


@router.post("/games/human")
async def create_human_game(request: HumanGameRequest):
    """Cria uma nova partida humano vs IA"""

    if request.opponent_model not in AVAILABLE_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"Modelo '{request.opponent_model}' não disponível"
        )

    game_id = str(uuid.uuid4())

    # Determinar quem é branco e preto
    if request.player_color == "white":
        white_player = "Human"
        black_player = request.opponent_model
    else:
        white_player = request.opponent_model
        black_player = "Human"

    game = GameState(game_id, white_player, black_player)
    game.status = GameStatus.PLAYING

    with games_lock:
        active_games[game_id] = game

    return {
        "success": True,
        "game": game.to_dict(),
        "message": "Partida criada com sucesso"
    }


@router.post("/games/{game_id}/move")
async def make_human_move(game_id: str, request: MoveRequest):
    """Processa um lance do jogador humano"""

    with games_lock:
        game = active_games.get(game_id)

    if not game:
        raise HTTPException(status_code=404, detail="Partida não encontrada")

    if game.status != GameStatus.PLAYING:
        raise HTTPException(
            status_code=400, detail="Partida não está em andamento")

    # Aqui você validaria o lance com chess.js ou similar
    # Por simplicidade, vamos aceitar qualquer lance

    # Adicionar lance ao histórico
    game.move_history.append(request.move)
    game.updated_at = datetime.now()

    # Simular mudança de turno
    game.current_turn = "black" if game.current_turn == "white" else "white"

    # Broadcast update
    await broadcast_update({
        "type": "move_made",
        "game_id": game_id,
        "move": request.move,
        "game_state": game.to_dict()
    })

    return {
        "success": True,
        "move": request.move,
        "game_state": game.to_dict()
    }


@router.get("/games/{game_id}")
async def get_game_state(game_id: str):
    """Obtém o estado atual de uma partida"""

    with games_lock:
        game = active_games.get(game_id)

    if not game:
        raise HTTPException(status_code=404, detail="Partida não encontrada")

    return game.to_dict()


@router.get("/games/active")
async def get_active_games():
    """Lista todas as partidas ativas"""

    with games_lock:
        games = [game.to_dict() for game in active_games.values()]

    return {"games": games}


@router.delete("/games/{game_id}")
async def end_game(game_id: str):
    """Finaliza uma partida"""

    with games_lock:
        if game_id in active_games:
            game = active_games[game_id]
            game.status = GameStatus.FINISHED
            del active_games[game_id]

            # Salvar no banco de dados
            save_game_to_db(game)

            return {"success": True, "message": "Partida finalizada"}

    raise HTTPException(status_code=404, detail="Partida não encontrada")


@router.get("/stats")
async def get_arena_stats():
    """Obtém estatísticas gerais da arena"""

    with games_lock:
        active_games_count = len(active_games)

    with battles_lock:
        active_battles_count = len(active_battles)

    # Estatísticas do banco de dados
    try:
        total_games = get_total_games_from_db()
        model_stats = get_model_stats_from_db()
    except Exception as e:
        total_games = 0
        model_stats = {}

    return {
        "active_games": active_games_count,
        "active_battles": active_battles_count,
        "total_games_played": total_games,
        "available_models": len(AVAILABLE_MODELS),
        "model_performance": model_stats
    }

# --- Funções auxiliares ---


game_engine = GameEngine()


async def process_battle(battle: BattleState):
    """Processa uma batalha em background usando a engine real"""
    battle.status = GameStatus.PLAYING
    try:
        for game_num in range(battle.config.num_games):
            battle.current_game = game_num + 1
            # Rodar partida real usando GameEngine
            game_result = await simulate_game(
                battle.config.white_model,
                battle.config.black_model,
                battle.config.opening,
                battle.config.realtime_speed
            )
            battle.results.append(game_result)
            battle.updated_at = datetime.now()
            # Broadcast update
            await broadcast_update({
                "type": "battle_update",
                "battle_id": battle.id,
                "battle_state": battle.to_dict(),
                "current_board": game_result.get("fen"),
                "current_moves": game_result.get("move_history"),
            })
            await asyncio.sleep(1)
        battle.status = GameStatus.FINISHED
        await broadcast_update({
            "type": "battle_finished",
            "battle_id": battle.id,
            "battle_state": battle.to_dict()
        })
    except Exception as e:
        battle.status = GameStatus.ERROR
        await broadcast_update({
            "type": "battle_error",
            "battle_id": battle.id,
            "error": str(e)
        })


async def simulate_game(white_model: str, black_model: str, opening: str, speed: float):
    """Executa uma partida real entre dois modelos usando GameEngine"""
    # Chama a engine real (sincronamente, pois não há await)
    result = game_engine.play_game(white_model, black_model, opening)
    # Adiciona delay para simular tempo real
    await asyncio.sleep(speed)
    return {
        "white": white_model,
        "black": black_model,
        "result": result["result"],
        "moves": result["moves"],
        "fen": result["fen"],
        "move_history": result["pgn"].split(),
        "opening": opening
    }


def save_game_to_db(game: GameState):
    """Salva uma partida no banco de dados"""

    DB_PATH = os.path.abspath(os.path.join(
        os.path.dirname(__file__), '..', 'chess_arena.db'))

    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()

            # Criar tabela se não existir
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS games (
                    id TEXT PRIMARY KEY,
                    white TEXT NOT NULL,
                    black TEXT NOT NULL,
                    result TEXT,
                    pgn TEXT,
                    moves INTEGER,
                    opening TEXT,
                    date TEXT,
                    analysis_data TEXT
                )
            """)

            # Inserir partida
            cursor.execute("""
                INSERT OR REPLACE INTO games 
                (id, white, black, result, pgn, moves, opening, date, analysis_data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                game.id,
                game.white_player,
                game.black_player,
                game.result,
                json.dumps(game.move_history),  # PGN simplificado
                len(game.move_history),
                "",  # Abertura
                game.created_at.isoformat(),
                json.dumps({})  # analysis_data
            ))

            conn.commit()

    except Exception as e:
        print(f"Erro ao salvar partida no banco: {e}")


def get_total_games_from_db() -> int:
    """Obtém o total de partidas do banco"""

    DB_PATH = os.path.abspath(os.path.join(
        os.path.dirname(__file__), '..', 'chess_arena.db'))

    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM games")
            return cursor.fetchone()[0]
    except:
        return 0


def get_model_stats_from_db() -> Dict[str, Dict[str, int]]:
    """Obtém estatísticas dos modelos do banco"""

    DB_PATH = os.path.abspath(os.path.join(
        os.path.dirname(__file__), '..', 'chess_arena.db'))

    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT white, black, result 
                FROM games 
                WHERE result IS NOT NULL
            """)

            stats = {}

            for white, black, result in cursor.fetchall():
                # Inicializar se não existir
                if white not in stats:
                    stats[white] = {"wins": 0, "draws": 0, "losses": 0}
                if black not in stats:
                    stats[black] = {"wins": 0, "draws": 0, "losses": 0}

                # Atualizar estatísticas
                if result == "1-0":
                    stats[white]["wins"] += 1
                    stats[black]["losses"] += 1
                elif result == "0-1":
                    stats[black]["wins"] += 1
                    stats[white]["losses"] += 1
                else:  # Empate
                    stats[white]["draws"] += 1
                    stats[black]["draws"] += 1

            return stats

    except Exception as e:
        print(f"Erro ao obter estatísticas: {e}")
        return {}

# --- Endpoints para debug e desenvolvimento ---


@router.get("/debug/clear-all")
async def clear_all_data():
    """Limpa todos os dados em memória (apenas para desenvolvimento)"""

    global active_games, active_battles

    with games_lock:
        active_games.clear()

    with battles_lock:
        active_battles.clear()

    return {"message": "Todos os dados em memória foram limpos"}


@router.get("/debug/create-sample-data")
async def create_sample_data():
    """Cria dados de exemplo (apenas para desenvolvimento)"""

    # Criar algumas partidas de exemplo
    sample_games = [
        {"white": "GPT-4o", "black": "Gemini-Pro", "result": "1-0"},
        {"white": "Claude-3.5-Sonnet", "black": "Deepseek-R1", "result": "0-1"},
        {"white": "GPT-4-Turbo", "black": "GPT-4o", "result": "1/2-1/2"},
    ]

    for i, game_data in enumerate(sample_games):
        game_id = f"sample_{i+1}"
        game = GameState(game_id, game_data["white"], game_data["black"])
        game.result = game_data["result"]
        game.status = GameStatus.FINISHED
        game.move_history = ["e4", "e5", "Nf3", "Nc6"]

        save_game_to_db(game)

    return {"message": f"Criados {len(sample_games)} jogos de exemplo"}


@router.get("/matchups")
async def list_matchups():
    """
    Lista todos os confrontos disponíveis (pastas de PGN na pasta games).
    """
    base_dir = Path(__file__).resolve().parent.parent / "games"
    pgn_dirs = [d for d in base_dir.iterdir() if d.is_dir()]
    matchups = [d.name for d in pgn_dirs]
    return {"matchups": matchups}


@router.get("/matchups/{matchup}/games")
async def list_games_for_matchup(matchup: str):
    """
    Lista todos os arquivos .pgn de um confronto na pasta games.
    """
    base_dir = Path(__file__).resolve().parent.parent / "games"
    matchup_dir = base_dir / matchup
    if not matchup_dir.exists() or not matchup_dir.is_dir():
        return {"games": []}
    games = [f.name for f in matchup_dir.glob("*.pgn")]
    return {"games": games}


@router.get("/matchups/{matchup}/games/{game_file}")
async def get_pgn_for_game(matchup: str, game_file: str):
    """
    Retorna o conteúdo do PGN de um jogo específico na pasta games.
    """
    base_dir = Path(__file__).resolve().parent.parent / "games"
    game_path = base_dir / matchup / game_file
    if not game_path.exists():
        return {"error": "Arquivo não encontrado"}
    with open(game_path, "r", encoding="utf-8") as f:
        pgn_text = f.read()
    parsed = parse_pgn(pgn_text)
    return parsed


@router.get("/status")
async def get_status(battle_id: Optional[str] = None):
    """Obtém o status de uma batalha, conforme o parâmetro passado."""
    if battle_id:
        with battles_lock:
            battle = active_battles.get(battle_id)
        if not battle:
            raise HTTPException(
                status_code=404, detail="Batalha não encontrada")
        return battle.to_dict()
    else:
        raise HTTPException(
            status_code=400, detail="É necessário informar battle_id")

model_manager = ModelManager()
game_analyzer = GameAnalyzer()
lichess_api = LichessAPI()
pgn_importer = PGNImporter()
human_game_utils = HumanGameUtils()
