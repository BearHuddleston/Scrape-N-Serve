package models

import (
	"time"

	"gorm.io/gorm"
)

// ScrapedItem represents data scraped from the target website
type ScrapedItem struct {
	gorm.Model
	Title       string    `json:"title" gorm:"index"`
	Description string    `json:"description"`
	URL         string    `json:"url" gorm:"uniqueIndex"`
	ImageURL    string    `json:"image_url"`
	Price       float64   `json:"price"`
	ScrapedAt   time.Time `json:"scraped_at" gorm:"index"`
	Metadata    string    `json:"metadata" gorm:"type:jsonb"`
}
