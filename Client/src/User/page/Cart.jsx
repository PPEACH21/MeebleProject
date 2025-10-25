import { useContext, useEffect, useMemo, useState, useCallback } from "react";
import axios from "@/api/axios";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { AuthContext } from "@/context/ProtectRoute";
import { useNavigate, useLocation } from "react-router-dom";
import "@css/pages/CartPage.css";

const currency = (n) =>
  (Number(n) || 0).toLocaleString("th-TH", {
    style: "currency",
    currency: "THB",
  });

// แปลงตัวเลขให้ชัวร์
const toNum = (v) => (typeof v === "number" ? v : Number(v) || 0);
const recomputeTotal = (items) =>
  (items || []).reduce((s, it) => s + toNum(it.qty) * toNum(it.price), 0);

export default function Cart() {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const vendorIdFromState = location.state?.vendorId; // มาจากหน้า MenuStore ตอน navigate เข้ามา
  const shopFromState = location.state?.shop;

  // ปรับ mapping ให้ตรงกับระบบของคุณ
  const userId = auth?.user_id || auth?.uid || "";
  const customerId = auth?.username || auth?.customerId || auth?.email || "";

  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState({ customerId, items: [], total: 0 });

  // ดึง vendor/shop จากรายการชิ้นแรกของตะกร้า (รองรับคีย์ตัวเล็ก/ใหญ่จาก BE)
  const getVendorShopFromItems = (items) => {
    const f = (items && items[0]) || {};
    const vendorId = f.vendorId || f.VendorID || "";
    const shopId = f.shopId || f.ShopID || "";
    return { vendorId, shopId };
  };

  // ใช้ vendor/shop ปัจจุบัน (state ถ้ามี, ไม่มีก็ดึงจาก cart)
  const currentVendorShop = useMemo(() => {
    const { vendorId, shopId } = getVendorShopFromItems(cart.items);
    return {
      vendorId: vendorIdFromState || vendorId,
      shopId: shopFromState?.id || shopId,
    };
  }, [vendorIdFromState, shopFromState, cart.items]);

  // ปุ่มกลับไปหน้าร้านเดิม (แก้ให้ไป /menu/:vendorId)
  const goBackToVendor = useCallback(() => {
    const vid = currentVendorShop.vendorId;
    if (vid) {
      navigate(`/menu/${vid}`, { state: { shop: shopFromState } });
    } else {
      navigate("/"); // ไม่มีข้อมูลจริงๆ ค่อยกลับหน้าแรก
    }
  }, [currentVendorShop.vendorId, shopFromState, navigate]);

  const canCheckout = useMemo(
    () => (cart.items?.length || 0) > 0 && toNum(cart.total) > 0,
    [cart]
  );

  // ✅ ใช้เส้นทาง /api/cart ให้ตรงกับ Backend ของคุณ
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
      return Swal.fire(
        "ไม่มีข้อมูลผู้ใช้",
        "ไม่พบ customerId — โปรดเข้าสู่ระบบ",
        "error"
      );
    }
    setLoading(true);
    try {
      const { data } = await apiGetCart(customerId);
      // ทำให้แน่ใจว่า field เป็นตัวเลข และ total ถูกต้องเสมอ
      const items = (data.items || []).map((it) => ({
        ...it,
        qty: toNum(it.qty),
        price: toNum(it.price),
      }));
      const serverTotal = toNum(data.total);
      const safeTotal = serverTotal > 0 ? serverTotal : recomputeTotal(items);
      setCart({ ...data, items, total: safeTotal });
    } catch (e) {
      console.error("GET /api/cart error:", e?.response?.data || e.message);
      Swal.fire(
        "ดึงตะกร้าไม่สำเร็จ",
        e?.response?.data?.error || e.message,
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [customerId, apiGetCart]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const updateQty = async (menuId, qty) => {
    const newQty = Math.max(0, Math.floor(toNum(qty)));
    const { vendorId, shopId } = getVendorShopFromItems(cart.items);
    try {
      await apiUpdateQty({ vendorId, shopId, customerId, menuId, qty: newQty });
      // optimistic update
      setCart((prev) => {
        const items = prev.items
          .map((it) => (it.id === menuId ? { ...it, qty: newQty } : it))
          .filter((it) => toNum(it.qty) > 0);
        return { ...prev, items, total: recomputeTotal(items) };
      });
    } catch (e) {
      console.error(
        "PATCH /api/cart/qty error:",
        e?.response?.data || e.message
      );
      Swal.fire(
        "ปรับจำนวนไม่สำเร็จ",
        e?.response?.data?.error || e.message,
        "error"
      );
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
    updateQty(menuId, 0);
  };

  const onCheckout = async () => {
    if (!canCheckout) return;
    const { vendorId, shopId } = getVendorShopFromItems(cart.items);
    if (!vendorId || !shopId) {
      return Swal.fire(
        "ไม่พบร้านค้า",
        "ไม่พบ vendorId/shopId ในตะกร้า",
        "info"
      );
    }

    const ok = await Swal.fire({
      title: "ยืนยันการสั่งซื้อ",
      html: `<div style="text-align:left">ยอดรวม: <b>${currency(
        cart.total
      )}</b><br/>ร้าน: ${shopId}<br/>Vendor: ${vendorId}</div>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
    });
    if (!ok.isConfirmed) return;

    try {
      const { data } = await apiCheckout({
        vendorId,
        shopId,
        customerId,
        userId,
      });
      await Swal.fire("สร้างออเดอร์แล้ว", `เลขที่: ${data.orderId}`, "success");
      fetchCart(); // หลัง checkout BE ล้างตะกร้า → ดึงใหม่ให้ว่าง
      // navigate("/orders");
    } catch (e) {
      console.error(
        "POST /api/cart/checkout error:",
        e?.response?.data || e.message
      );
      const msg =
        e?.response?.data?.error || e?.response?.data?.msg || "checkout failed";
      Swal.fire("ไม่สำเร็จ", msg, "error");
    }
  };

  if (!customerId)
    return <p className="cartPage">ไม่พบ customerId — โปรดเข้าสู่ระบบ</p>;

  return (
    <div className="cartPage">
      <h2>ตะกร้าสินค้า</h2>

      {loading ? (
        <p>กำลังโหลด...</p>
      ) : (cart.items?.length || 0) === 0 ? (
        <div className="emptyCart">
          <p>ตะกร้ายังว่าง</p>
          <button className="btn" onClick={goBackToVendor}>
            เลือกซื้อสินค้าต่อ
          </button>
        </div>
      ) : (
        <>
          <div className="cartList">
            {cart.items.map((it) => (
              <div className="cartItem" key={it.id}>
                <img
                  src={it.image || "https://placehold.co/80x80"}
                  alt={it.name}
                  className="thumb"
                />
                <div className="info">
                  <div className="name">{it.name}</div>
                  <div className="desc line-clamp-2">{it.description}</div>
                  <div className="meta">
                    <span className="price">{currency(it.price)}</span>
                    <span className="x">x</span>
                    <div className="qtyBox">
                      <button
                        className="qtyBtn"
                        onClick={() => updateQty(it.id, toNum(it.qty) - 1)}
                      >
                        −
                      </button>
                      <input
                        className="qtyInput"
                        type="number"
                        min={0}
                        value={toNum(it.qty)}
                        onChange={(e) => updateQty(it.id, e.target.value)}
                      />
                      <button
                        className="qtyBtn"
                        onClick={() => updateQty(it.id, toNum(it.qty) + 1)}
                      >
                        +
                      </button>
                    </div>
                    <span className="subtotal">
                      = {currency(toNum(it.qty) * toNum(it.price))}
                    </span>
                  </div>
                </div>
                <button
                  className="removeBtn"
                  onClick={() => removeItem(it.id)}
                  aria-label="remove"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          <div className="cartSummary">
            <div className="row">
              <span>ยอดรวม</span>
              <strong>{currency(cart.total)}</strong>
            </div>
            <div className="actions">
              <button className="btn ghost" onClick={goBackToVendor}>
                เลือกซื้อสินค้าต่อ
              </button>
              <button
                className="btn primary"
                disabled={!canCheckout}
                onClick={onCheckout}
              >
                ชำระเงิน / สร้างออเดอร์
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
