package controllers

import (
	"cloud.google.com/go/firestore"
	"github.com/PPEACH21/MebleBackend-Web/config"
	"github.com/PPEACH21/MebleBackend-Web/models"
	"github.com/gofiber/fiber/v2"
)

func SetLocation(c *fiber.Ctx) error {
	userId := c.Params("ID")

	data := config.Client.Collection("vendor").
		Doc("foLSIgqAeG6qrH29kdo0").
		Collection("shop").
		Doc(userId)

	// เช็คว่า doc มีจริงไหม
	_, err := data.Get(config.Ctx)
	if err != nil {
		return c.Status(404).SendString("ไม่พบ shop นี้")
	}

	datanew := new(models.Shop)
	if err := c.BodyParser(datanew); err != nil {
		return c.Status(400).SendString("BodyParser error")
	}

	_, err = data.Update(config.Ctx, []firestore.Update{
		{Path: "latitude", Value: datanew.Latitude},
		{Path: "longitude", Value: datanew.Longitude},
	})
	if err != nil {
		return c.Status(500).SendString("Firestore update error")
	}

	return c.JSON(fiber.Map{
		"latitude":  datanew.Latitude,
		"longitude": datanew.Longitude,
	})
}
