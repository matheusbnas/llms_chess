from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_backend.dashboard import router as dashboard_router
from fastapi_backend.arena import router as arena_router
from fastapi_backend.settings import router as settings_router

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
