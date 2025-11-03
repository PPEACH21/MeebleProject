// src/pages/Cart.jsx
import { useContext, useEffect, useMemo, useState, useCallback } from "react";
import axios from "@/api/axios";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { AuthContext } from "@/context/ProtectRoute";
import { useNavigate, useLocation } from "react-router-dom";
import "@css/pages/CartPage.css";
import { MdDelete } from "react-icons/md";

const currency = (n) =>
  (Number(n) || 0).toLocaleString("th-TH", { style: "currency", currency: "THB" });

const toNum = (v) => (typeof v === "number" ? v : Number(v) || 0);
const recomputeTotal = (items) =>
  (items || []).reduce((s, it) => s + toNum(it.qty) * toNum(it.price), 0);

export default function Cart() {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const vendorIdFromState = location.state?.vendorId;
  const shopFromState = location.state?.shop;

  const userId = auth?.user_id || auth?.uid || "";
  const customerId = auth?.user_id || auth?.username || auth?.email || "";

  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState({
    customerId,
    shop_name: "",
    items: [],
    total: 0,
  });

  const getVendorShopFromItems = (items) => {
    const f = (items && items[0]) || {};
    const vendorId = f.vendorId || f.VendorID || "";
    const shopId = f.shopId || f.ShopID || "";
    return { vendorId, shopId };
  };

  const currentVendorShop = useMemo(() => {
    const { vendorId, shopId } = getVendorShopFromItems(cart.items);
    return {
      vendorId: vendorIdFromState || vendorId,
      shopId: shopFromState?.id || shopId,
    };
  }, [vendorIdFromState, shopFromState, cart.items]);

  const getCurrentShopId = useCallback(() => {
    const first = cart.items?.[0] || {};
    const shopIdFromCart = first.shopId || first.ShopID || "";
    const shopIdFromState2 = shopFromState?.id || shopFromState?.shopId || "";
    const shopIdFromStorage =
      (typeof window !== "undefined" && localStorage.getItem("currentShopId")) || "";
    return shopIdFromCart || shopIdFromState2 || shopIdFromStorage || "";
  }, [cart.items, shopFromState]);

  const goBackToShop = useCallback(() => {
    const sid = getCurrentShopId();
    if (!sid || (cart?.items?.length ?? 0) === 0) {
      navigate("/home");
      return;
    }
    navigate(`/menu/${encodeURIComponent(sid)}`, {
      state: { shop: shopFromState, shopId: sid },
    });
  }, [getCurrentShopId, shopFromState, navigate, cart]);

  const canCheckout = useMemo(
    () => (cart.items?.length || 0) > 0 && cart.total > 0,
    [cart]
  );

  // --- API helpers ---
  const apiGetCart = useCallback(
    (customerId) =>
      axios.get("/api/cart", { params: { customerId }, withCredentials: true }),
    []
  );
  const apiUpdateQty = useCallback(
    (body) => axios.patch("/api/cart/qty", body, { withCredentials: true }),
    []
  );
  const apiCheckout = useCallback(
    (body) => axios.post("/api/cart/checkout", body, { withCredentials: true }),
    []
  );

  const fetchCart = useCallback(async () => {
    if (!customerId) {
      setLoading(false);
      return Swal.fire("ไม่มีข้อมูลผู้ใช้", "ไม่พบ customerId — โปรดเข้าสู่ระบบ", "error");
    }
    setLoading(true);
    try {
      const { data } = await apiGetCart(customerId);
      const items = (data.items || []).map((it) => ({
        ...it,
        qty: toNum(it.qty),
        price: toNum(it.price),
      }));
      const serverTotal = toNum(data.total);
      const safeTotal = serverTotal > 0 ? serverTotal : recomputeTotal(items);
      const next = { ...data, shop_name: data.shop_name || "", items, total: safeTotal };
      setCart(next);
      console.log("cart :", next);
    } catch (e) {
      console.error("GET /api/cart error:", e?.response?.data || e.message);
      Swal.fire("ดึงตะกร้าไม่สำเร็จ", e?.response?.data?.error || e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [customerId, apiGetCart]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // --- อัปเดตจำนวน (ยิง API ทุกครั้ง + optimistic update) ---
  const updateQty = async (menuId, qty) => {
    const newQty = Math.max(0, Math.floor(toNum(qty)));
    const { vendorId, shopId } = getVendorShopFromItems(cart.items);

    // optimistic ก่อน
    setCart((prev) => {
      const items = prev.items
        .map((it) => (it.id === menuId ? { ...it, qty: newQty } : it))
        .filter((it) => toNum(it.qty) > 0);
      return {
        ...prev,
        items,
        total: recomputeTotal(items),
        shop_name: items.length ? prev.shop_name : "",
      };
    });

    try {
      await apiUpdateQty({ vendorId, shopId, customerId, menuId, qty: newQty });
    } catch (e) {
      console.error("PATCH /api/cart/qty error:", e?.response?.data || e.message);
      // ถ้า error ดึงจากเซิร์ฟเวอร์มาทับ (กัน state เพี้ยน)
      await fetchCart();
      Swal.fire("ปรับจำนวนไม่สำเร็จ", e?.response?.data?.error || e.message, "error");
    }
  };

  const removeItem = async (menuId) => {
    const ok = await Swal.fire({
      title: "ลบสินค้านี้ออกจากตะกร้า?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    });
    if (!ok.isConfirmed) return;
    updateQty(menuId, 0); // ★ ยิง API และเคลียร์ชื่อร้านถ้าตะกร้าว่าง
  };

  const onCheckout = async () => {
    if (!canCheckout) return;

    const ok = await Swal.fire({
      title: "ยืนยันการสั่งซื้อ",
      html: `<div style="text-align:left">
              ยอดรวม (จะใช้ราคาล่าสุดขณะชำระ): <b>${currency(cart.total)}</b><br/>
              ร้าน: ${cart.shop_name || "—"}
            </div>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
    });
    if (!ok.isConfirmed) return;

    try {
      const { data } = await apiCheckout({ userId, customerId });
      await Swal.fire("สำเร็จ", `สร้างประวัติแล้ว (ID: ${data.historyId || "-"})`, "success");
      fetchCart(); // จะว่างหลัง checkout
    } catch (e) {
      const msg = e?.response?.data?.error || e?.response?.data?.msg || e.message;
      Swal.fire("ไม่สำเร็จ", msg, "error");
    }
  };

  if (!customerId)
    return <p className="CP_cartPage">ไม่พบ customerId — โปรดเข้าสู่ระบบ</p>;

  return (
    <div className="CP_cartPage">
      <h2>ชื่อร้าน : {cart.items?.length < 1 ? `ไม่มีร้านที่เลือกขณะนี้` : cart.shop_name}</h2>
      <h2>ตะกร้าสินค้า</h2>

      {loading ? (
        <p>กำลังโหลด...</p>
      ) : (cart.items?.length || 0) === 0 ? (
        <div className="CP_emptyCart">
          <p>ตะกร้ายังว่าง</p>
          <button className="CP_btn" onClick={goBackToShop}>
            เลือกซื้อสินค้าต่อ
          </button>
        </div>
      ) : (
        <>
          <div className="CP_cartList">
            {cart.items.map((it) => (
              <div className="CP_cartItem" key={it.id}>
                <img
                  src={it.image || "https://placehold.co/80x80"}
                  alt={it.name}
                  className="CP_cartItem"
                />
                <div className="CP_info">
                  <div className="name">{it.name}</div>
                  <div className="desc line-clamp-2">{it.description}</div>
                  <div className="meta">
                    <span className="CP_price">{currency(it.CP_price)}</span>
                    <span className="x">x</span>

                    <div className="CP_qtyBox">
                      {/* − : ยิง API ทุกครั้ง */}
                      <button
                        className="btn1"
                        style={{ padding: "2px 10px" }}
                        onClick={() => updateQty(it.id, toNum(it.qty) - 1)} // ★
                      >
                        −
                      </button>

                      {/* พิมพ์เลข: อัปเดต state ทันที, ยิง API ตอน blur */}
                      <input
                        className="CP_qtyInput"
                        min={0}
                        value={toNum(it.qty)}
                        onChange={(e) => {
                          const newQty = Math.max(0, Number(e.target.value) || 0);
                          setCart((prev) => {
                            const items = prev.items.map((item) =>
                              item.id === it.id ? { ...item, qty: newQty } : item
                            );
                            const filtered = items.filter((x) => x.qty > 0);
                            return {
                              ...prev,
                              items: filtered,
                              total: recomputeTotal(filtered),
                              shop_name: filtered.length ? prev.shop_name : "",
                            };
                          });
                        }}
                        onBlur={(e) => {
                          const commitQty = Math.max(0, Number(e.target.value) || 0);
                          updateQty(it.id, commitQty); // ★
                        }}
                      />

                      {/* + : ยิง API ทุกครั้ง */}
                      <button
                        className="btn1"
                        style={{ padding: "2px 10px" }}
                        onClick={() => updateQty(it.id, toNum(it.qty) + 1)} // ★
                      >
                        +
                      </button>
                    </div>

                    <span className="CP_subtotal">
                      {currency(toNum(it.qty) * toNum(it.price))}
                    </span>
                  </div>
                </div>

                <button className="CP_subtotal" onClick={() => removeItem(it.id)} aria-label="remove">
                  <MdDelete color="#e00" size={30} />
                </button>
              </div>
            ))}
          </div>

          <div className="CP_cartSummary">
            <div className="row">
              <span>ยอดรวม</span>
              <strong>{currency(cart.total)}</strong>
            </div>
            <div className="CP_actions">
              <button className="CP_btn ghost" onClick={goBackToShop}>
                เลือกซื้อสินค้าต่อ
              </button>
              <button className="CP_btn primary" disabled={!canCheckout} onClick={onCheckout}>
                ชำระเงิน
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}