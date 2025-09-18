package middlewares

import (
	"cloud.google.com/go/firestore"
	"github.com/PPEACH21/MebleBackend-Web/config"
	"github.com/PPEACH21/MebleBackend-Web/models"
	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

func CreateUser(c *fiber.Ctx) error {
	user := new(models.User)
	if err := c.BodyParser(user) ; err!=nil{
        return  c.Status(fiber.StatusBadRequest).SendString(err.Error())
	}
	
	_,err := config.Client.Collection("User").Where("email","==",user.Email).Limit(1).Documents(config.Ctx).Next()
	if err == nil{
		return c.Status(fiber.StatusBadRequest).SendString("email has already")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Error hashing password")
	}

	user.Password = string(hashedPassword)

	_, _, err = config.Client.Collection("User").Add(config.Ctx,map[string]interface{}{
		"email":     user.Email,
		"password":   user.Password,
		"token":  user.Token,
		"createdat": firestore.ServerTimestamp,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Error saving user")
	}

	return c.JSON(fiber.Map{
		"message" : "Create success",
		
	})
}