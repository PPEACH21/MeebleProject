// src/component/Nav.jsx
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "@/context/ProtectRoute";
import axios from "@/api/axios";
import { FaRegUserCircle, FaHistory } from "react-icons/fa";
import { TiShoppingCart } from "react-icons/ti";
import { useNavigate } from "react-router-dom";
import { Outlet } from "react-router-dom";

export const NavLayout = ({focus,cart}) => {
  return (
    <>
      <Navbar focus={focus} cart={cart}/>
      <div style={{height: "calc(100vh - 60px)", overflowY:'auto'}}>
        <Outlet/>
      </div>
    </>
  );
};

const DropdownProfile =({logout,username,email})=> {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div style={{ position: "relative", color: "#fff"}}>

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
          onMouseLeave={(e) => {(e.currentTarget.style.background = "#fff"); setOpen(false)}}
        >
          <div style={{width:"300px",height:"100px",display:'flex',flexDirection:'column',justifyContent:'space-evenly'}}>
            <div className="dropdownProfile">
              <FaRegUserCircle size={55} />
              <div style={{fontWeight:'bold'}} >
                <p>{username || "Guest"}</p>
                <p>{email || "Guest@gmail.com"}</p>
              </div>
            </div>
            

          </div>

          <div
            onClick={() => navigate("/profile")}
            className="dropdownchoice"
            onMouseEnter={(e) => (e.currentTarget.style.background = "#FFE0C2")}
            onMouseLeave={(e) => {(e.currentTarget.style.background = "#fff")}} 
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
}

const Navbar = ({ focus=false ,cart=false}) => {
  const { auth,logout } = useContext(AuthContext);

  const getuserID = async () => {
    try {
      const res = await axios.get(`/user/${auth.user_id}`, {
        withCredentials: true,
      });
      setDatauser(res.data);
      // console.log("API Response:", res.data);
    } catch (err) {
      console.error("Error fetching user:", err);
    }
  };
  
  const [dataUser, setDatauser] = useState([]);
  const navigate = useNavigate();
  
  useEffect(() => {
    getuserID();
  }, []);
  
  const goHome = () => {
    navigate("/home"); // ✅ เปลี่ยน path ไปหน้า Home
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
          {focus?(
            <p onClick={() => navigate(-1)} style={{ cursor: "pointer" }}>
              Back
            </p>
          ):(
            <>
              <img
                src="https://i.ibb.co/MyMPRx3P/Chat-GPT-Image-Sep-23-2025-10-01-38-PM.jpg"
                alt="Logo"
                onClick={goHome}
                style={{ cursor: "pointer" ,height:'60px', width:'60px'}}
              />
              <p onClick={goHome} style={{ cursor: "pointer" }}>
                MEEBLE PROJECT
              </p>
            </>
          )}
        </div>
        <div className="navMenu">
          {focus?
            <>
            {cart?
              <div className="fontcolor">
                <TiShoppingCart size={35} onClick={() => navigate("/cart")} />
              </div>
            :
            <>
            </>
            }
            </>
          :
            <>
              <div className="fontcolor">
                <FaHistory size={25} onClick={() => navigate("/history")} />
              </div>
              <div className="fontcolor">
                <TiShoppingCart size={35} onClick={() => navigate("/cart")} />
              </div>
            </>
          }
          <div className="rowset fontcolor">
            <p>Coin:{dataUser.Cost}.-</p>
          </div>
          <div
            style={{ gap: 10, alignItems: "center" ,cursor:'pointer'}}
            // onClick={()=>console.log("Click")}
          >
            <DropdownProfile logout={logout} username={dataUser.username} email={dataUser.email}/>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
