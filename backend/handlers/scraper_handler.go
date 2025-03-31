package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/arkouda/scrape-n-serve/db"
	"github.com/arkouda/scrape-n-serve/models"
	"github.com/arkouda/scrape-n-serve/services"
	"github.com/arkouda/scrape-n-serve/utils"
	"github.com/gin-gonic/gin"
)

var (
	logger = utils.NewLogger("handlers")
)

// ScrapingRequest represents the expected request body for scraping
type ScrapingRequest struct {
	URL     string `json:"url" binding:"required"`
	MaxDepth int    `json:"max_depth"`
}

// StartScraping handles the request to start the scraping process
func StartScraping(c *gin.Context) {
	var req ScrapingRequest
	
	// Try to bind JSON body first
	if err := c.ShouldBindJSON(&req); err != nil {
		// If JSON binding fails, try URL query parameter
		req.URL = c.Query("url")
		if depthStr := c.Query("max_depth"); depthStr != "" {
			if depth, err := strconv.Atoi(depthStr); err == nil {
				req.MaxDepth = depth
			}
		}
	}
	
	// Validate URL
	if req.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "URL is required",
		})
		return
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
		// Set max depth if provided, otherwise use default
		maxDepth := 2 // Default value
		if req.MaxDepth > 0 {
			maxDepth = req.MaxDepth
		}
		
		_, err := services.StartScraping(req.URL, maxDepth)
		if err != nil {
			logger.Error("Error during scraping: %v", err)
		}
	}()

	c.JSON(http.StatusAccepted, gin.H{
		"status":  "success",
		"message": "Scraping started",
		"url":     req.URL,
		"time":    time.Now(),
	})
}

// GetScrapingStatus checks if a scraping job is currently running
func GetScrapingStatus(c *gin.Context) {
	isRunning := services.IsScrapingInProgress()
	
	status := "idle"
	if isRunning {
		status = "running"
	}
	
	c.JSON(http.StatusOK, gin.H{
		"status":      "success",
		"scraping":    isRunning,
		"state":       status,
		"time":        time.Now(),
	})
}

// GetScrapedData handles the request to get scraped data
func GetScrapedData(c *gin.Context) {
	// Parse query parameters
	limitStr := c.DefaultQuery("limit", "100")
	offsetStr := c.DefaultQuery("offset", "0")
	sortBy := c.DefaultQuery("sort", "scraped_at")
	order := c.DefaultQuery("order", "desc")
	
	// Convert to appropriate types
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 || limit > 1000 {
		limit = 100
	}
	
	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}
	
	// Validate sort field
	validSortFields := map[string]bool{
		"scraped_at": true,
		"title":      true,
		"price":      true,
		"id":         true,
	}
	
	if !validSortFields[sortBy] {
		sortBy = "scraped_at"
	}
	
	// Validate order
	if order != "asc" && order != "desc" {
		order = "desc"
	}

	// Get scraped items
	items, totalCount, err := services.GetScrapedItemsWithPagination(limit, offset, sortBy, order)
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
		"total":  totalCount,
		"limit":  limit,
		"offset": offset,
		"data":   items,
	})
}

// GetItemById handles the request to get a specific scraped item by ID
func GetItemById(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid ID format",
		})
		return
	}
	
	var item models.ScrapedItem
	result := db.DB.First(&item, id)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Item not found",
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   item,
	})
}
