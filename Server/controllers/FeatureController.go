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

// -------------------- part: shop/menu (คงเดิม) --------------------

func SetLocation(c *fiber.Ctx) error {
	userId := c.Params("ID")

	data := config.Client.Collection("vendors").
		Doc("foLSIgqAeG6qrH29kdo0").
		Collection("shops").
		Doc(userId)

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

	docs, err := data.Documents(ctx).GetAll()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "อ่านข้อมูลไม่สำเร็จ"})
	}

	newId := fmt.Sprintf("menu%d", len(docs)+1)

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
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	vendorId := c.Params("vendor_id")
	if vendorId == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "missing vendor_id",
		})
	}

	col := config.Client.Collection("vendors").Doc(vendorId).Collection("menu")

	docs, err := col.Documents(ctx).GetAll()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "ดึงข้อมูลไม่สำเร็จ",
		})
	}

	menus := make([]models.Menu, 0, len(docs))
	for _, d := range docs {
		var m models.Menu
		if err := d.DataTo(&m); err != nil {
			continue
		}
		m.ID = d.Ref.ID
		menus = append(menus, m)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success":   true,
		"vendor_id": vendorId,
		"menus":     menus,
	})
}

// -------------------- helpers (เวอร์ชันตะกร้าระดับบนสุด) --------------------

// cart/{customerId}
func topCartDoc(customerID string) *firestore.DocumentRef {
	if customerID == "" {
		customerID = "anon"
	}
	return config.Client.Collection("cart").Doc(customerID)
}

func ordersCol(vendorID, shopID string) *firestore.CollectionRef {
	return config.Client.
		Collection("vendors").Doc(vendorID).
		Collection("shops").Doc(shopID).
		Collection("orders")
}

func loadMenuByID(vendorID, menuID string) (*models.Menu, error) {
	snap, err := config.Client.
		Collection("vendors").Doc(vendorID).
		Collection("menu").Doc(menuID).
		Get(config.Ctx)
	if err != nil || !snap.Exists() {
		return nil, fmt.Errorf("menu not found")
	}
	var m models.Menu
	if err := snap.DataTo(&m); err != nil {
		return nil, err
	}
	m.ID = menuID
	return &m, nil
}

// -------------------- endpoints: Cart (top-level) --------------------

// GET /api/cart?customerId=
func GetCart(c *fiber.Ctx) error {
	customerID := c.Query("customerId")
	if customerID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "customerId is required"})
	}

	snap, err := topCartDoc(customerID).Get(config.Ctx)
	if err != nil || !snap.Exists() {
		// ยังไม่มี cart -> คืนว่าง
		return c.JSON(models.Cart{
			CustomerID: customerID,
			Items:      []models.CartItem{},
			Total:      0,
			UpdatedAt:  time.Now(),
		})
	}
	var cart models.Cart
	if err := snap.DataTo(&cart); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "cart decode error", "msg": err.Error()})
	}
	// เผื่อโครงสร้างเก่ายังไม่มี CustomerID
	if cart.CustomerID == "" {
		cart.CustomerID = customerID
	}
	return c.JSON(cart)
}

// POST /api/cart/add
// รับ: vendorId(ไม่บังคับ), shopId(ไม่บังคับ), customerId*, qty*, item.menuId*, item.{name,price,image,description}
func AddToCart(c *fiber.Ctx) error {
	var req models.AddToCartRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "BodyParser error", "msg": err.Error(),
		})
	}

	// ต้องมี: customerId (username), userId (doc id), menuId และ qty > 0
	if req.CustomerID == "" || req.UserID == "" || req.Item.MenuID == "" || req.Qty <= 0 {
		return c.Status(400).JSON(fiber.Map{
			"error": "customerId/userId/menuId/qty required",
		})
	}

	// ถ้า FE ไม่ส่ง name/price/image/description มา และมี vendorId -> เติมจากเมนู
	if (req.Item.Name == "" || req.Item.Price <= 0 || req.Item.Image == "" || req.Item.Description == "") && req.VendorID != "" {
		if m, err := loadMenuByID(req.VendorID, req.Item.MenuID); err == nil {
			if req.Item.Name == "" {
				req.Item.Name = m.Name
			}
			if req.Item.Price <= 0 {
				req.Item.Price = m.Price
			}
			if req.Item.Image == "" {
				req.Item.Image = m.Image
			}
			if req.Item.Description == "" {
				req.Item.Description = m.Description
			}
		}
	}

	// user_id ให้เป็น DocumentRef ของ users/{userId} (ไม่ใช่ username)
	userRef := config.Client.Collection("users").Doc(req.UserID)

	// อ้างอิงเมนู (optional)
	var menuRef *firestore.DocumentRef
	if req.VendorID != "" {
		menuRef = config.Client.Collection("vendors").Doc(req.VendorID).
			Collection("menu").Doc(req.Item.MenuID)
	}

	// cart/{customerId} — cart ผูกกับ username เพื่อเปิดตะกร้าตามชื่อได้ง่าย
	ref := topCartDoc(req.CustomerID)

	err := config.Client.RunTransaction(config.Ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		// โหลด cart เดิม
		var cart models.Cart
		snap, err := tx.Get(ref)
		if err != nil || !snap.Exists() {
			cart = models.Cart{
				CustomerID: req.CustomerID,
				Items:      []models.CartItem{},
				Total:      0,
				UpdatedAt:  time.Now(),
			}
		} else if err := snap.DataTo(&cart); err != nil {
			return err
		}

		// รวมรายการซ้ำตาม menuId
		found := false
		for i := range cart.Items {
			if cart.Items[i].ID == req.Item.MenuID {
				cart.Items[i].Qty += req.Qty
				if req.Item.Price > 0 {
					cart.Items[i].Price = req.Item.Price
				}
				if cart.Items[i].Name == "" {
					cart.Items[i].Name = req.Item.Name
				}
				if cart.Items[i].Image == "" {
					cart.Items[i].Image = req.Item.Image
				}
				if cart.Items[i].Description == "" {
					cart.Items[i].Description = req.Item.Description
				}
				if cart.Items[i].VendorID == "" {
					cart.Items[i].VendorID = req.VendorID
				}
				if cart.Items[i].ShopID == "" {
					cart.Items[i].ShopID = req.ShopID
				}
				if cart.Items[i].MenuRef == nil {
					cart.Items[i].MenuRef = menuRef
				}
				found = true
				break
			}
		}
		if !found {
			cart.Items = append(cart.Items, models.CartItem{
				ID:          req.Item.MenuID,
				Name:        req.Item.Name,
				Qty:         req.Qty,
				Price:       req.Item.Price,
				Image:       req.Item.Image,
				Description: req.Item.Description,
				VendorID:    req.VendorID,
				ShopID:      req.ShopID,
				MenuRef:     menuRef,
			})
		}

		// คำนวณยอดรวม
		var total float64
		for _, it := range cart.Items {
			total += float64(it.Qty) * it.Price
		}
		cart.Total = total
		cart.UpdatedAt = time.Now()

		// บันทึก — user_id เป็น DocumentRef ของ users/{userId}, customerId เป็น username
		return tx.Set(ref, map[string]interface{}{
			"user_id":    userRef,         // ✅ /users/{userId}
			"customerId": cart.CustomerID, // ✅ username
			"items":      cart.Items,
			"total":      cart.Total,
			"updatedAt":  cart.UpdatedAt,
		})
	})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "failed to add to cart", "msg": err.Error(),
		})
	}
	return c.JSON(fiber.Map{"message": "added to cart"})
}

// POST /api/cart/checkout
// ใช้ vendorId + shopId ตอนนี้เพื่อสร้าง order ให้ร้าน และล้าง cart/{customerId}
func CheckoutCart(c *fiber.Ctx) error {
	var req models.SimpleCartRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "BodyParser error", "msg": err.Error()})
	}
	// ต้องมี userId (doc id), customerId (username), vendorId, shopId
	if req.UserID == "" || req.CustomerID == "" || req.VendorID == "" || req.ShopID == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "userId/customerId/vendorId/shopId is required",
		})
	}

	cRef := topCartDoc(req.CustomerID)
	userRef := config.Client.Collection("users").Doc(req.UserID)

	var createdOrderID string
	err := config.Client.RunTransaction(config.Ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		snap, err := tx.Get(cRef)
		if err != nil || !snap.Exists() {
			return fiber.ErrNotFound
		}
		var cart models.Cart
		if err := snap.DataTo(&cart); err != nil {
			return err
		}
		if len(cart.Items) == 0 || cart.Total <= 0 {
			return fiber.ErrBadRequest
		}

		// เขียนออเดอร์ไปที่ร้าน
		oRef := ordersCol(req.VendorID, req.ShopID).NewDoc()
		order := models.Order{
			Items:      cart.Items,
			Total:      cart.Total,
			Status:     "awaiting_payment",
			CreatedAt:  time.Now(),
			CustomerID: req.CustomerID, // username
			// ถ้าต้องการเก็บอ้างอิงผู้ใช้ใน order ด้วยก็ทำได้:
			// UserRef: userRef,  // <- เพิ่ม field firestore.DocumentRef ใน models.Order ถ้าจะใช้
		}
		if err := tx.Set(oRef, order); err != nil {
			return err
		}
		createdOrderID = oRef.ID

		// ล้างตะกร้า: คงรูปแบบให้ user_id เป็น DocumentRef ของ users/{userId}
		return tx.Set(cRef, map[string]interface{}{
			"user_id":    userRef,        // ✅ DocumentRef ของผู้ใช้
			"customerId": req.CustomerID, // ✅ username
			"items":      []models.CartItem{},
			"total":      0,
			"updatedAt":  time.Now(),
		})
	})
	if err != nil {
		if err == fiber.ErrNotFound {
			return c.Status(404).JSON(fiber.Map{"error": "cart not found"})
		}
		if err == fiber.ErrBadRequest {
			return c.Status(400).JSON(fiber.Map{"error": "cart empty"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "checkout failed", "msg": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message": "order created (awaiting payment)",
		"orderId": createdOrderID,
	})
}
