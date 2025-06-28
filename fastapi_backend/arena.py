from fastapi import APIRouter, HTTPException, Query, Request
from typing import List, Optional
from pydantic import BaseModel
import os
import pgn_utils
import arena_engine
import chess
import chess.pgn
import threading
import uuid
import time
from datetime import datetime
import sqlite3
import json

router = APIRouter(prefix="/api/arena", tags=["arena"])

# --- Modelos de dados ---


class BattleRequest(BaseModel):
    white_model: str
    black_model: str
    opening: str
    num_games: int
    realtime_speed: float


class TournamentRequest(BaseModel):
    models: List[str]
    games_per_pair: int


class NextMoveRequest(BaseModel):
    battle_id: str

# --- Endpoints ---


@router.get("/models")
def list_models():
    manager = ModelManager()
    available = manager.get_available_models()
    return {"models": list(available.keys())}


@router.get("/matchups")
def get_matchups():
    return {"matchups": pgn_utils.list_matchups()}


@router.get("/matchups/{matchup}/games")
def get_games_in_matchup(matchup: str):
    games = pgn_utils.list_games_in_matchup(matchup)
    if not games:
        raise HTTPException(
            status_code=404, detail="Confronto não encontrado ou sem partidas.")
    return {"games": games}


@router.get("/matchups/{matchup}/games/{game}")
def get_game_pgn(matchup: str, game: str):
    pgn_text = pgn_utils.read_pgn_file(matchup, game)
    if not pgn_text:
        raise HTTPException(status_code=404, detail="Partida não encontrada.")
    parsed = pgn_utils.parse_pgn(pgn_text)
    return parsed


@router.post("/battle")
def start_battle(req: BattleRequest):
    battle_id = arena_engine.start_battle(
        req.white_model, req.black_model, req.opening, req.num_games, req.realtime_speed
    )
    return {"battle_id": battle_id, "status": "started"}


@router.post("/tournament")
def start_tournament(req: TournamentRequest):
    tournament_id = arena_engine.start_tournament(
        req.models, req.games_per_pair)
    return {"tournament_id": tournament_id, "status": "started"}


@router.get("/status")
def get_status(battle_id: Optional[str] = Query(None), tournament_id: Optional[str] = Query(None)):
    if battle_id:
        status = arena_engine.get_battle_status(battle_id)
        if not status:
            raise HTTPException(
                status_code=404, detail="Batalha não encontrada")
        return status
    if tournament_id:
        status = arena_engine.get_tournament_status(tournament_id)
        if not status:
            raise HTTPException(
                status_code=404, detail="Torneio não encontrado")
        return status
    return {"status": "not_found"}


@router.post("/next_move")
def next_move(req: NextMoveRequest):
    # TODO: Implementar lógica para jogar próximo lance em tempo real
    return {
        "move": "e4",
        "description": "GPT-4o joga e4, controlando o centro.",
        "current_board": "FEN",
        "pgn": "...",
        "status": "playing"
    }


@router.get("/saved_games")
def list_saved_games():
    # TODO: Implementar lógica para listar partidas salvas
    return [
        {"id": "uuid", "white": "GPT-4o", "black": "Gemini-Pro", "date": "..."}
    ]


@router.get("/game/{game_id}")
def get_game(game_id: str):
    # TODO: Implementar lógica para retornar dados de uma partida salva
    return {
        "pgn": "...",
        "moves": [
            {"move": "e4", "description": "..."}
        ]
    }


@router.get("/models/static")
def list_models_static():
    return {"models": [
        "GPT-4o",
        "GPT-4-Turbo",
        "Gemini-Pro",
        "Claude-3.5-Sonnet",
        "Deepseek-R1"
    ]}


# Estado em memória para jogos humanos
_human_games = {}
_human_games_lock = threading.Lock()


class HumanGame:
    def __init__(self, opponent_model, player_color, difficulty, time_control):
        self.id = str(uuid.uuid4())
        self.opponent_model = opponent_model
        self.player_color = player_color
        self.difficulty = difficulty
        self.time_control = time_control
        self.board = chess.Board()
        self.move_history = []
        self.pgn_game = chess.pgn.Game()
        self.current_node = self.pgn_game
        self.status = "playing"
        self.result = None
        self.fen = self.board.fen()
        self.created_at = datetime.now().isoformat()

    def to_dict(self):
        return {
            "id": self.id,
            "opponent_model": self.opponent_model,
            "player_color": self.player_color,
            "difficulty": self.difficulty,
            "time_control": self.time_control,
            "fen": self.board.fen(),
            "move_history": self.move_history,
            "status": self.status,
            "result": self.result,
            "created_at": self.created_at,
            "pgn": str(self.pgn_game)
        }

    def save_to_db(self):
        if not self.status == "finished":
            return
        moves = len(self.move_history)
        save_game_to_db({
            'white': "Humano" if self.player_color == "white" else self.opponent_model,
            'black': self.opponent_model if self.player_color == "white" else "Humano",
            'result': self.result,
            'pgn': str(self.pgn_game),
            'moves': moves,
            'opening': '',
            'date': self.created_at,
            'tournament_id': None,
            'analysis': {}
        })


@router.post("/games/human")
def start_human_game(req: Request):
    data = req.json() if hasattr(req, 'json') else req
    opponent_model = data.get("opponentModel")
    player_color = data.get("playerColor")
    difficulty = data.get("difficulty")
    time_control = data.get("timeControl")
    game = HumanGame(opponent_model, player_color, difficulty, time_control)
    with _human_games_lock:
        _human_games[game.id] = game
    return {"success": True, "game": game.to_dict()}


@router.post("/games/human/move")
def human_move(req: Request):
    data = req.json() if hasattr(req, 'json') else req
    game_id = data.get("gameId")
    move_san = data.get("move")
    with _human_games_lock:
        game = _human_games.get(game_id)
    if not game or game.status != "playing":
        return {"success": False, "error": "Jogo não encontrado ou já finalizado."}
    try:
        move = game.board.parse_san(move_san)
        from_square = move.from_square
        to_square = move.to_square
        game.board.push(move)
        node = game.current_node.add_variation(move)
        game.current_node = node
        game.move_history.append({
            "move": move_san,
            "by": "human",
            "from_square": from_square,
            "to_square": to_square
        })
        game.fen = game.board.fen()
        if game.board.is_game_over():
            game.status = "finished"
            game.result = game.board.result()
        game.save_to_db()
        return {"success": True, "game": game.to_dict()}
    except Exception as e:
        return {"success": False, "error": f"Lance inválido: {e}"}


@router.post("/games/human/ai")
def ai_move(req: Request):
    data = req.json() if hasattr(req, 'json') else req
    game_id = data.get("gameId")
    with _human_games_lock:
        game = _human_games.get(game_id)
    if not game or game.status != "playing":
        return {"success": False, "error": "Jogo não encontrado ou já finalizado."}
    # Simulação: IA joga lance aleatório
    legal_moves = list(game.board.legal_moves)
    if not legal_moves:
        game.status = "finished"
        game.result = game.board.result()
        game.save_to_db()
        return {"success": True, "game": game.to_dict()}
    move = legal_moves[0]
    move_san = game.board.san(move)
    from_square = move.from_square
    to_square = move.to_square
    game.board.push(move)
    node = game.current_node.add_variation(move)
    node.comment = "Lance da IA (mock)"
    game.current_node = node
    game.move_history.append({
        "move": move_san,
        "by": "llm",
        "from_square": from_square,
        "to_square": to_square,
        "explanation": "Lance da IA (mock)"
    })
    game.fen = game.board.fen()
    if game.board.is_game_over():
        game.status = "finished"
        game.result = game.board.result()
    game.save_to_db()
    return {"success": True, "game": game.to_dict()}


@router.post("/games/human/hint")
def human_hint(req: Request):
    data = req.json() if hasattr(req, 'json') else req
    game_id = data.get("gameId")
    with _human_games_lock:
        game = _human_games.get(game_id)
    if not game or game.status != "playing":
        return {"success": False, "error": "Jogo não encontrado ou já finalizado."}
    # Simulação: retorna primeiro lance legal como dica
    legal_moves = list(game.board.legal_moves)
    if not legal_moves:
        return {"success": False, "error": "Sem lances disponíveis."}
    move = legal_moves[0]
    move_san = game.board.san(move)
    return {"success": True, "hint": move_san}


@router.post("/games/human/undo")
def human_undo(req: Request):
    data = req.json() if hasattr(req, 'json') else req
    game_id = data.get("gameId")
    with _human_games_lock:
        game = _human_games.get(game_id)
    if not game or len(game.board.move_stack) == 0:
        return {"success": False, "error": "Nada para desfazer."}
    game.board.pop()
    if game.move_history:
        game.move_history.pop()
    # Atualiza PGN
    # (Simples: reinicializa PGN e refaz todos os lances)
    game.pgn_game = chess.pgn.Game()
    node = game.pgn_game
    for m in game.board.move_stack:
        node = node.add_variation(m)
    game.current_node = node
    game.fen = game.board.fen()
    game.status = "playing"
    game.result = None
    game.save_to_db()
    return {"success": True, "game": game.to_dict()}


@router.post("/games/human/resign")
def human_resign(req: Request):
    data = req.json() if hasattr(req, 'json') else req
    game_id = data.get("gameId")
    with _human_games_lock:
        game = _human_games.get(game_id)
    if not game:
        return {"success": False, "error": "Jogo não encontrado."}
    game.status = "finished"
    game.result = "0-1" if game.player_color == "white" else "1-0"
    game.save_to_db()
    return {"success": True, "game": game.to_dict()}


@router.get("/games/human/status")
def human_game_status(game_id: str):
    with _human_games_lock:
        game = _human_games.get(game_id)
    if not game:
        return {"success": False, "error": "Jogo não encontrado."}
    return {"success": True, "game": game.to_dict()}


def save_game_to_db(game_data):
    DB_PATH = os.path.abspath(os.path.join(os.path.dirname(
        __file__), "..", "test_streamlit", "llm_chess_arena", "chess_arena.db"))
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO games (white, black, result, pgn, moves, opening, date, tournament_id, analysis_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            game_data['white'],
            game_data['black'],
            game_data['result'],
            game_data['pgn'],
            game_data.get('moves', 0),
            game_data.get('opening', ''),
            game_data.get('date', game_data.get('created_at', '')),
            game_data.get('tournament_id'),
            json.dumps(game_data.get('analysis', {}))
        ))
        conn.commit()
