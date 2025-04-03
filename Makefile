# Scrape-N-Serve Makefile
# Simplifies Docker-based development and deployment

# Set shell to bash
SHELL := /bin/bash

# Default target
.PHONY: help
help:
	@echo "Scrape-N-Serve Makefile"
	@echo "-----------------------"
	@echo "Available commands:"
	@echo ""
	@echo "Basic commands:"
	@echo "  make build        - Build all Docker containers"
	@echo "  make up           - Start the application in detached mode"
	@echo "  make down         - Stop the application"
	@echo "  make restart      - Restart the application"
	@echo "  make logs         - Show logs from all containers"
	@echo ""
	@echo "Deployment commands:"
	@echo "  make update       - Pull latest code and rebuild containers"
	@echo "  make deploy       - Deploy the application (pull, build, restart)"
	@echo "  make clean        - Remove all containers, images, and volumes"
	@echo ""
	@echo "Development commands:"
	@echo "  make dev-setup    - Setup development environment (install dependencies)"
	@echo "  make backend      - Build only the backend container"
	@echo "  make frontend     - Build only the frontend container"
	@echo "  make test         - Run backend tests"
	@echo ""
	@echo "Monitoring and debugging:"
	@echo "  make status       - Show container status"
	@echo "  make shell SERVICE=<service> - Execute shell in a container"
	@echo "  make service-logs SERVICE=<service> - View logs for a specific service"
	@echo "  make db-backup    - Backup the database"
	@echo "  make db-clear     - Clear all data from the database"

# Build all Docker containers
.PHONY: build
build:
	@echo "Building all containers..."
	docker-compose build

# Start the application in detached mode
.PHONY: up
up:
	@echo "Starting application..."
	docker-compose up -d

# Stop the application
.PHONY: down
down:
	@echo "Stopping application..."
	docker-compose down

# Restart the application
.PHONY: restart
restart: down up
	@echo "Application restarted"

# Show logs from all containers
.PHONY: logs
logs:
	docker-compose logs -f

# Pull latest code and rebuild containers
.PHONY: update
update:
	@echo "Pulling latest code..."
	git pull
	@echo "Rebuilding containers..."
	docker-compose build

# Deploy the application (pull, build, restart)
.PHONY: deploy
deploy: update restart
	@echo "Deployment complete"

# Remove all containers, images, and volumes
.PHONY: clean
clean:
	@echo "Removing containers, images, and volumes..."
	docker-compose down --rmi all --volumes --remove-orphans

# Build only the backend container
.PHONY: backend
backend:
	@echo "Building backend container..."
	docker-compose build backend

# Build only the frontend container
.PHONY: frontend
frontend:
	@echo "Building frontend container..."
	docker-compose build frontend

# Run backend tests
.PHONY: test
test:
	@echo "Running backend tests..."
	cd backend && go test -v ./...

# Show container status
.PHONY: status
status:
	@echo "Container status:"
	docker-compose ps

# Execute shell in a container (usage: make shell SERVICE=backend)
.PHONY: shell
shell:
	@if [ -z "$(SERVICE)" ]; then \
		echo "Usage: make shell SERVICE=<service_name>"; \
		echo "Available services: backend, frontend, db"; \
		exit 1; \
	fi
	docker-compose exec $(SERVICE) sh

# View logs for a specific service (usage: make service-logs SERVICE=backend)
.PHONY: service-logs
service-logs:
	@if [ -z "$(SERVICE)" ]; then \
		echo "Usage: make service-logs SERVICE=<service_name>"; \
		echo "Available services: backend, frontend, db"; \
		exit 1; \
	fi
	docker-compose logs -f $(SERVICE)

# Backup database
.PHONY: db-backup
db-backup:
	@echo "Creating database backup..."
	@mkdir -p ./backups
	@TIMESTAMP=$$(date +%Y%m%d_%H%M%S); \
	docker-compose exec db pg_dump -U postgres -d scrape_n_serve > ./backups/scrape_n_serve_$$TIMESTAMP.sql
	@echo "Backup saved to ./backups/"

# Clear all data from database
.PHONY: db-clear
db-clear:
	@echo "Clearing all data from the database..."
	@docker-compose exec db psql -U postgres -d scrape_n_serve -c "DELETE FROM scraped_items;"
	@echo "All data cleared successfully"

# Setup development environment
.PHONY: dev-setup
dev-setup:
	@echo "Setting up development environment..."
	@echo "Installing backend dependencies..."
	cd backend && go mod download
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "Development environment ready"