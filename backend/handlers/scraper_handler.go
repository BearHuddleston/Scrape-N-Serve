package handlers

import (
	"net/http"
	"strconv"

	"github.com/arkouda/scrape-n-serve/services"
	"github.com/gin-gonic/gin"
)

// StartScraping handles the request to start the scraping process
func StartScraping(c *gin.Context) {
	// Get target URL from request or config
	targetURL := c.Query("url")
	if targetURL == "" {
		targetURL = "https://example.com" // Default URL or from config
	}

	// Check if scraping is already in progress
	if services.IsScrapingInProgress() {
		c.JSON(http.StatusConflict, gin.H{
			"status":  "error",
			"message": "Scraping is already in progress",
		})
		return
	}

	// Start scraping in a goroutine
	go func() {
		_, err := services.StartScraping(targetURL)
		if err != nil {
			// Log error, but don't return since this is async
		}
	}()

	c.JSON(http.StatusAccepted, gin.H{
		"status":  "success",
		"message": "Scraping started",
	})
}

// GetScrapedData handles the request to get scraped data
func GetScrapedData(c *gin.Context) {
	// Parse limit parameter with default
	limitStr := c.DefaultQuery("limit", "100")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 100
	}

	// Get scraped items
	items, err := services.GetScrapedItems(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to retrieve data",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"count":  len(items),
		"data":   items,
	})
}
