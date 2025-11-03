// src/component/Nav.jsx
import { useContext, useState } from "react";
import { AuthContext } from "@/context/ProtectRoute";
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
      >
        {avatar ? (
          <img
            src={avatar}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50px",
              border: "5px solid rgba(255, 214, 177, 0.7)",
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
              {avatar ? (
                <img
                  src={avatar}
                  style={{
                    width: "55px",
                    height: "55px",
                    borderRadius: "50px",
                    border: "5px solid rgba(255, 214, 177, 0.7)",
                  }}
                />
              ) : (
                <FaRegUserCircle size={55} />
              )}
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
  const { Profile, logout } = useContext(AuthContext);
  const [showCalendar, setShowCalendar] = useState(false); // ⬅️ state ปฏิทิน

  const navigate = useNavigate();

  const goHome = () => {
    navigate("/home");
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
                <TiShoppingCart
                  size={35}
                  onClick={() => navigate("/cart")}
                />
              </div>
            </>
          )}

          <div className="rowset fontcolor">
            <p>Coin: {Profile?.Coin ?? 0}.-</p>
          </div>

          <div style={{ gap: 10, alignItems: "center", cursor: "pointer" }}>
            <DropdownProfile
              logout={logout}
              username={Profile?.username}
              email={Profile?.email}
              avatar={Profile?.avatar}
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
