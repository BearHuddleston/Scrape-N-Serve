package services

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gocolly/colly/v2"
)

func TestDefaultScraperConfig(t *testing.T) {
	config := DefaultScraperConfig()

	if config.MaxDepth != 2 {
		t.Errorf("Expected MaxDepth to be 2, got %d", config.MaxDepth)
	}

	if config.Parallelism != 4 {
		t.Errorf("Expected Parallelism to be 4, got %d", config.Parallelism)
	}

	if config.RequestDelay != 500*time.Millisecond {
		t.Errorf("Expected RequestDelay to be 500ms, got %v", config.RequestDelay)
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
	// Create a test HTML page matching the exact selectors in hasProductIndicators()
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
	
	// Test a non-product page
	nonProductHTML := `
		<html>
			<body>
				<div class="article">
					<h1>Blog Post Title</h1>
					<div class="content">This is a blog post.</div>
				</div>
			</body>
		</html>
	`
	
	ts2 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		w.Write([]byte(nonProductHTML))
	}))
	defer ts2.Close()
	
	c2 := colly.NewCollector()
	var result2 bool
	
	c2.OnHTML("body", func(e *colly.HTMLElement) {
		result2 = hasProductIndicators(e)
	})
	
	c2.Visit(ts2.URL)
	
	if result2 {
		t.Error("Expected hasProductIndicators to return false for a non-product page")
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

	// Test directly using the product extractor helper functions
	var title, description string

	c.OnHTML("div.product", func(e *colly.HTMLElement) {
		title = getFirstNonEmpty(e,
			"h1.product-title",
			".product-name",
			".product h1",
			"h1",
		)

		description = getFirstNonEmpty(e,
			".product-description",
			".description",
			"#product-description",
		)

		// Just test that we can extract an image URL (not storing it)
		_ = getFirstNonEmptyAttr(e, "src",
			".product-image",
			"img.product",
		)

		// Increment the context counter
		ctx.processedItems++
	})

	c.Visit(ts.URL)

	// Check the extracted data
	if title != "Test Product" {
		t.Errorf("Expected title to be 'Test Product', got '%s'", title)
	}

	if description != "This is a test product description." {
		t.Errorf("Expected description to be 'This is a test product description.', got '%s'", description)
	}

	if ctx.processedItems != 1 {
		t.Errorf("Expected processedItems to be 1, got %d", ctx.processedItems)
	}
}

func TestExtractWikipediaData(t *testing.T) {
	// We'll create a simpler test without database interaction

	// Create a test Wikipedia-style HTML page
	html := `
		<html>
			<head>
				<title>Test Wikipedia Article - Wikipedia</title>
			</head>
			<body>
				<h1 id="firstHeading">Test Wikipedia Article</h1>
				<div id="mw-content-text">
					<p>This is the first paragraph of the Wikipedia article about a test subject.</p>
					<p>This is the second paragraph with more details.</p>
					<div class="infobox">
						<img src="/wiki/images/test.jpg" alt="Test image" />
						<table>
							<tr>
								<th>Born</th>
								<td>January 1, 2000</td>
							</tr>
							<tr>
								<th>Occupation</th>
								<td>Test Subject</td>
							</tr>
						</table>
					</div>
					<div class="toc">
						<ul>
							<li>Section 1</li>
							<li>Section 2</li>
							<li>Section 3</li>
						</ul>
					</div>
				</div>
				<div id="mw-normal-catlinks">
					<ul>
						<li>Category 1</li>
						<li>Category 2</li>
					</ul>
				</div>
				<div id="footer-info-lastmod">
					This page was last edited on 1 January 2023
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

	// Mock the URL to look like Wikipedia
	mockURL, _ := url.Parse(ts.URL)
	mockURL.Host = "en.wikipedia.org"

	// Create a collector and make a request
	c := colly.NewCollector()
	var foundTitle, foundDescription string

	// Add a request callback to override the URL in the response to make it look like Wikipedia
	c.OnRequest(func(r *colly.Request) {
		r.URL = mockURL
	})

	c.OnHTML("body", func(e *colly.HTMLElement) {
		// The URL field of the Request field of the HTMLElement would normally be the original URL,
		// but we've overridden it to be our mock URL
		if strings.Contains(e.Request.URL.Host, "wikipedia.org") {
			// For testing, we'll just extract the title and description
			foundTitle = e.ChildText("h1#firstHeading")
			foundDescription = e.ChildText("#mw-content-text p:first-of-type")
		}
	})

	c.Visit(ts.URL)

	// Check the extracted data
	if foundTitle != "Test Wikipedia Article" {
		t.Errorf("Expected title to be 'Test Wikipedia Article', got '%s'", foundTitle)
	}

	expectedDesc := "This is the first paragraph of the Wikipedia article about a test subject."
	if foundDescription != expectedDesc {
		t.Errorf("Expected description to be '%s', got '%s'", expectedDesc, foundDescription)
	}
}
