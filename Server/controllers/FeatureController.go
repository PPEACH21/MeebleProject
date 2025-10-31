package controllers

import (
	"context"
	"fmt"
	"mime/multipart"
	"os"
	"reflect"
	"strings"
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

func GetMenus(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	shopId := c.Params("shopId")
	if shopId == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing shopId"})
	}

	col := config.Client.Collection("shops").Doc(shopId).Collection("menu")
	docs, err := col.Documents(ctx).GetAll()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "อ่านข้อมูลเมนูไม่สำเร็จ"})
	}

	menus := make([]models.Menu, 0, len(docs))
	for _, d := range docs {
		var m models.Menu
		if err := d.DataTo(&m); err == nil {
			m.ID = d.Ref.ID
			menus = append(menus, m)
		}
	}

	return c.JSON(fiber.Map{
		"menus": menus, // ✅ ส่งแค่เมนูตามที่ต้องการ
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
		// ยังไม่มี cart -> คืนว่าง (ใช้คีย์ตัวเล็กให้ตรง FE)
		return c.JSON(fiber.Map{
			"customerId": customerID,
			"shop_name":  "",
			"items":      []models.CartItem{},
			"total":      0,
			"updatedAt":  time.Now(),
		})
	}

	// ✅ คืน map จาก Firestore ตรง ๆ เพื่อรักษา key เป็นตัวเล็ก (items, total, shop_name, shopId, vendorId)
	return c.JSON(snap.Data())
}

func AddToCart(c *fiber.Ctx) error {
	var req models.AddToCartRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "BodyParser error", "msg": err.Error(),
		})
	}

	// 🔎 DEBUG: ดู payload ที่เข้ามาจริง
	fmt.Println("========== DEBUG AddToCart ==========")
	fmt.Printf("Raw Payload: %+v\n", req)
	fmt.Println("=====================================")

	// ✅ ตรวจ required fields แบบระบุทีละช่อง
	missing := []string{}
	if strings.TrimSpace(req.CustomerID) == "" {
		missing = append(missing, "customerId")
	}
	if strings.TrimSpace(req.UserID) == "" {
		missing = append(missing, "userId")
	}
	if strings.TrimSpace(req.ShopID) == "" {
		missing = append(missing, "shopId")
	}
	if strings.TrimSpace(req.Shop_name) == "" {
		// รองรับกรณี FE ส่ง shopName มาแทน shop_name
		if v := reflect.ValueOf(req).FieldByName("ShopName"); v.IsValid() {
			if s, ok := v.Interface().(string); ok && strings.TrimSpace(s) != "" {
				req.Shop_name = s
			}
		}
		if strings.TrimSpace(req.Shop_name) == "" {
			missing = append(missing, "shop_name")
		}
	}
	if strings.TrimSpace(req.Item.MenuID) == "" {
		missing = append(missing, "menuId")
	}
	if req.Qty <= 0 {
		missing = append(missing, "qty (> 0)")
	}

	if len(missing) > 0 {
		fmt.Printf("❌ Missing fields: %v\n", missing)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "missing required fields",
			"missing": missing,
			"exampleBody": map[string]any{
				"customerId": "peach",
				"userId":     "abc123",
				"shopId":     "Shop01",
				"shop_name":  "KU Canteen",
				"item": map[string]any{
					"menuId": "MENU001",
				},
				"qty": 1,
			},
			"note": "รองรับทั้ง shop_name และ shopName; qty ต้องมากกว่า 0",
		})
	}

	// เติมข้อมูลเมนูถ้าขาด (optional)
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

	userRef := config.Client.Collection("users").Doc(req.UserID)

	var menuRef *firestore.DocumentRef
	if req.VendorID != "" {
		menuRef = config.Client.Collection("vendors").Doc(req.VendorID).
			Collection("menu").Doc(req.Item.MenuID)
	}

	ref := topCartDoc(req.CustomerID)

	err := config.Client.RunTransaction(config.Ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		var cart models.Cart
		snap, err := tx.Get(ref)
		if err != nil || !snap.Exists() {
			cart = models.Cart{
				CustomerID: req.CustomerID,
				Shop_name:  req.Shop_name,
				Items:      []models.CartItem{},
				Total:      0,
				UpdatedAt:  time.Now(),
			}
			fmt.Println("ℹ️  Cart not found -> create new")
		} else if err := snap.DataTo(&cart); err != nil {
			fmt.Println("❌ Error decoding cart:", err)
			return err
		} else {
			fmt.Printf("🔎 Current Cart: %+v\n", cart)
		}

		// 🔒 Lock ด้วย shopId เท่านั้น
		existingShop := ""
		if len(cart.Items) > 0 {
			existingShop = cart.Items[0].ShopID
		}
		incomingShop := req.ShopID

		if len(cart.Items) > 0 {
			if existingShop == "" && incomingShop != "" {
				existingShop = incomingShop
			}
			if incomingShop == "" || existingShop == "" || existingShop != incomingShop {
				msg := fmt.Sprintf("CART_SHOP_CONFLICT: cart locked to shop=%s, incoming shop=%s", existingShop, incomingShop)
				fmt.Println("❌", msg)
				return fiber.NewError(fiber.StatusConflict, msg)
			}
		}

		// ✅ รวมรายการซ้ำในร้านเดียวกัน (shopId + menuId)
		found := false
		for i := range cart.Items {
			if cart.Items[i].ShopID == req.ShopID && cart.Items[i].ID == req.Item.MenuID {
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
				VendorID:    req.VendorID, // optional
				ShopID:      req.ShopID,   // 🔑 สำคัญ
				MenuRef:     menuRef,
			})
		}

		// รวมยอด
		var total float64
		for _, it := range cart.Items {
			total += float64(it.Qty) * it.Price
		}
		cart.Total = total
		cart.UpdatedAt = time.Now()

		// เขียนกลับด้วยคีย์ตัวเล็ก (ตรงกับ FE)
		writeData := map[string]interface{}{
			"user_id":    userRef,
			"customerId": cart.CustomerID,
			"shop_name":  req.Shop_name,
			"items":      cart.Items,
			"total":      cart.Total,
			"updatedAt":  cart.UpdatedAt,
			"shopId":     req.ShopID, // 🔒 lock shop
		}
		if req.VendorID != "" {
			writeData["vendorId"] = req.VendorID
		}

		fmt.Printf("📝 Write Cart: shopId=%s total=%.2f items=%d\n", req.ShopID, cart.Total, len(cart.Items))
		return tx.Set(ref, writeData) // หรือใช้ MergeAll ก็ได้ แล้วแต่ต้องการ
	})

	if err != nil {
		if fe, ok := err.(*fiber.Error); ok && fe.Code == fiber.StatusConflict {
			return c.Status(fe.Code).JSON(fiber.Map{
				"error": "ตะกร้าถูกล็อกไว้ที่ร้านเดิม โปรดชำระ/ลบของเดิมก่อนสั่งร้านอื่น",
				"code":  "CART_SHOP_CONFLICT",
				"msg":   fe.Message,
			})
		}
		fmt.Println("❌ AddToCart failed:", err)
		return c.Status(500).JSON(fiber.Map{"error": "failed to add to cart", "msg": err.Error()})
	}

	fmt.Println("✅ AddToCart success")
	return c.JSON(fiber.Map{"message": "added to cart"})
}

func toFloat(v interface{}) float64 {
	switch t := v.(type) {
	case int:
		return float64(t)
	case int64:
		return float64(t)
	case float64:
		return t
	case float32:
		return float64(t)
	default:
		return 0
	}
}
func toInt(v interface{}) int {
	switch t := v.(type) {
	case int:
		return t
	case int64:
		return int(t)
	case float64:
		return int(t)
	case float32:
		return int(t)
	default:
		return 0
	}
}

// CheckoutCartFromDB: อ่าน /cart/{customerId} แล้วสร้าง history + หักเงิน + เคลียร์ตะกร้า
func CheckoutCartFromDB(c *fiber.Ctx) error {
	type Req struct {
		UserID     string `json:"userId"`
		CustomerID string `json:"customerId"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "BodyParser error", "msg": err.Error()})
	}
	if strings.TrimSpace(req.UserID) == "" || strings.TrimSpace(req.CustomerID) == "" {
		return c.Status(400).JSON(fiber.Map{"error": "userId/customerId is required"})
	}

	cartRef := config.Client.Collection("cart").Doc(req.CustomerID)
	userRef := config.Client.Collection("users").Doc(req.UserID)

	var createdHistoryID string

	err := config.Client.RunTransaction(config.Ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		// 1) โหลด cart
		cs, err := tx.Get(cartRef)
		if err != nil || !cs.Exists() {
			return fiber.NewError(fiber.StatusNotFound, "cart not found")
		}
		var cart struct {
			CustomerID string                   `firestore:"customerId"`
			UserIDPath interface{}              `firestore:"user_id"` // อนุโลมทั้ง ref หรือ string
			ShopID     string                   `firestore:"shopId"`
			ShopName   string                   `firestore:"shop_name"`
			Items      []map[string]interface{} `firestore:"items"`
			Total      interface{}              `firestore:"total"` // อนุโลมชนิด
		}
		if err := cs.DataTo(&cart); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "invalid cart data")
		}
		if len(cart.Items) == 0 {
			return fiber.NewError(fiber.StatusBadRequest, "cart empty")
		}

		// 2) คำนวณ total ใหม่จาก items
		var recomputed float64
		for _, it := range cart.Items {
			price := toFloat(it["price"])
			if price == 0 {
				price = toFloat(it["Price"])
			}
			qty := toInt(it["qty"])
			if qty == 0 {
				qty = toInt(it["Qty"])
			}
			if price > 0 && qty > 0 {
				recomputed += price * float64(qty)
			}
		}
		if recomputed <= 0 {
			recomputed = toFloat(cart.Total) // fallback
		}
		if recomputed <= 0 {
			return fiber.NewError(fiber.StatusBadRequest, "cannot compute total")
		}

		// 3) ตรวจเงินผู้ใช้
		us, err := tx.Get(userRef)
		if err != nil || !us.Exists() {
			return fiber.NewError(fiber.StatusNotFound, "user not found")
		}
		var currentCost float64
		if v, ok := us.Data()["Cost"]; ok && v != nil {
			switch t := v.(type) {
			case int64:
				currentCost = float64(t)
			case int:
				currentCost = float64(t)
			case float64:
				currentCost = t
			case string:
				currentCost = toFloat(t) // ✅ รองรับ string
			default:
				return fiber.NewError(fiber.StatusInternalServerError, "invalid Cost type on user")
			}
		}
		if currentCost < recomputed {
			return fiber.NewError(402, fmt.Sprintf("insufficient funds: have %.2f, need %.2f", currentCost, recomputed))
		}

		// 4) เขียน history
		historyRef := config.Client.Collection("orders").NewDoc()
		createdHistoryID = historyRef.ID
		if err := tx.Set(historyRef, map[string]interface{}{
			"historyId":  createdHistoryID,
			"userId":     req.UserID,
			"userRef":    userRef,
			"customerId": req.CustomerID,
			"shopId":     cart.ShopID,
			"shop_name":  cart.ShopName,
			"items":      cart.Items,
			"total":      recomputed,
			"status":     "prepare",
			"createdAt":  time.Now(),
			"updatedAt":  time.Now(),
		}); err != nil {
			return err
		}

		// 5) หักเงินผู้ใช้
		if err := tx.Update(userRef, []firestore.Update{
			{Path: "Cost", Value: currentCost - recomputed},
			{Path: "updatedAt", Value: time.Now()},
		}); err != nil {
			return err
		}

		// 6) ล้างตะกร้า (คง user_id ไว้ได้ จะเป็น ref หรือ string ก็ได้)
		return tx.Set(cartRef, map[string]interface{}{
			"user_id":    cart.UserIDPath,
			"customerId": req.CustomerID,
			"shopId":     "",
			"shop_name":  "",
			"items":      []interface{}{},
			"total":      0,
			"updatedAt":  time.Now(),
		}, firestore.MergeAll)
	})

	if err != nil {
		if fe, ok := err.(*fiber.Error); ok {
			return c.Status(fe.Code).JSON(fiber.Map{"error": fe.Message})
		}
		return c.Status(500).JSON(fiber.Map{"error": "checkout failed", "msg": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message":   "history created & user charged & cart cleared",
		"historyId": createdHistoryID,
	})
}

// PATCH /api/cart/qty
// body: { vendorId, shopId, customerId, menuId, qty }
func UpdateCartQty(c *fiber.Ctx) error {
	var req models.UpdateQtyRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "BodyParser error", "msg": err.Error()})
	}
	if req.CustomerID == "" || req.MenuID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "customerId/menuId is required"})
	}

	ref := topCartDoc(req.CustomerID)

	err := config.Client.RunTransaction(config.Ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		snap, err := tx.Get(ref)
		if err != nil || !snap.Exists() {
			return fiber.ErrNotFound
		}
		var cart models.Cart
		if err := snap.DataTo(&cart); err != nil {
			return err
		}

		// หา item ตาม menuId (== CartItem.ID)
		idx := -1
		for i, it := range cart.Items {
			if it.ID == req.MenuID {
				idx = i
				break
			}
		}
		if idx == -1 {
			return fiber.ErrNotFound
		}

		// ปรับรายการ
		if req.Qty <= 0 {
			// ลบรายการ
			cart.Items = append(cart.Items[:idx], cart.Items[idx+1:]...)
		} else {
			// อัปเดตจำนวน
			cart.Items[idx].Qty = req.Qty

			// อัปเดต meta เฉพาะถ้าส่งมา (optional)
			if cart.Items[idx].VendorID == "" && req.VendorID != "" {
				cart.Items[idx].VendorID = req.VendorID
			}
			if cart.Items[idx].ShopID == "" && req.ShopID != "" {
				cart.Items[idx].ShopID = req.ShopID
			}
		}

		// คำนวณยอดรวมใหม่
		var total float64
		for _, it := range cart.Items {
			total += float64(it.Qty) * it.Price
		}

		updates := []firestore.Update{
			{Path: "customerId", Value: cart.CustomerID},
			{Path: "items", Value: cart.Items},
			{Path: "total", Value: total},
			{Path: "updatedAt", Value: time.Now()},
		}

		// ✅ ถ้าตะกร้าว่าง → ล้างชื่อร้าน
		if len(cart.Items) == 0 || total <= 0 {
			updates = append(updates, firestore.Update{Path: "shop_name", Value: ""})
			// (ถ้าต้องการล้างข้อมูลอื่น ๆ เช่น vendorId/shopId ที่ระดับ cart ก็เพิ่มที่นี่ได้)
		}

		return tx.Update(ref, updates)
	})

	if err != nil {
		if err == fiber.ErrNotFound {
			return c.Status(404).JSON(fiber.Map{"error": "cart or item not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "update qty failed", "msg": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "ok"})
}
