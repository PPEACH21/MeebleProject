// src/User/page/VendorOrders.jsx
import { useEffect, useMemo, useState, useContext } from "react";
import axios from "@/api/axios";
import { useNavigate } from "react-router-dom";
import "@css/pages/VendorOrders.css";
import { AuthContext } from "@/context/ProtectRoute";
import { m } from "@/paraglide/messages.js";

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

  // 1) หา shopId
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const fromLocal = localStorage.getItem("currentShopId");
        if (fromLocal) {
          if (!alive) return;
          setShopId(fromLocal);
          return;
        }

        if (!vendorId) {
          setErr(m.not_found_shopid_hint());
          return;
        }

        const res = await axios.get(`/shops/by-vendor/${vendorId}`, {
          withCredentials: true,
        });

        let resolvedShop = null;
        if (res.data?.hasShop && res.data.shop) {
          resolvedShop = res.data.shop;
        } else if (Array.isArray(res.data?.shops) && res.data.shops.length > 0) {
          resolvedShop = res.data.shops[0];
        }

        const id = resolvedShop?.id || resolvedShop?.ID || resolvedShop?.Id || "";
        if (!id) {
          setErr(m.not_found_shopid_hint());
          return;
        }

        localStorage.setItem("currentShopId", id);
        if (!alive) return;
        setShopId(id);
      } catch (e) {
        console.error("❌ [VendorOrders] load shop error:", e?.response?.data || e.message);
        setErr(e?.response?.data?.error || e.message || m.load_orders_error());
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [vendorId]);

  // 2) โหลดออเดอร์ของร้าน
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
        const filtered = data.filter((o) => {
          const st = canonicalStatus(o?.status);
          return st === "prepare" || st === "ongoing";
        });

        filtered.sort((a, b) => {
          const ta = toDate(a.createdAt) || toDate(a.raw?.createdAt) || new Date(0);
          const tb = toDate(b.createdAt) || toDate(b.raw?.createdAt) || new Date(0);
          return tb - ta;
        });

        if (!alive) return;
        setOrders(filtered);
      } catch (e) {
        console.error("❌ [VendorOrders] load orders error:", e?.response?.data || e.message);
        if (!alive) return;
        setErr(e?.response?.data?.error || e.message || m.load_orders_error());
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

    const chipText = isSuccess
      ? m.status_done()
      : isOngoing
      ? m.status_shipping()
      : m.status_preparing();

    const created =
      order?.createdAt || order?.raw?.createdAt || order?.updatedAt || order?.raw?.updatedAt;
    const customer =
      order?.raw?.customerName ||
      order?.customerName ||
      order?.raw?.username ||
      order?.username ||
      m.unknown_shop(); // ถ้าอยากแยกคีย์เฉพาะ "ไม่ระบุ" ให้เพิ่ม m.unknown_value()

    return (
      <div
        className="v-card"
        role="button"
        onClick={() => navigate(`/vendor/orders/${encodeURIComponent(order.id)}`)}
        title={m.view_order_detail()}
      >
        <div className="v-card__left">
          <div className="v-field">
            <div className="v-label">{m.order_id()}</div>
            <div className="v-value">{order.orderId || order.id}</div>
          </div>
          <div className="v-field">
            <div className="v-label">{m.customer()}</div>
            <div className="v-value">{customer}</div>
          </div>
          <div className="v-field">
            <div className="v-label">{m.date_label()}</div>
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
        <h1 className="v-title">{m.orders_title_shop()}</h1>

        {!shopId && !loading && (
          <p className="v-empty">{m.not_found_shopid_hint()}</p>
        )}

        {loading && <p className="v-loading">{m.loading_data()}</p>}

        {!loading && err && (
          <p className="v-error">
            {m.error_occurred()}: {String(err)}
          </p>
        )}

        {!loading && !err && shopId && orders.length === 0 && (
          <p className="v-empty">{m.orders_empty_queue()}</p>
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
