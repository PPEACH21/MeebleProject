import { useEffect, useMemo, useState, useContext } from "react";
import axios from "@/api/axios";
import { useNavigate } from "react-router-dom";
import "@css/pages/VendorOrders.css";
import { AuthContext } from "@/context/ProtectRoute";

/* ---------- helpers ---------- */
const toDate = (v) => {
  if (!v) return null;
  if (typeof v === "object" && ("seconds" in v || "_seconds" in v)) {
    const s = v.seconds ?? v._seconds;
    return new Date(s * 1000);
  }
  return new Date(v);
};

const formatThaiBuddhist = (v) => {
  const d = toDate(v);
  if (!d || isNaN(+d)) return "-";
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

const canonicalStatus = (s) => {
  const x = String(s || "").trim().toLowerCase();
  if (["prepare", "preparing", "กำลังจัดเตรียม"].includes(x)) return "prepare";
  if (["ongoing", "on-going", "shipping", "กำลังจัดส่ง"].includes(x)) return "ongoing";
  if (["success", "completed", "done", "เสร็จสิ้น", "สำเร็จ"].includes(x)) return "success";
  return x || "prepare";
};

/* ---------- main ---------- */
export default function VendorOrders() {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);

  const [shopId, setShopId] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const vendorId = useMemo(() => auth?.user_id || auth?.id || "", [auth]);

  // 1) หา shopId แบบเดียวกับ VHomePage:
  //    - เอาจาก localStorage.currentShopId ก่อน
  //    - ถ้าไม่เจอ: ยิง /shops/by-vendor/:vendorId แล้วตั้ง currentShopId
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        // A. จาก localStorage ก่อน
        const fromLocal = localStorage.getItem("currentShopId");
        if (fromLocal) {
          if (!alive) return;
          setShopId(fromLocal);
          return;
        }

        // B. ถ้าไม่มีใน localStorage และเรารู้ vendorId → ไปดึงจาก backend
        if (!vendorId) {
          setErr("ยังไม่พบข้อมูลผู้ใช้ (vendorId)");
          return;
        }

        const res = await axios.get(`/shops/by-vendor/${vendorId}`, {
          withCredentials: true,
        });

        // รองรับสองรูปแบบที่ VHomePage รองรับ
        let resolvedShop = null;
        if (res.data?.hasShop && res.data.shop) {
          resolvedShop = res.data.shop;
        } else if (Array.isArray(res.data?.shops) && res.data.shops.length > 0) {
          resolvedShop = res.data.shops[0];
        }

        const id =
          resolvedShop?.id || resolvedShop?.ID || resolvedShop?.Id || "";

        if (!id) {
          setErr("ไม่พบร้านที่คุณเป็นเจ้าของ");
          return;
        }

        localStorage.setItem("currentShopId", id);
        if (!alive) return;
        setShopId(id);
      } catch (e) {
        console.error("❌ [VendorOrders] ค้นหาร้านจาก vendor ล้มเหลว:", e?.response?.data || e.message);
        setErr(e?.response?.data?.error || e.message || "load shop error");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [vendorId]);

  // 2) เมื่อมี shopId แล้ว ค่อยโหลดออเดอร์ของร้าน
  useEffect(() => {
    if (!shopId) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const res = await axios.get("/orders/shop", {
          params: { shopId },
          withCredentials: true,
        });

        const data = Array.isArray(res.data) ? res.data : [];

        // เผื่อฝั่ง BE ส่งสถานะหลุดมา กรองเฉพาะ prepare/ongoing
        const filtered = data.filter((o) => {
          const st = canonicalStatus(o?.status);
          return st === "prepare" || st === "ongoing";
        });

        // เรียงล่าสุดก่อน
        filtered.sort((a, b) => {
          const ta = toDate(a.createdAt) || toDate(a.raw?.createdAt) || new Date(0);
          const tb = toDate(b.createdAt) || toDate(b.raw?.createdAt) || new Date(0);
          return tb - ta;
        });

        if (!alive) return;
        setOrders(filtered);
      } catch (e) {
        console.error("❌ [VendorOrders] โหลดออเดอร์ร้านล้มเหลว:", e?.response?.data || e.message);
        if (!alive) return;
        setErr(e?.response?.data?.error || e.message || "load orders error");
        setOrders([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [shopId]);

  // ---------- UI ----------
  const OrderCard = ({ order }) => {
    const st = canonicalStatus(order.status);
    const isOngoing = st === "ongoing";
    const isSuccess = st === "success";

    const chipClass = isSuccess
      ? "v-chip--success"
      : isOngoing
      ? "v-chip--ongoing"
      : "v-chip--prepare";

    const chipText = isSuccess ? "สำเร็จ" : isOngoing ? "กำลังจัดส่ง" : "กำลังเตรียม";

    const created = order?.createdAt || order?.raw?.createdAt || order?.updatedAt || order?.raw?.updatedAt;
    const customer =
      order?.raw?.customerName ||
      order?.customerName ||
      order?.raw?.username ||
      order?.username ||
      "ไม่ระบุ";

    return (
      <div
        className="v-card"
        role="button"
        onClick={() => navigate(`/vendor/orders/${encodeURIComponent(order.id)}`)}
        title="ดูรายละเอียดออเดอร์"
      >
        <div className="v-card__left">
          <div className="v-field">
            <div className="v-label">Order ID</div>
            <div className="v-value">{order.orderId || order.id}</div>
          </div>
          <div className="v-field">
            <div className="v-label">ลูกค้า</div>
            <div className="v-value">{customer}</div>
          </div>
          <div className="v-field">
            <div className="v-label">วันที่</div>
            <div className="v-value">{formatThaiBuddhist(created)}</div>
          </div>
        </div>
        <div className={`v-chip ${chipClass}`}>{chipText}</div>
      </div>
    );
  };

  return (
    <div className="v-wrap">
      <div className="v-container">
        <h1 className="v-title">ออเดอร์ทั้งหมดของร้าน</h1>

        {!shopId && !loading && (
          <p className="v-empty">
            ยังไม่พบ <code>shopId</code> — กรุณาเข้าไปที่หน้า “หน้าหลักร้าน” เพื่อเลือกร้านก่อน
          </p>
        )}

        {loading && <p className="v-loading">กำลังโหลดข้อมูล…</p>}

        {!loading && err && <p className="v-error">เกิดข้อผิดพลาด: {String(err)}</p>}

        {!loading && !err && shopId && orders.length === 0 && (
          <p className="v-empty">ยังไม่มีออเดอร์ในคิว</p>
        )}

        {!loading && !err && orders.length > 0 && (
          <div className="v-grid">
            {orders.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
