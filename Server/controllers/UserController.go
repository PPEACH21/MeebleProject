package controllers

import (
	"fmt"
	"log"

	"cloud.google.com/go/firestore"
	"github.com/PPEACH21/MebleBackend-Web/config"
	"github.com/PPEACH21/MebleBackend-Web/models"
	"github.com/gofiber/fiber/v2"
	"google.golang.org/api/iterator"
)

func GetShop(c *fiber.Ctx) error {
	var shop []models.Shop
	data := config.Shops.Documents(config.Ctx)
	for{
		doc, err := data.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return c.Status(fiber.StatusBadRequest).SendString(err.Error())
		}

		var u models.Shop
		if err := doc.DataTo(&u); err != nil {
			log.Println("error convert:", err)
			continue
		}
		
		if u.Vendor_ref != nil {
			u.Vendor_id = u.Vendor_ref.ID
		} else {
			u.Vendor_id = ""
		}

		// u.Vendor_id = doc.Ref.ID 
		shop = append(shop, u)
	}
	return c.Status(fiber.StatusOK).JSON(shop)
}

func VerifiedUser(c *fiber.Ctx) error {
	userId := c.Params("id")

	fmt.Println("User: ",userId)

	data := config.User.Doc(userId)
	docRef,err := data.Get(config.Ctx)
	if err != nil{
		return c.Status(fiber.StatusBadRequest).SendString("Not user ID")
	}
	
	_,err = docRef.Ref.Update(config.Ctx,[]firestore.Update{
		{
			Path: "verified",
			Value: true,
		},
	})
	if err!=nil{
		return c.Status(fiber.StatusBadRequest).SendString("Update data Error")
	}


	return c.Status(fiber.StatusOK).JSON(data)
}


func UserProfile(c *fiber.Ctx)error{
	userID := c.Params("id")
	fmt.Println("User: ",userID)

	data:= config.User.Doc(userID)
	docRef,err := data.Get(config.Ctx)
	if err != nil{
		return c.Status(fiber.StatusBadRequest).SendString("Not user ID")
	}

	userData := docRef.Data()
	if userData == nil {
		return c.Status(fiber.StatusNotFound).SendString("User not found")
	}
	return c.Status(fiber.StatusOK).JSON(userData);
}