package controllers

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/PPEACH21/MebleBackend-Web/config"
	"github.com/PPEACH21/MebleBackend-Web/models"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"google.golang.org/api/iterator"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func GetShop(c *fiber.Ctx) error {
	ctx := config.Ctx
	col := config.Client.Collection("shops")

	snaps, err := col.Documents(ctx).GetAll()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to fetch shops",
			"msg":   err.Error(),
		})
	}

	// ส่ง map ตรง ๆ เพื่อรักษาคีย์ทั้งหมดให้ตรง Firestore (min_price, max_price จะติดมาด้วย)
	out := make([]map[string]interface{}, 0, len(snaps))
	for _, s := range snaps {
		m := s.Data()
		// แนบ id เผื่อ doc ไม่มีฟิลด์ id
		if _, ok := m["id"]; !ok {
			m["id"] = s.Ref.ID
		}
		out = append(out, m)
	}

	return c.JSON(out)
}

func VerifiedUser(c *fiber.Ctx) error {
	userId := c.Params("id")
	// fmt.Println("User: ", userId)

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

	var member models.User
	if err := docRef.DataTo(&member); err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Error parsing user data")
	}

	userData, err := docRef.Ref.Get(config.Ctx)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to fetch updated user")
	}

	c.ClearCookie("token")
	var updatedUser models.User
	userData.DataTo(&updatedUser)

	claims := jwt.MapClaims{
		"user_id":  userData.Ref.ID,
		"email":    updatedUser.Email,
		"username": updatedUser.Username,
		"verified": updatedUser.Verified,
		"role":     "user",
		"exp":      time.Now().Add(time.Minute * 60).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	secret := os.Getenv("JWT_SECRET")
	t, err := token.SignedString([]byte(secret))
	if err != nil {
		return c.SendStatus(fiber.StatusInternalServerError)
	}

	c.Cookie(&fiber.Cookie{
		Name:     "token",
		Value:    t,
		Expires:  time.Now().Add(time.Minute * 60),
		HTTPOnly: false,
		// Secure:   false,
		// SameSite: "Strict",
	})

	return c.Status(fiber.StatusAccepted).SendString("Update data Success")
}

func UserProfile(c *fiber.Ctx) error {
	userID := c.Params("id")

	fmt.Println("User: ", userID)
	data := config.User.Doc(userID)
	docRef, err := data.Get(config.Ctx)
	if err != nil {
		data = config.Vendor.Doc(userID)
		docRef, err = data.Get(config.Ctx)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).SendString("Not user ID")
		}
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

// ---------- helper ----------
func getString(m map[string]interface{}, keys ...string) string {
	for _, k := range keys {
		if v, ok := m[k]; ok && v != nil {
			if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
				return s
			}
		}
	}
	return ""
}

func getTimeLike(m map[string]interface{}, keys ...string) time.Time {
	for _, k := range keys {
		if v, ok := m[k]; ok && v != nil {
			switch t := v.(type) {
			case time.Time:
				return t
			case *time.Time:
				if t != nil {
					return *t
				}
			case map[string]interface{}:
				// Firestore บาง client แปลง timestamp เป็น map["_seconds": ...]
				if sec, ok := t["_seconds"]; ok {
					if s, ok := sec.(int64); ok {
						return time.Unix(s, 0)
					}
					if s, ok := sec.(float64); ok {
						return time.Unix(int64(s), 0)
					}
				}
			}
		}
	}
	return time.Time{}
}

func normalizeOrder(docID string, data map[string]interface{}) models.OrderDTO {
	return models.OrderDTO{
		ID:        docID,
		OrderID:   getString(data, "orderId", "order_id", "id"),
		ShopName:  getString(data, "shop_name", "shopName", "storeName", "vendorName"),
		Status:    getString(data, "status"),
		CreatedAt: getTimeLike(data, "createdAt", "created_at", "time", "orderedAt"),
		Raw:       data,
	}
}

// ---------- main ----------
func ListOrdersByUser(c *fiber.Ctx) error {
	userId := strings.TrimSpace(c.Query("userId"))
	if userId == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "userId is required"})
	}

	ctx := config.Ctx
	db := config.Client

	// ✅ ไม่มี OrderBy เพื่อหลีกเลี่ยงการสร้าง composite index
	q := db.Collection("orders").Where("userId", "==", userId).Limit(200)

	snaps, err := q.Documents(ctx).GetAll()
	if err != nil {
		fmt.Println("❌ Firestore error:", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	orders := make([]models.OrderDTO, 0, len(snaps))
	for _, d := range snaps {
		orders = append(orders, normalizeOrder(d.Ref.ID, d.Data()))
	}

	// ✅ sort ฝั่ง Go (แทนการใช้ OrderBy ใน Firestore)
	sort.Slice(orders, func(i, j int) bool {
		ti := getTimeLike(orders[i].Raw, "createdAt")
		tj := getTimeLike(orders[j].Raw, "createdAt")
		return ti.After(tj)
	})

	return c.JSON(orders)
}

// ---------- ดึงออเดอร์รายตัว ----------
func GetOrderByID(c *fiber.Ctx) error {
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
	var customerID string
	if cid, ok := data["customerId"].(string); ok && cid != "" {
		customerID = cid
	} else if raw, ok := data["raw"].(map[string]interface{}); ok {
		if cid, ok2 := raw["customerId"].(string); ok2 {
			customerID = cid
		}
	}

	if customerID != "" {
		fmt.Println("🔍 [GetOrderByID] Found customerId:", customerID)
		userDoc, err := db.Collection("users").Doc(customerID).Get(ctx)
		if err != nil {
			fmt.Println("⚠️ Error getting user:", err)
		} else if userDoc.Exists() {
			userData := userDoc.Data()

			// ✅ ใช้ field "username" จาก Firestore
			if uname, ok := userData["username"].(string); ok {
				data["customerName"] = uname
				fmt.Printf("✅ ใช้ username: %s\n", uname)
			} else {
				fmt.Println("⚠️ ไม่มี field 'username' ใน user doc")
				data["customerName"] = "ไม่ระบุชื่อผู้ใช้"
			}
		} else {
			fmt.Println("⚠️ ไม่พบ user doc:", customerID)
			data["customerName"] = "ไม่พบข้อมูลผู้ใช้"
		}
	} else {
		data["customerName"] = "ไม่มี customerId"
	}

	return c.JSON(data)
}
