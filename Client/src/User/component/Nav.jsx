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

  const fmtInt = (n) =>
    (Number(n) || 0).toLocaleString("th-TH", {
      maximumFractionDigits: 0,
    });

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
    </nav>
  );
};

export default Navbar;
