# Alcom Consultants Limited — Website

Property listings, property management and valuations for **alcomconsultants.co.ke**.

| Part | Stack |
|---|---|
| `frontend/` | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| `backend/` | Django 5.2 LTS, Django REST Framework, Celery, Python 3.14 |
| Data | PostgreSQL 18 + PostGIS 3.6, Redis 8 |
| Infra | Docker Compose, Nginx, GitHub Actions |

Planning docs: [requirements](docs/REQUIREMENTS.md) · [architecture](docs/ARCHITECTURE.md) ·
[decisions](docs/DECISIONS.md) · [deployment](docs/DEPLOYMENT.md) · [roadmap](docs/ROADMAP.md)

## Local development

Prerequisites: Docker (with Compose v2), Node 24 LTS (for editor tooling and frontend tests),
and optionally [uv](https://docs.astral.sh/uv/) for backend tooling outside Docker.

```bash
make setup          # creates .env from .env.example and builds images
make up             # starts everything
make superuser      # create an admin account
```

| URL | What |
|---|---|
| http://localhost:8080 | Website (Nginx → Next.js) |
| http://localhost:8080/api/v1/docs/ | API docs (Swagger) |
| http://localhost:8080/api/v1/health/ | API health check |
| http://localhost:8080/django-admin/ | Django admin |
| http://localhost:8025 | Mailpit (captured dev emails) |

Run `make help` for all commands (tests, lint, migrations, logs…).

### Git hooks
```bash
uv tool install pre-commit && pre-commit install
```

### Workflow
- Branch from `main` (`feat/…`, `fix/…`, `chore/…`), open a PR, CI must pass, then merge.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/).
- After changing `backend/pyproject.toml`, run `make lock` and rebuild.
