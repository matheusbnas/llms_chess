from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_backend.dashboard import router as dashboard_router
from fastapi_backend.arena import router as arena_router
from fastapi_backend.settings import router as settings_router
from fastapi_backend.models_manager import ModelManager
from fastapi_backend.analysis import GameAnalyzer
from fastapi_backend.lichess_api import LichessAPI
from fastapi_backend.pgn_importer import PGNImporter
from fastapi_backend.human_game_utils import HumanGameUtils
from fastapi_backend.analysis import router as analysis_router
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard_router)
app.include_router(arena_router)
app.include_router(settings_router)
app.include_router(analysis_router)

# Servir arquivos HTML da pasta 'pages'
pages_dir = os.path.abspath(os.path.join(
    os.path.dirname(__file__), '..', 'pages'))
app.mount("/pages", StaticFiles(directory=pages_dir), name="pages")

model_manager = ModelManager()
game_analyzer = GameAnalyzer()
lichess_api = LichessAPI()
pgn_importer = PGNImporter()
human_game_utils = HumanGameUtils()


@app.get("/health")
async def health_check():
    return {"status": "ok"}
