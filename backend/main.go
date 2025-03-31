package main

import (
	"log"
	"time"
	
	"github.com/arkouda/scrape-n-serve/db"
	"github.com/arkouda/scrape-n-serve/handlers"
	"github.com/arkouda/scrape-n-serve/utils"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize logger
	logger := utils.NewLogger("main")
	
	// Initialize database
	if err := db.Connect(); err != nil {
		logger.Error("Failed to connect to database: %v", err)
		log.Fatalf("Failed to connect to database: %v", err)
	}
	logger.Info("Connected to database successfully")
	
	// Set Gin to release mode in production
	gin.SetMode(gin.ReleaseMode)
	
	// Initialize router
	r := gin.Default()
	
	// Add CORS middleware
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		AllowWildcard:    true,
		AllowWebSockets:  true,
		MaxAge:           12 * time.Hour,
	}))
	
	// Custom middleware for request logging
	r.Use(func(c *gin.Context) {
		// Start timer
		start := time.Now()
		
		// Process request
		c.Next()
		
		// Log request
		latency := time.Since(start)
		logger.RequestLogger(c.Request.Method, c.Request.URL.Path, c.ClientIP(), c.Writer.Status(), latency)
	})
	
	// API Version 1 group
	v1 := r.Group("/api/v1")
	{
		// Scraping endpoints
		v1.POST("/scrape", handlers.StartScraping)
		v1.GET("/scrape/status", handlers.GetScrapingStatus)
		
		// Data endpoints
		v1.GET("/data", handlers.GetScrapedData)
		v1.GET("/data/search", handlers.SearchData)
		v1.GET("/data/stats", handlers.GetStats)
		v1.GET("/data/:id", handlers.GetItemById)
	}
	
	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "up",
			"time":   time.Now(),
		})
	})
	
	// For backward compatibility (can be removed later)
	r.POST("/scrape", handlers.StartScraping)
	r.GET("/data", handlers.GetScrapedData)
	
	// Start server
	logger.Info("Starting server on :8080")
	if err := r.Run(":8080"); err != nil {
		logger.Error("Failed to start server: %v", err)
		log.Fatalf("Failed to start server: %v", err)
	}
}
