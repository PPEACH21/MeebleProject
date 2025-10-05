package service

import (
	"fmt"
	"os"
	"time"

	"github.com/PPEACH21/MebleBackend-Web/config"
	"github.com/PPEACH21/MebleBackend-Web/models"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

func Login(c *fiber.Ctx)error{
	user := new(models.User)
	if err := c.BodyParser(user) ; err!=nil{
        return  c.Status(fiber.StatusBadRequest).SendString(err.Error())
	}

	docs,err := config.User.Where("email", "==", user.Email).Limit(1).Documents(config.Ctx).Next()
	if err != nil {
		docs, err = config.Client.Collection("users").Where("username", "==", user.Username).Limit(1).Documents(config.Ctx).Next()
		if err != nil {
			return c.Status(fiber.StatusNotFound).SendString("Email or Username Not Found")
		}
    }
	
	var member models.User
    if err := docs.DataTo(&member); err != nil {
        return c.Status(fiber.StatusInternalServerError).SendString("Error parsing user data")
    }
    
    err = bcrypt.CompareHashAndPassword([]byte(member.Password), []byte(user.Password))
    if err != nil {
        return c.Status(fiber.StatusUnauthorized).SendString("Password Not Correct");
    }

    fmt.Println("Login Valid Correct!")
    claims := jwt.MapClaims{
		"user_id":docs.Ref.ID,
		"email": member.Email,
		"username": member.Username,
		"verified": member.Verified,
		"role":   "user",
		"exp":    time.Now().Add(time.Minute * 20).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	secret := os.Getenv("JWT_SECRET")
	t, err := token.SignedString([]byte(secret))
	if err != nil {
		return c.SendStatus(fiber.StatusInternalServerError)
	}

	c.Cookie(&fiber.Cookie{
		Name:     "token",
		Value:    t,
		Expires:  time.Now().Add(time.Minute * 5),
		HTTPOnly: false,    
		// Secure:   false,
		// SameSite: "Strict",
	})

	return c.JSON(fiber.Map{
		"user_id": docs.Ref.ID,
		"email": member.Email,
		"username" : member.Username,
		"role" : "user",
		"verified": member.Verified,
		"message": "login success",
	})
}