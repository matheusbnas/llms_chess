"""
Módulo de análise de partidas de xadrez.
Migrado de tests_streamlit/src/analysis.py
"""

import chess
import chess.pgn
from typing import Dict, List, Any, Optional
import numpy as np
from io import StringIO
from fastapi import APIRouter, HTTPException, Query, Body
from fastapi.responses import JSONResponse
from fastapi_backend.database import GameDatabase
import sqlite3


class GameAnalyzer:
    """Analyzes chess games and provides insights"""

    def __init__(self):
        pass

    def analyze_game(self, game: chess.pgn.Game, depth: int = 15) -> Dict[str, Any]:
        return self._analyze_without_engine(game)

    def _analyze_without_engine(self, game: chess.pgn.Game) -> Dict[str, Any]:
        board = chess.Board()
        move_count = 0
        captures = 0
        checks = 0
        castles = 0
        for node in game.mainline():
            if node.move:
                move_count += 1
                move = node.move
                if board.is_capture(move):
                    captures += 1
                board.push(move)
                if board.is_check():
                    checks += 1
                if move in [chess.Move.from_uci("e1g1"), chess.Move.from_uci("e1c1"), chess.Move.from_uci("e8g8"), chess.Move.from_uci("e8c8")]:
                    castles += 1
        return {
            'total_moves': move_count,
            'white_accuracy': 0.0,
            'black_accuracy': 0.0,
            'move_evaluations': [],
            'move_accuracies': [],
            'blunders': 0,
            'best_moves': [],
            'worst_moves': [],
            'captures': captures,
            'checks': checks,
            'castles': castles,
            'average_evaluation': 0
        }

    def compare_models(self, model1: str, model2: str, db) -> Dict[str, Any]:
        games = db.get_games_between_models(model1, model2)
        if not games:
            return {"error": "No games found between these models"}
        model1_wins = 0
        model2_wins = 0
        draws = 0
        model1_accuracies = []
        model2_accuracies = []
        performance_over_time = []
        for i, game_data in enumerate(games):
            result = game_data['result']
            white = game_data['white']
            black = game_data['black']
            if result == "1-0":
                if white == model1:
                    model1_wins += 1
                else:
                    model2_wins += 1
            elif result == "0-1":
                if black == model1:
                    model1_wins += 1
                else:
                    model2_wins += 1
            else:
                draws += 1
            game_pgn = chess.pgn.read_game(StringIO(game_data['pgn']))
            analysis = self.analyze_game(game_pgn)
            if white == model1:
                model1_accuracies.append(analysis['white_accuracy'])
                model2_accuracies.append(analysis['black_accuracy'])
            else:
                model1_accuracies.append(analysis['black_accuracy'])
                model2_accuracies.append(analysis['white_accuracy'])
            performance_over_time.append(
                {'game_number': i + 1, 'model': model1, 'accuracy': model1_accuracies[-1]})
            performance_over_time.append(
                {'game_number': i + 1, 'model': model2, 'accuracy': model2_accuracies[-1]})
        return {
            'model1_wins': model1_wins,
            'model2_wins': model2_wins,
            'draws': draws,
            'model1_accuracy': np.mean(model1_accuracies) if model1_accuracies else 0,
            'model2_accuracy': np.mean(model2_accuracies) if model2_accuracies else 0,
            'performance_over_time': performance_over_time
        }

    def calculate_elo_ratings(self, games: List[Dict], initial_rating: int = 1500) -> Dict[str, Dict]:
        ratings = {}
        games_played = {}
        for game in games:
            for player in [game['white'], game['black']]:
                if player not in ratings:
                    ratings[player] = initial_rating
                    games_played[player] = 0
        sorted_games = sorted(games, key=lambda x: x.get('date', ''))
        for game in sorted_games:
            white = game['white']
            black = game['black']
            result = game['result']
            white_rating = ratings[white]
            black_rating = ratings[black]
            white_expected = 1 / \
                (1 + 10**((black_rating - white_rating) / 400))
            black_expected = 1 - white_expected
            if result == "1-0":
                white_score, black_score = 1, 0
            elif result == "0-1":
                white_score, black_score = 0, 1
            else:
                white_score, black_score = 0.5, 0.5
            white_k = 32 if games_played[white] < 30 else 16
            black_k = 32 if games_played[black] < 30 else 16
            ratings[white] += white_k * (white_score - white_expected)
            ratings[black] += black_k * (black_score - black_expected)
            games_played[white] += 1
            games_played[black] += 1
        result_data = {}
        for model in ratings.keys():
            model_games = [g for g in games if g['white']
                           == model or g['black'] == model]
            wins = sum(1 for g in model_games if (
                g['white'] == model and g['result'] == "1-0") or (g['black'] == model and g['result'] == "0-1"))
            total = len(model_games)
            win_rate = wins / total if total > 0 else 0
            accuracies = []
            for game_data in model_games:
                game_pgn = chess.pgn.read_game(
                    StringIO(game_data.get('pgn', '')))
                if game_pgn:
                    analysis = self.analyze_game(game_pgn)
                    if game_data['white'] == model:
                        accuracies.append(analysis['white_accuracy'])
                    else:
                        accuracies.append(analysis['black_accuracy'])
            result_data[model] = {
                'model': model,
                'elo': round(ratings[model]),
                'games_played': games_played[model],
                'win_rate': win_rate,
                'avg_accuracy': np.mean(accuracies) if accuracies else 0
            }
        return result_data

    def get_detailed_stats(self, model: str, db) -> Dict[str, Any]:
        games = db.get_games_for_model(model)
        if not games:
            return {"error": "No games found for this model"}
        total_games = len(games)
        wins = sum(1 for g in games if (
            g['white'] == model and g['result'] == "1-0") or (g['black'] == model and g['result'] == "0-1"))
        draws = sum(1 for g in games if g['result'] == "1/2-1/2")
        losses = total_games - wins - draws
        win_rate = (wins / total_games * 100) if total_games > 0 else 0
        white_games = [g for g in games if g['white'] == model]
        black_games = [g for g in games if g['black'] == model]
        white_wins = sum(1 for g in white_games if g['result'] == "1-0")
        black_wins = sum(1 for g in black_games if g['result'] == "0-1")
        white_draws = sum(1 for g in white_games if g['result'] == "1/2-1/2")
        black_draws = sum(1 for g in black_games if g['result'] == "1/2-1/2")
        accuracies = []
        for game_data in games:
            game_pgn = chess.pgn.read_game(StringIO(game_data.get('pgn', '')))
            if game_pgn:
                analysis = self.analyze_game(game_pgn)
                if game_data['white'] == model:
                    accuracies.append(analysis['white_accuracy'])
                else:
                    accuracies.append(analysis['black_accuracy'])
        avg_accuracy = np.mean(accuracies) if accuracies else 0
        recent_games = games[-20:] if len(games) >= 20 else games
        recent_accuracies = []
        for game_data in recent_games:
            game_pgn = chess.pgn.read_game(StringIO(game_data.get('pgn', '')))
            if game_pgn:
                analysis = self.analyze_game(game_pgn)
                if game_data['white'] == model:
                    recent_accuracies.append(analysis['white_accuracy'])
                else:
                    recent_accuracies.append(analysis['black_accuracy'])
        return {
            'total_games': total_games,
            'wins': wins,
            'draws': draws,
            'losses': losses,
            'win_rate': win_rate,
            'avg_accuracy': avg_accuracy,
            'current_elo': 1500,  # Would need to calculate from ELO system
            'by_color': {
                'white': {
                    'wins': white_wins,
                    'draws': white_draws,
                    'losses': len(white_games) - white_wins - white_draws
                },
                'black': {
                    'wins': black_wins,
                    'draws': black_draws,
                    'losses': len(black_games) - black_wins - black_draws
                }
            },
            'recent_trend': recent_accuracies
        }

    def get_opening_statistics(self, db) -> List[Dict[str, Any]]:
        games = db.get_all_games()
        opening_stats = {}
        for game_data in games:
            game_pgn = chess.pgn.read_game(StringIO(game_data.get('pgn', '')))
            if not game_pgn:
                continue
            opening = self._get_opening_name(game_pgn)
            if opening not in opening_stats:
                opening_stats[opening] = {
                    'opening': opening,
                    'games_played': 0,
                    'white_wins': 0,
                    'black_wins': 0,
                    'draws': 0,
                    'total_moves': 0,
                    'accuracies': []
                }
            stats = opening_stats[opening]
            stats['games_played'] += 1
            stats['total_moves'] += game_data.get('moves', 0)
            result = game_data['result']
            if result == "1-0":
                stats['white_wins'] += 1
            elif result == "0-1":
                stats['black_wins'] += 1
            else:
                stats['draws'] += 1
            analysis = self.analyze_game(game_pgn)
            avg_accuracy = (analysis['white_accuracy'] +
                            analysis['black_accuracy']) / 2
            stats['accuracies'].append(avg_accuracy)
        result = []
        for opening, stats in opening_stats.items():
            if stats['games_played'] >= 3:
                win_rate = (stats['white_wins'] +
                            stats['black_wins']) / stats['games_played']
                avg_accuracy = np.mean(
                    stats['accuracies']) if stats['accuracies'] else 0
                avg_game_length = stats['total_moves'] / stats['games_played']
                result.append({
                    'opening': opening,
                    'games_played': stats['games_played'],
                    'win_rate': win_rate,
                    'avg_accuracy': avg_accuracy,
                    'avg_game_length': avg_game_length
                })
        return result

    def _get_opening_name(self, game: chess.pgn.Game) -> str:
        opening = game.headers.get("Opening", "")
        if opening:
            return opening
        board = chess.Board()
        moves = []
        for node in game.mainline():
            if node.move and len(moves) < 6:
                moves.append(board.san(node.move))
                board.push(node.move)
        if not moves:
            return "Unknown"
        first_move = moves[0]
        openings = {
            "e4": "King's Pawn",
            "d4": "Queen's Pawn",
            "Nf3": "Réti Opening",
            "c4": "English Opening",
            "g3": "King's Indian Attack",
            "b3": "Nimzo-Larsen Attack",
            "f4": "Bird's Opening",
            "Nc3": "Van Geet Opening"
        }
        return openings.get(first_move, "Other")

    def process_lichess_games(self, lichess_games: List[Dict]) -> Dict[str, Any]:
        training_data = {'positions': [], 'evaluations': [],
                         'best_moves': [], 'openings': [], 'endgames': []}
        for game_data in lichess_games:
            try:
                game = chess.pgn.read_game(StringIO(game_data['pgn']))
                if not game:
                    continue
                board = chess.Board()
                move_count = 0
                for node in game.mainline():
                    if node.move:
                        move_count += 1
                        position_data = {
                            'fen': board.fen(),
                            'move': board.san(node.move),
                            'move_number': move_count,
                            'rating': game_data.get('rating', 1500)
                        }
                        if move_count <= 10:
                            training_data['openings'].append(position_data)
                        elif move_count >= 40:
                            training_data['endgames'].append(position_data)
                        else:
                            training_data['positions'].append(position_data)
                        board.push(node.move)
            except Exception as e:
                print(f"Error processing Lichess game: {e}")
                continue
        return training_data

    def apply_rag_improvements(self) -> Dict[str, Dict[str, float]]:
        improvements = {
            'GPT-4o': {'accuracy_gain': 2.5, 'performance_gain': 1.8},
            'Gemini-Pro': {'accuracy_gain': 3.1, 'performance_gain': 2.2},
            'Deepseek-Chat': {'accuracy_gain': 1.9, 'performance_gain': 1.5}
        }
        return improvements


router = APIRouter(prefix="/api/analysis", tags=["analysis"])

game_analyzer = GameAnalyzer()
db = GameDatabase()


@router.get("/game/{game_id}")
def analyze_game(game_id: int):
    try:
        games = db.get_all_games()
        game_data = next((g for g in games if g['id'] == game_id), None)
        if not game_data:
            raise HTTPException(status_code=404, detail="Game not found")
        import chess.pgn
        from io import StringIO
        game_pgn = chess.pgn.read_game(StringIO(game_data['pgn']))
        analysis = game_analyzer.analyze_game(game_pgn)
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compare-models")
def compare_models(data: dict = Body(...)):
    model1 = data.get('model1')
    model2 = data.get('model2')
    if not model1 or not model2:
        raise HTTPException(
            status_code=400, detail="Both model1 and model2 are required")
    try:
        result = game_analyzer.compare_models(model1, model2, db)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/elo-rankings")
def elo_rankings():
    try:
        games = db.get_all_games()
        rankings = game_analyzer.calculate_elo_ratings(games)
        return list(rankings.values())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/elo-history")
def elo_history():
    try:
        with sqlite3.connect(db.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT model_name, elo_rating, date FROM elo_history ORDER BY date")
            history = [
                {'model': row[0], 'elo': row[1], 'date': row[2]}
                for row in cursor.fetchall()
            ]
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/model-stats")
def model_stats(model: str = Query(...)):
    try:
        stats = game_analyzer.get_detailed_stats(model, db)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/opening-stats")
def opening_stats():
    try:
        stats = game_analyzer.get_opening_statistics(db)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/apply-rag-improvements")
def apply_rag_improvements():
    try:
        improvements = game_analyzer.apply_rag_improvements()
        return improvements
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
