package models

import "time"

type User = struct {
	Email     string    `json:"email" firestore:"email"`
	Password  string    `json:"password" firestore:"password"`
	Token     string    `json:"token" firestore:"token"`
	CreatedAt time.Time `json:"createdAt" firestore:"createdAt"`
}