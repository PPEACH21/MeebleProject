package service

import (
	"fmt"
	"os"
	"time"

	"cloud.google.com/go/firestore"
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

	docs,err := config.Client.Collection("User").Where("email", "==", user.Email).Limit(1).Documents(config.Ctx).Next()
	if err != nil {
        return c.Status(fiber.StatusNotFound).SendString("Email Not Found")
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
    token := jwt.New(jwt.SigningMethodHS256)
    claims := token.Claims.(jwt.MapClaims)
    claims["email"] = user.Email
    claims["role"] = "user"
    claims["exp"] = time.Now().Add(time.Minute * 20).Unix()

    t, err := token.SignedString([]byte(os.Getenv("JWT_SECRET")))
    if err != nil {
      return c.SendStatus(fiber.StatusInternalServerError)
    }
    
    _,err = docs.Ref.Update(config.Ctx,[]firestore.Update{
        {Path: "token", Value: t},
	})
    if err != nil{
        return c.Status(fiber.StatusInternalServerError).SendString(err.Error())
    }

	return c.JSON(fiber.Map{
		"message" : "Login success",
		"token": t,
	})
}