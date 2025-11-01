// src/User/page/VHomePage.jsx
import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "@/api/axios";
import { AuthContext } from "@/context/ProtectRoute";
import "@css/pages/vendorHome.css";

export default function VHomePage() {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();

  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ todaySales: 0, orders: 0, reserves: 0 });
  const [updating, setUpdating] = useState(false);
  const [updatingReserve, setUpdatingReserve] = useState(false);

  const userId = auth?.user_id;

  /* ───────── โหลดร้าน ───────── */
  useEffect(() => {
    const fetchShop = async () => {
      try {
        const res = await axios.get(`/shops/by-vendor/${userId}`, { withCredentials: true });
        let resolvedShop = null;
        if (res.data?.hasShop && res.data.shop) resolvedShop = res.data.shop;
        else if (Array.isArray(res.data?.shops) && res.data.shops.length > 0) resolvedShop = res.data.shops[0];

        if (resolvedShop) {
          const id = resolvedShop.id || resolvedShop.ID || resolvedShop.Id;
          localStorage.setItem("currentShopId", id);
          setShop({
            id,
            shop_name: resolvedShop.shop_name || resolvedShop.name,
            status: !!resolvedShop.status,
            reserve_active: !!resolvedShop.reserve_active,
          });
        }
      } catch (err) {
        console.error("Error fetching shop:", err);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchShop();
  }, [userId]);

  /* ───────── โหลดสถิติ ───────── */
  useEffect(() => {
    const fetchStats = async () => {
      if (!shop?.id) return;
      try {
        const res = await axios.get(`/api/shops/${shop.id}/stats`, { withCredentials: true });
        // ตัวอย่าง response: { todaySales: 1530, orders: 12, reserves: 3 }
        setStats(res.data || { todaySales: 0, orders: 0, reserves: 0 });
      } catch (err) {
        console.warn("โหลดสถิติไม่สำเร็จ", err?.response?.data || err.message);
      }
    };
    fetchStats();
  }, [shop?.id]);

  /* ───────── ปุ่มเปิด/ปิด ───────── */
  const toggleShopStatus = async () => {
    if (!shop?.id) return;
    try {
      setUpdating(true);
      const newStatus = !shop.status;
      await axios.put(`/shops/${shop.id}/status`, { status: newStatus }, { withCredentials: true });
      setShop((p) => ({ ...p, status: newStatus }));
    } finally {
      setUpdating(false);
    }
  };

  const toggleReserve = async () => {
    if (!shop?.id) return;
    try {
      setUpdatingReserve(true);
      const newReserve = !shop.reserve_active;
      await axios.put(`/shops/${shop.id}/reserve`, { reserve_active: newReserve }, { withCredentials: true });
      setShop((p) => ({ ...p, reserve_active: newReserve }));
    } finally {
      setUpdatingReserve(false);
    }
  };

  if (loading) return <div className="dashboard-main"><h2>กำลังโหลดข้อมูล...</h2></div>;
  if (!shop) return <div className="dashboard-main"><h2>ยังไม่มีร้านในระบบ</h2></div>;

  return (
    <div className="dashboard-main">
      <div className="content">
        <div className="header-row">
          <h1>{shop.shop_name}</h1>
          <div className="btn-group">
            <button className={`status-btn ${shop.status ? "open" : "closed"}`} onClick={toggleShopStatus}>
              {shop.status ? "🔓 ร้านเปิดอยู่" : "🔒 ร้านปิดอยู่"}
            </button>
            <button className={`reserve-btn ${shop.reserve_active ? "on" : "off"}`} onClick={toggleReserve}>
              {shop.reserve_active ? "📅 เปิดรับการจอง" : "🚫 ปิดรับการจอง"}
            </button>
            <button className="menu-btn" onClick={() => navigate(`/vendor/shops/${shop.id}/menu`)}>
              🍽️ จัดการเมนู
            </button>
          </div>
        </div>

        {/* ───────── Dashboard Summary ───────── */}
        <div className="dashboard-cards">
          <div className="card summary">
            <h3>ยอดขายวันนี้</h3>
            <p className="amount">{stats.todaySales.toLocaleString("th-TH", { style: "currency", currency: "THB" })}</p>
          </div>
          <div className="card summary">
            <h3>จำนวนออเดอร์</h3>
            <p className="amount">{stats.orders}</p>
          </div>
          <div className="card summary">
            <h3>จำนวนการจอง</h3>
            <p className="amount">{stats.reserves}</p>
          </div>
        </div>

        {/* ───────── Calendar / Reserve Section ───────── */}
        <div className="dashboard-lower">
          <div className="calendar-box">
            <h3>📅 ปฏิทินการจอง</h3>
            <iframe
              src="https://calendar.google.com/calendar/embed?mode=MONTH"
              title="calendar"
              className="calendar-frame"
            />
          </div>
          <div className="recent-orders">
            <h3>🧾 ออเดอร์ล่าสุด</h3>
            <p>ฟังก์ชันนี้สามารถดึง /shops/{shop.id}/orders ล่าสุดได้</p>
          </div>
        </div>
      </div>
    </div>
  );
}
