# Scrape-N-Serve

A microservice application that demonstrates web scraping using Golang and a React Native front-end.

## Project Overview

Scrape-N-Serve is a web scraping microservice that:
- Scrapes target websites using Golang's Colly library
- Stores data in a PostgreSQL database
- Exposes RESTful API endpoints
- Provides a React Native frontend for triggering scraping and viewing results

## Tech Stack

### Backend
- Language: Go (Golang)
- Web Framework: Gin
- Scraping Library: Colly
- Database: PostgreSQL
- ORM: GORM

### Frontend
- Framework: React Native
- Language: TypeScript
- State Management: Redux Toolkit

### DevOps
- Docker & Docker Compose for containerization

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js (v16+) and npm/yarn
- Go (v1.21+) for local development

### Backend Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/scrape-n-serve.git
   cd scrape-n-serve
   ```

2. Run using Docker Compose:
   ```
   docker-compose up
   ```

3. For local development:
   ```
   cd backend
   go run main.go
   ```

### Frontend Setup

1. Install dependencies:
   ```
   cd frontend
   npm install
   ```

2. Start the development server:
   ```
   npm start
   ```

3. Follow the Expo instructions to run on a device or emulator

## API Endpoints

- `POST /scrape` - Trigger a scraping process
- `GET /data` - Retrieve scraped data
- `GET /data/search` - Search through scraped data
- `GET /data/stats` - Get scraping statistics

## Project Structure

```
/project-root
    /backend
        main.go
        config.go
        /handlers
        /services
        /models
        /db
        /utils
    /frontend
        App.tsx
        /components
        /services
    docker-compose.yml
```

## License

MIT