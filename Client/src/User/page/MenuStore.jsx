// src/pages/MenuStore.jsx
import axios from "@/api/axios";
import { useState, useEffect, useContext } from "react";
import { useParams, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { AuthContext } from "@/context/ProtectRoute";
import { FaStar } from "react-icons/fa6";
import "@css/pages/MenuStore.css";
import { m } from "@/paraglide/messages.js";

/* ----------------- helpers ----------------- */
// หยิบ shopId จากอ็อบเจ็กต์ร้านหลายรูปแบบ
const getShopId = (shop) =>
  shop?.id || shop?.ID || shop?.shop_id || shop?.shopId || "";

// ปลอดภัย: ดึง lat/lng จากโครงสร้างที่อาจต่างกัน
const pickLatLng = (s) => {
  const gp = s?.address || s?.geo || {};
  const lat = gp.latitude ?? gp.lat ?? s?.lat ?? 0;
  const lng = gp.longitude ?? gp.lng ?? s?.lng ?? 0;
  return { lat: Number(lat) || 0, lng: Number(lng) || 0 };
};

// แปลงเมนูให้ฟิลด์สม่ำเสมอ
const normalizeMenu = (x) => ({
  id: x.ID ?? x.id ?? x.docId ?? x.menuId ?? x.menu_id ?? "",
  name: x.Name ?? x.name ?? "",
  price: Number(x.Price ?? x.price ?? 0),
  description: x.Description ?? x.description ?? "",
  image: x.Image ?? x.image ?? "",
  active: (x.Active ?? x.active ?? true) === true,
});

/* ----------------- component ----------------- */

export default function MenuStore() {
  const { auth } = useContext(AuthContext);
  const location = useLocation();
  const { id: paramShopId } = useParams(); // /menu/:id

  // ✅ ดึง shopId: param → state → query → localStorage
  const shopFromState = location.state?.shop || null;
  const stateShopId = location.state?.shopId || getShopId(shopFromState) || "";
  const queryShopId = new URLSearchParams(location.search).get("shopId") || "";
  const storageShopId =
    (typeof window !== "undefined" && localStorage.getItem("currentShopId")) ||
    "";
  const shopId = paramShopId || stateShopId || queryShopId || storageShopId;

  // ⬇️ ต้องมี setShop เพื่อเติมชื่อร้านภายหลังจาก DB
  const [shop, setShop] = useState(
    shopFromState ? { ...shopFromState, id: getShopId(shopFromState) } : null
  );

  const [menus, setMenus] = useState([]);
  const [lat, setLat] = useState(13.736717);
  const [lng, setLng] = useState(100.523186);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // ตั้งพิกัดจาก state ถ้ามี
  useEffect(() => {
    const gp = shopFromState?.address;
    if (gp?.latitude && gp?.longitude) {
      setLat(gp.latitude);
      setLng(gp.longitude);
    }
  }, [shopFromState]);

  // ✅ โหลดเมนูจาก shops/{shopId}/menu (ผู้ใช้ทั่วไปเห็นเฉพาะ active)
  const fetchMenusByShop = async (sid) => {
    if (!sid) {
      setErr(m.missing_shopid());
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`/shops/${sid}/menu`, {
        withCredentials: true,
      });
      const raw = res.data?.menus ?? res.data ?? [];
      const normalized = (Array.isArray(raw) ? raw : []).map(normalizeMenu);
      setMenus(normalized.filter((a) => a.active));
      setErr("");
    } catch (e) {
      console.error("fetch menus error:", e?.response?.data || e);
      setErr(m.menu_fetch_error());
      setMenus([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // เก็บลง localStorage เผื่อ refresh/revisit
    if (shopId && typeof window !== "undefined") {
      localStorage.setItem("currentShopId", shopId);
    }
    fetchMenusByShop(shopId);
  }, [shopId]);

  // ⬇️ เติมข้อมูลร้านจาก DB ถ้าไม่มีชื่อร้าน (ใช้ /Shop ที่คุณมีใน backend)
  useEffect(() => {
    const ensureShopMeta = async () => {
      try {
        if (!shopId) return;

        // ถ้ามีชื่อร้านอยู่แล้ว ไม่ต้องดึง
        if (shop?.shop_name) return;

        // เรียก /Shop (คืนรายการร้านทั้งหมดใน collection "shops")
        const res = await axios.get("/Shop", { withCredentials: true });
        const list = Array.isArray(res.data) ? res.data : [];
        const found =
          list.find((s) => (s.id || s.ID) === shopId) ||
          list.find((s) => (s.shopId || s.shop_id) === shopId);

        if (found) {
          const { lat: la, lng: ln } = pickLatLng(found);
          setShop((prev) => ({
            ...(prev || {}),
            ...found,
            id: found.id || found.ID || shopId,
          }));
          if (la || ln) {
            setLat(la);
            setLng(ln);
          }
          // debug
          console.log("✅ Loaded shop meta:", {
            id: found.id || found.ID || shopId,
            shop_name: found.shop_name || found.name,
          });
        } else {
          console.warn("⚠️ Shop not found in /Shop list for id:", shopId);
        }
      } catch (e) {
        console.error("ensureShopMeta error:", e?.response?.data || e);
      }
    };
    ensureShopMeta();
  }, [shopId, shop?.shop_name]);

  /* ----------------- add-to-cart (merge logic) ----------------- */

  const handleOrder = async (item) => {
    const { value: qty } = await Swal.fire({
      title: `${m.enter_quantity()} ${item.name}`,
      input: "number",
      inputValue: 1,
      inputAttributes: { min: 1, step: 1 },
      confirmButtonText: m.confirm_add_cart(),
      cancelButtonText: m.cancel(),
      showCancelButton: true,
    });
    if (qty === null || qty === undefined) return;

    const qtyNum = Number(qty);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      Swal.fire(m.add_to_cart_invalid_qty(), "", "error");
      return;
    }

    const menuIdRaw = item.id || item.ID || item.menuId || item.menu_id || "";
    const menuId = String(menuIdRaw);
    if (!menuId) {
      Swal.fire(m.add_to_cart_missing_id(), "", "error");
      return;
    }

    const customerId = auth?.user_id || "";
    if (!customerId) {
      Swal.fire(m.add_to_cart_not_login(), "", "error");
      return;
    }

    const itemId = `${shopId}:${menuId}`;

    const payload = {
      customerId,
      userId: auth.user_id,
      shopId,
      // ส่งชื่อร้านไปด้วย (ถ้ามี) — ฝั่ง BE จะอ่านจาก DB เป็นหลักอยู่แล้ว
      shop_name: shop?.shop_name || shop?.name || "",
      qty: qtyNum,
      item: {
        id: itemId,
        menuId,
        shopId,
        name: item.name,
        price: Number(item.price) || 0,
        image: item.image || "",
        description: item.description || "",
      },
    };

    console.log("🛒 Add to Cart Payload:", payload);

    try {
      const { data: currentCart = {} } = await axios.get("/api/cart", {
        params: { customerId },
        withCredentials: true,
      });

      console.log("📦 Current Cart Data:", currentCart);

      const found = (currentCart.items || []).find(
        (it) =>
          String(it.menuId ?? it.menu_id ?? "") === menuId &&
          String(it.shopId ?? it.ShopID ?? "") === String(shopId)
      );

      if (found) {
        const newQty = Number(found.qty || 0) + qtyNum;
        console.log(`🔁 พบเมนูเดิมในร้านนี้ → รวมจำนวนเป็น ${newQty}`);
        await axios.patch(
          "/api/cart/qty",
          {
            shopId,
            customerId,
            menuId,
            qty: newQty,
          },
          { withCredentials: true }
        );
        console.log("✅ PATCH /api/cart/qty สำเร็จ");
      } else {
        console.log("➕ เพิ่มเมนูใหม่ลงตะกร้า (POST /api/cart/add)");
        await axios.post("/api/cart/add", payload, { withCredentials: true });
        console.log("✅ POST /api/cart/add สำเร็จ");
      }

      Swal.fire(m.success(), m.add_to_cart_success(), "success");

      window.dispatchEvent(
        new CustomEvent("cart:updated", {
          detail: { shopId, menuId, delta: qtyNum },
        })
      );
      localStorage.setItem("cartUpdatedAt", String(Date.now()));
    } catch (e) {
      console.error("❌ Add to Cart Error:", e?.response?.data || e);
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.msg ||
        e?.message ||
        "เพิ่มลงตะกร้าไม่สำเร็จ";
      Swal.fire(m.add_to_cart_error(), "", "error");
    }
  };

  /* ----------------- render ----------------- */

  return (
    <div className="rowset">
      <div className="left">
        <div className="storeBox">
          <img
            src={
              shop?.image ||
              "https://i.pinimg.com/1200x/0d/08/60/0d0860d917320784369a58a1f01187d3.jpg"
            }
            alt="shop"
          />
          <div className="storeText">
            {/* ⬇️ ตอนนี้จะดึงชื่อได้ทั้งจาก state และจาก /Shop */}
            <h2 className="storeTitle">
              {shop?.shop_name || shop?.name || m.store_name()}
            </h2>
            <h3
              className="storeRate"
              style={{ display: "flex", alignItems: "center" }}
            >
              <FaStar size={20} /> {shop?.rate ?? "-"} / 5
            </h3>
            <h4 className="storeSubtitle">{m.store_description()}</h4>
            <p className="storeDesc">
              {shop?.description || m.menu_not_found()}
            </p>
          </div>
        </div>

        <div className="mapBox">
          <h1>{m.store_location()}</h1>
          <div className="miniMap">
            <iframe
              src={`https://www.google.com/maps?q=${lat},${lng}&z=17&output=embed`}
              allowFullScreen
              loading="lazy"
              title="mini-map"
            />
          </div>
          <button
            className="openMapBtn"
            onClick={() =>
              window.open(
                `https://www.google.com/maps?q=${lat},${lng}`,
                "_blank"
              )
            }
            style={btnPrimary}
          >
            {m.store_open_map()}
          </button>
          {lat === 0 && lng === 0 && (
            <div style={{ color: "#b45309", marginTop: 8 }}>
              {m.store_not_set_location()}
            </div>
          )}
        </div>
      </div>

      <div className="right">
        <div className="menuScroll">
          <div className="menu">
            {loading && <div style={{ padding: 12 }}>{m.menu_loading()}.</div>}
            {!loading && err && (
              <div style={{ color: "crimson", padding: 12 }}>{err}</div>
            )}
            {!loading && !err && menus.length === 0 && (
              <div style={{ padding: 12 }}>{m.menu_not_found()}</div>
            )}

            {!loading &&
              !err &&
              menus.map((item, index) => (
                <div
                  key={item.id || index}
                  className="menuBox"
                  style={{ margin: 10, padding: 10 }}
                >
                  <button
                    onClick={() => handleOrder(item)}
                    style={{ ...cardButton, textAlign: "left" }}
                  >
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name || "menu"}
                        style={{
                          width: "100%",
                          maxWidth: 360,
                          borderRadius: 8,
                          marginBottom: 8,
                          objectFit: "cover",
                        }}
                      />
                    )}
                    <p>
                      <b>{m.store_name()}:</b> {item.name}
                    </p>
                    <p>
                      <b>{m.price()}:</b> {item.price} ฿
                    </p>
                    <p>
                      <b>{m.description()}:</b> {item.description}
                    </p>
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------- inline styles ----------------- */
const cardButton = {
  width: "100%",
  background: "white",
  border: "1px solid #eee",
  borderRadius: 10,
  padding: 10,
  cursor: "pointer",
  boxShadow: "rgba(0,0,0,0.04) 0 2px 8px",
};

const btnPrimary = {
  background: "#ffa360",
  color: "#fff",
  border: "none",
  padding: "8px 12px",
  borderRadius: 8,
  cursor: "pointer",
};
