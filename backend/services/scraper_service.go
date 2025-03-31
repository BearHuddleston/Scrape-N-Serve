package services

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/arkouda/scrape-n-serve/db"
	"github.com/arkouda/scrape-n-serve/models"
	"github.com/gocolly/colly/v2"
)

var (
	scraping       bool
	scrapingMutex  sync.Mutex
	scrapeComplete chan bool
)

// StartScraping initiates the web scraping process
func StartScraping(targetURL string) (bool, error) {
	// Use mutex to prevent multiple scraping processes
	scrapeComplete = make(chan bool, 1)
	scraping = true
	defer func() {
		scraping = false
	}()

	// Initialize the collector
	c := colly.NewCollector(
		colly.AllowedDomains("example.com"), // Replace with actual domain
		colly.MaxDepth(2),                    // Limit crawling depth
		colly.Async(true),                    // Enable async scraping
	)

	// Set concurrent requests limit
	c.Limit(&colly.LimitRule{
		DomainGlob:  "*",
		Parallelism: 2,
		Delay:       1 * time.Second,
	})

	// Define a counter for processed items
	var processedItems int
	var mu sync.Mutex

	// Process item details
	c.OnHTML(".product-item", func(e *colly.HTMLElement) {
		// Extract data from the HTML element
		title := e.ChildText(".product-title")
		description := e.ChildText(".product-description")
		url := e.Request.AbsoluteURL(e.ChildAttr("a", "href"))
		imageURL := e.ChildAttr("img", "src")
		
		// Example of extracting price with simple error handling
		var price float64
		// In a real application, parse the price value properly
		
		// Create metadata field (example)
		metadata := map[string]string{
			"category": e.ChildText(".category"),
			"vendor":   e.ChildText(".vendor"),
		}

		metadataJSON, _ := json.Marshal(metadata)

		// Create a new ScrapedItem
		item := models.ScrapedItem{
			Title:       title,
			Description: description,
			URL:         url,
			ImageURL:    imageURL,
			Price:       price,
			ScrapedAt:   time.Now(),
			Metadata:    string(metadataJSON),
		}

		// Save to database
		result := db.DB.Where(models.ScrapedItem{URL: url}).FirstOrCreate(&item)
		if result.Error != nil {
			log.Printf("Error saving item %s: %v", url, result.Error)
		}

		// Update counter with mutex protection
		mu.Lock()
		processedItems++
		mu.Unlock()

		// Visit product detail page if needed
		detailURL := e.ChildAttr(".details-link", "href")
		if detailURL != "" {
			e.Request.Visit(detailURL)
		}
	})

	// Handle errors
	c.OnError(func(r *colly.Response, err error) {
		log.Printf("Error scraping %s: %v", r.Request.URL, err)
	})

	// Start scraping
	c.Visit(targetURL)

	// Wait for all requests to complete
	c.Wait()

	log.Printf("Scraping complete. Processed %d items.", processedItems)
	scrapeComplete <- true
	return true, nil
}

// IsScrapingInProgress checks if scraping is currently active
func IsScrapingInProgress() bool {
	scrapeComplete <- false
	return scraping
}

// GetScrapedItems retrieves items from the database
func GetScrapedItems(limit int) ([]models.ScrapedItem, error) {
	var items []models.ScrapedItem

	result := db.DB.Order("scraped_at DESC").Limit(limit).Find(&items)
	if result.Error != nil {
		return nil, result.Error
	}

	return items, nil
}
