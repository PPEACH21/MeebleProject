import { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom"; // 👈 เพิ่ม
import axios from "@/api/axios";
import { AuthContext } from "@/context/ProtectRoute";
import "@css/pages/vendorHome.css";

export default function VHomePage() {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate(); // 👈 เพิ่ม

  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updatingReserve, setUpdatingReserve] = useState(false);

  // ✅ โหลดข้อมูลร้านจาก user_id (vendorId) แล้ว "ตั้งค่า" currentShopId ให้ทั้งแอป
  useEffect(() => {
    const fetchShop = async () => {
      try {
        const vendorId = auth?.user_id;
        if (!vendorId) return;

        const res = await axios.get(`/shops/by-vendor/${vendorId}`, {
          withCredentials: true,
        });

        // รองรับได้ทั้ง 2 รูปแบบ response:
        // 1) { hasShop: true, shop: {...} }
        // 2) { success: true, shops: [ {...}, ... ] }
        let resolvedShop = null;
        if (res.data?.hasShop && res.data.shop) {
          resolvedShop = res.data.shop;
        } else if (Array.isArray(res.data?.shops) && res.data.shops.length > 0) {
          resolvedShop = res.data.shops[0]; // หรือให้ผู้ใช้เลือกถ้ามีหลายร้าน
        }

        if (resolvedShop) {
          // normalize id field
          const norm = {
            id: resolvedShop.id || resolvedShop.ID || resolvedShop.Id,
            shop_name:
              resolvedShop.shop_name || resolvedShop.name || resolvedShop.shopName,
            status: !!resolvedShop.status,
            reserve_active: !!resolvedShop.reserve_active,
            ...resolvedShop,
          };

          if (!norm.id) {
            console.warn("⚠️ ร้านที่ได้มาไม่มี id:", resolvedShop);
          } else {
            // 👉 เก็บไว้ให้ Sidebar / VendorMenu ใช้งาน
            localStorage.setItem("currentShopId", norm.id);
          }

          setShop(norm);
        } else {
          setShop(null);
        }
      } catch (err) {
        console.error("Error fetching shop:", err?.response?.data || err);
        setShop(null);
      } finally {
        setLoading(false);
      }
    };
    fetchShop();
  }, [auth?.user_id]);

  // ✅ เปิด/ปิดร้าน (status)
  const toggleShopStatus = async () => {
    if (!shop?.id) return;
    try {
      setUpdating(true);
      const newStatus = !shop.status;

      await axios.put(
        `/shops/${shop.id}/status`,
        { status: newStatus },
        { withCredentials: true }
      );

      setShop((prev) => ({
        ...prev,
        status: newStatus,
        order_active: newStatus, // ผูกกับร้าน
      }));
    } catch (err) {
      console.error("Error updating shop status:", err?.response?.data || err);
      alert("ไม่สามารถเปลี่ยนสถานะร้านได้");
    } finally {
      setUpdating(false);
    }
  };

  // ✅ เปิด/ปิดการจอง (reserve_active)
  const toggleReserve = async () => {
    if (!shop?.id) return;
    try {
      setUpdatingReserve(true);
      const newReserve = !shop.reserve_active;

      await axios.put(
        `/shops/${shop.id}/reserve`,
        { reserve_active: newReserve },
        { withCredentials: true }
      );

      setShop((prev) => ({
        ...prev,
        reserve_active: newReserve,
      }));
    } catch (err) {
      console.error("Error updating reserve status:", err?.response?.data || err);
      alert("ไม่สามารถเปลี่ยนสถานะการจองได้");
    } finally {
      setUpdatingReserve(false);
    }
  };

  if (loading)
    return (
      <div className="dashboard-main">
        <div className="content">
          <h2>กำลังโหลดข้อมูลร้าน...</h2>
        </div>
      </div>
    );

  if (!shop)
    return (
      <div className="dashboard-main">
        <div className="content">
          <h2>ยังไม่มีร้านในระบบ</h2>
        </div>
      </div>
    );

  return (
    <div className="dashboard-main">
      <div className="content">
        <div className="header-row">
          <h1>{shop.shop_name || `ร้าน (${shop.id})`}</h1>

          <div className="btn-group">
            {/* ปุ่มเปิด/ปิดร้าน */}
            <button
              className={`status-btn ${shop.status ? "open" : "closed"}`}
              onClick={toggleShopStatus}
              disabled={updating}
            >
              {updating
                ? "⏳ กำลังอัปเดต..."
                : shop.status
                ? "🔓 ร้านเปิดอยู่ (คลิกเพื่อปิด)"
                : "🔒 ร้านปิดอยู่ (คลิกเพื่อเปิด)"}
            </button>

            {/* ปุ่มเปิด/ปิดจอง */}
            <button
              className={`reserve-btn ${shop.reserve_active ? "on" : "off"}`}
              onClick={toggleReserve}
              disabled={updatingReserve}
            >
              {updatingReserve
                ? "⏳ กำลังอัปเดต..."
                : shop.reserve_active
                ? "📅 เปิดรับการจอง"
                : "🚫 ปิดรับการจอง"}
            </button>

            {/* ✅ ปุ่มไปจัดการเมนู (แน่ใจว่าใช้ shop.id จริง) */}
            <button
              className="menu-btn"
              onClick={() => {
                if (!shop?.id) return alert("ไม่พบ shopId");
                // ส่ง state เผื่อหน้า VendorMenu อยากใช้
                navigate(`/vendor/shops/${shop.id}/menu`, {
                  state: { shopId: shop.id, shop },
                });
              }}
            >
              🍽️ จัดการเมนู
            </button>

            {/* หรือใช้ลิงก์ก็ได้ */}
            {/* <Link className="menu-link" to={`/vendor/shops/${shop.id}/menu`} state={{ shopId: shop.id, shop }}>
              🍽️ จัดการเมนู
            </Link> */}
          </div>
        </div>

        {/* debug เล็กน้อย */}
        <div style={{ marginTop: 8, color: "#64748b", fontSize: 13 }}>
          <div>Shop ID: <code>{shop.id}</code></div>
        </div>

        <div className="sale"></div>
        <div className="sale"></div>
      </div>
    </div>
  );
}
