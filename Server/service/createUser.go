package service

import (
	"fmt"

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

	if(user.Email=="" || user.Password=="" || user.Username ==""){
		return  c.Status(fiber.StatusBadRequest).SendString("Please fill in all required fields.")
	}

	_,err := config.User.Where("email","==",user.Email).Limit(1).Documents(config.Ctx).Next()
	if err == nil{
		return c.Status(fiber.StatusBadRequest).SendString("email has already")
	}

	_,err = config.User.Where("username","==",user.Username).Limit(1).Documents(config.Ctx).Next()
	if err == nil{
		return c.Status(fiber.StatusBadRequest).SendString("Username have been Already")
	}
	
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Error hashing password")
	}

	user.Password = string(hashedPassword)

	_, _, err = config.User.Add(config.Ctx,map[string]interface{}{
		"email":     user.Email,
		"username": 	user.Username,
		"password":   user.Password,
		"otp_verify": "",
		"verified": false,
		"Cost": 0,
		"createdat": firestore.ServerTimestamp,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Error saving user")
	}

	return c.JSON(fiber.Map{
		"email":     user.Email,
		"username": 	user.Username,
		"message" : "Create success",
	})
}

func ChangePassword(c *fiber.Ctx)error{
	user := new(models.User)
	if err := c.BodyParser(user); err != nil {
    return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
        "error": "Invalid request body",
    })
	}
	fmt.Println(user)
	
	data,err := config.User.Where("email","==",user.Email).Documents(config.Ctx).GetAll()
	if err!=nil{
		return c.Status(fiber.StatusBadGateway).SendString("Get data error")
	}
	
	
	if len(data) == 0 {
		return c.Status(fiber.StatusNotFound).SendString("not data")
		
	}
	
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Error hashing password")
	}
	
	docRef := data[0].Ref
	_, err = docRef.Update(config.Ctx, []firestore.Update{
		{Path: "password", Value: string(hashedPassword)},
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error updating password",
		})
	}
	
	fmt.Println("updating password Complete")
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Password changed successfully",
	})
}