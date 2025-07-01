import chess
import chess.pgn
import threading
import time
import uuid
from datetime import datetime
import sqlite3
import json
import os

DB_PATH = os.path.abspath(os.path.join(
    os.path.dirname(__file__), '..', 'chess_arena.db'))


def save_game_to_db(game_data):
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
            game_data.get('date', datetime.now().isoformat()),
            game_data.get('tournament_id'),
            json.dumps(game_data.get('analysis', {}))
        ))
        conn.commit()


# Estado em memória para batalhas e torneios
_battles = {}
_battles_lock = threading.Lock()
_tournaments = {}
_tournaments_lock = threading.Lock()


class ArenaBattle:
    def __init__(self, white, black, opening, num_games, realtime_speed, tournament_id=None):
        self.id = str(uuid.uuid4())
        self.white = white
        self.black = black
        self.opening = opening
        self.num_games = num_games
        self.realtime_speed = realtime_speed
        self.current_game = 0
        self.total_games = num_games
        self.results = []
        self.status = "playing"
        self.thread = threading.Thread(target=self.run_battle)
        self.thread.daemon = True
        self._stop = False
        self.pgns = []
        self.last_board_fen = None
        self.last_pgn = None
        self.tournament_id = tournament_id
        self.thread.start()

    def run_battle(self):
        for game_num in range(1, self.num_games + 1):
            if self._stop:
                self.status = "stopped"
                break
            board = chess.Board()
            game = chess.pgn.Game()
            node = game
            game.headers["White"] = self.white
            game.headers["Black"] = self.black
            game.headers["Date"] = datetime.now().strftime("%Y.%m.%d")
            game.headers["Event"] = "LLM Chess Arena"
            # Abertura
            try:
                move = board.parse_san(self.opening.split()[-1])
                board.push(move)
                node = node.add_variation(move)
            except Exception:
                pass
            move_count = 0
            while not board.is_game_over() and move_count < 60:
                # Simulação: alterna lances aleatórios
                legal_moves = list(board.legal_moves)
                if not legal_moves:
                    break
                move = legal_moves[move_count % len(legal_moves)]
                board.push(move)
                node = node.add_variation(move)
                move_count += 1
                self.last_board_fen = board.fen()
                self.last_pgn = str(game)
                time.sleep(self.realtime_speed)
            result = board.result()
            game.headers["Result"] = result
            self.results.append({
                "game": game_num,
                "white": self.white,
                "black": self.black,
                "result": result
            })
            self.pgns.append(str(game))
            self.current_game = game_num
            # Salvar no banco
            save_game_to_db({
                'white': self.white,
                'black': self.black,
                'result': result,
                'pgn': str(game),
                'moves': move_count,
                'opening': self.opening,
                'date': datetime.now().isoformat(),
                'tournament_id': self.tournament_id,
                'analysis': {}
            })
        self.status = "finished"

    def stop(self):
        self._stop = True

# Torneio todos-vs-todos


class ArenaTournament:
    def __init__(self, models, games_per_pair):
        self.id = str(uuid.uuid4())
        self.models = models
        self.games_per_pair = games_per_pair
        self.status = "playing"
        self.current_match = 0
        self.total_matches = len(models) * (len(models) - 1)
        self.results = []
        self.battles = []
        self.thread = threading.Thread(target=self.run_tournament)
        self.thread.daemon = True
        self._stop = False
        self.thread.start()

    def run_tournament(self):
        matchups = [(w, b) for i, w in enumerate(self.models)
                    for j, b in enumerate(self.models) if i != j]
        for idx, (white, black) in enumerate(matchups, 1):
            if self._stop:
                self.status = "stopped"
                break
            battle = ArenaBattle(white, black, "1. e4",
                                 self.games_per_pair, 0.1, tournament_id=self.id)
            self.battles.append(battle)
            while battle.status != "finished":
                time.sleep(0.5)
            self.results.extend(battle.results)
            self.current_match = idx
        self.status = "finished"

    def stop(self):
        self._stop = True

# API helpers


def start_battle(white, black, opening, num_games, realtime_speed):
    battle = ArenaBattle(white, black, opening, num_games, realtime_speed)
    with _battles_lock:
        _battles[battle.id] = battle
    return battle.id


def get_battle_status(battle_id):
    with _battles_lock:
        battle = _battles.get(battle_id)
    if not battle:
        return None
    return {
        "white": battle.white,
        "black": battle.black,
        "current_game": battle.current_game,
        "total_games": battle.total_games,
        "current_board": battle.last_board_fen,
        "results": battle.results,
        "pgn": battle.last_pgn,
        "status": battle.status
    }


def start_tournament(models, games_per_pair):
    tournament = ArenaTournament(models, games_per_pair)
    with _tournaments_lock:
        _tournaments[tournament.id] = tournament
    return tournament.id


def get_tournament_status(tournament_id):
    with _tournaments_lock:
        tournament = _tournaments.get(tournament_id)
    if not tournament:
        return None
    return {
        "models": tournament.models,
        "games_per_pair": tournament.games_per_pair,
        "current_match": tournament.current_match,
        "total_matches": tournament.total_matches,
        "results": tournament.results,
        "status": tournament.status
    }
