# Developer shortcuts. Run `make help` to list targets.
COMPOSE      := docker compose
COMPOSE_PROD := docker compose -f compose.yaml -f compose.prod.yaml
BACKEND      := $(COMPOSE) exec backend

.DEFAULT_GOAL := help
.PHONY: help setup up down build logs ps shell migrate migrations superuser \
        test test-backend test-frontend lint format lock api-types

help: ## Show this help
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

setup: ## First-time setup: create .env with generated secrets and build images
	@test -f .env || { \
		sed -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$$(python3 -c 'import secrets; print(secrets.token_urlsafe(24))')|" \
		    -e "s|^DJANGO_SECRET_KEY=.*|DJANGO_SECRET_KEY=$$(python3 -c 'import secrets; print(secrets.token_urlsafe(50))')|" \
		    .env.example > .env && echo "Created .env with generated secrets"; }
	$(COMPOSE) build

up: ## Start the dev stack (http://localhost:8080)
	$(COMPOSE) up -d
	@echo "Site:    http://localhost:8080"
	@echo "API:     http://localhost:8080/api/v1/docs/"

down: ## Stop the dev stack
	$(COMPOSE) down

build: ## Rebuild dev images
	$(COMPOSE) build

logs: ## Follow logs (e.g. make logs s=backend)
	$(COMPOSE) logs -f $(s)

ps: ## List running services
	$(COMPOSE) ps

shell: ## Django shell
	$(BACKEND) python manage.py shell

migrate: ## Apply database migrations
	$(BACKEND) python manage.py migrate

migrations: ## Create new migrations
	$(BACKEND) python manage.py makemigrations

superuser: ## Create a Django superuser
	$(BACKEND) python manage.py createsuperuser

test: test-backend test-frontend ## Run all tests

test-backend: ## Backend tests with coverage
	$(BACKEND) pytest --cov --cov-report=term-missing

test-frontend: ## Frontend unit tests
	cd frontend && npm test

lint: ## Lint + type-check everything
	$(BACKEND) ruff check .
	$(BACKEND) ruff format --check .
	$(BACKEND) mypy .
	cd frontend && npm run lint && npm run typecheck && npm run format:check

format: ## Auto-format everything
	$(BACKEND) ruff check --fix .
	$(BACKEND) ruff format .
	cd frontend && npm run format

lock: ## Re-lock Python dependencies after editing backend/pyproject.toml
	$(COMPOSE) run --rm --no-deps --user root backend uv lock

api-types: ## Regenerate frontend API types from the backend OpenAPI schema
	$(COMPOSE) run --rm --no-deps -e DJANGO_SETTINGS_MODULE=config.settings.test backend \
		python manage.py spectacular --file /app/.openapi.yaml
	cd frontend && npx openapi-typescript ../backend/.openapi.yaml -o lib/api/schema.d.ts
	rm -f backend/.openapi.yaml
