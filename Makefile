SHELL := /bin/sh
COMPOSE ?= docker compose
SERVICE ?= app

.DEFAULT_GOAL := help

.PHONY: help up up-d down restart logs sh lint test build check

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*## "; print "Usage: make <target>\n"} /^[a-zA-Z0-9_.-]+:.*## / {printf "  %-10s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

up: ## Start app with docker compose (foreground)
	$(COMPOSE) up --build

up-d: ## Start app with docker compose (detached)
	$(COMPOSE) up --build -d

down: ## Stop docker compose services
	$(COMPOSE) down

restart: ## Restart app container
	$(COMPOSE) up --build -d --force-recreate

logs: ## Follow app logs
	$(COMPOSE) logs -f $(SERVICE)

sh: ## Open shell in app container
	$(COMPOSE) run --rm $(SERVICE) sh

lint: ## Run lint in container
	$(COMPOSE) run --rm $(SERVICE) npm run lint

test: ## Run tests in container
	$(COMPOSE) run --rm $(SERVICE) npm run test:ci

build: ## Run build in container
	$(COMPOSE) run --rm $(SERVICE) npm run build

check: ## Run lint, test, and build
	$(MAKE) lint
	$(MAKE) test
	$(MAKE) build

