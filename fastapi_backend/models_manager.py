"""
Gerenciamento de modelos de IA para o LLM Chess Arena.
Migrado de tests_streamlit/src/models.py
"""

import os
from typing import List, Dict, Any
import time
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv
import time
import anthropic

# Tentar importar os provedores, mas permitir fallback se não instalados
try:
    from langchain_openai import ChatOpenAI
except ImportError:
    ChatOpenAI = None
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
except ImportError:
    ChatGoogleGenerativeAI = None
try:
    from langchain_groq import ChatGroq
except ImportError:
    ChatGroq = None
try:
    from langchain_core.prompts import ChatPromptTemplate
except ImportError:
    ChatPromptTemplate = None
try:
    from langchain_anthropic import ChatAnthropic
    CLAUDE_AVAILABLE = True
except ImportError:
    ChatAnthropic = None
    CLAUDE_AVAILABLE = False


def get_env_var(key):
    v = os.getenv(key)
    if v is not None:
        return v.strip()
    return ""


class ModelManager:
    """Manages all available LLM models and their configurations"""

    def __init__(self):
        self.models = {}
        self.model_configs = {}
        self._initialize_models()

    def _initialize_models(self):
        openai_key = get_env_var("OPENAI_API_KEY")
        if openai_key and ChatOpenAI:
            self.models.update({
                "GPT-4o": ChatOpenAI(temperature=0.1, model='gpt-4o', api_key=openai_key),
                "GPT-4-Turbo": ChatOpenAI(temperature=0.1, model='gpt-4-turbo', api_key=openai_key),
                "GPT-3.5-Turbo": ChatOpenAI(temperature=0.1, model='gpt-3.5-turbo', api_key=openai_key),
            })
        google_key = get_env_var("GOOGLE_API_KEY")
        if google_key and ChatGoogleGenerativeAI:
            self.models.update({
                "Gemini-Pro": ChatGoogleGenerativeAI(temperature=0.1, model="gemini-1.5-pro-latest", google_api_key=google_key),
                "Gemini-1.0-Pro": ChatGoogleGenerativeAI(temperature=0.1, model="gemini-1.0-pro", google_api_key=google_key),
            })
        deepseek_key = get_env_var("DEEPSEEK_API_KEY")
        if deepseek_key and ChatOpenAI:
            self.models.update({
                "Deepseek-Chat": ChatOpenAI(
                    temperature=0.1,
                    model="deepseek-chat",
                    api_key=deepseek_key,
                    base_url="https://api.deepseek.com/v1"
                ),
                "Deepseek-Coder": ChatOpenAI(
                    temperature=0.1,
                    model="deepseek-coder",
                    api_key=deepseek_key,
                    base_url="https://api.deepseek.com/v1"
                ),
            })
        groq_key = get_env_var("GROQ_API_KEY")
        if groq_key and ChatGroq:
            self.models.update({
                "Llama3-70B": ChatGroq(temperature=0, model_name="llama3-70b-8192", groq_api_key=groq_key),
                "Mixtral-8x7B": ChatGroq(temperature=0, model_name="mixtral-8x7b-32768", groq_api_key=groq_key),
            })
        claude_key = get_env_var("CLAUDE_API_KEY")
        if claude_key and CLAUDE_AVAILABLE and ChatAnthropic:
            self.models.update({
                "Claude-3-Opus": ChatAnthropic(
                    temperature=0.1,
                    model_name="claude-3-opus-20240229",
                    anthropic_api_key=claude_key
                ),
                "Claude-3-Sonnet": ChatAnthropic(
                    temperature=0.1,
                    model_name="claude-3-sonnet-20240229",
                    anthropic_api_key=claude_key
                ),
                "Claude-3-Haiku": ChatAnthropic(
                    temperature=0.1,
                    model_name="claude-3-haiku-20240307",
                    anthropic_api_key=claude_key
                ),
            })

    def get_available_models(self) -> Dict[str, bool]:
        status = {}
        for name, model in self.models.items():
            status[name] = True
        return status

    def get_model(self, model_name: str):
        return self.models.get(model_name)

    def test_model(self, model_name: str) -> Dict[str, Any]:
        model = self.get_model(model_name)
        if not model:
            return {"success": False, "error": "Model not found"}
        try:
            start_time = time.time()
            if not ChatPromptTemplate:
                return {"success": False, "error": "PromptTemplate not available"}
            test_prompt = ChatPromptTemplate.from_messages([
                ("system", "You are a chess player. Respond with just 'e4' - nothing else."),
                ("human", "What is your first move as white?")
            ])
            messages = test_prompt.format_messages(input="test")
            response = model.invoke(messages)
            response_time = time.time() - start_time
            if hasattr(response, "content"):
                resp_content = response.content.strip()
            elif isinstance(response, str):
                resp_content = response.strip()
            else:
                resp_content = str(response)
            return {
                "success": True,
                "response_time": response_time,
                "response": resp_content
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_chess_prompt(self, color: str):
        if not ChatPromptTemplate:
            return None
        system_template = """
        You are a Chess Grandmaster playing in a tournament.
        You are playing with the {color} pieces.
        I will give you the last move, the history of the game so far, and
        you must analyze the position and find the best move.
        # IMPORTANT RULES:
        1. You must respond with a valid chess move in Standard Algebraic Notation (SAN)
        2. Do not include move numbers (like '1.' or '2...')
        3. Examples of valid moves: e4, Nf3, O-O, Qh5+, Rxe8#
        4. Think strategically about piece development, center control, and king safety
        # OUTPUT FORMAT:
        My move: "Move"
        Brief explanation in Portuguese (max 2 sentences) of why you chose this move.
        """
        return ChatPromptTemplate.from_messages([
            ("system", system_template.format(color=color)),
            ("human", "{input}")
        ])

    def update_model_config(self, model_name: str, config: Dict[str, Any]):
        self.model_configs[model_name] = config
        if model_name in self.models:
            pass

    def get_model_info(self, model_name: str) -> Dict[str, Any]:
        if model_name not in self.models:
            return {}
        return {
            "name": model_name,
            "provider": self._get_provider(model_name),
            "available": model_name in self.get_available_models(),
            "config": self.model_configs.get(model_name, {})
        }

    def _get_provider(self, model_name: str) -> str:
        if "GPT" in model_name:
            return "OpenAI"
        elif "Gemini" in model_name:
            return "Google"
        elif "Deepseek" in model_name:
            return "DeepSeek"
        elif "Llama" in model_name or "Mixtral" in model_name:
            return "Groq"
        elif "Claude" in model_name:
            return "Anthropic"
        else:
            return "Unknown"

    def add_model(self, name: str, config: Dict[str, Any]):
        self.models[name] = config

    def list_models(self) -> List[str]:
        return list(self.models.keys())

    def activate_model(self, name: str):
        if name in self.models:
            self.models[name]['active'] = True

    def deactivate_model(self, name: str):
        if name in self.models:
            self.models[name]['active'] = False

    # Adicione outras funções conforme necessário para gerenciamento de modelos
