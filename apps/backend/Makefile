# =============================================================
#  JuggleFlow — Makefile
#  Usage : make <target>
# =============================================================

COMPOSE  = podman compose
PROJECT  = juggleflow
DB_CTR   = juggleflow-db
BACK_CTR = juggleflow-backend
DB_USER  = $(shell grep POSTGRES_USER .env | cut -d= -f2)
DB_NAME  = $(shell grep POSTGRES_DB   .env | cut -d= -f2)

.PHONY: help up down restart build rebuild logs logs-db logs-back \
        db shell-back ps clean clean-all status

# ── Default target ────────────────────────────────────────────
help:
	@echo ""
	@echo "  JuggleFlow — Podman commands"
	@echo "  ──────────────────────────────────────────"
	@echo "  make up           Start all services (detached)"
	@echo "  make down         Stop and remove containers"
	@echo "  make restart      Restart all services"
	@echo "  make build        Build backend image"
	@echo "  make rebuild      Force rebuild (no cache)"
	@echo "  make logs         Follow all logs"
	@echo "  make logs-db      Follow PostgreSQL logs"
	@echo "  make logs-back    Follow backend logs"
	@echo "  make db           Open psql in DB container"
	@echo "  make shell-back   Open shell in backend container"
	@echo "  make ps           Show running containers"
	@echo "  make status       Health status of services"
	@echo "  make clean        Remove containers + volumes"
	@echo "  make clean-all    Remove containers + volumes + images"
	@echo ""

# ── Lifecycle ─────────────────────────────────────────────────
up:
	@cp -n .env.example .env 2>/dev/null && echo "  .env created from .env.example — please edit it" || true
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) restart

# ── Build ─────────────────────────────────────────────────────
build:
	$(COMPOSE) build backend

rebuild:
	$(COMPOSE) build --no-cache backend

# ── Logs ──────────────────────────────────────────────────────
logs:
	$(COMPOSE) logs -f

logs-db:
	$(COMPOSE) logs -f db

logs-back:
	$(COMPOSE) logs -f backend

# ── Access ────────────────────────────────────────────────────
db:
	podman exec -it $(DB_CTR) psql -U $(DB_USER) -d $(DB_NAME)

shell-back:
	podman exec -it $(BACK_CTR) sh

# ── Monitoring ────────────────────────────────────────────────
ps:
	$(COMPOSE) ps

status:
	@echo "\n  DB health:"
	@podman inspect --format "  Status: {{.State.Health.Status}}" $(DB_CTR) 2>/dev/null || echo "  container not running"
	@echo "\n  Backend health:"
	@podman inspect --format "  Status: {{.State.Health.Status}}" $(BACK_CTR) 2>/dev/null || echo "  container not running"

# ── Cleanup ───────────────────────────────────────────────────
clean:
	$(COMPOSE) down -v
	@echo "  Containers and volumes removed."

clean-all:
	$(COMPOSE) down -v --rmi all
	@echo "  Containers, volumes and images removed."
