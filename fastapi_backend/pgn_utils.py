import os
import chess.pgn
from typing import List, Dict, Optional
from io import StringIO

# Pastas de confrontos (ajuste conforme necessário)
PGN_FOLDERS = [
    "Gemini-Pro vs GPT-4o",
    "gpt-4 vs Deepseek",
    "GPT-4o vs Gemini-Pro"
]

PGN_BASE_PATH = os.path.abspath(os.path.join(
    os.path.dirname(__file__), "..", "games"))


def list_matchups() -> List[str]:
    """Lista os confrontos disponíveis (pastas de PGN na pasta games)."""
    return [folder for folder in os.listdir(PGN_BASE_PATH) if os.path.isdir(os.path.join(PGN_BASE_PATH, folder))]


def list_games_in_matchup(matchup: str) -> List[str]:
    """Lista os arquivos .pgn em um confronto."""
    folder_path = os.path.join(PGN_BASE_PATH, matchup)
    if not os.path.isdir(folder_path):
        return []
    return [f for f in os.listdir(folder_path) if f.endswith('.pgn')]


def read_pgn_file(matchup: str, game_file: str) -> Optional[str]:
    """Lê o conteúdo de um arquivo PGN."""
    file_path = os.path.join(PGN_BASE_PATH, matchup, game_file)
    if not os.path.isfile(file_path):
        return None
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except UnicodeDecodeError:
        with open(file_path, 'r', encoding='latin-1') as f:
            return f.read()


def parse_pgn(pgn_text: str) -> Dict:
    """Extrai cabeçalhos, lances e descrições de um PGN."""
    pgn_io = StringIO(pgn_text)
    game = chess.pgn.read_game(pgn_io)
    if not game:
        return {}
    headers = dict(game.headers)
    moves = []
    node = game
    while node.variations:
        next_node = node.variation(0)
        move_san = node.board().san(next_node.move)
        comment = next_node.comment if next_node.comment else ""
        moves.append({"move": move_san, "description": comment})
        node = next_node
    return {"headers": headers, "moves": moves, "pgn": pgn_text}
