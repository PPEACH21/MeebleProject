import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import axios from "../api/axios.jsx";
import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/ProtectRoute.jsx";

const MenuStore = () => {
  const { auth } = useContext(AuthContext);
  const [data, setData] = useState([]);
  const [dataUser, setDatauser] = useState([]);
  const [showMap, setShowMap] = useState(false);

  // 🗺 ตัวอย่างพิกัด (กรุงเทพฯ)
  const lat = 13.736717;
  const lng = 100.523186;

  const getshop = async () => {
    try {
      const res = await axios.get("/Shop", { withCredentials: true });
      console.log("API Response:", res.data);
      setData(res.data);
    } catch (err) {
      console.error("Error fetching shops:", err);
    }
  };

  const getuserID = async () => {
    try {
      const res = await axios.get(`/user/${auth.user_id}`, {
        withCredentials: true,
      });
      setDatauser(res.data);
      console.log("API Response:", res.data);
    } catch (err) {
      console.error("Error fetching user:", err);
    }
  };

  useEffect(() => {
    getuserID();
    getshop();
  }, []);

  return (
    <>
      <div className="box">
        <div className="left">
          <div className="storeBox">
            <img
              src="https://i.pinimg.com/1200x/0d/08/60/0d0860d917320784369a58a1f01187d3.jpg"
              alt="shop"
            />
            <h1>Name</h1>
            <h1>⭐ 4.8</h1>
            <h1>Description</h1>
            <h1>Paragraph</h1>
          </div>

          {/* ✅ mapBox รวมอยู่ในไฟล์เดียว */}
          <div className="mapBox">
            <h1>Location</h1>

            {/* mini map */}
            <div className="miniMap">
              <iframe
                src={`https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`}
                allowFullScreen
                loading="lazy"
                title="mini-map"
              />
            </div>

            <Button
              className="openMapBtn"
              onClick={() =>
                window.open(
                  "https://www.google.com/maps?q=13.736717,100.523186",
                  "_blank"
                )
              }
            >
              Open in Map
            </Button>
          </div>
        </div>

        <div className="right">
          <div className="menu">
            {data.map((item, index) => (
              <div
                className="menuBox"
                key={index}
                style={{ margin: "10px", padding: "10px" }}
              >
                <Button>
                  <p>
                    <b>Name:</b> {item.shop_name}
                  </p>
                  <p>
                    <b>Description:</b> {item.description}
                  </p>
                  <p>
                    <b>Rate:</b> {item.rate}
                  </p>
                  <p>
                    <b>Status:</b> {item.status ? "Active" : "Inactive"}
                  </p>
                  <p>
                    <b>reserve_active:</b>{" "}
                    {item.reserve_active ? "Active" : "Inactive"}
                  </p>
                  <p>
                    <b>order_active:</b>{" "}
                    {item.order_active ? "Active" : "Inactive"}
                  </p>
                  <p>
                    <b>Type:</b> {item.type}
                  </p>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default MenuStore;
