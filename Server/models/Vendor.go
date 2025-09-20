package models

import (
	"time"
)

type Shop = struct {
	Rate        float32 `json:"rate" firestore:"rate"`
	Description string  `json:"description" firestore:"description"`
	Name        string  `json:"name" firestore:"name"`
	Type        string  `json:"type" firestore:"type"`
	Status      bool    `json:"status" firestore:"status"`
	Latitude    float32 `json:"latitude" firestore:"latitude"`
	Longitude   float32 `json:"longitude" firestore:"longitude"`
}

type Menu = struct {
	Name        string  `json:"name" firestore:"name"`
	Price       float32 `json:"price" firestore:"price"`
	Description string  `json:"description" firestore:"description"`
	Image       string  `json:"img" firestore:"img"`
}

type finance_date = struct {
	Date    time.Time `json:"date" firestore:"date"`
	Denied  int       `json:"denied" firestore:"denied"`
	Order   int       `json:"order" firestore:"order"`
	Success int       `json:"success" firestore:"success"`
	Total   int       `json:"total" firestore:"total"`
}
