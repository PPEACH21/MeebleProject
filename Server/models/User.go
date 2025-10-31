package models

import "time"

type User = struct {
	Email      string    `json:"email" firestore:"email"`
	Username   string    `json:"username" firestore:"username"`
	Password   string    `json:"password" firestore:"password"`
	OTP_Verify string    `json:"otp_verify" firestore:"otp_verify"`
	Verified   bool      `json:"verified" firestore:"verified"`
	Cost       int       `json:"cost" firestore:"cost"`
	CreatedAt  time.Time `json:"createdAt" firestore:"createdAt"`
}

type Select = struct {
	MenuID string `json:"menuID firestore:menuID"`
	Note   string `json:"note firestore:note"`
	Count  string `json:"count firestore:count"`
	Cost   string `json:"cost firestore:cost"`
}

type OTP_Verify struct {
	Email    string `json:"email" firestore:"email"`
	Username string `json:"username" firestore:"username"`
	OTP      string `json:"otp" firestore:"otp"`
}

type OrderDTO struct {
	ID           string                 `json:"id"`
	OrderID      string                 `json:"orderId,omitempty"`
	ShopName     string                 `json:"shop_name,omitempty"`
	Status       string                 `json:"status,omitempty"`
	CreatedAt    interface{}            `json:"createdAt,omitempty"`    // firetore.Timestamp or time.Time or string
	CustomerName string                 `json:"customerName,omitempty"` // ✅ เพิ่มตรงนี้
	Raw          map[string]interface{} `json:"raw,omitempty"`
}
