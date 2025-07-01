import sqlite3
import json
import os
from typing import List, Dict, Any, Optional
from datetime import datetime


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
                "SELECT id, white, black, result, moves, opening, date FROM games ORDER BY id DESC")
            rows = cursor.fetchall()
            return [
                {
                    'id': row[0],
                    'white': row[1],
                    'black': row[2],
                    'result': row[3],
                    'moves': row[4],
                    'opening': row[5],
                    'date': row[6]
                } for row in rows
            ]

    def get_recent_games(self, limit: int = 10) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, white, black, result, moves, opening, date FROM games ORDER BY id DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            return [
                {
                    'id': row[0],
                    'white': row[1],
                    'black': row[2],
                    'result': row[3],
                    'moves': row[4],
                    'opening': row[5],
                    'date': row[6]
                } for row in rows
            ]

    def get_unique_models(self) -> List[str]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT DISTINCT model_name FROM model_stats")
            rows = cursor.fetchall()
            return [row[0] for row in rows]

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
