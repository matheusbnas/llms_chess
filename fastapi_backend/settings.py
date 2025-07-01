from fastapi import APIRouter, HTTPException

router = APIRouter()

# Configurações simuladas (pode ser expandido para ler do banco ou arquivo futuramente)
SETTINGS = {
    "modelParams": {
        "temperature": 0.7,
        "maxTokens": 1024,
        "thinkingTime": 5
    },
    "gameSettings": {
        "defaultTimeControl": "blitz",
        "autoSaveGames": True,
        "showCoordinates": True,
        "highlightLastMove": True,
        "autoAnalysis": False,
        "analysisDepth": 10,
        "saveAnalysis": True
    },
    "server_info": {
        "version": "1.0.0",
        "environment": "dev"
    }
}


@router.get("/api/settings")
def get_settings():
    try:
        return SETTINGS
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
