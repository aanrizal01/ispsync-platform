# ISP Billing Platform — Makefile
# Usage: make <target>

.PHONY: help setup generate-keys up down restart logs api-logs web-logs migrate migrate-down db-shell redis-shell \
        build-api build-web test test-api test-billing seed fmt lint

# ── Colors ────────────────────────────────────────────────────────
CYAN  = \033[0;36m
NC    = \033[0m

## help: Show this help message
help:
	@echo "$(CYAN)ISP Billing Platform$(NC)"
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make $(CYAN)<target>$(NC)\n\nTargets:\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(CYAN)%-20s$(NC) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

## setup: Initial project setup (copy .env, generate JWT keys, install deps)
setup: .env generate-keys
	@echo "$(CYAN)Setup complete. Run 'make up' to start services.$(NC)"

.env:
	cp .env.example .env
	@echo "$(CYAN).env created. Please review and update secrets.$(NC)"

## generate-keys: Generate RSA key pair for JWT signing
generate-keys:
	@mkdir -p keys
	@if [ ! -f keys/private.pem ]; then \
		openssl genrsa -out keys/private.pem 4096; \
		openssl rsa -in keys/private.pem -pubout -out keys/public.pem; \
		echo "$(CYAN)JWT RSA keys generated in ./keys/$(NC)"; \
	else \
		echo "$(CYAN)JWT keys already exist, skipping.$(NC)"; \
	fi

## up: Start all services
up:
	docker compose up -d

## down: Stop all services
down:
	docker compose down

## restart: Restart a specific service (e.g. make restart service=api)
restart:
	docker compose restart $(service)

## logs: Tail all service logs
logs:
	docker compose logs -f

## api-logs: Tail API server logs
api-logs:
	docker compose logs -f api

## web-logs: Tail Next.js logs
web-logs:
	docker compose logs -f web

## migrate: Run pending database migrations
migrate:
	docker compose exec api /app/tmp/api migrate

## migrate-down: Roll back one migration
migrate-down:
	docker compose exec api sh -c "migrate -path /app/migrations -database $$DATABASE_URL down 1"

## db-shell: Open PostgreSQL interactive shell
db-shell:
	docker compose exec postgres psql -U postgres -d isp_billing

## redis-shell: Open Redis CLI
redis-shell:
	docker compose exec redis redis-cli -a $$(grep REDIS_PASSWORD .env | cut -d= -f2)

## seed: Seed the database with a default super admin user
seed:
	docker compose exec api sh -c "DATABASE_URL=$$DATABASE_URL /app/tmp/seed"

## build-api: Build the Go API binary
build-api:
	cd apps/api && go build -o tmp/api ./cmd/api

## build-web: Build the Next.js production bundle
build-web:
	cd apps/web && npm run build

## test: Run all tests
test: test-api

## test-api: Run Go tests
test-api:
	cd apps/api && go test -v -race -count=1 ./...

## test-billing: Run billing-specific tests (focus on critical logic)
test-billing:
	cd apps/api && go test -v -race -count=1 ./internal/billing/... ./pkg/money/...

## fmt: Format Go code
fmt:
	cd apps/api && gofmt -s -w .
	cd apps/api && goimports -w .

## lint: Run linters
lint:
	cd apps/api && golangci-lint run ./...

## create-admin: Create a super admin user (prompts for credentials)
create-admin:
	@echo "Creating super admin user..."
	docker compose exec api sh -c "DATABASE_URL=$$DATABASE_URL /app/tmp/api create-admin"
