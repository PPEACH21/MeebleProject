package models
import "time"

type User = struct {
	Usename string	`json:"username firestore:username"`
	Cost 	string	`json:"cost firestore:cost"`
	Email     string    `json:"email" firestore:"email"`
	Password  string    `json:"password" firestore:"password"`
	Token     string    `json:"token" firestore:"token"`
	CreatedAt time.Time `json:"createdAt" firestore:"createdAt"`
}

type Select = struct {
	MenuID string `json:"menuID firestore:menuID"`
	Note string `json:"note firestore:note"`
	Count string `json:"count firestore:count"`
	Cost string `json:"cost firestore:cost"`
}