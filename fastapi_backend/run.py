import uvicorn
import socket
import sys

START_PORT = 8000
MAX_PORT = 8019


def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) == 0


def main():
    for port in range(START_PORT, MAX_PORT + 1):
        if not is_port_in_use(port):
            print(f"\n🚀 FastAPI backend rodando na porta {port}")
            uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
            break
        else:
            print(f"⚠️  Porta {port} em uso. Tentando próxima...")
    else:
        print(f"❌ Nenhuma porta disponível entre {START_PORT} e {MAX_PORT}")
        sys.exit(1)


if __name__ == "__main__":
    main()
