from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel

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
    # TODO: Implementar lógica para retornar modelos disponíveis
    return {"models": ["GPT-4o", "Gemini-Pro", "Deepseek"]}


@router.post("/battle")
def start_battle(req: BattleRequest):
    # TODO: Implementar lógica para iniciar batalha individual
    return {"battle_id": "uuid", "status": "started"}


@router.post("/tournament")
def start_tournament(req: TournamentRequest):
    # TODO: Implementar lógica para iniciar torneio
    return {"tournament_id": "uuid", "status": "started"}


@router.get("/status")
def get_status(battle_id: Optional[str] = Query(None), tournament_id: Optional[str] = Query(None)):
    # TODO: Implementar lógica para retornar status da batalha/torneio
    return {
        "white": "GPT-4o",
        "black": "Gemini-Pro",
        "current_game": 2,
        "total_games": 5,
        "current_board": "FEN",
        "results": [
            {"game": 1, "white": "GPT-4o", "black": "Gemini-Pro", "result": "1-0"}
        ],
        "pgn": "...",
        "status": "playing"
    }


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
