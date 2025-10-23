// src/component/Nav.jsx
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/ProtectRoute";
import axios from "../api/axios";

const Navbar = () => {
  const { auth } = useContext(AuthContext);

  const [dataUser, setDataUser] = useState(null);
  const [cartCost, setCartCost] = useState(0);

  const getUserAndCart = async () => {
    try {
      // 1) ดึง user จาก user_id (doc id)
      const resUser = await axios.get(`/user/${auth.user_id}`, {
        withCredentials: true,
      });
      const user = resUser.data || {};
      setDataUser(user);

      // 2) ดึง cart ด้วย customerId = username
      if (user.username) {
        const resCart = await axios.get(
          `/api/cart?customerId=${encodeURIComponent(user.username)}`,
          { withCredentials: true }
        );
        const cart = resCart?.data || {};
        setCartCost(Number(cart.total || 0));
      } else {
        setCartCost(0);
      }
    } catch (err) {
      console.error("Navbar load error:", err);
      setCartCost(0);
    }
  };

  useEffect(() => {
    if (auth?.user_id) getUserAndCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.user_id]);

  return (
    <nav className="navHomePage">
      <div className="nav">
        <img
          src="https://i.ibb.co/MyMPRx3P/Chat-GPT-Image-Sep-23-2025-10-01-38-PM.jpg"
          alt="Logo"
        />
        <div className="navMenu">
          <h1>cost : {cartCost.toFixed(2)}</h1>
          <h1>history</h1>
          <h1>username : {dataUser?.username || "-"}</h1>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
