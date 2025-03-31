package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/arkouda/scrape-n-serve/db"
	"github.com/arkouda/scrape-n-serve/models"
	"github.com/arkouda/scrape-n-serve/services"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupTestDB initializes an in-memory SQLite database for testing
func setupTestDB() {
	var err error
	// Use in-memory SQLite for testing
	db.DB, err = gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		panic("Failed to connect to test database: " + err.Error())
	}
	
	// Migrate the schema
	db.DB.AutoMigrate(&models.ScrapedItem{})
	
	// Add some test data
	testItems := []models.ScrapedItem{
		{
			Title:       "Test Item 1",
			Description: "This is a test item description",
			URL:         "https://example.com/item1",
			ImageURL:    "https://example.com/images/item1.jpg",
			Price:       19.99,
			ScrapedAt:   time.Now(),
			Metadata:    `{"category": "Test Category"}`,
		},
		{
			Title:       "Test Item 2",
			Description: "Another test item description",
			URL:         "https://example.com/item2",
			ImageURL:    "https://example.com/images/item2.jpg",
			Price:       29.99,
			ScrapedAt:   time.Now().Add(-time.Hour),
			Metadata:    `{"category": "Another Category"}`,
		},
	}
	
	for _, item := range testItems {
		db.DB.Create(&item)
	}
}

func setupRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.Default()
	
	// Setup routes
	r.POST("/api/v1/scrape", StartScraping)
	r.GET("/api/v1/scrape/status", GetScrapingStatus)
	r.GET("/api/v1/data", GetScrapedData)
	r.GET("/api/v1/data/:id", GetItemById)
	
	return r
}

func TestMain(m *testing.M) {
	// Setup test database before running tests
	setupTestDB()
	
	// Run tests
	m.Run()
}

func TestStartScrapingWithoutURL(t *testing.T) {
	router := setupRouter()
	
	// Create a request with empty body
	req, _ := http.NewRequest("POST", "/api/v1/scrape", nil)
	w := httptest.NewRecorder()
	
	// Perform the request
	router.ServeHTTP(w, req)
	
	// Check response
	assert.Equal(t, http.StatusBadRequest, w.Code)
	
	// Parse response
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	
	assert.Nil(t, err)
	assert.Equal(t, "error", response["status"])
	assert.Equal(t, "URL is required", response["message"])
}

func TestStartScrapingWithURL(t *testing.T) {
	router := setupRouter()
	
	// Create a request with URL in JSON body
	body := map[string]string{"url": "https://example.com"}
	jsonBody, _ := json.Marshal(body)
	req, _ := http.NewRequest("POST", "/api/v1/scrape", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	
	w := httptest.NewRecorder()
	
	// Perform the request
	router.ServeHTTP(w, req)
	
	// Check response - should be Accepted since it's async
	assert.Equal(t, http.StatusAccepted, w.Code)
	
	// Parse response
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	
	assert.Nil(t, err)
	assert.Equal(t, "success", response["status"])
	assert.Equal(t, "Scraping started", response["message"])
	assert.Equal(t, "https://example.com", response["url"])
}

func TestStartScrapingWithURLQueryParam(t *testing.T) {
	// We need to create a new router for each test to ensure a clean state
	gin.SetMode(gin.TestMode)
	router := gin.Default()
	
	// Setup routes just for this test
	router.POST("/api/v1/scrape", StartScraping)
	
	// Reset the scraping state for this test
	services.ResetScrapingState()
	
	// Create a request with URL as query parameter
	req, _ := http.NewRequest("POST", "/api/v1/scrape?url=https://example.com&max_depth=3", nil)
	w := httptest.NewRecorder()
	
	// Perform the request
	router.ServeHTTP(w, req)
	
	// Check response - should be Accepted since it's async
	assert.Equal(t, http.StatusAccepted, w.Code)
	
	// Parse response
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	
	assert.Nil(t, err)
	assert.Equal(t, "success", response["status"])
	assert.Equal(t, "Scraping started", response["message"])
	assert.Equal(t, "https://example.com", response["url"])
}

func TestGetScrapingStatus(t *testing.T) {
	router := setupRouter()
	
	req, _ := http.NewRequest("GET", "/api/v1/scrape/status", nil)
	w := httptest.NewRecorder()
	
	// Perform the request
	router.ServeHTTP(w, req)
	
	// Check response
	assert.Equal(t, http.StatusOK, w.Code)
	
	// Parse response
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	
	assert.Nil(t, err)
	assert.Equal(t, "success", response["status"])
	
	// Scraping state should be a boolean
	_, exists := response["scraping"]
	assert.True(t, exists)
	
	// State should be a string (either "idle" or "running")
	state, exists := response["state"]
	assert.True(t, exists)
	assert.IsType(t, "", state)
}

func TestGetScrapedDataWithDefaults(t *testing.T) {
	router := setupRouter()
	
	req, _ := http.NewRequest("GET", "/api/v1/data", nil)
	w := httptest.NewRecorder()
	
	// Perform the request
	router.ServeHTTP(w, req)
	
	// Check response - should be OK
	assert.Equal(t, http.StatusOK, w.Code)
	
	// Parse response
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	
	assert.Nil(t, err)
	assert.Equal(t, "success", response["status"])
	
	// Should have count, total, limit, offset, and data fields
	_, exists := response["count"]
	assert.True(t, exists)
	
	_, exists = response["total"]
	assert.True(t, exists)
	
	_, exists = response["limit"]
	assert.True(t, exists)
	
	_, exists = response["offset"]
	assert.True(t, exists)
	
	_, exists = response["data"]
	assert.True(t, exists)
}

func TestGetScrapedDataWithParams(t *testing.T) {
	router := setupRouter()
	
	req, _ := http.NewRequest("GET", "/api/v1/data?limit=5&offset=10&sort=title&order=asc", nil)
	w := httptest.NewRecorder()
	
	// Perform the request
	router.ServeHTTP(w, req)
	
	// Check response - should be OK
	assert.Equal(t, http.StatusOK, w.Code)
	
	// Parse response
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	
	assert.Nil(t, err)
	assert.Equal(t, "success", response["status"])
	
	// Check the limit and offset values
	limit, exists := response["limit"]
	assert.True(t, exists)
	assert.Equal(t, float64(5), limit)
	
	offset, exists := response["offset"]
	assert.True(t, exists)
	assert.Equal(t, float64(10), offset)
}

func TestGetItemByIdWithInvalidId(t *testing.T) {
	router := setupRouter()
	
	req, _ := http.NewRequest("GET", "/api/v1/data/invalid", nil)
	w := httptest.NewRecorder()
	
	// Perform the request
	router.ServeHTTP(w, req)
	
	// Check response - should be Bad Request
	assert.Equal(t, http.StatusBadRequest, w.Code)
	
	// Parse response
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	
	assert.Nil(t, err)
	assert.Equal(t, "error", response["status"])
	assert.Equal(t, "Invalid ID format", response["message"])
}