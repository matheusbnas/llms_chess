"""
Gerenciamento de modelos de IA para o LLM Chess Arena.
Migrado de tests_streamlit/src/models.py
"""

from typing import List, Dict, Any


class ModelManager:
    def __init__(self):
        self.models = {}
        # Carregar modelos do banco ou arquivo, se necessário

    def add_model(self, name: str, config: Dict[str, Any]):
        self.models[name] = config

    def get_model(self, name: str) -> Dict[str, Any]:
        return self.models.get(name, {})

    def list_models(self) -> List[str]:
        return list(self.models.keys())

    def activate_model(self, name: str):
        if name in self.models:
            self.models[name]['active'] = True

    def deactivate_model(self, name: str):
        if name in self.models:
            self.models[name]['active'] = False

    # Adicione outras funções conforme necessário para gerenciamento de modelos
