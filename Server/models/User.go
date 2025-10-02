package models

import "time"

type User = struct {
	Email     string    `json:"email" firestore:"email"`
	Username string	`json:"username" firestore:"username"`
	Password  string    `json:"password" firestore:"password"`
	OTP_Verify string `json:"otp_verify" firestore:"otp_verify"`
	Verified 	bool	`json:"verified" firestore:"verified"`
	Cost 	int	`json:"cost" firestore:"cost"`
	CreatedAt time.Time `json:"createdAt" firestore:"createdAt"`
}

type Select = struct {
	MenuID string `json:"menuID firestore:menuID"`
	Note string `json:"note firestore:note"`
	Count string `json:"count firestore:count"`
	Cost string `json:"cost firestore:cost"`
}