// src/User/page/VHomePage.jsx
import { useState, useEffect, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "@/api/axios";
import { AuthContext } from "@/context/ProtectRoute";
import "@css/pages/vendorHome.css";
import {m} from "@/paraglide/messages"

/* ---------- helper: ล็อก/ปลดล็อก sidebar ---------- */
const lockSidebar = (on) => {
  const body = document?.body;
  if (!body) return;
  const cls = "sidebar-lock";
  if (on) body.classList.add(cls);
  else body.classList.remove(cls);
};

/* ---------- helper: format & calc ---------- */
const getOrderTotal = (o) => {
  const num = (v) => (typeof v === "number" ? v : Number(v) || 0);
  const direct =
    o?.total ?? o?.amount ?? o?.price ??
    o?.raw?.total ?? o?.raw?.amount ?? o?.raw?.price;
  if (direct != null) return num(direct);

  const items = Array.isArray(o?.items)
    ? o.items
    : Array.isArray(o?.raw?.items)
    ? o.raw.items
    : [];
  return items.reduce((s, it) => {
    const p = num(it?.price ?? it?.Price);
    const q = num(it?.qty ?? it?.Qty ?? 1);
    return s + p * q;
  }, 0);
};

const dayKey = (v) => {
  const d = new Date(v);
  if (isNaN(d)) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const normalizeReservationList = (resData) => {
  const toMillis = (t) => {
    if (!t) return null;
    if (typeof t === "number") return t;
    if (typeof t === "string") return Date.parse(t) || null;
    const s = t.seconds ?? t._seconds;
    const ns = t.nanos ?? t._nanoseconds;
    if (typeof s === "number") return s * 1000 + Math.round((ns || 0) / 1e6);
    return null;
  };

  const list = Array.isArray(resData)
    ? resData
    : Array.isArray(resData?.data)
    ? resData.data
    : Array.isArray(resData?.reservations)
    ? resData.reservations
    : [];

  return list
    .map((r) => ({
      id: r.id || r.ID,
      date: r.date, // YYYY-MM-DD
      userId: r.userId,
      customerId: r.customerId,
      shopId: r.shopId,
      shop_name: r.shop_name,
      note: r.note || "",
      phone: r.phone || "",
      createdAt:
        toMillis(r.createdAt) ??
        toMillis(r.raw?.createdAt) ??
        r.createdAt ??
        r.raw?.createdAt,
    }))
    .filter((r) => typeof r.date === "string" && r.date.length === 10);
};

export default function VHomePage() {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();

  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ todaySales: 0, orders: 0, reserves: 0 });
  const [updating, setUpdating] = useState(false);
  const [updatingReserve, setUpdatingReserve] = useState(false);

  // orders (display only)
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // sales & orders from history
  const [totalSalesAll, setTotalSalesAll] = useState(0);
  const [totalOrderCountAll, setTotalOrderCountAll] = useState(0);
  const [dailySales, setDailySales] = useState([]); // [{date,amount,orders}]
  const [todaySalesCalc, setTodaySalesCalc] = useState(0);
  const [todayOrderCount, setTodayOrderCount] = useState(0);
  const [showDailyModal, setShowDailyModal] = useState(false);

  // reservations (calendar)
  const [reservations, setReservations] = useState([]);
  const [reservationsLoading, setReservationsLoading] = useState(true);

  const userId = auth?.user_id;

  /* ---------- โหลดร้าน ---------- */
  useEffect(() => {
    let alive = true;

    const fetchShop = async () => {
      try {
        const res = await axios.get(`/shops/by-vendor/${userId}`, {
          withCredentials: true,
        });

        let resolvedShop = null;
        if (res.data?.hasShop && res.data.shop) resolvedShop = res.data.shop;
        else if (Array.isArray(res.data?.shops) && res.data.shops.length > 0)
          resolvedShop = res.data.shops[0];

        if (resolvedShop) {
          const id = resolvedShop.id || resolvedShop.ID || resolvedShop.Id;
          localStorage.setItem("currentShopId", id);
          if (!alive) return;
          setShop({
            id,
            shop_name: resolvedShop.shop_name || resolvedShop.name,
            status: !!resolvedShop.status,
            reserve_active: !!resolvedShop.reserve_active,
          });
          lockSidebar(false); // มีร้านแล้ว ปลดล็อก
        } else {
          // ไม่มีร้าน → ล็อก sidebar + ไปสร้างร้าน
          lockSidebar(true);
          navigate("/vendor/create", { replace: true });
        }
      } catch (err) {
        console.error("Error fetching shop:", err);
        if (!shop) {
          lockSidebar(true);
          navigate("/vendor/create", { replace: true });
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    if (userId) fetchShop();

    return () => {
      alive = false;
      lockSidebar(false);
    };
  }, [userId, navigate]); // include navigate

  /* ---------- สถิติ (ถ้ามี endpoint) ---------- */
  useEffect(() => {
    const fetchStats = async () => {
      if (!shop?.id) return;
      try {
        const res = await axios.get(`/api/shops/${shop.id}/stats`, {
          withCredentials: true,
        });
        setStats(res.data || { todaySales: 0, orders: 0, reserves: 0 });
      } catch (err) {
        console.warn("โหลดสถิติไม่สำเร็จ", err?.response?.data || err.message);
      }
    };
    fetchStats();
  }, [shop?.id]);

  /* ---------- ออเดอร์ล่าสุด ---------- */
  useEffect(() => {
    const fetchOrders = async () => {
      if (!shop?.id) return;
      setOrdersLoading(true);
      try {
        const res = await axios.get("/orders/shop", {
          params: { shopId: shop.id },
          withCredentials: true,
        });
        const data = Array.isArray(res.data) ? res.data : [];

        const filtered = data
          .filter((o) =>
            ["prepare", "ongoing"].includes(
              String(o.status || "").toLowerCase()
            )
          )
          .sort(
            (a, b) =>
              new Date(b.createdAt || b.raw?.createdAt || 0) -
              new Date(a.createdAt || a.raw?.createdAt || 0)
          );

        setOrders(filtered);
      } catch (err) {
        console.warn("โหลดออเดอร์ไม่สำเร็จ", err?.response?.data || err.message);
        setOrders([]);
      } finally {
        setOrdersLoading(false);
      }
    };
    fetchOrders();
  }, [shop?.id]);

  /* ---------- ยอดขายรวม/รายวัน ---------- */
  useEffect(() => {
    const loadHistory = async () => {
      if (!shop?.id) return;
      try {
        const res = await axios.get(`/api/shops/${shop.id}/history`, {
          withCredentials: true,
        });
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        const successOnly = list.filter((o) => {
          const t = String(o?.status || o?.raw?.status || "").toLowerCase();
          return t.includes("success") || t.includes("done");
        });

        const totalAll = successOnly.reduce((s, o) => s + getOrderTotal(o), 0);

        const bucket = new Map();
        successOnly.forEach((o) => {
          const ts = o.createdAt || o.raw?.createdAt || o.raw?.time || o.time;
          const key = dayKey(ts || Date.now());
          const amt = getOrderTotal(o);
          const cur = bucket.get(key) || { amount: 0, orders: 0 };
          cur.amount += amt;
          cur.orders += 1;
          bucket.set(key, cur);
        });

        const daily = Array.from(bucket.entries())
          .map(([date, v]) => ({ date, ...v }))
          .sort((a, b) => (a.date < b.date ? 1 : -1));

        const todayKey = dayKey(Date.now());
        const todayData = bucket.get(todayKey) || { amount: 0, orders: 0 };

        setTotalSalesAll(totalAll);
        setTotalOrderCountAll(successOnly.length);
        setDailySales(daily);
        setTodaySalesCalc(todayData.amount);
        setTodayOrderCount(todayData.orders);
      } catch (e) {
        console.warn("โหลด history ไม่สำเร็จ", e?.response?.data || e.message);
        setTotalSalesAll(0);
        setTotalOrderCountAll(0);
        setDailySales([]);
        setTodaySalesCalc(0);
        setTodayOrderCount(0);
      }
    };
    loadHistory();
  }, [shop?.id]);

  /* ---------- การจอง (Calendar) โหลดตลอด + รีเฟรชอัตโนมัติ ---------- */
  useEffect(() => {
    if (!shop?.id) return;

    let alive = true;
    let timer = null;

    const fetchReservations = async () => {
      try {
        // รอบแรกโชว์กำลังโหลด ถ้าก่อนหน้าไม่มีข้อมูล
        setReservationsLoading((prev) => prev === true || reservations.length === 0);

        const res = await axios.get(`/shops/${shop.id}/reservations`, {
          withCredentials: true,
        });

        const normalized = normalizeReservationList(res.data);
        if (!alive) return;

        setReservations(normalized);
        setStats((prev) => ({ ...prev, reserves: normalized.length }));
      } catch (err) {
        if (!alive) return;
        console.warn("[reservations] load failed", err?.response?.data || err.message);
        setReservations([]);
        setStats((prev) => ({ ...prev, reserves: 0 }));
      } finally {
        if (alive) setReservationsLoading(false);
      }
    };

    // โหลดทันทีที่เข้าหน้า
    fetchReservations();
    // รีเฟรชทุก 20 วินาที
    timer = setInterval(fetchReservations, 20000);

    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, [shop?.id]);

  /* ---------- ปุ่มเปิด/ปิด ---------- */
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
      await axios.put(
        `/shops/${shop.id}/reserve`,
        { reserve_active: newReserve },
        { withCredentials: true }
      );
      setShop((p) => ({ ...p, reserve_active: newReserve }));
    } finally {
      setUpdatingReserve(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-main">
        <h2>กำลังโหลดข้อมูล...</h2>
      </div>
    );
  }

  // ไม่มีร้าน: ปกติจะถูก redirect ไปแล้ว — เผื่อกรณี render ทับ ให้โชว์ข้อความกันว่าง
  if (!shop) {
    return (
      <div className="dashboard-main">
        <h2>กำลังตรวจสอบร้าน…</h2>
      </div>
    );
  }

  return (
    <div className="dashboard-main">
      <div className="content">
        <div className="header-row">
          <h1 style={{paddingLeft:"110px"}}>{shop.shop_name}</h1>
          <div className="btn-group">
            <button
              className={`status-btn ${shop.status ? "open" : "closed"}`}
              onClick={toggleShopStatus}
              disabled={updating}
            >
              {shop.status ? `🔓 ${m.storeOpen()}` : `🔒 ${m.StoreClosed()} `}
            </button>
            <button
              className={`reserve-btn ${shop.reserve_active ? "on" : "off"}`}
              onClick={toggleReserve}
              disabled={updatingReserve}
            >
              {shop.reserve_active ? `📅 ${m.reserveOpen()}` : `🚫 ${m.reserveClose()}`}
            </button>
            <button
              className="menu-btn"
              onClick={() => navigate(`/vendor/shops/${shop.id}/menu`)}
            >
              🍽️ {m.manageMenu()}
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="dashboard-cards">
          <div className="card summary">
            <h3>{m.todaySale()}</h3>
            <p className="amount">
              {todaySalesCalc.toLocaleString("th-TH", {
                style: "currency",
                currency: "THB",
              })}
            </p>
            <p className="subtext">{m.orderAmount()} : {todayOrderCount}</p>
          </div>

          <div className="card summary">
            <h3>{m.allOrder()}</h3>
            <p className="amount">{totalOrderCountAll}</p>
          </div>

          <div className="card summary">
            <h3>{m.allReserve()}</h3>
            <p className="amount">{stats.reserves}</p>
          </div>

          <button
            className="card summary clickable"
            onClick={() => setShowDailyModal(true)}
          >
            <h3>{m.allSales()}</h3>
            <p className="amount">
              {totalSalesAll.toLocaleString("th-TH", {
                style: "currency",
                currency: "THB",
              })}
            </p>
            <span className="hint">{m.saleDetail()}</span>
          </button>
        </div>

        {/* Calendar + Recent Orders */}
        <div className="dashboard-lower">
          <div className="calendar-box">
            <h3>📅 {m.reserveCalendar()}</h3>
            <ReservationCalendar
              loading={reservationsLoading}
              reservations={reservations}
            />
          </div>

          <div className="recent-orders">
            <h3>🧾 {m.lastedOrder()}</h3>
            {ordersLoading ? (
              <p>{m.loading()}</p>
            ) : orders.length === 0 ? (
              <p>{m.lastedOrder()}</p>
            ) : (
              <table className="order-table">
                <thead>
                  <tr>
                    <th>{m.time()}</th>
                    <th>{m.order_id()}</th>
                    <th>{m.costumer()}</th>
                    <th>{m.status()}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id || o.historyId || o.orderId}>
                      <td>
                        {new Date(
                          o.createdAt || o.raw?.createdAt
                        ).toLocaleString("th-TH")}
                      </td>
                      <td>{o.id || o.historyId || o.orderId}</td>
                      <td>{o.customerName || o.raw?.customerName || "—"}</td>
                      {/* จุดสีเท่านั้น */}
                      <td data-status={String(o.status || "").toLowerCase()} />
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* รายวัน (ยอดขาย) */}
      {showDailyModal && (
        <div className="modal-mask" onClick={() => setShowDailyModal(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>สรุปยอดขายรายวัน</h3>
              <button
                className="close-btn"
                onClick={() => setShowDailyModal(false)}
              >
                ✕
              </button>
            </div>
            {dailySales.length === 0 ? (
              <div className="modal-body">ยังไม่มีข้อมูลยอดขาย</div>
            ) : (
              <div className="modal-body">
                <table className="daily-table">
                  <thead>
                    <tr>
                      <th>วันที่</th>
                      <th>จำนวนออเดอร์</th>
                      <th>ยอดขาย</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailySales.map((d) => (
                      <tr key={d.date}>
                        <td>
                          {new Date(d.date).toLocaleDateString("th-TH")}
                        </td>
                        <td>{d.orders}</td>
                        <td>
                          {d.amount.toLocaleString("th-TH", {
                            style: "currency",
                            currency: "THB",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="modal-foot">
              <button className="primary" onClick={() => setShowDailyModal(false)}>
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================== ปฏิทินการจอง ================== */
function ReservationCalendar({ loading, reservations }) {
  const ymdLocal = (d) => {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  };

  // ใช้ Firestore docId ปกติ และโชว์เป็น 5 ตัวท้าย + วันที่
  const reservationCode = (id, date) => {
    if (!id) return "—";
    const frag = (id.length >= 5 ? id.slice(-5) : id).toUpperCase();
    return `${frag}-${date || ""}`;
  };

  // ดึงชื่อจากหลังบ้าน /api/users/:id/name และ cache กันยิงซ้ำ
  const [nameCache, setNameCache] = useState(new Map());
  const inflight = useMemo(() => new Map(), []);
  const getDisplayName = async (uid) => {
    if (!uid) return "";
    if (nameCache.has(uid)) return nameCache.get(uid);
    if (inflight.has(uid)) return inflight.get(uid);

    const p = (async () => {
      try {
        const res = await axios.get(`/api/users/${uid}/name`, {
          withCredentials: true,
        });
        const name = res?.data?.name || uid;
        setNameCache((prev) => {
          const m = new Map(prev);
          m.set(uid, name);
          return m;
        });
        return name;
      } catch {
        return uid;
      } finally {
        inflight.delete(uid);
      }
    })();

    inflight.set(uid, p);
    return p;
  };

  const [month, setMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayOpen, setDayOpen] = useState(false);

  const group = useMemo(() => {
    const m = new Map();
    (reservations || []).forEach((r) => {
      const key = typeof r.date === "string" ? r.date : "";
      if (!key) return;
      const arr = m.get(key) || [];
      arr.push(r);
      m.set(key, arr);
    });
    return m;
  }, [reservations]);

  const addMonth = (delta) => {
    const d = new Date(month);
    d.setMonth(d.getMonth() + delta);
    setMonth(d);
  };

  const labelTH = month.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
  });

  const year = month.getFullYear();
  const mon = month.getMonth();
  const firstDow = new Date(year, mon, 1).getDay();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, mon, d));

  const todayYMD = ymdLocal(new Date());

  return (
    <>
      <div className="cal-head">
        <button className="cal-nav" onClick={() => addMonth(-1)}>
          &laquo;
        </button>
        <div className="cal-title">{labelTH}</div>
        <button className="cal-nav" onClick={() => addMonth(1)}>
          &raquo;
        </button>
      </div>

      {loading ? (
        <div className="cal-loading">กำลังโหลดการจอง…</div>
      ) : (
        <div className="cal-grid">
          {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((w) => (
            <div key={w} className="cal-colhead">
              {w}
            </div>
          ))}

          {cells.map((d, idx) => {
            if (!d) return <div key={`b${idx}`} className="cal-cell blank" />;
            const ymd = ymdLocal(d);
            const items = group.get(ymd) || [];
            const count = items.length;

            return (
              <button
                key={ymd}
                className={`cal-cell day ${ymd === todayYMD ? "today" : ""} ${
                  count ? "has" : ""
                }`}
                onClick={() => {
                  setSelectedDate(ymd);
                  setDayOpen(true);
                }}
                title={count ? `${count} การจอง` : ""}
              >
                <div className="cal-date">{d.getDate()}</div>
                {count > 0 && <div className="badge">{count}</div>}
              </button>
            );
          })}
        </div>
      )}

      {dayOpen && (
        <div className="modal-mask" onClick={() => setDayOpen(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>
                การจองวันที่{" "}
                {(() => {
                  if (!selectedDate) return "—";
                  const [Y, M, D] = selectedDate.split("-");
                  const dt = new Date(
                    Number(Y),
                    Number(M) - 1,
                    Number(D),
                    12,
                    0,
                    0
                  );
                  return dt.toLocaleDateString("th-TH");
                })()}
              </h3>
              <button className="close-btn" onClick={() => setDayOpen(false)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              {(() => {
                const list = group.get(selectedDate) || [];
                if (list.length === 0) return <p>ไม่มีการจอง</p>;
                return (
                  <table className="daily-table">
                    <thead>
                      <tr>
                        <th>เวลา</th>
                        <th>ผู้จอง</th>
                        <th>รหัสจอง</th>
                        <th>ติดต่อ</th>
                        <th>หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list
                        .slice()
                        .sort(
                          (a, b) =>
                            Number(a.createdAt || 0) -
                            Number(b.createdAt || 0)
                        )
                        .map((r) => (
                          <tr key={r.id}>
                            <td>
                              {r.createdAt
                                ? new Date(
                                    r.createdAt
                                  ).toLocaleTimeString("th-TH")
                                : "—"}
                            </td>
                            <td>
                              <AsyncName
                                uid={r.userId || r.customerId}
                                getName={getDisplayName}
                              />
                            </td>
                            <td style={{ fontFamily: "monospace" }}>
                              {reservationCode(r.id, r.date)}
                            </td>
                            <td>{r.phone || "—"}</td>
                            <td>{r.note || "—"}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            <div className="modal-foot">
              <button className="primary" onClick={() => setDayOpen(false)}>
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AsyncName({ uid, getName }) {
  const [name, setName] = useState(uid || "");
  useEffect(() => {
    let mounted = true;
    (async () => {
      const n = await getName(uid);
      if (mounted) setName(n || uid || "");
    })();
    return () => {
      mounted = false;
    };
  }, [uid, getName]);
  return <span>{name}</span>;
}
