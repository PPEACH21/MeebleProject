package controllers

import (
	"context"
	"fmt"
	"mime/multipart"
	"os"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/PPEACH21/MebleBackend-Web/config"
	"github.com/PPEACH21/MebleBackend-Web/models"
	"github.com/gofiber/fiber/v2"
	"google.golang.org/genproto/googleapis/type/latlng"
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
		{
			Path:  "address",
			Value: &latlng.LatLng{Latitude: datanew.Address.Latitude, Longitude: datanew.Address.Longitude},
		},
	})
	if err != nil {
		return c.Status(500).SendString("Firestore update error")
	}

	return c.JSON(fiber.Map{
		"address": &latlng.LatLng{Latitude: datanew.Address.Latitude, Longitude: datanew.Address.Longitude},
	})
}

func saveFile(c *fiber.Ctx, file *multipart.FileHeader) (string, error) {
	path := fmt.Sprintf("uploads/%d_%s", time.Now().Unix(), file.Filename)

	if err := os.MkdirAll("uploads", 0755); err != nil {
		return "", err
	}

	// 👇 ใช้ c.SaveFile() ไม่ใช่ fiber.SaveFile()
	if err := c.SaveFile(file, path); err != nil {
		return "", err
	}
	return path, nil
}

func AddMenu(c *fiber.Ctx) error {
	ctx := context.Background()

	vendorId := "fGencyRIvBlWcX9DXWBo"
	data := config.Client.Collection("vendors").
		Doc(vendorId).
		Collection("menu")

	var menu models.Menu
	if err := c.BodyParser(&menu); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "ข้อมูลไม่ถูกต้อง"})
	}

	// 🔹 ดึงจำนวนเมนูที่มีอยู่แล้ว
	docs, err := data.Documents(ctx).GetAll()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "อ่านข้อมูลไม่สำเร็จ"})
	}

	// 🔹 สร้าง docId ใหม่ เช่น menu1, menu2, ...
	newId := fmt.Sprintf("menu%d", len(docs)+1)

	// 🔹 เซฟข้อมูลโดยใช้ docId ที่เรากำหนดเอง
	_, err = data.Doc(newId).Set(ctx, menu)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "บันทึก Firestore ไม่สำเร็จ"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"id":      newId,
		"menu":    menu,
	})
}

func GetMenus(c *fiber.Ctx) error {
	// กำหนด timeout กันแฮงค์
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// รับ vendor_id จาก path: /vendors/:vendor_id/menu
	vendorId := c.Params("vendor_id")
	if vendorId == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "missing vendor_id",
		})
	}

	// vendors/{vendorId}/menu
	col := config.Client.Collection("vendors").Doc(vendorId).Collection("menu")

	// อ่านเอกสารทั้งหมด
	docs, err := col.Documents(ctx).GetAll()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "ดึงข้อมูลไม่สำเร็จ",
		})
	}

	// map -> []models.Menu (ตาม struct ที่ให้มา)
	menus := make([]models.Menu, 0, len(docs))
	for _, d := range docs {
		var m models.Menu
		if err := d.DataTo(&m); err != nil {
			continue // ข้ามเอกสารที่แปลงไม่ได้
		}
		menus = append(menus, m)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success":   true,
		"vendor_id": vendorId,
		"menus":     menus, // []Menu ที่ประกอบด้วย Name, Price, Description, Image
	})
}
