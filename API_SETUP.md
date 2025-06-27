# 🔑 API Keys Setup - LLM Chess Arena

## Configuração das Chaves de API

### 1. Criar arquivo .env

Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

### 2. Configurar as chaves de API

Abra o arquivo `.env` e configure suas chaves:

#### OpenAI API
1. Acesse: https://platform.openai.com/api-keys
2. Crie uma nova API key
3. Substitua `your_openai_api_key_here` pela sua chave

#### Google AI API
1. Acesse: https://makersuite.google.com/app/apikey
2. Crie uma nova API key
3. Substitua `your_google_api_key_here` pela sua chave

#### Anthropic API
1. Acesse: https://console.anthropic.com/
2. Crie uma nova API key
3. Substitua `your_anthropic_api_key_here` pela sua chave

#### DeepSeek API
1. Acesse: https://platform.deepseek.com/
2. Crie uma nova API key
3. Substitua `your_deepseek_api_key_here` pela sua chave

### 3. Exemplo de configuração

```env
# API Keys obrigatórias
OPENAI_API_KEY=sk-proj-abcd1234...
GOOGLE_API_KEY=AIzaSyAbc123...
ANTHROPIC_API_KEY=sk-ant-api03-abc123...
DEEPSEEK_API_KEY=sk-abc123...

# Configurações do servidor
PORT=3000
NODE_ENV=development
API_TIMEOUT=30000
MOVE_DELAY=2000
```

### 4. Testar configuração

Após configurar as chaves, rode:
```bash
npm start
```

O console mostrará quais APIs estão configuradas:
- ✅ Set = Configurada corretamente
- ❌ Not set = Não configurada

### 5. Problemas comuns

#### Erro de timeout
- Aumente `API_TIMEOUT` no `.env` (padrão: 30000ms)

#### Chave inválida
- Verifique se a chave está correta
- Certifique-se que a conta tem créditos

#### Rate limit
- Aguarde alguns minutos
- Verifique os limites da sua conta

### 6. Modelos disponíveis

| Provider | Modelo | Status |
|----------|--------|--------|
| OpenAI | GPT-4o | ✅ Recomendado |
| OpenAI | GPT-4-Turbo | ✅ Disponível |
| Google | Gemini-1.5-Pro | ✅ Recomendado |
| Google | Gemini-1.0-Pro | ✅ Disponível |
| Anthropic | Claude-3.5-Sonnet | ✅ Disponível |
| DeepSeek | Deepseek-R1 | ⚠️ Experimental |

### 7. Segurança

- **NUNCA** commite o arquivo `.env`
- Use variáveis de ambiente em produção
- Monitore o uso das APIs
- Configure rate limits apropriados