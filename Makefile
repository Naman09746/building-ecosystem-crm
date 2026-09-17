# ============================================================================
# Ecosystem Realty — Developer Workflow
# Run `make help` to see all targets.
# ============================================================================

FRONTEND := apps/real-estate

.PHONY: help install dev build start lint typecheck test test-migrations test-e2e \
        docker-build docker-run graphify ci verify clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

install: ## Install monorepo dependencies
	yarn install --frozen-lockfile

dev: ## Start dev server
	yarn dev

build: ## Production build (typecheck + compile all workspaces)
	yarn build

start: ## Start production server for real-estate app
	cd $(FRONTEND) && yarn start

lint: ## ESLint across monorepo
	yarn lint

test: ## Unit · security · state-machine tests (vitest)
	yarn test

test-migrations: ## Validate DB migrations + RLS + quota triggers against real Postgres
	node scripts/validate-migrations.mjs

test-e2e: ## Playwright browser smoke suite (builds + serves the app)
	cd $(FRONTEND) && npx playwright test

docker-build: ## Build the production Docker image from monorepo root
	docker build -f $(FRONTEND)/Dockerfile -t ecosystemrealty:latest .

docker-run: ## Run the production image (expects apps/real-estate/.env.production)
	docker run -p 3000:3000 --env-file $(FRONTEND)/.env.production ecosystemrealty:latest

graphify: ## Refresh the code knowledge graph
	graphify update .

ci: lint test-migrations test build ## Run everything CI runs, locally

verify: ci test-e2e ## Everything: CI checks + E2E suite

clean: ## Remove build artifacts
	rm -rf apps/*/.next apps/*/test-results apps/*/playwright-report
