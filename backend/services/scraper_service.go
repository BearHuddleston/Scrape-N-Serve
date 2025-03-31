package services

import (
	"encoding/json"
	"fmt"
	"log"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/arkouda/scrape-n-serve/db"
	"github.com/arkouda/scrape-n-serve/models"
	"github.com/gocolly/colly/v2"
	"github.com/gocolly/colly/v2/extensions"
)

var (
	scraping       bool
	scrapingMutex  sync.Mutex
	scrapeComplete chan bool = make(chan bool, 1)
)

// ScraperConfig represents configuration options for the scraper
type ScraperConfig struct {
	MaxDepth          int
	Parallelism       int
	RequestDelay      time.Duration
	RequestTimeout    time.Duration
	FollowRedirects   bool
	AllowedDomains    []string
	DisallowedDomains []string
}

// DefaultScraperConfig returns the default scraper configuration
func DefaultScraperConfig() ScraperConfig {
	return ScraperConfig{
		MaxDepth:        2,       // Reduce default depth to avoid scraping too many pages
		Parallelism:     4,       // Reduce parallelism to avoid overloading sites
		RequestDelay:    500 * time.Millisecond,
		RequestTimeout:  10 * time.Second,
		FollowRedirects: true,
	}
}

// StartScraping initiates the web scraping process
func StartScraping(targetURL string, maxDepth int) (bool, error) {
	// Use mutex to prevent multiple scraping processes
	scrapingMutex.Lock()
	if scraping {
		scrapingMutex.Unlock()
		return false, fmt.Errorf("scraping is already in progress")
	}
	scraping = true
	scrapingMutex.Unlock()
	
	// Ensure we mark scraping as complete when we're done
	defer func() {
		scrapingMutex.Lock()
		scraping = false
		scrapingMutex.Unlock()
	}()

	// Parse the target URL to get the domain
	parsedURL, err := url.Parse(targetURL)
	if err != nil {
		return false, fmt.Errorf("invalid URL: %w", err)
	}
	
	domain := parsedURL.Hostname()
	config := DefaultScraperConfig()
	
	// Override max depth if provided
	if maxDepth > 0 {
		config.MaxDepth = maxDepth
	}
	
	// For Wikipedia, we don't restrict to just the hostname to allow following links to other language editions
	if strings.Contains(domain, "wikipedia.org") {
		config.AllowedDomains = []string{"wikipedia.org", "en.wikipedia.org", "www.wikipedia.org"}
	} else {
		config.AllowedDomains = []string{domain}
	}
	
	// Initialize the collector with the domain
	c := initializeCollector(config)
	
	// Context for scraping session
	ctx := &scrapingContext{
		processedItems: 0,
		visitedURLs:    make(map[string]bool),
		productURLs:    make(map[string]bool),
		seenImages:     make(map[string]bool),
		mu:             &sync.Mutex{},
		startTime:      time.Now(),
	}

	// Set up callbacks for different types of pages
	setupProductPageCallbacks(c, ctx)
	setupListingPageCallbacks(c, ctx)
	setupGenericPageCallbacks(c, ctx)
	
	// Handle errors
	c.OnError(func(r *colly.Response, err error) {
		log.Printf("Error scraping %s: %v", r.Request.URL, err)
	})
	
	// Before making a request
	c.OnRequest(func(r *colly.Request) {
		log.Printf("Visiting %s", r.URL.String())
		ctx.mu.Lock()
		ctx.visitedURLs[r.URL.String()] = true
		ctx.mu.Unlock()
	})

	// Start scraping
	if err := c.Visit(targetURL); err != nil {
		return false, fmt.Errorf("failed to start scraping: %w", err)
	}

	// Wait for all requests to complete
	c.Wait()

	elapsed := time.Since(ctx.startTime)
	log.Printf("Scraping complete. Processed %d items in %v.", ctx.processedItems, elapsed)
	
	// Non-blocking send to channel
	select {
	case scrapeComplete <- true:
		// Successfully sent to channel
	default:
		// Channel is full or unavailable, just log it
		log.Printf("Could not send to scrapeComplete channel")
	}
	
	return true, nil
}

// scrapingContext stores the context for a scraping session
type scrapingContext struct {
	processedItems int
	visitedURLs    map[string]bool
	productURLs    map[string]bool
	seenImages     map[string]bool
	mu             *sync.Mutex
	startTime      time.Time
}

// initializeCollector creates and configures a new collector
func initializeCollector(config ScraperConfig) *colly.Collector {
	c := colly.NewCollector(
		colly.MaxDepth(config.MaxDepth),
		colly.Async(true),
	)
	
	if len(config.AllowedDomains) > 0 {
		c.AllowedDomains = config.AllowedDomains
	}
	
	if len(config.DisallowedDomains) > 0 {
		c.DisallowedDomains = config.DisallowedDomains
	}
	
	// Set concurrent requests limit
	c.Limit(&colly.LimitRule{
		DomainGlob:  "*",
		Parallelism: config.Parallelism,
		Delay:       config.RequestDelay,
		RandomDelay: 500 * time.Millisecond,
	})
	
	// Set timeout
	c.SetRequestTimeout(config.RequestTimeout)
	
	// Add extensions
	extensions.RandomUserAgent(c)
	extensions.Referer(c)
	
	return c
}

// setupProductPageCallbacks sets up callbacks for product pages
func setupProductPageCallbacks(c *colly.Collector, ctx *scrapingContext) {
	// This selector should be adjusted based on the target site's structure
	c.OnHTML("div.product, div.product-detail, div.item", func(e *colly.HTMLElement) {
		extractProductData(e, ctx)
	})
	
	// Add Wikipedia-specific selectors
	c.OnHTML("body", func(e *colly.HTMLElement) {
		// If it's a Wikipedia page, extract data using Wikipedia-specific logic
		if strings.Contains(e.Request.URL.Host, "wikipedia.org") {
			extractWikipediaData(e, ctx)
		}
	})
}

// setupListingPageCallbacks sets up callbacks for listing/category pages
func setupListingPageCallbacks(c *colly.Collector, ctx *scrapingContext) {
	// Handle pagination links
	c.OnHTML("a.page, a.pagination__item, .pagination a", func(e *colly.HTMLElement) {
		pageURL := e.Request.AbsoluteURL(e.Attr("href"))
		if pageURL != "" && !ctx.visitedURLs[pageURL] {
			e.Request.Visit(pageURL)
		}
	})
	
	// Handle product links in listing pages
	c.OnHTML("a.product-link, a.product-item, .product-grid a", func(e *colly.HTMLElement) {
		productURL := e.Request.AbsoluteURL(e.Attr("href"))
		if productURL != "" {
			ctx.mu.Lock()
			if !ctx.productURLs[productURL] {
				ctx.productURLs[productURL] = true
				ctx.mu.Unlock()
				e.Request.Visit(productURL)
			} else {
				ctx.mu.Unlock()
			}
		}
	})
	
	// Handle Wikipedia links
	c.OnHTML(".mw-parser-output a[href]", func(e *colly.HTMLElement) {
		href := e.Attr("href")
		// Only follow internal Wikipedia links that don't start with # (anchors), : (special pages), or / (root paths)
		if strings.HasPrefix(href, "/wiki/") && 
		   !strings.Contains(href, ":") && 
		   !strings.HasPrefix(href, "#") {
			linkURL := e.Request.AbsoluteURL(href)
			ctx.mu.Lock()
			if !ctx.visitedURLs[linkURL] {
				ctx.visitedURLs[linkURL] = true
				ctx.mu.Unlock()
				e.Request.Visit(linkURL)
			} else {
				ctx.mu.Unlock()
			}
		}
	})
}

// setupGenericPageCallbacks sets up callbacks for generic pages
func setupGenericPageCallbacks(c *colly.Collector, ctx *scrapingContext) {
	// Try to detect product information on any page
	c.OnHTML("body", func(e *colly.HTMLElement) {
		// Check if it's a Wikipedia page first
		if strings.Contains(e.Request.URL.Host, "wikipedia.org") {
			extractWikipediaData(e, ctx)
			return
		}
		
		// For non-Wikipedia pages, check for common product page indicators
		if hasProductIndicators(e) {
			extractProductData(e, ctx)
		}
	})
}

// hasProductIndicators checks if the page has common indicators of a product page
func hasProductIndicators(e *colly.HTMLElement) bool {
	// Look for common product page elements
	hasPriceElement := e.DOM.Find(".price, span.amount, .product-price").Length() > 0
	hasAddToCartButton := e.DOM.Find("button.add-to-cart, .add-to-basket, .buy-now").Length() > 0
	hasProductTitle := e.DOM.Find("h1.product-title, .product-name, .product h1").Length() > 0
	
	return hasPriceElement && (hasAddToCartButton || hasProductTitle)
}

// extractWikipediaData extracts content from Wikipedia pages
func extractWikipediaData(e *colly.HTMLElement, ctx *scrapingContext) {
	// Get the title of the Wikipedia article
	title := e.ChildText("h1#firstHeading")
	if title == "" {
		title = e.ChildText("h1.firstHeading")
	}
	
	// Get URL from the current page
	url := e.Request.URL.String()
	
	// Get description from the first paragraph
	description := e.ChildText("#mw-content-text p:first-of-type")
	
	// Get the first image
	imageURL := e.ChildAttr(".infobox img, .thumbimage, img.mw-headline-anchor", "src")
	imageURL = e.Request.AbsoluteURL(imageURL)
	
	// If no image found in those selectors, try to find any image
	if imageURL == "" {
		imageURL = e.ChildAttr("img", "src")
		imageURL = e.Request.AbsoluteURL(imageURL)
	}
	
	// Gather metadata
	metadata := map[string]string{
		"categories": strings.Join(e.ChildTexts("#mw-normal-catlinks li"), ", "),
		"lastModified": e.ChildText("#footer-info-lastmod"),
		"contentType": "wikipedia-article",
	}
	
	// Extract table of contents sections
	var sections []string
	e.ForEach(".toc ul li", func(_ int, subEl *colly.HTMLElement) {
		sections = append(sections, subEl.Text)
	})
	
	if len(sections) > 0 {
		metadata["sections"] = strings.Join(sections, ", ")
	}
	
	// Get infobox data if available
	e.ForEach(".infobox tr", func(_ int, row *colly.HTMLElement) {
		label := strings.TrimSpace(row.ChildText("th"))
		value := strings.TrimSpace(row.ChildText("td"))
		if label != "" && value != "" {
			metadata[label] = value
		}
	})
	
	metadataJSON, _ := json.Marshal(metadata)
	
	// Skip if essential info is missing
	if title == "" || url == "" {
		return
	}
	
	// Create a new ScrapedItem
	item := models.ScrapedItem{
		Title:       title,
		Description: description,
		URL:         url,
		ImageURL:    imageURL,
		Price:       0.0, // Wikipedia articles don't have prices
		ScrapedAt:   time.Now(),
		Metadata:    string(metadataJSON),
	}
	
	// Save to database only if it's a new URL
	ctx.mu.Lock()
	defer ctx.mu.Unlock()
	
	result := db.DB.Where(models.ScrapedItem{URL: url}).FirstOrCreate(&item)
	if result.Error != nil {
		log.Printf("Error saving Wikipedia article %s: %v", url, result.Error)
		return
	}
	
	if result.RowsAffected > 0 {
		// It's a new item
		ctx.processedItems++
		log.Printf("Saved new Wikipedia article: %s", title)
	}
}

// extractProductData extracts product data from an HTML element
func extractProductData(e *colly.HTMLElement, ctx *scrapingContext) {
	// Try multiple selectors for each field to handle different site structures
	title := getFirstNonEmpty(e,
		"h1.product-title",
		".product-name",
		".product h1",
		"h1",
	)
	
	description := getFirstNonEmpty(e,
		".product-description",
		".description",
		"meta[name='description']",
		"#product-description",
		".product-details p",
	)
	
	// For meta description, we need to get the content attribute
	if description == "" {
		description = e.ChildAttr("meta[name='description']", "content")
	}
	
	// Get URL from the current page
	url := e.Request.URL.String()
	
	// Try different image selectors
	imageURL := getFirstNonEmptyAttr(e, "src",
		".product-image img",
		".gallery img",
		".carousel img",
		"#main-image",
		"img.product",
	)
	
	// For images, ensure we have absolute URLs
	imageURL = e.Request.AbsoluteURL(imageURL)
	
	// Try to extract price with different selectors
	priceStr := getFirstNonEmpty(e,
		".price",
		".product-price",
		"span.amount",
		".current-price",
	)
	
	// Clean up price string and convert to float
	price := 0.0
	if priceStr != "" {
		// Remove currency symbols and formatting
		priceStr = strings.ReplaceAll(priceStr, "$", "")
		priceStr = strings.ReplaceAll(priceStr, "£", "")
		priceStr = strings.ReplaceAll(priceStr, "€", "")
		priceStr = strings.ReplaceAll(priceStr, ",", "")
		priceStr = strings.TrimSpace(priceStr)
		
		if p, err := strconv.ParseFloat(priceStr, 64); err == nil {
			price = p
		}
	}
	
	// Skip if we couldn't extract essential information
	if title == "" || url == "" {
		return
	}
	
	// Create metadata with all available product information
	metadata := map[string]string{
		"category": getFirstNonEmpty(e, ".breadcrumbs", ".category", ".product-category"),
		"vendor": getFirstNonEmpty(e, ".vendor", ".brand", ".manufacturer"),
		"sku": getFirstNonEmpty(e, ".sku", ".product-sku", "span.sku"),
		"availability": getFirstNonEmpty(e, ".stock", ".availability", ".inventory"),
	}
	
	// Add any additional structured data if available
	e.ForEach("meta[property^='og:']", func(_ int, elem *colly.HTMLElement) {
		property := elem.Attr("property")
		content := elem.Attr("content")
		if property != "" && content != "" {
			// Extract the property name after the "og:" prefix
			propName := strings.TrimPrefix(property, "og:")
			metadata[propName] = content
		}
	})
	
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
	
	// Save to database only if it's a new URL
	ctx.mu.Lock()
	defer ctx.mu.Unlock()
	
	result := db.DB.Where(models.ScrapedItem{URL: url}).FirstOrCreate(&item)
	if result.Error != nil {
		log.Printf("Error saving item %s: %v", url, result.Error)
		return
	}
	
	if result.RowsAffected > 0 {
		// It's a new item
		ctx.processedItems++
		log.Printf("Saved new item: %s", title)
	}
}

// getFirstNonEmpty tries multiple selectors and returns the first non-empty result
func getFirstNonEmpty(e *colly.HTMLElement, selectors ...string) string {
	for _, selector := range selectors {
		if text := strings.TrimSpace(e.ChildText(selector)); text != "" {
			return text
		}
	}
	return ""
}

// getFirstNonEmptyAttr gets an attribute from the first matching selector
func getFirstNonEmptyAttr(e *colly.HTMLElement, attr string, selectors ...string) string {
	for _, selector := range selectors {
		if text := strings.TrimSpace(e.ChildAttr(selector, attr)); text != "" {
			return text
		}
	}
	return ""
}

// IsScrapingInProgress checks if scraping is currently active
func IsScrapingInProgress() bool {
	scrapingMutex.Lock()
	result := scraping
	scrapingMutex.Unlock()
	return result
}

// ResetScrapingState resets the scraping state (mainly for testing)
func ResetScrapingState() {
	scrapingMutex.Lock()
	scraping = false
	scrapingMutex.Unlock()
}

// GetScrapedItems retrieves items from the database with simple limit
func GetScrapedItems(limit int) ([]models.ScrapedItem, error) {
	var items []models.ScrapedItem

	result := db.DB.Order("scraped_at DESC").Limit(limit).Find(&items)
	if result.Error != nil {
		return nil, result.Error
	}

	return items, nil
}

// GetScrapedItemsWithPagination retrieves items with pagination, sorting, and count
func GetScrapedItemsWithPagination(limit, offset int, sortBy, order string) ([]models.ScrapedItem, int64, error) {
	var items []models.ScrapedItem
	var totalCount int64

	// Count total matching items
	if err := db.DB.Model(&models.ScrapedItem{}).Count(&totalCount).Error; err != nil {
		return nil, 0, err
	}

	// Build the order clause
	orderClause := sortBy
	if order == "desc" {
		orderClause = orderClause + " DESC"
	} else {
		orderClause = orderClause + " ASC"
	}

	// Get items with pagination and sorting
	result := db.DB.Order(orderClause).Limit(limit).Offset(offset).Find(&items)
	if result.Error != nil {
		return nil, 0, result.Error
	}

	return items, totalCount, nil
}
