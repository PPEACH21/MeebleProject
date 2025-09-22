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

	vendorId := "foLSIgqAeG6qrH29kdo0"
	data := config.Client.Collection("vendor").
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
	ctx := context.Background()

	vendorId := "foLSIgqAeG6qrH29kdo0"
	data := config.Client.Collection("vendor").
		Doc(vendorId).
		Collection("menu")

	// อ่านเอกสารทั้งหมด
	docs, err := data.Documents(ctx).GetAll()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "ดึงข้อมูลไม่สำเร็จ"})
	}

	// แปลงเป็น slice ของ Menu
	menus := []models.Menu{}
	for _, doc := range docs {
		var m models.Menu
		if err := doc.DataTo(&m); err == nil {
			menus = append(menus, m)
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"menus":   menus,
	})
}
