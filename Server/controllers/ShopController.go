package controllers

import (
	"context"
	"fmt"
	"math"
	"net/http"
	"sort"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/PPEACH21/MebleBackend-Web/config"
	"github.com/PPEACH21/MebleBackend-Web/models"
	"github.com/gofiber/fiber/v2"
	"google.golang.org/api/iterator"
	"google.golang.org/genproto/googleapis/type/latlng"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
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

func GetShopByVendor(c *fiber.Ctx) error {
	ctx := context.Background()

	vendorId := c.Params("vendorId")
	if vendorId == "" {
		return c.Status(400).JSON(fiber.Map{"error": "ต้องระบุ vendorId"})
	}

	// ทำ DocumentRef ไปที่ vendors/{vendorId}
	vendorRef := config.Client.Collection("vendors").Doc(vendorId)

	// query shops ที่ vendor_id == vendorRef
	iter := config.Client.Collection("shops").
		Where("vendor_id", "==", vendorRef).
		Documents(ctx)
	defer iter.Stop()

	shops := make([]map[string]interface{}, 0)
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "อ่านข้อมูลไม่สำเร็จ"})
		}
		m := doc.Data()
		m["id"] = doc.Ref.ID
		// (ออปชัน) แปลง vendor_id document ref → id
		if v, ok := m["vendor_id"].(*firestore.DocumentRef); ok && v != nil {
			m["vendorId"] = v.ID
		}
		shops = append(shops, m)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"count":   len(shops),
		"shops":   shops,
	})
}

func AddMenu(c *fiber.Ctx) error {
	ctx := context.Background()

	shopId := c.Params("shopId")
	if shopId == "" {
		return c.Status(400).JSON(fiber.Map{"error": "ต้องระบุ shopId"})
	}

	// 1) โหลด shop จากท็อปเลเวล /shops/{shopId}
	shopSnap, err := config.Client.Collection("shops").Doc(shopId).Get(ctx)
	if err != nil {
		// ถ้าคุณมี helper statusFromErr ก็ใช้ได้ แต่แนะนำใช้ codes.NotFound โดยตรง
		// เช่น: if status.Code(err) == codes.NotFound { ... }
		return c.Status(404).JSON(fiber.Map{"error": "ไม่พบร้านนี้"})
	}

	// (ออปชัน) อ่าน vendor_id เผื่ออยากเก็บ vendorId ลงในเมนูด้วย
	var shopMeta struct {
		VendorRef *firestore.DocumentRef `firestore:"vendor_id"`
	}
	_ = shopSnap.DataTo(&shopMeta)
	var vendorId string
	if shopMeta.VendorRef != nil {
		vendorId = shopMeta.VendorRef.ID
	}

	// 2) parse body -> models.Menu (สมมติว่ามีฟิลด์ Name, Price, Description, Image)
	var menu models.Menu
	if err := c.BodyParser(&menu); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "ข้อมูลไม่ถูกต้อง"})
	}
	// (กันพลาดเล็กน้อย)
	if menu.Name == "" || menu.Price <= 0 {
		return c.Status(400).JSON(fiber.Map{"error": "กรอกชื่อ/ราคาให้ถูกต้อง"})
	}

	// 3) เขียนลง path ที่เป็นแหล่งจริง: /shops/{shopId}/menu
	menuCol := config.Client.Collection("shops").Doc(shopId).Collection("menu")
	newDoc := menuCol.NewDoc()

	// ใส่ id/อ้างอิง/เวลา (ปรับให้เข้ากับ struct ของคุณ)
	// หมายเหตุ: ใน Go Firestore ใส่ ServerTimestamp ได้ด้วยค่า sentinel นี้
	data := map[string]interface{}{
		"id":          newDoc.ID,
		"name":        menu.Name,
		"price":       menu.Price,
		"description": menu.Description,
		"image":       menu.Image,
		"shopId":      shopId,
		"vendorId":    vendorId, // ว่างได้ ถ้าไม่มี vendor
		"createdAt":   firestore.ServerTimestamp,
		"updatedAt":   firestore.ServerTimestamp,
	}

	if _, err := newDoc.Set(ctx, data); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "บันทึก Firestore ไม่สำเร็จ"})
	}

	// 4) อัปเดตราคา min/max ของร้าน (เวอร์ชันอ่านจาก /shops/{shopId}/menu)
	if minP, maxP, err := ComputeShopPriceRangeSimple("", shopId); err != nil {
		fmt.Println("❌ Recompute error:", err)
	} else {
		fmt.Printf("✅ อัปเดตราคา shop %s: %.2f - %.2f\n", shopId, minP, maxP)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"id":      newDoc.ID,
		"menu":    data,
	})
}

// helper: แปลง error จาก Firestore เป็น code (optional)
func statusFromErr(err error) (int, bool) {
	// ใส่ logic ตามที่คุณใช้จัดการ error code/GRPC status ในโปรเจกต์
	return 0, false
}

func UpdateShopStatus(c *fiber.Ctx) error {
	shopId := c.Params("id")
	if shopId == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "shopId required"})
	}

	var body struct {
		Status bool `json:"status"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}

	docRef := config.Client.Collection("shops").Doc(shopId)
	_, err := docRef.Update(config.Ctx, []firestore.Update{
		{Path: "status", Value: body.Status},
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"status":  body.Status,
	})
}
func UpdateReserveStatus(c *fiber.Ctx) error {
	shopId := c.Params("id")
	if shopId == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "shopId required"})
	}

	var body struct {
		ReserveActive bool `json:"reserve_active"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}

	docRef := config.Client.Collection("shops").Doc(shopId)
	_, err := docRef.Update(config.Ctx, []firestore.Update{
		{Path: "reserve_active", Value: body.ReserveActive},
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update"})
	}

	return c.JSON(fiber.Map{
		"success":        true,
		"reserve_active": body.ReserveActive,
	})
}

// controllers/menu_update.go
func UpdateMenu(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	shopId := c.Params("shopId")
	menuId := c.Params("menuId")
	if shopId == "" || menuId == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing shopId or menuId"})
	}

	doc := config.Client.Collection("shops").Doc(shopId).Collection("menu").Doc(menuId)

	var in struct {
		Name        *string  `json:"name"`
		Description *string  `json:"description"`
		Image       *string  `json:"image"`
		Price       *float64 `json:"price"`
		Active      *bool    `json:"active"` // เผื่ออยากแก้พร้อมกัน
	}
	if err := c.BodyParser(&in); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}

	updates := []firestore.Update{}
	if in.Name != nil {
		updates = append(updates, firestore.Update{Path: "name", Value: strings.TrimSpace(*in.Name)})
	}
	if in.Description != nil {
		updates = append(updates, firestore.Update{Path: "description", Value: strings.TrimSpace(*in.Description)})
	}
	if in.Image != nil {
		updates = append(updates, firestore.Update{Path: "image", Value: *in.Image})
	}
	if in.Price != nil {
		updates = append(updates, firestore.Update{Path: "price", Value: *in.Price})
	}
	if in.Active != nil {
		updates = append(updates, firestore.Update{Path: "active", Value: *in.Active})
	}
	updates = append(updates, firestore.Update{Path: "updatedAt", Value: time.Now()})

	if len(updates) == 1 { // มีแต่ updatedAt แปลว่าไม่ได้ส่งอะไรมาแก้
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "no fields to update"})
	}

	if _, err := doc.Update(ctx, updates); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "update failed"})
	}

	// คืนค่าล่าสุดให้ FE
	snap, err := doc.Get(ctx)
	if err != nil {
		return c.JSON(fiber.Map{"success": true})
	}
	var out models.Menu
	if err := snap.DataTo(&out); err == nil {
		out.ID = snap.Ref.ID
	}
	return c.JSON(fiber.Map{"success": true, "menu": out})
}
func ToggleMenuActive(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	shopId := c.Params("shopId")
	menuId := c.Params("menuId")
	if shopId == "" || menuId == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing shopId or menuId"})
	}

	doc := config.Client.Collection("shops").Doc(shopId).Collection("menu").Doc(menuId)
	snap, err := doc.Get(ctx)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "menu not found"})
	}
	var m struct {
		Active bool `firestore:"active"`
	}
	_ = snap.DataTo(&m)

	newActive := !m.Active
	_, err = doc.Update(ctx, []firestore.Update{
		{Path: "active", Value: newActive},
		{Path: "updatedAt", Value: time.Now()},
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "toggle failed"})
	}

	return c.JSON(fiber.Map{"success": true, "active": newActive})
}

func ComputeShopPriceRangeSimple(vendorId, shopId string) (float64, float64, error) {
	ctx := context.Background()
	col := config.Client.Collection("shops").Doc(shopId).Collection("menu")

	docs, err := col.Documents(ctx).GetAll()
	if err != nil {
		return 0, 0, err
	}
	if len(docs) == 0 {
		// ไม่มีเมนูเลย → เคลียร์ค่าในร้าน
		_, _ = config.Client.Collection("shops").Doc(shopId).Set(ctx, map[string]interface{}{
			"min_price":        0,
			"max_price":        0,
			"price_updated_at": time.Now(),
		}, firestore.MergeAll)
		return 0, 0, nil
	}

	minP := math.MaxFloat64
	maxP := 0.0
	for _, d := range docs {
		var m models.Menu
		if err := d.DataTo(&m); err == nil {
			if m.Price < minP {
				minP = m.Price
			}
			if m.Price > maxP {
				maxP = m.Price
			}
		}
	}

	// เผื่อกรณีข้อมูลไม่ครบ
	if minP == math.MaxFloat64 {
		minP = 0
	}

	// ✅ อัปเดตค่ากลับใน shops/{shopId}
	_, err = config.Client.Collection("shops").Doc(shopId).Set(ctx, map[string]interface{}{
		"min_price":        minP,
		"max_price":        maxP,
		"price_updated_at": time.Now(),
	}, firestore.MergeAll)
	if err != nil {
		return minP, maxP, err
	}

	return minP, maxP, nil
}

func DeleteMenu(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	shopId := c.Params("shopId")
	menuId := c.Params("menuId")
	if shopId == "" || menuId == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing shopId or menuId"})
	}

	// หา vendorId จาก shops/{shopId}
	shopSnap, err := config.Client.Collection("shops").Doc(shopId).Get(ctx)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "ไม่พบร้านนี้"})
	}
	var shopMeta struct {
		VendorRef *firestore.DocumentRef `firestore:"vendor_id"`
	}
	if err := shopSnap.DataTo(&shopMeta); err != nil || shopMeta.VendorRef == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ร้านนี้ไม่มี vendor_id"})
	}
	vendorId := shopMeta.VendorRef.ID

	fmt.Printf("🗑️ HARD DELETE menu: vendor=%s shop=%s menu=%s at %s\n",
		vendorId, shopId, menuId, time.Now().Format(time.RFC3339))

	// ลบเอกสารตรง ๆ ใน path หลัก
	curDoc := config.Client.
		Collection("vendors").Doc(vendorId).
		Collection("shops").Doc(shopId).
		Collection("menu").Doc(menuId)

	if _, err := curDoc.Delete(ctx); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "ลบเมนูไม่สำเร็จ"})
	}

	// (ออปชัน) ลบ path เก่า เผื่อเคยมีเก็บไว้
	legacyDoc := config.Client.Collection("shops").Doc(shopId).Collection("menu").Doc(menuId)
	_, _ = legacyDoc.Delete(ctx) // ไม่ต้องสน error มาก

	// (ออปชัน) อัปเดตช่วงราคา
	if minP, maxP, err := ComputeShopPriceRangeSimple(vendorId, shopId); err != nil {
		fmt.Println("❌ Recompute error:", err)
	} else {
		fmt.Printf("✅ Updated price range: shop=%s vendor=%s min=%.2f max=%.2f\n", shopId, vendorId, minP, maxP)
	}

	return c.JSON(fiber.Map{
		"success":   true,
		"deletedId": menuId,
	})
}

// ---------- ดึงออเดอร์ "ที่ยังไม่เสร็จ" ของร้าน ----------
func ListOrdersByShop(c *fiber.Ctx) error {
	shopId := strings.TrimSpace(c.Query("shopId"))
	if shopId == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "shopId is required"})
	}

	ctx := config.Ctx
	db := config.Client

	// ดึงเฉพาะสถานะที่ยังทำอยู่
	q := db.Collection("orders").
		Where("shopId", "==", shopId).
		Where("status", "in", []interface{}{"prepare", "ongoing"}). // ตัด success ออก
		Limit(200)

	snaps, err := q.Documents(ctx).GetAll()
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	orders := make([]models.OrderDTO, 0, len(snaps))
	for _, d := range snaps {
		data := d.Data()
		order := normalizeOrder(d.Ref.ID, data)

		// เติมชื่อผู้ใช้แบบเดิมที่คุณทำอยู่
		if cid, _ := data["customerId"].(string); cid != "" {
			if userDoc, err := db.Collection("users").Doc(cid).Get(ctx); err == nil && userDoc.Exists() {
				if uname, ok := userDoc.Data()["username"].(string); ok {
					order.CustomerName = uname
				}
			}
		}
		orders = append(orders, order)
	}

	// เรียงล่าสุดก่อน (ตาม createdAt)
	sort.Slice(orders, func(i, j int) bool {
		ti := getTimeLike(orders[i].Raw, "createdAt")
		tj := getTimeLike(orders[j].Raw, "createdAt")
		return ti.After(tj)
	})
	return c.JSON(orders)
}

func GetUserNameCustomer(c *fiber.Ctx) error {
	orderID := strings.TrimSpace(c.Params("id"))
	if orderID == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "orderId is required"})
	}

	ctx := config.Ctx
	db := config.Client

	doc, err := db.Collection("orders").Doc(orderID).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "order not found"})
		}
		fmt.Println("❌ Firestore error:", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	data := doc.Data()
	data["id"] = doc.Ref.ID

	// ✅ ดึงชื่อจาก users โดยใช้ customerId
	if cid, ok := data["customerId"].(string); ok && cid != "" {
		fmt.Println("🔍 [GetOrderByID] Found customerId:", cid)
		userDoc, err := db.Collection("users").Doc(cid).Get(ctx)
		if err != nil {
			fmt.Println("⚠️ Error getting user:", err)
		} else if userDoc.Exists() {
			userData := userDoc.Data()

			// ✅ ใช้ field "username" โดยตรง
			if uname, ok := userData["username"].(string); ok {
				data["customerName"] = uname
				fmt.Printf("✅ ใช้ username: %s\n", uname)
			} else {
				fmt.Println("⚠️ ไม่มี field 'username' ใน user doc")
				data["customerName"] = "ไม่ระบุชื่อผู้ใช้"
			}
		} else {
			fmt.Println("⚠️ ไม่พบ user doc:", cid)
			data["customerName"] = "ไม่พบข้อมูลผู้ใช้"
		}
	} else {
		data["customerName"] = "ไม่มี customerId"
	}

	return c.JSON(data)
}
func shopHistoryCol(shopID string) *firestore.CollectionRef {
	return config.Client.Collection("shops").Doc(shopID).Collection("history")
}
func ordersRoot() *firestore.CollectionRef {
	return config.Client.Collection("orders")
}

func userHistoryCol(userID string) *firestore.CollectionRef {
	return config.Client.Collection("users").Doc(userID).Collection("history")
}
func UpdateOrderStatus(c *fiber.Ctx) error {
	orderId := strings.TrimSpace(c.Params("orderId"))
	if orderId == "" {
		return c.Status(400).JSON(fiber.Map{"error": "orderId is required"})
	}

	var body struct {
		Status string `json:"status"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "BodyParser error", "msg": err.Error()})
	}
	next := strings.TrimSpace(body.Status)
	switch next {
	case "prepare", "on-going", "ongoing", "success":
	default:
		return c.Status(400).JSON(fiber.Map{"error": "invalid status"})
	}

	ctx := config.Ctx
	db := config.Client
	orderRef := ordersRoot().Doc(orderId)

	err := db.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		// 1) อ่านออเดอร์ปัจจุบัน
		snap, err := tx.Get(orderRef)
		if err != nil || !snap.Exists() {
			return fiber.ErrNotFound
		}
		data := snap.Data()

		// ฟิลด์สำคัญที่ต้องมีใน order
		shopId, _ := data["shopId"].(string)
		if shopId == "" {
			return fiber.NewError(fiber.StatusConflict, "order missing shopId")
		}
		// user id อาจเก็บชื่อ customerId หรือ userId ก็รองรับทั้งคู่
		userId := ""
		if v, ok := data["userId"].(string); ok && v != "" {
			userId = v
		} else if v, ok := data["customerId"].(string); ok && v != "" {
			userId = v
		}
		if userId == "" {
			// ไม่บังคับ error: อนุญาตให้ผ่าน แต่จะไม่ได้เขียน user history
			fmt.Printf("⚠️ order %s has no userId/customerId\n", orderId)
		}

		// สถานะปัจจุบัน
		current := "prepare"
		if v, ok := data["status"].(string); ok && v != "" {
			current = strings.ToLower(strings.TrimSpace(v))
		}

		// โลจิก transition (prepare -> on-going -> success)
		normalize := func(s string) string {
			s = strings.ToLower(strings.TrimSpace(s))
			if s == "on-going" {
				return "ongoing"
			}
			return s
		}
		cur := normalize(current)
		nx := normalize(next)

		valid := map[string][]string{
			"prepare": {"ongoing"},
			"ongoing": {"success"},
			"success": {},
		}
		allowed := valid[cur]
		can := false
		for _, a := range allowed {
			if a == nx {
				can = true
				break
			}
		}

		// Idempotent: ถ้า status เดิม = ใหม่
		if cur == nx {
			return tx.Update(orderRef, []firestore.Update{
				{Path: "updatedAt", Value: time.Now()},
			})
		}
		if !can {
			return fiber.NewError(fiber.StatusConflict, fmt.Sprintf("invalid transition: %s -> %s", cur, nx))
		}

		now := time.Now()

		// 2) ถ้ายังไม่ success แค่อัปเดตสถานะใน orders
		if nx != "success" {
			return tx.Update(orderRef, []firestore.Update{
				{Path: "status", Value: nx},
				{Path: "updatedAt", Value: now},
			})
		}

		// 3) ถ้า success ⇒ สร้างเอกสาร history ทั้ง shop และ user (ถ้ามี userId) แล้วลบ orders
		// เตรียม payload สำหรับ history
		// เก็บข้อมูลหลัก ๆ ให้พอแสดงผล (items/total/shop_name/userId/createdAt/finishedAt/…)
		histDoc := map[string]interface{}{
			"id":                orderId,
			"status":            "success",
			"shopId":            shopId,
			"userId":            userId, // อาจว่างได้ ถ้าออเดอร์ไม่มี
			"items":             data["items"],
			"total":             data["total"],
			"shop_name":         data["shop_name"],
			"customerName":      data["customerName"],
			"createdAt":         firstNonNil(data["createdAt"], data["rawCreatedAt"]), // เผื่อมีรูปแบบ custom
			"finishedAt":        now,
			"movedToHistoryAt":  now,
			"sourceOrderStatus": cur,
			"source":            "orders",
		}

		// เขียนลง shops/{shopId}/history/{orderId}
		shopHistRef := shopHistoryCol(shopId).Doc(orderId)
		if err := tx.Set(shopHistRef, histDoc, firestore.MergeAll); err != nil {
			return err
		}
		// ถ้ามี userId ⇒ เขียนลง users/{userId}/history/{orderId}
		if userId != "" {
			userHistRef := userHistoryCol(userId).Doc(orderId)
			if err := tx.Set(userHistRef, histDoc, firestore.MergeAll); err != nil {
				return err
			}
		}

		// สุดท้าย ลบจาก orders ให้เป็น “ย้าย” จริง ๆ
		if err := tx.Delete(orderRef); err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		if err == fiber.ErrNotFound {
			return c.Status(404).JSON(fiber.Map{"error": "order not found"})
		}
		if fe, ok := err.(*fiber.Error); ok && (fe.Code == 400 || fe.Code == 409) {
			return c.Status(fe.Code).JSON(fiber.Map{"error": fe.Message})
		}
		return c.Status(500).JSON(fiber.Map{"error": "update status failed", "msg": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "status updated", "status": next})
}

// ตัวช่วยหยิบค่าแรกที่ไม่ nil
func firstNonNil(vals ...interface{}) interface{} {
	for _, v := range vals {
		if v != nil {
			return v
		}
	}
	return nil
}

// GET /api/shops/:shopId/history
func ListShopHistory(c *fiber.Ctx) error {
	shopId := strings.TrimSpace(c.Params("shopId"))
	if shopId == "" {
		return c.Status(400).JSON(fiber.Map{"error": "shopId is required"})
	}

	ctx := config.Ctx
	db := config.Client
	col := db.Collection("shops").Doc(shopId).Collection("history")

	// พยายาม orderBy finishedAt -> ถ้าไม่ได้ fallback movedToHistoryAt
	q := col.OrderBy("finishedAt", firestore.Desc).Limit(200)
	snaps, err := q.Documents(ctx).GetAll()
	if err != nil {
		if s, ok := status.FromError(err); ok && (s.Code() == codes.FailedPrecondition || s.Code() == codes.InvalidArgument) {
			q2 := col.OrderBy("movedToHistoryAt", firestore.Desc).Limit(200)
			if snaps2, err2 := q2.Documents(ctx).GetAll(); err2 == nil {
				snaps = snaps2
				err = nil
			}
		}
	}
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// รวบรวม userId ทั้งหมดเพื่อลดการยิงซ้ำ
	type row struct {
		id   string
		data map[string]interface{}
	}
	rows := make([]row, 0, len(snaps))
	userIDs := make(map[string]struct{})
	for _, d := range snaps {
		m := d.Data()
		m["id"] = d.Ref.ID
		rows = append(rows, row{id: d.Ref.ID, data: m})

		if uid, ok := m["userId"].(string); ok && strings.TrimSpace(uid) != "" {
			userIDs[strings.TrimSpace(uid)] = struct{}{}
		}
	}

	// ดึงชื่อผู้ใช้ทั้งหมดแบบ cache
	nameCache := make(map[string]string, len(userIDs))
	for uid := range userIDs {
		name, _ := getUserNameByID(ctx, db, uid) // ไม่ fail ทั้งลิสต์ถ้าบางคน error
		if name != "" {
			nameCache[uid] = name
		}
	}

	// ใส่ customerName ให้แต่ละแถว (ถ้าเดิมไม่มี)
	res := make([]map[string]interface{}, 0, len(rows))
	for _, r := range rows {
		m := r.data
		// ถ้าเดิมไม่มี customerName ให้ใส่จาก cache
		if _, has := m["customerName"]; !has || m["customerName"] == "" {
			if uid, ok := m["userId"].(string); ok && uid != "" {
				if nm, ok2 := nameCache[uid]; ok2 && nm != "" {
					m["customerName"] = nm
				}
			}
		}
		res = append(res, m)
	}

	return c.JSON(res)
}

// GET /api/shops/:shopId/history/:orderId
func GetShopHistoryDoc(c *fiber.Ctx) error {
	shopId := strings.TrimSpace(c.Params("shopId"))
	orderId := strings.TrimSpace(c.Params("orderId"))
	if shopId == "" || orderId == "" {
		return c.Status(400).JSON(fiber.Map{"error": "shopId/orderId is required"})
	}

	ctx := config.Ctx
	db := config.Client

	ref := db.Collection("shops").Doc(shopId).Collection("history").Doc(orderId)
	snap, err := ref.Get(ctx)
	if err != nil || !snap.Exists() {
		return c.Status(404).JSON(fiber.Map{"error": "history doc not found"})
	}
	m := snap.Data()
	m["id"] = snap.Ref.ID

	// ถ้าไม่มี customerName แต่มี userId → ไปดึงชื่อมาเติม
	if (m["customerName"] == nil || m["customerName"] == "") && m["userId"] != nil {
		if uid, ok := m["userId"].(string); ok && strings.TrimSpace(uid) != "" {
			if name, _ := getUserNameByID(ctx, db, uid); name != "" {
				m["customerName"] = name
			}
		}
	}

	return c.JSON(m)
}
func getUserNameByID(ctx context.Context, db *firestore.Client, userId string) (string, error) {
	userId = strings.TrimSpace(userId)
	if userId == "" {
		return "", nil
	}
	snap, err := db.Collection("users").Doc(userId).Get(ctx)
	if err != nil || !snap.Exists() {
		return "", err
	}
	u := snap.Data()
	// ไล่ fallback ตามฟิลด์ที่มักใช้กัน
	if s, ok := u["username"].(string); ok && s != "" {
		return s, nil
	}
	if s, ok := u["name"].(string); ok && s != "" {
		return s, nil
	}
	if s, ok := u["fullname"].(string); ok && s != "" {
		return s, nil
	}
	if s, ok := u["displayName"].(string); ok && s != "" {
		return s, nil
	}
	if s, ok := u["email"].(string); ok && s != "" {
		return s, nil
	}
	return "", nil
}
