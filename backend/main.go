package main

import (
	"log"
	
	"github.com/arkouda/scrape-n-serve/db"
	"github.com/arkouda/scrape-n-serve/handlers"
	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize database
	if err := db.Connect(); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	
	// Initialize router
	r := gin.Default()
	
	// Setup routes
	r.POST("/scrape", handlers.StartScraping)
	r.GET("/data", handlers.GetScrapedData)
	
	// Start server
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
