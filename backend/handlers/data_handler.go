package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/arkouda/scrape-n-serve/db"
	"github.com/arkouda/scrape-n-serve/models"
	"github.com/gin-gonic/gin"
)

// SearchData handles searching through scraped data
func SearchData(c *gin.Context) {
	// Get query parameters
	query := c.Query("q")
	limitStr := c.DefaultQuery("limit", "20")
	offsetStr := c.DefaultQuery("offset", "0")
	
	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)
	
	if limit <= 0 {
		limit = 20
	}
	
	// Create database query
	dbQuery := db.DB.Model(&models.ScrapedItem{})
	
	// Apply search filters if query is provided
	if query != "" {
		dbQuery = dbQuery.Where("title ILIKE ? OR description ILIKE ?", "%"+query+"%", "%"+query+"%")
	}
	
	// Count total results for pagination
	var total int64
	if err := dbQuery.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"message": "Failed to count results",
		})
		return
	}
	
	// Get results with pagination
	var items []models.ScrapedItem
	if err := dbQuery.Order("scraped_at DESC").Limit(limit).Offset(offset).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"message": "Failed to retrieve data",
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"total": total,
		"limit": limit,
		"offset": offset,
		"data": items,
	})
}

// GetStats provides statistics about the scraped data
func GetStats(c *gin.Context) {
	var totalItems int64
	var latestScrape time.Time
	
	// Get total count
	if err := db.DB.Model(&models.ScrapedItem{}).Count(&totalItems).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"message": "Failed to count items",
		})
		return
	}
	
	// Get latest scrape time
	var latestItem models.ScrapedItem
	if err := db.DB.Order("scraped_at DESC").First(&latestItem).Error; err == nil {
		latestScrape = latestItem.ScrapedAt
	}
	
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"stats": gin.H{
			"total_items": totalItems,
			"latest_scrape": latestScrape,
		},
	})
}
