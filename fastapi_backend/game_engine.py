"""
Engine de partidas de xadrez para o LLM Chess Arena.
Migrado de tests_streamlit/src/game_engine.py
"""

import chess
import chess.pgn
from typing import Optional, Dict, Any, List
import re
from datetime import datetime
from fastapi_backend.models_manager import ModelManager


class GameEngine:
    """Handles chess game logic and AI move generation (backend version)"""

    def __init__(self):
        self.model_manager = ModelManager()
        self.judge_model = None
        self._initialize_judge()

    def _initialize_judge(self):
        """Initialize the judge model for move validation"""
        available_models = self.model_manager.list_models()
        # Prefer Llama3-70B or Mixtral-8x7B if available
        for preferred in ["Llama3-70B", "Mixtral-8x7B"]:
            if preferred in available_models:
                self.judge_model = self.model_manager.get_model(preferred)
                return
        # Fallback to any available model
        if available_models:
            self.judge_model = self.model_manager.get_model(
                available_models[0])

    def get_ai_move(self, board: chess.Board, model_name: str, last_move: str = None, max_retries: int = 3):
        """Get a move and explanation from an AI model (stub for backend)"""
        model = self.model_manager.get_model(model_name)
        if not model:
            return None, None
        color = "white" if board.turn == chess.WHITE else "black"
        # Aqui deveria chamar o modelo LLM real, mas como stub:
        legal_moves = list(board.legal_moves)
        if legal_moves:
            return legal_moves[0], "(Stub: lance aleatório)"
        return None, None

    def _extract_move_from_response(self, resposta, board):
        match = re.search(r'My move:\s*["\']?([^\n"\']+)["\']?', resposta)
        if match:
            move_san = match.group(1).strip()
            try:
                return board.parse_san(move_san)
            except Exception:
                return None
        return None

    def _prepare_game_context(self, board: chess.Board, last_move: str = None) -> str:
        game_temp = chess.pgn.Game.from_board(board)
        history = str(game_temp)
        pattern = r".*?(?=1\.)"
        history = re.sub(pattern, "", history, flags=re.DOTALL)
        legal_moves = [board.san(move) for move in board.legal_moves]
        context = f"""
        Game History:
        {history}
        Last move played: {last_move or 'Game start'}
        Current position (FEN): {board.fen()}
        Legal moves available: {', '.join(legal_moves[:20])}{'...' if len(legal_moves) > 20 else ''}
        Find the best move for this position.
        """
        return context

    def play_game(self, white_model: str, black_model: str, opening: str = "1. e4", max_moves: int = 200) -> Dict[str, Any]:
        """Play a complete game between two models (backend version)"""
        board = chess.Board()
        game = chess.pgn.Game()
        node = game
        game.headers["White"] = white_model
        game.headers["Black"] = black_model
        game.headers["Date"] = datetime.now().strftime("%Y.%m.%d")
        game.headers["Event"] = "LLM Chess Arena"
        # Play opening move
        opening_move = opening.split()[-1]
        try:
            move = board.parse_san(opening_move)
            board.push(move)
            node = node.add_variation(move)
        except ValueError:
            move = board.parse_san("e4")
            board.push(move)
            node = node.add_variation(move)
        last_move = opening
        move_count = 0
        # Game loop
        while not board.is_game_over() and move_count < max_moves:
            current_model = black_model if board.turn == chess.BLACK else white_model
            move, explicacao = self.get_ai_move(
                board, current_model, last_move=last_move)
            if move:
                board.push(move)
                node = node.add_variation(move)
                last_move = board.san(move)
                move_count += 1
            else:
                break
        result = board.result()
        game.headers["Result"] = result
        return {
            "pgn": str(game),
            "result": result,
            "moves": move_count,
            "white": white_model,
            "black": black_model,
            "fen": board.fen(),
        }

    def start_game(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Inicia uma nova partida de xadrez com base na configuração fornecida.
        """
        # TODO: Implementar lógica real de início de partida
        return {"status": "ok", "message": "Partida iniciada."}

    def process_move(self, game_id: str, move: str) -> Dict[str, Any]:
        """
        Processa um lance em uma partida existente.
        """
        # TODO: Implementar processamento real de lance
        return {"status": "ok", "message": f"Lance {move} processado para o jogo {game_id}."}
