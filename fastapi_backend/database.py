import sqlite3
import json
import os
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import chess.pgn
from io import StringIO
import re


class GameDatabase:
    """Manages the SQLite database for storing games and statistics"""

    def __init__(self, db_path: str = None):
        if db_path is None:
            # Sempre usa o banco na raiz do projeto
            db_path = os.path.abspath(os.path.join(
                os.path.dirname(__file__), '..', 'chess_arena.db'))
        self.db_path = db_path
        self._initialize_database()

    def _initialize_database(self):
        """Initialize the database with required tables"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Games table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS games (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    white TEXT NOT NULL,
                    black TEXT NOT NULL,
                    result TEXT NOT NULL,
                    pgn TEXT NOT NULL,
                    moves INTEGER,
                    opening TEXT,
                    date TEXT,
                    white_elo INTEGER DEFAULT 1500,
                    black_elo INTEGER DEFAULT 1500,
                    analysis_data TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            # Model statistics table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS model_stats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    model_name TEXT NOT NULL,
                    games_played INTEGER DEFAULT 0,
                    wins INTEGER DEFAULT 0,
                    draws INTEGER DEFAULT 0,
                    losses INTEGER DEFAULT 0,
                    current_elo INTEGER DEFAULT 1500,
                    avg_accuracy REAL DEFAULT 0.0,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(model_name)
                )
            """)
            # ELO history table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS elo_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    model_name TEXT NOT NULL,
                    elo_rating INTEGER NOT NULL,
                    date TEXT NOT NULL,
                    game_id INTEGER,
                    FOREIGN KEY (game_id) REFERENCES games (id)
                )
            """)
            # Training data table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS training_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    position_fen TEXT NOT NULL,
                    best_move TEXT,
                    evaluation REAL,
                    source TEXT,
                    rating INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    def save_game(self, game_data: Dict[str, Any]) -> int:
        """Save a game to the database"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO games (white, black, result, pgn, moves, opening, date, analysis_data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                game_data['white'],
                game_data['black'],
                game_data['result'],
                game_data['pgn'],
                game_data.get('moves', 0),
                game_data.get('opening', ''),
                game_data.get('date', datetime.now().isoformat()),
                json.dumps(game_data.get('analysis', {}))
            ))
            game_id = cursor.lastrowid
            conn.commit()
            return game_id

    def get_all_games(self) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, white, black, result, pgn, moves, opening, date, analysis_data FROM games ORDER BY created_at DESC")
            games = []
            for row in cursor.fetchall():
                games.append({
                    'id': row[0],
                    'white': row[1],
                    'black': row[2],
                    'result': row[3],
                    'pgn': row[4],
                    'moves': row[5],
                    'opening': row[6],
                    'date': row[7],
                    'analysis': json.loads(row[8]) if row[8] else {}
                })
            return games

    def get_recent_games(self, limit: int = 10) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT white, black, result, moves, opening, date FROM games ORDER BY created_at DESC LIMIT ?", (limit,))
            games = []
            for row in cursor.fetchall():
                games.append({
                    'white': row[0] if row[0] is not None else '',
                    'black': row[1] if row[1] is not None else '',
                    'result': row[2] if row[2] is not None else '',
                    'moves': row[3] if row[3] is not None else 0,
                    'opening': row[4] if row[4] is not None else '',
                    'date': row[5] if row[5] is not None else '',
                })
            return games

    def get_games_between_models(self, model1: str, model2: str) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT white, black, result, pgn, moves, date FROM games WHERE (white = ? AND black = ?) OR (white = ? AND black = ?) ORDER BY created_at",
                           (model1, model2, model2, model1))
            games = []
            for row in cursor.fetchall():
                games.append({
                    'white': row[0],
                    'black': row[1],
                    'result': row[2],
                    'pgn': row[3],
                    'moves': row[4],
                    'date': row[5]
                })
            return games

    def get_games_for_model(self, model: str) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT white, black, result, pgn, moves, date FROM games WHERE white = ? OR black = ? ORDER BY created_at", (model, model))
            games = []
            for row in cursor.fetchall():
                games.append({
                    'white': row[0],
                    'black': row[1],
                    'result': row[2],
                    'pgn': row[3],
                    'moves': row[4],
                    'date': row[5]
                })
            return games

    def get_unique_models(self) -> List[str]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT DISTINCT model_name FROM model_stats WHERE games_played > 0 ORDER BY model_name")
            return [row[0] for row in cursor.fetchall()]

    def get_global_stats(self) -> Dict[str, Any]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM games")
            total_games = cursor.fetchone()[0]
            cursor.execute(
                "SELECT COUNT(*) FROM model_stats WHERE games_played > 0")
            active_models = cursor.fetchone()[0]
            cursor.execute("SELECT AVG(moves) FROM games WHERE moves > 0")
            avg_game_length = cursor.fetchone()[0] or 0
            return {'total_games': total_games, 'active_models': active_models, 'avg_game_length': avg_game_length}

    def get_results_by_model(self) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT model_name, wins, draws, losses FROM model_stats WHERE games_played > 0 ORDER BY wins DESC")
            results = []
            for row in cursor.fetchall():
                results.append(
                    {'model': row[0], 'wins': row[1], 'draws': row[2], 'losses': row[3]})
            return results

    def get_winrate_data(self) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT SUM(CASE WHEN result = '1-0' THEN 1 ELSE 0 END) as white_wins, SUM(CASE WHEN result = '0-1' THEN 1 ELSE 0 END) as black_wins, SUM(CASE WHEN result = '1/2-1/2' THEN 1 ELSE 0 END) as draws FROM games")
            row = cursor.fetchone()
            white_wins, black_wins, draws = row[0] or 0, row[1] or 0, row[2] or 0
            total = white_wins + black_wins + draws
            if total == 0:
                return []
            return [
                {'result_type': 'White Wins', 'percentage': white_wins},
                {'result_type': 'Black Wins', 'percentage': black_wins},
                {'result_type': 'Draws', 'percentage': draws}
            ]

    def get_database_stats(self) -> Dict[str, Any]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM games")
            total_games = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM model_stats")
            total_models = cursor.fetchone()[0]
            return {
                'total_games': total_games,
                'total_models': total_models
            }
