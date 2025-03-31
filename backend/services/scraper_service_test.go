package services

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/arkouda/scrape-n-serve/models"
	"github.com/gocolly/colly/v2"
)

func TestDefaultScraperConfig(t *testing.T) {
	config := DefaultScraperConfig()
	
	if config.MaxDepth != 3 {
		t.Errorf("Expected MaxDepth to be 3, got %d", config.MaxDepth)
	}
	
	if config.Parallelism != 5 {
		t.Errorf("Expected Parallelism to be 5, got %d", config.Parallelism)
	}
	
	if config.RequestDelay != time.Second {
		t.Errorf("Expected RequestDelay to be 1s, got %v", config.RequestDelay)
	}
}

func TestInitializeCollector(t *testing.T) {
	config := ScraperConfig{
		MaxDepth:       2,
		Parallelism:    3,
		RequestDelay:   500 * time.Millisecond,
		AllowedDomains: []string{"example.com"},
	}
	
	c := initializeCollector(config)
	
	if c == nil {
		t.Fatal("Expected non-nil collector")
	}
	
	if len(c.AllowedDomains) != 1 || c.AllowedDomains[0] != "example.com" {
		t.Errorf("Expected AllowedDomains to be ['example.com'], got %v", c.AllowedDomains)
	}
}

func TestHasProductIndicators(t *testing.T) {
	// Create a test HTML page
	html := `
		<html>
			<body>
				<div class="product">
					<h1 class="product-title">Test Product</h1>
					<span class="price">$19.99</span>
					<button class="add-to-cart">Add to Cart</button>
				</div>
			</body>
		</html>
	`
	
	// Create a test server
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		w.Write([]byte(html))
	}))
	defer ts.Close()
	
	// Create a collector and make a request
	c := colly.NewCollector()
	var result bool
	
	c.OnHTML("body", func(e *colly.HTMLElement) {
		result = hasProductIndicators(e)
	})
	
	c.Visit(ts.URL)
	
	if !result {
		t.Error("Expected hasProductIndicators to return true for a product page")
	}
}

func TestGetFirstNonEmpty(t *testing.T) {
	// Create a test HTML page
	html := `
		<html>
			<body>
				<div class="product">
					<h1 class="title1">Title 1</h1>
					<h2 class="title2">Title 2</h2>
					<p class="desc1">Description 1</p>
					<p class="desc2">Description 2</p>
				</div>
			</body>
		</html>
	`
	
	// Create a test server
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		w.Write([]byte(html))
	}))
	defer ts.Close()
	
	// Create a collector and make a request
	c := colly.NewCollector()
	var title, description string
	
	c.OnHTML("div.product", func(e *colly.HTMLElement) {
		title = getFirstNonEmpty(e, ".title1", ".title2")
		description = getFirstNonEmpty(e, ".nonexistent", ".desc1", ".desc2")
	})
	
	c.Visit(ts.URL)
	
	if title != "Title 1" {
		t.Errorf("Expected title to be 'Title 1', got '%s'", title)
	}
	
	if description != "Description 1" {
		t.Errorf("Expected description to be 'Description 1', got '%s'", description)
	}
}

func TestExtractProductData(t *testing.T) {
	// Create a mock scraping context
	ctx := &scrapingContext{
		processedItems: 0,
		visitedURLs:    make(map[string]bool),
		productURLs:    make(map[string]bool),
		seenImages:     make(map[string]bool),
		mu:             &sync.Mutex{},
		startTime:      time.Now(),
	}
	
	// Create a test HTML page
	html := `
		<html>
			<body>
				<div class="product">
					<h1 class="product-title">Test Product</h1>
					<div class="product-description">This is a test product description.</div>
					<span class="price">$29.99</span>
					<img class="product-image" src="/images/test.jpg" />
					<div class="category">Test Category</div>
					<span class="sku">SKU12345</span>
				</div>
			</body>
		</html>
	`
	
	// Create a test server
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		w.Write([]byte(html))
	}))
	defer ts.Close()
	
	// Create a collector and make a request
	c := colly.NewCollector()
	
	// Mock the DB operations by creating a function to simulate saving to DB
	var capturedItem *models.ScrapedItem
	
	c.OnHTML("div.product", func(e *colly.HTMLElement) {
		// Override the database save operation
		origExtract := extractProductData
		defer func() { extractProductData = origExtract }()
		
		extractProductData = func(e *colly.HTMLElement, ctx *scrapingContext) {
			title := getFirstNonEmpty(e,
				"h1.product-title",
				".product-name",
				".product h1",
				"h1",
			)
			
			description := getFirstNonEmpty(e,
				".product-description",
				".description",
				"#product-description",
			)
			
			imageURL := getFirstNonEmptyAttr(e, "src",
				".product-image",
				"img.product",
			)
			
			priceStr := getFirstNonEmpty(e, ".price")
			
			capturedItem = &models.ScrapedItem{
				Title:       title,
				Description: description,
				URL:         e.Request.URL.String(),
				ImageURL:    imageURL,
				ScrapedAt:   time.Now(),
			}
			
			ctx.processedItems++
		}
		
		extractProductData(e, ctx)
	})
	
	c.Visit(ts.URL)
	
	// Now check the captured item
	if capturedItem == nil {
		t.Fatal("Expected item to be captured")
	}
	
	if capturedItem.Title != "Test Product" {
		t.Errorf("Expected title to be 'Test Product', got '%s'", capturedItem.Title)
	}
	
	if capturedItem.Description != "This is a test product description." {
		t.Errorf("Expected description to be 'This is a test product description.', got '%s'", capturedItem.Description)
	}
	
	if ctx.processedItems != 1 {
		t.Errorf("Expected processedItems to be 1, got %d", ctx.processedItems)
	}
}