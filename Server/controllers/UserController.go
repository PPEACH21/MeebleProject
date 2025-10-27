package controllers

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/PPEACH21/MebleBackend-Web/config"
	"github.com/PPEACH21/MebleBackend-Web/models"
	"github.com/gofiber/fiber/v2"
	"google.golang.org/api/iterator"
)

func GetShop(c *fiber.Ctx) error {
	var shops []models.Shop
	data := config.Shops.Documents(config.Ctx)

	// cache ผลลัพธ์ราคา (คำนวณครั้งเดียวต่อ vendor)
	type vm struct{ min, max *float64 }
	vendorPrices := map[string]vm{}
	recomputed := map[string]bool{} // กันคำนวณซ้ำ

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
			continue
		}

		// map vendor_id จาก reference
		if u.Vendor_ref != nil {
			u.Vendor_id = u.Vendor_ref.ID
		}

		// ✅ คำนวณ min/max ให้ vendor นี้ (ครั้งเดียวในหนึ่ง request)
		if u.Vendor_id != "" {
			// ถ้าเรายังไม่ได้คำนวณให้ vendor นี้ ให้คำนวณเลยตอนเจอร้านแรกของ vendor นั้น
			if !recomputed[u.Vendor_id] {
				if minVal, maxVal, err := ComputeVendorPriceRangeSimple(u.Vendor_id); err == nil {
					// เก็บในแคช (เป็น pointer)
					mi, ma := minVal, maxVal
					vendorPrices[u.Vendor_id] = vm{min: &mi, max: &ma}
				} else {
					// ถ้าคำนวณพัง ก็เก็บ nil ไว้ก่อน (FE จะเห็นเป็น null/“–”)
					//fmt.Println("[/Shop] recompute error vendor=", u.Vendor_id, "err=", err)
					vendorPrices[u.Vendor_id] = vm{min: nil, max: nil}
				}
				recomputed[u.Vendor_id] = true
			}

			// ดึงค่าจากแคชมาใส่ลงร้าน
			if rng, ok := vendorPrices[u.Vendor_id]; ok {
				u.PriceMin = rng.min
				u.PriceMax = rng.max
			}
		}

		shops = append(shops, u)
	}

	return c.Status(fiber.StatusOK).JSON(shops)
}

func VerifiedUser(c *fiber.Ctx) error {
	userId := c.Params("id")

	fmt.Println("User: ", userId)

	data := config.User.Doc(userId)
	docRef, err := data.Get(config.Ctx)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString("Not user ID")
	}

	_, err = docRef.Ref.Update(config.Ctx, []firestore.Update{
		{
			Path:  "verified",
			Value: true,
		},
	})
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString("Update data Error")
	}

	return c.Status(fiber.StatusOK).JSON(data)
}

func UserProfile(c *fiber.Ctx) error {
	userID := c.Params("id")
	fmt.Println("User: ", userID)

	data := config.User.Doc(userID)
	docRef, err := data.Get(config.Ctx)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString("Not user ID")
	}

	userData := docRef.Data()
	if userData == nil {
		return c.Status(fiber.StatusNotFound).SendString("User not found")
	}
	return c.Status(fiber.StatusOK).JSON(userData)
}

func GetUserHistory(c *fiber.Ctx) error {
	userId := c.Params("userId")
	if userId == "" {
		return c.Status(400).JSON(fiber.Map{"error": "missing userId"})
	}

	col := config.Client.Collection("users").Doc(userId).Collection("history")

	// ----------- Query Options -----------
	limit := 50
	if v := c.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			if n > 200 {
				n = 200 // จำกัดสูงสุด 200
			}
			limit = n
		}
	}

	// ✅ เริ่มจาก query แทน collectionRef
	query := col.Query

	// --- Filter ตามสถานะ (optional) ---
	if s := strings.TrimSpace(c.Query("status")); s != "" {
		query = query.Where("status", "==", s)
	}

	// --- เรียงจาก createdAt ล่าสุดก่อน ---
	query = query.OrderBy("createdAt", firestore.Desc).Limit(limit)

	// --- Pagination (optional): startAfter=timestamp (milliseconds) ---
	if sa := strings.TrimSpace(c.Query("startAfter")); sa != "" {
		if ms, err := strconv.ParseInt(sa, 10, 64); err == nil && ms > 0 {
			query = query.StartAfter(time.UnixMilli(ms))
		}
	}

	// ----------- Fetch Documents -----------
	iter := query.Documents(config.Ctx)
	defer iter.Stop()

	var history []map[string]interface{}
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}

		d := doc.Data()

		// ✅ ส่งเฉพาะ field ที่ UI ใช้
		out := map[string]interface{}{
			"id":        doc.Ref.ID,
			"orderId":   d["orderId"],
			"shop_name": d["shop_name"],
			"createdAt": d["createdAt"],
			"status":    d["status"],
			"total":     d["total"], // เพิ่มยอดรวมให้ด้วย เผื่อแสดงใน History
		}

		history = append(history, out)
	}

	return c.JSON(history)
}

func GetUserHistoryByID(c *fiber.Ctx) error {
	userId := c.Params("userId")
	historyId := c.Params("historyId")

	if userId == "" || historyId == "" {
		return c.Status(400).JSON(fiber.Map{"error": "missing userId or historyId"})
	}

	col := config.Client.Collection("users").Doc(userId).Collection("history")

	// ---------- 1. ลองค้นด้วย Document ID ตรง ๆ ----------
	doc, err := col.Doc(historyId).Get(config.Ctx)
	if err == nil && doc.Exists() {
		data := doc.Data()
		data["id"] = doc.Ref.ID
		return c.JSON(data)
	}

	// ---------- 2. ถ้าไม่เจอ → ลองค้นด้วย orderId ----------
	iter := col.Where("orderId", "==", historyId).Limit(1).Documents(config.Ctx)
	defer iter.Stop()

	d, err := iter.Next()
	if err == iterator.Done {
		return c.Status(404).JSON(fiber.Map{"error": "history not found"})
	}
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	data := d.Data()
	data["id"] = d.Ref.ID
	return c.JSON(data)
}

func userHistoryCol(userID string) *firestore.CollectionRef {
	return config.Client.Collection("users").Doc(userID).Collection("history")
}

func shopHistoryCol(vendorID, shopID string) *firestore.CollectionRef {
	return config.Client.
		Collection("vendors").Doc(vendorID).
		Collection("shops").Doc(shopID).
		Collection("history")
}

func UpdateOrderStatus(c *fiber.Ctx) error {
	vendorId := c.Params("vendorId")
	shopId := c.Params("shopId")
	orderId := c.Params("orderId")
	if vendorId == "" || shopId == "" || orderId == "" {
		return c.Status(400).JSON(fiber.Map{"error": "missing vendorId/shopId/orderId"})
	}

	var body struct {
		Status string `json:"status"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "BodyParser error", "msg": err.Error()})
	}
	next := body.Status
	if next != "prepare" && next != "on-going" && next != "success" {
		return c.Status(400).JSON(fiber.Map{"error": "invalid status"})
	}

	ordersRef := ordersCol(vendorId, shopId).Doc(orderId)

	err := config.Client.RunTransaction(config.Ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		snap, err := tx.Get(ordersRef)
		if err != nil || !snap.Exists() {
			return fiber.ErrNotFound
		}

		// อ่านสถานะปัจจุบัน (ถือว่า "prepare" ถ้ายังไม่มี)
		current := "prepare"
		if v, ok := snap.Data()["status"]; ok && v != nil {
			if s, ok := v.(string); ok && s != "" {
				current = s
			}
		}

		// Idempotent: ถ้าขอสถานะเดิมซ้ำ → ผ่านเลย
		if current == next {
			// อัปเดต updatedAt เบา ๆ ก็ได้ (หรือจะไม่อัปเดตก็ได้)
			return tx.Update(ordersRef, []firestore.Update{
				{Path: "updatedAt", Value: time.Now()},
			})
		}

		// อนุญาตเฉพาะ transition: prepare -> on-going -> success
		valid := map[string][]string{
			"prepare":  {"on-going"},
			"on-going": {"success"},
			"success":  {}, // end
		}
		allowed := valid[current]
		can := false
		for _, s := range allowed {
			if s == next {
				can = true
				break
			}
		}
		if !can {
			return fiber.NewError(fiber.StatusConflict, fmt.Sprintf("invalid transition: %s -> %s", current, next))
		}

		// อัปเดตสถานะใน orders
		if err := tx.Update(ordersRef, []firestore.Update{
			{Path: "status", Value: next},
			{Path: "updatedAt", Value: time.Now()},
		}); err != nil {
			return err
		}

		// เตรียมอ้างอิงสำหรับ history
		// (เราควรมี userId ใน order ตั้งแต่ checkout)
		var userIdFromOrder string
		if v, ok := snap.Data()["userId"]; ok {
			if s, ok := v.(string); ok {
				userIdFromOrder = s
			}
		}

		// shop history (/vendors/.../shops/.../history/{orderId})
		shopHistRef := shopHistoryCol(vendorId, shopId).Doc(orderId)
		if err := tx.Set(shopHistRef, map[string]interface{}{
			"status":    next,
			"updatedAt": time.Now(),
		}, firestore.MergeAll); err != nil {
			return err
		}
		// ถ้ายังไม่มี createdAt ให้เติม (ครั้งแรก)
		if err := tx.Set(shopHistRef, map[string]interface{}{
			"createdAt": time.Now(),
		}, firestore.Merge([]string{"createdAt"})); err != nil {
			return err
		}

		if userIdFromOrder != "" {
			userHistRef := userHistoryCol(userIdFromOrder).Doc(orderId)

			// ✅ ดึง shop_name จาก order ถ้ามี
			var shopName string
			if v, ok := snap.Data()["shop_name"]; ok {
				if s, ok := v.(string); ok {
					shopName = s
				}
			}

			// ✅ อัปเดตสถานะและชื่อร้านใน user history
			if err := tx.Set(userHistRef, map[string]interface{}{
				"status":    next,
				"shop_name": shopName,
				"updatedAt": time.Now(),
			}, firestore.MergeAll); err != nil {
				return err
			}

			// ✅ สร้าง createdAt ถ้ายังไม่มี
			if err := tx.Set(userHistRef, map[string]interface{}{
				"createdAt": time.Now(),
			}, firestore.Merge([]string{"createdAt"})); err != nil {
				return err
			}
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
