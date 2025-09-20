package controllers

import (
	"log"

	"github.com/PPEACH21/MebleBackend-Web/config"
	"github.com/PPEACH21/MebleBackend-Web/models"
	"github.com/gofiber/fiber/v2"
	"google.golang.org/api/iterator"
)

func GetShop(c *fiber.Ctx) error {
	var shop []models.Shop
	// data := config.Client.Collection("vendor").Doc("foLSIgqAeG6qrH29kdo0").Collection("shop").Documents(config.Ctx)
	data := config.Client.CollectionGroup("shop").Documents(config.Ctx)
	for {
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
		shop = append(shop,models.Shop{
			Rate: u.Rate,
			Description: u.Description,
			Name: u.Name,
			Type: u.Type,
			Status:u.Status,
		})
	}
	return c.Status(fiber.StatusOK).JSON(shop)
}