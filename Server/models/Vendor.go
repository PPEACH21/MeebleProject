package models

import (
	"time"

	"google.golang.org/genproto/googleapis/type/latlng"
)

type Shop = struct {
	Address *latlng.LatLng `json:"address" firestore:"address"`
	Create_at time.Time `json:"create_at" firestore:"create_at"`
	Description string `json:"description" firestore:"description"`
	Order_active bool `json:"order_active" firestore:"order_active"`
	Rate float32 `json:"rate" firestore:"rate"`
	Reserve_active bool `json:"reserve_active" firestore:"reserve_active"`
	Shop_name string `json:"shop_name" firestore:"shop_name"`
	Status bool `json:"status" firestore:"status"`
	Type string `json:"type" firestore:"type"`
}


type Menu = struct {
	Name        string  `json:"name" firestore:"name"`
	Price       float32 `json:"price" firestore:"price"`
	Description string  `json:"description" firestore:"description"`
	Image       string  `json:"image" firestore:"image"`
}

type finance_date = struct {
	Date    time.Time `json:"date" firestore:"date"`
	Denied  int       `json:"denied" firestore:"denied"`
	Order   int       `json:"order" firestore:"order"`
	Success int       `json:"success" firestore:"success"`
	Total   int       `json:"total" firestore:"total"`
}
