// src/component/Nav.jsx
import { useContext, useEffect,  useState } from "react";
import { AuthContext } from "@/context/ProtectRoute";
import axios from "@/api/axios";
import { FaRegUserCircle, FaHistory } from "react-icons/fa";
import { FaRegCalendarAlt } from "react-icons/fa";
import { TiShoppingCart } from "react-icons/ti";
import { useNavigate } from "react-router-dom";
import { Outlet } from "react-router-dom";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import {m} from "@/paraglide/messages"

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

const DropdownProfile = ({ logout, avatar, username, email }) => {
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
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
        }}
      >
        {avatar ? (
          <img
            src={avatar}
            alt="avatar"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50px",
              border: "5px solid rgba(255, 214, 177, 0.7)",
              objectFit: "cover",
            }}
          />
        ) : (
          <FaRegUserCircle size={30} />
        )}
        <span>{username || "Guest"}</span>
      </div>

      {open && (
        <div
          className={`dropdownSelect ${open ? "fade-slideDown" : ""}`}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#fff";
            setOpen(false);
          }}
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            background: "#fff",
            color: "#111827",
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,.15)",
            overflow: "hidden",
            width: 300,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-evenly",
              padding: 12,
              borderBottom: "1px solid #f3f4f6",
            }}
          >
            <div
              className="dropdownProfile"
              style={{ display: "flex", gap: 12, alignItems: "center" }}
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt="avatar"
                  style={{
                    width: "55px",
                    height: "55px",
                    borderRadius: "50px",
                    border: "5px solid rgba(255, 214, 177, 0.7)",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <FaRegUserCircle size={55} />
              )}
              <div style={{ fontWeight: "bold", lineHeight: 1.2 }}>
                <p style={{ margin: 0 }}>{username || "Guest"}</p>
                <p style={{ margin: 0, fontWeight: 500, color: "#6b7280" }}>
                  {email || "Guest@gmail.com"}
                </p>
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate("/profile")}
            className="dropdownchoice"
            onMouseEnter={(e) => (e.currentTarget.style.background = "#FFE0C2")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
            style={{ padding: 12, cursor: "pointer" }}
          >
            {m.editProfile()}
          </div>
          <div
            onClick={() => navigate("/settings")}
            className="dropdownchoice"
            onMouseEnter={(e) => (e.currentTarget.style.background = "#FFE0C2")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
            style={{ padding: 12, cursor: "pointer" }}
          >
            {m.Setting()}
          </div>
          <div
            onClick={handleLogout}
            className="dropdownchoice"
            onMouseEnter={(e) => (e.currentTarget.style.background = "#FFE0C2")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
            style={{
              padding: 12,
              cursor: "pointer",
              borderTop: "1px solid #f3f4f6",
            }}
          >
            {m.logout()}
          </div>
        </div>
      )}
    </div>
  );
};

const Navbar = ({ focus = false, cart = false }) => {
  const { Profile, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [coin, setCoin] = useState(Number(Profile?.Coin || 0));
  useEffect(() => {
    setCoin(Number(Profile?.Coin || 0));
  }, [Profile?.Coin]);

  // ปฏิทิน/รายการจอง
  const [showCalendar, setShowCalendar] = useState(false);
  const [loadingResv, setLoadingResv] = useState(false);
  const [reservations, setReservations] = useState([]);

  const goHome = () => {
    navigate("/home");
  };
  const userId = Profile.User_id;
  // ✅ เติมเงิน (บวกเพิ่ม) ด้วย SweetAlert2 + API topup
  const handleTopUpCoin = async () => {
    console.log(Profile)
    if (!userId) {
      Swal.fire({
        icon: "error",
        title: "ไม่พบผู้ใช้",
        text: "ไม่สามารถเติม Coin ได้",
      });
      return;
    }

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
    if (value === undefined) return;

    const amount = Math.floor(Number(value));
    const prev = Number(coin || 0);
    const optimistic = prev + amount;

    // optimistic update
    setCoin(optimistic);

    try {
      const res = await axios.post(
        `/user/${userId}/cost/topup`,
        { amount },
        { withCredentials: true }
      );

      // รองรับได้ทั้งรูปแบบ { user: { Cost } } หรือ { cost }
      if (res?.data?.user?.Cost !== undefined) {
        setCoin(Number(res.data.user.Cost));
      } else if (res?.data?.cost !== undefined) {
        setCoin(Number(res.data.cost));
      }

      Swal.fire({
        icon: "success",
        title: "เติมสำเร็จ",
        timer: 1100,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Top-up failed:", err);
      setCoin(prev); // rollback
      Swal.fire({ icon: "error", title: "เติมไม่สำเร็จ" });
    }
  };

  // ✅ โหลดรายการจองเมื่อเปิด popup
  useEffect(() => {
    const fetchReservations = async () => {
      if (!showCalendar || !userId) return;
      setLoadingResv(true);
      try {
        // ปรับ endpoint ให้ตรงกับแบ็กเอนด์ของคุณ
        const res = await axios.get(`/reservations/user/${userId}`, {
          withCredentials: true,
        });
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
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
  }, [showCalendar, userId]);

  const fmtInt = (n) =>
    (Number(n) || 0).toLocaleString("th-TH", { maximumFractionDigits: 0 });

  // แสดงรายการจองใน popup
  const ReservationList = () => {
    if (loadingResv) return <p style={{ color: "#64748b" }}>กำลังโหลด...</p>;
    if (!reservations.length)
      return <p style={{ color: "#64748b" }}>ยังไม่มีรายการจอง</p>;
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ fontWeight: 700 }}>
                {r.shop_name || r.shopId || "-"}
              </div>
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
    <>
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
            <div className="rowset icon">
              <img
                src="https://i.ibb.co/N2d4z7cY/LOGO.png"
                alt="Logo"
                onClick={goHome}
                style={{ cursor: "pointer", height: "60px", width: "60px" }}
              />
              <p onClick={goHome} style={{ cursor: "pointer" }}>
                MEEBLE PROJECT
              </p>
            </div>
          </div>

          <div className="navMenu">
            {focus ? (
              <>
                {cart ? (
                  <div className="fontcolor">
                    <TiShoppingCart
                      size={35}
                      onClick={() => navigate("/cart")}
                    />
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div className="fontcolor">
                  <FaHistory size={25} onClick={() => navigate("/history")} />
                </div>

                {/* ปฏิทิน (Popup) */}
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

            {/* Coin: คลิกเติมเงิน */}
            <div
              className="rowset fontcolor"
              title="คลิกเพื่อเติม Coin"
              onClick={handleTopUpCoin}
              style={{
                gap: 6,
                alignItems: "center",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <p style={{whiteSpace:"nowrap"}}>{m.Coin()}: {fmtInt(coin)} .-</p>
            </div>

            <div style={{ gap: 10, alignItems: "center", cursor: "pointer" }}>
              <DropdownProfile
                logout={logout}
                avatar={Profile?.Avatar}
                username={Profile?.Username}
                email={Profile?.Email}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Popup ปฏิทิน/รายการจอง */}
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

            <ReservationList />
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
