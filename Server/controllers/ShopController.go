package controllers

import (
	"cloud.google.com/go/firestore"
	"github.com/PPEACH21/MebleBackend-Web/config"
	"github.com/PPEACH21/MebleBackend-Web/models"
	"github.com/gofiber/fiber/v2"
	"google.golang.org/genproto/googleapis/type/latlng"
)

func CreateShop(c *fiber.Ctx) error {
	shop := new(models.Shop)
	if err := c.BodyParser(shop); err != nil {
		return c.Status(fiber.StatusBadRequest).SendString(err.Error())
	}

	if shop.Shop_name == "" {
		return c.Status(fiber.StatusBadRequest).SendString("You must Have Shopname first")
	}

	if shop.Description == "" {
		shop.Description = "This shop has no description."
	}

	var vendorRef *firestore.DocumentRef
	if shop.Vendor_id != "" {
		vendorRef = config.Vendor.Doc(shop.Vendor_id)
	} else {
		vendorRef = nil
	}

	_, _, err := config.Shops.Add(config.Ctx, map[string]interface{}{
		"address": &latlng.LatLng{
			Latitude:  0,
			Longitude: 0,
		},
		"createAt":       firestore.ServerTimestamp,
		"description":    shop.Description,
		"order_active":   false,
		"rate":           0,
		"reserve_active": false,
		"shop_name":      shop.Shop_name,
		"status":         false,
		"type":           "default",
		"vendor_id":      vendorRef,
	})

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Error saving user")
	}
	return c.JSON(fiber.Map{
		"Shop_name":     shop.Shop_name,
		"Shop_vendorID": shop.Vendor_id,
		"message":       "Create success",
	})
}
