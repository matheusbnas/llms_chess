from fastapi import APIRouter, HTTPException, Request
from pathlib import Path
import re
import sqlite3
from io import StringIO
import chess.pgn
import time
import os
from fastapi_backend.database import GameDatabase

router = APIRouter()

PGN_DIRS = [
    "Gemini-Pro vs GPT-4o",
    "gpt-4 vs Deepseek",
    "GPT-4o vs Gemini-Pro"
]
BASE_DIR = Path(__file__).resolve().parent.parent


def parse_pgn_stats():
    stats = {}
    for dir_name in PGN_DIRS:
        dir_path = BASE_DIR / dir_name
        if not dir_path.exists():
            continue
        for file in dir_path.glob("*.pgn"):
            try:
                with open(file, "r", encoding="utf-8") as f:
                    pgn = f.read()
            except UnicodeDecodeError:
                with open(file, "r", encoding="latin-1") as f:
                    pgn = f.read()
            white = re.search(r'\[White "(.*?)"\]', pgn)
            black = re.search(r'\[Black "(.*?)"\]', pgn)
            result = re.search(r'\[Result "(.*?)"\]', pgn)
            if white and black and result:
                w = white.group(1)
                b = black.group(1)
                r = result.group(1)
                for player in [w, b]:
                    if player not in stats:
                        stats[player] = {"model": player, "wins": 0,
                                         "losses": 0, "draws": 0, "total": 0}
                stats[w]["total"] += 1
                stats[b]["total"] += 1
                if r == "1-0":
                    stats[w]["wins"] += 1
                    stats[b]["losses"] += 1
                elif r == "0-1":
                    stats[b]["wins"] += 1
                    stats[w]["losses"] += 1
                elif r == "1/2-1/2":
                    stats[w]["draws"] += 1
                    stats[b]["draws"] += 1
    return list(stats.values())


def parse_matchup_stats():
    matchup_stats = []
    for dir_name in PGN_DIRS:
        dir_path = BASE_DIR / dir_name
        if not dir_path.exists():
            continue
        if ' vs ' in dir_name:
            p1, p2 = dir_name.split(' vs ', 1)
        else:
            p1 = p2 = None
        p1_wins = p2_wins = draws = total = 0
        for file in dir_path.glob("*.pgn"):
            try:
                with open(file, "r", encoding="utf-8") as f:
                    pgn = f.read()
            except UnicodeDecodeError:
                with open(file, "r", encoding="latin-1") as f:
                    pgn = f.read()
            white = re.search(r'\[White "(.*?)"\]', pgn)
            black = re.search(r'\[Black "(.*?)"\]', pgn)
            result = re.search(r'\[Result "(.*?)"\]', pgn)
            if white and black and result:
                w = white.group(1)
                b = black.group(1)
                r = result.group(1)
                if set([w, b]) == set([p1, p2]):
                    if w == p1 and b == p2:
                        if r == "1-0":
                            p1_wins += 1
                        elif r == "0-1":
                            p2_wins += 1
                        elif r == "1/2-1/2":
                            draws += 1
                    elif w == p2 and b == p1:
                        if r == "1-0":
                            p2_wins += 1
                        elif r == "0-1":
                            p1_wins += 1
                        elif r == "1/2-1/2":
                            draws += 1
                    total += 1
        if p1 and p2 and total > 0:
            matchup_stats.append({
                "matchup": dir_name,
                "p1": p1,
                "p2": p2,
                "p1_wins": p1_wins,
                "p2_wins": p2_wins,
                "draws": draws,
                "total": total
            })
    return matchup_stats


@router.get("/api/data/dashboard")
def get_dashboard_data():
    try:
        db = GameDatabase()
        stats = db.get_database_stats()
        model_stats = []
        # Buscar estatísticas dos modelos
        with sqlite3.connect(db.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT model_name, games_played, wins, draws, losses, current_elo, avg_accuracy FROM model_stats")
            for row in cursor.fetchall():
                model_stats.append({
                    "model": row[0],
                    "games_played": row[1],
                    "wins": row[2],
                    "draws": row[3],
                    "losses": row[4],
                    "elo": row[5],
                    "avg_accuracy": row[6],
                })
        recent_games = db.get_recent_games(10)
        return {
            "totalGames": stats['total_games'],
            "modelStats": model_stats,
            "recentGames": recent_games,
            "matchupStats": []  # Pode ser implementado depois
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
