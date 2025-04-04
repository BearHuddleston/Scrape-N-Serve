# Scrape-N-Serve

A microservice application that demonstrates web scraping using Golang with both React and React Native frontends.

## Project Overview

Scrape-N-Serve is a web scraping microservice that:

- Scrapes target websites using Golang's Colly library
- Handles Wikipedia pages with specialized extraction logic
- Stores data in a PostgreSQL database
- Exposes RESTful API endpoints
- Provides both React and React Native frontends for triggering scraping and viewing results

## Tech Stack

### Backend

- Language: Go (Golang)
- Web Framework: Gin
- Scraping Library: Colly
- Database: PostgreSQL
- ORM: GORM

#### React Native Frontend
- Framework: React Native + Expo
- Language: TypeScript
- State Management: Redux Toolkit
- UI Components: React Native Paper
- Web Support: Expo Web

### DevOps

- Docker & Docker Compose for containerization
- Express & HTTP Proxy Middleware for API proxying (React Native)
- Nginx for serving static files and API proxying (Standard React)
- Makefile for simplified operation

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js (v16+) and npm (for local frontend development)
- Go (v1.21+) (for local backend development)

### Quick Start with Docker

The easiest way to run the application is using Docker Compose:

```bash
# Clone the repository
git clone https://github.com/BearHuddleston/scrape-n-serve.git
cd scrape-n-serve

# Start the application using Make
make up

# Or with docker-compose directly
docker-compose up -d
```

This will start three containers:
- PostgreSQL database
- Go backend API
- React frontend with Nginx

### Using the Makefile

The project includes a Makefile with helpful commands for Docker operations:

```bash
# Show available commands
make help

# Basic operations
make build        # Build all containers
make up           # Start the application in detached mode
make down         # Stop the application
make restart      # Restart the application
make logs         # Show logs from all containers

# Deployment
make update       # Pull latest code and rebuild containers
make deploy       # Deploy the application (pull, build, restart)

# Development
make dev-setup    # Setup development environment
make test         # Run backend tests
```

### Local Development

#### Backend Setup

```bash
cd backend

# Install dependencies
go mod download

# Run the application
go run main.go
```

#### Frontend Setup

##### React Native Frontend
```bash
cd frontend

# Install dependencies
npm install

# Start the development server for web
npm run web

# Start for iOS simulator (macOS only)
npm run ios

# Start for Android emulator
npm run android

# Build for production web
npm run build:web
```

## Using the Application

1. Access the frontend at http://localhost 
2. Enter a URL to scrape (Wikipedia pages work best)
3. Set the scraping depth
4. Click "Start Scraping"
5. Navigate to the "Scraped Data" tab to view results

## API Endpoints

### Scraping

- `POST /api/v1/scrape` - Trigger a scraping process
  - Body: `{ "url": "https://example.com", "max_depth": 2 }`
  - Query params: `?url=https://example.com&max_depth=2`

- `GET /api/v1/scrape/status` - Check scraping status

### Data Retrieval

- `GET /api/v1/data` - Get scraped data with pagination
  - Query params: `?limit=10&offset=0&sort=scraped_at&order=desc`

- `GET /api/v1/data/:id` - Get specific scraped item by ID

## Project Structure

```
/project-root
    /backend
        main.go             # Application entry point
        config.go           # Configuration settings
        /handlers           # API route handlers
        /services           # Business logic including scraper
        /models             # Data models
        /db                 # Database connection and operations
        /utils              # Utilities like logging
    /frontend
        App.tsx             # Main React Native application component
        /src                # React Native source code
            /components     # UI components
            /screens        # Screen components
            /navigation     # Navigation configuration
            /services       # API services and Redux state management
        server.js           # Express server for web hosting and API proxying
    Makefile                # Commands for build and deployment
    docker-compose.yml      # Docker services configuration
```

## Features

- **Web Scraping**: Extract data from websites with configurable depth
- **Wikipedia Support**: Special handling for Wikipedia page extraction
- **Concurrent Scraping**: Parallel processing with rate limiting
- **Cross-Platform**: Run on web, iOS, and Android with React Native
- **Modern UI**: Responsive interface with Material Design components
- **Docker Ready**: Fully containerized for easy deployment
- **API First**: RESTful API design with clean separation of concerns
- **Robust Data Handling**: Resilient against varying data formats

## License

MIT