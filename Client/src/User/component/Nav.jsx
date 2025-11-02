// src/component/Nav.jsx
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "@/context/ProtectRoute";
import axios from "@/api/axios";
import { FaRegUserCircle, FaHistory } from "react-icons/fa";
import { TiShoppingCart } from "react-icons/ti";
import { useNavigate } from "react-router-dom";
import { Outlet } from "react-router-dom";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

// ⬇️ เพิ่มไอคอนปฏิทิน
import { FaRegCalendarAlt } from "react-icons/fa";

export const NavLayout = ({ focus, cart }) => {
  return (
    <>
      <Navbar focus={focus} cart={cart} />
      <div style={{ height: "calc(100vh - 60px)", overflowY: "auto" }}>
        <Outlet />
      </div>
    </>
  );
};

const DropdownProfile = ({ logout, username, email }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div style={{ position: "relative", color: "#fff", zIndex: 2 }}>
      <div
        className="dropdownmain"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
      >
        <FaRegUserCircle size={30} />
        <span>{username || "Guest"}</span>
      </div>

      {open && (
        <div
          className={`dropdownSelect ${open ? "fade-in" : "fade-out"}`}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#fff";
            setOpen(false);
          }}
        >
          <div
            style={{
              width: "300px",
              height: "100px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-evenly",
            }}
          >
            <div className="dropdownProfile">
              <FaRegUserCircle size={55} />
              <div style={{ fontWeight: "bold" }}>
                <p>{username || "Guest"}</p>
                <p>{email || "Guest@gmail.com"}</p>
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate("/profile")}
            className="dropdownchoice"
            onMouseEnter={(e) => (e.currentTarget.style.background = "#FFE0C2")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
          >
            แก้ไขโปรไฟล์
          </div>
          <div
            onClick={() => navigate("/settings")}
            className="dropdownchoice"
            onMouseEnter={(e) => (e.currentTarget.style.background = "#FFE0C2")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
          >
            ตั้งค่า
          </div>
          <div
            onClick={handleLogout}
            className="dropdownchoice"
            onMouseEnter={(e) => (e.currentTarget.style.background = "#FFE0C2")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
          >
            ออกจากระบบ
          </div>
        </div>
      )}
    </div>
  );
};

const Navbar = ({ focus = false, cart = false }) => {
  const { auth, logout } = useContext(AuthContext);
  const [dataUser, setDatauser] = useState({}); // ✅ เป็น object
  const navigate = useNavigate();

  // ⬇️ เพิ่ม state สำหรับ Popup ปฏิทิน/รายการจอง
  const [showCalendar, setShowCalendar] = useState(false);
  const [loadingResv, setLoadingResv] = useState(false);
  const [reservations, setReservations] = useState([]); // [{id, date, shop_name, shopId, note, ...}]

  const getuserID = async () => {
    try {
      if (!auth?.user_id) return;
      const res = await axios.get(`/user/${auth.user_id}`, {
        withCredentials: true,
      });
      setDatauser(res.data || {});
    } catch (err) {
      console.error("Error fetching user:", err);
    }
  };

  useEffect(() => {
    getuserID();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.user_id]);

  const goHome = () => {
    navigate("/home");
  };

  // ✅ ฟังก์ชันเติมเงิน: กรอกจำนวน → บวกเพิ่ม → อัปเดตแบบ optimistic
  const handleTopUpCoin = async () => {
    const { value } = await Swal.fire({
      title: "เติม Coin",
      input: "number",
      inputLabel: "จำนวนที่ต้องการเติม (บวกเพิ่มจากยอดเดิม)",
      inputAttributes: { min: 1, step: 1 },
      inputValidator: (v) => {
        if (v === "" || Number.isNaN(Number(v))) return "กรุณากรอกตัวเลข";
        if (Number(v) <= 0) return "จำนวนต้องมากกว่า 0";
        return undefined;
      },
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
    });
    if (value === undefined) return; // กดยกเลิก

    const amount = Math.floor(Number(value));
    const prev = Number(dataUser?.Cost ?? 0);
    const optimistic = prev + amount;

    // อัปเดตหน้าไว้ก่อน
    setDatauser((p) => ({ ...p, Cost: optimistic }));

    try {
      const res = await axios.post(
        `/user/${auth.user_id}/cost/topup`,
        { amount },
        { withCredentials: true }
      );

      // ถ้า backend ส่ง cost ใหม่กลับมา ใช้ค่าจริง
      if (res?.data?.user?.Cost !== undefined) {
        setDatauser((p) => ({ ...p, Cost: Number(res.data.user.Cost) }));
      } else if (res?.data?.cost !== undefined) {
        setDatauser((p) => ({ ...p, Cost: Number(res.data.cost) }));
      }

      Swal.fire({
        icon: "success",
        title: "เติมสำเร็จ",
        timer: 1100,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Top-up failed:", err);
      // ย้อนกลับค่าเดิมถ้าพัง
      setDatauser((p) => ({ ...p, Cost: prev }));
      Swal.fire({ icon: "error", title: "เติมไม่สำเร็จ" });
    }
  };

  // ⬇️ โหลดรายการจองของ user เมื่อเปิด popup
  useEffect(() => {
    const fetchReservations = async () => {
      if (!showCalendar || !auth?.user_id) return;
      setLoadingResv(true);
      try {
        const res = await axios.get(`/reservations/user/${auth.user_id}`, {
          withCredentials: true,
        });
        const list = Array.isArray(res.data) ? res.data : (res.data?.items || []);
        // เรียงจากวันที่ใหม่ -> เก่า
        list.sort((a, b) => String(b.date).localeCompare(String(a.date)));
        setReservations(list);
      } catch (e) {
        console.error("fetch reservations failed", e);
        setReservations([]);
      } finally {
        setLoadingResv(false);
      }
    };
    fetchReservations();
  }, [showCalendar, auth?.user_id]);

  const fmtInt = (n) =>
    (Number(n) || 0).toLocaleString("th-TH", {
      maximumFractionDigits: 0,
    });

  // ⬇️ helper แสดงรายการใน popup
  const ReservationList = () => {
    if (loadingResv) return <p style={{ color: "#64748b" }}>กำลังโหลด...</p>;
    if (!reservations.length) return <p style={{ color: "#64748b" }}>ยังไม่มีรายการจอง</p>;

    return (
      <div style={{ maxHeight: "60vh", overflowY: "auto", marginTop: 8 }}>
        {reservations.map((r) => (
          <div
            key={r.id || `${r.shopId}_${r.date}`}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 12,
              marginBottom: 10,
              background: "#fff",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontWeight: 700 }}>{r.shop_name || r.shopId || "-"}</div>
              <div style={{ fontFamily: "monospace" }}>{r.date}</div>
            </div>
            {r.note ? (
              <div style={{ marginTop: 6, color: "#475569" }}>
                <b>หมายเหตุ:</b> {r.note}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    );
  };

  return (
    <nav className="navHomePage">
      <div className="nav">
        <div
          className="rowset"
          style={{
            alignItems: "center",
            fontWeight: "bold",
            color: "#fff",
            fontSize: "20px",
          }}
        >
          {focus ? (
            <p onClick={() => navigate(-1)} style={{ cursor: "pointer" }}>
              Back
            </p>
          ) : (
            <>
              <img
                src="https://i.ibb.co/MyMPRx3P/Chat-GPT-Image-Sep-23-2025-10-01-38-PM.jpg"
                alt="Logo"
                onClick={goHome}
                style={{ cursor: "pointer", height: "60px", width: "60px" }}
              />
              <p onClick={goHome} style={{ cursor: "pointer" }}>
                MEEBLE PROJECT
              </p>
            </>
          )}
        </div>

        <div className="navMenu">
          {focus ? (
            <>
              {cart ? (
                <div className="fontcolor">
                  <TiShoppingCart size={35} onClick={() => navigate("/cart")} />
                </div>
              ) : (
                <></>
              )}
            </>
          ) : (
            <>
              <div className="fontcolor">
                <FaHistory size={25} onClick={() => navigate("/history")} />
              </div>

              {/* ✅ ปุ่มปฏิทิน (Popup) — แค่เพิ่ม ไม่แก้ของเดิม */}
              <div
                className="fontcolor"
                title="ดูวันที่จอง (Popup)"
                onClick={() => setShowCalendar(true)}
                style={{ cursor: "pointer" }}
              >
                <FaRegCalendarAlt size={24} />
              </div>

              <div className="fontcolor">
                <TiShoppingCart size={35} onClick={() => navigate("/cart")} />
              </div>
            </>
          )}

          {/* ✅ คลิก Coin เพื่อเติมเงิน */}
          <div
            className="rowset fontcolor"
            title="คลิกเพื่อเติม Coin"
            onClick={handleTopUpCoin}
            style={{ gap: 6, alignItems: "center", cursor: "pointer", userSelect: "none" }}
          >
            <p>Coin: {fmtInt(dataUser?.Cost)}.-</p>
          </div>

          <div
            style={{ gap: 10, alignItems: "center", cursor: "pointer" }}
          >
            <DropdownProfile
              logout={logout}
              username={dataUser.username}
              email={dataUser.email}
            />
          </div>
        </div>
      </div>

      {/* ⬇️ Popup ปฏิทิน/รายการจอง — overlay ปิดได้ด้วยคลิกนอกกล่อง */}
      {showCalendar && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCalendar(false);
          }}
        >
          <div
            style={{
              width: "min(760px, 96vw)",
              background: "#fff",
              borderRadius: 16,
              boxShadow: "0 10px 30px rgba(0,0,0,.2)",
              border: "1px solid #e5e7eb",
              padding: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <h3 style={{ margin: 0 }}>📅 วันที่คุณจองไว้</h3>
              <button
                onClick={() => setShowCalendar(false)}
                style={{
                  border: "none",
                  background: "#111827",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "8px 12px",
                  cursor: "pointer",
                }}
              >
                ปิด
              </button>
            </div>

            {/* รายการจองแบบลิสต์เรียงตามวัน (ใหม่→เก่า) */}
            <ReservationList />
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
