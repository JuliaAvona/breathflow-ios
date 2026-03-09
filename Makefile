.PHONY: install start ios test test-watch test-coverage typecheck lint check docs clean help

# ─── Development ──────────────────────────────────────────────

install: ## Install all dependencies
	npm install

start: ## Start Expo dev server
	npx expo start

ios: ## Run on iOS simulator
	npx expo run:ios

# ─── Quality ──────────────────────────────────────────────────

test: ## Run unit tests
	npx jest

test-watch: ## Run tests in watch mode
	npx jest --watch

test-coverage: ## Run tests with coverage report
	npx jest --coverage

typecheck: ## TypeScript type check (no emit)
	npx tsc --noEmit

lint: ## ESLint check (when configured)
	@echo "ESLint not yet configured — add eslint to devDependencies"

check: typecheck test ## Run typecheck + tests (CI equivalent)
	@echo "✓ All checks passed"

# ─── Documentation ────────────────────────────────────────────

docs: ## Render PlantUML diagrams to SVG
	@mkdir -p docs/rendered
	@if command -v plantuml > /dev/null 2>&1; then \
		plantuml docs/architecture/*.puml -tsvg -o ../rendered/; \
		echo "✓ Diagrams rendered to docs/rendered/"; \
	else \
		echo "⚠ PlantUML not installed. Install: brew install plantuml"; \
	fi

docs-watch: ## Watch and re-render diagrams on change
	@echo "Watching docs/architecture/*.puml for changes..."
	@fswatch -o docs/architecture/*.puml | while read; do make docs; done

# ─── Release ──────────────────────────────────────────────────

changelog: ## Generate CHANGELOG from conventional commits
	@if command -v npx > /dev/null 2>&1; then \
		npx conventional-changelog -p angular -i CHANGELOG.md -s; \
		echo "✓ CHANGELOG.md updated"; \
	else \
		echo "⚠ npx not found"; \
	fi

build-ios: ## Build iOS via EAS
	npx eas build --platform ios

# ─── Cleanup ──────────────────────────────────────────────────

clean: ## Remove generated artifacts
	rm -rf node_modules/.cache
	rm -rf ios/build
	rm -rf docs/rendered
	@echo "✓ Cleaned build artifacts"

clean-all: clean ## Full clean (including node_modules and pods)
	rm -rf node_modules
	rm -rf ios/Pods
	@echo "✓ Full clean done. Run 'make install' to restore."

# ─── Help ─────────────────────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
