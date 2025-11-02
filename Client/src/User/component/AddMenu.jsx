import { useState, useEffect } from "react";
import axios from "@/api/axios";

export default function MenuManager() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    image: null,
  });
  const [menus, setMenus] = useState([]); // เก็บรายการเมนูทั้งหมด

  // โหลดเมนูทั้งหมดจาก backend
  const fetchMenus = async () => {
    try {
      const res = await axios.get("/menus");
      setMenus(res.data.menus);
    } catch (err) {
      console.error("Error fetching menus:", err);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleFileChange = (e) => {
    setForm({ ...form, image: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      let imageUrl = "";

      if (form.image) {
        const data = new FormData();
        data.append("image", form.image);

        const res = await axios.post(
          `https://api.imgbb.com/1/upload?key=a285726ccebc9fcae4533ba6ce1cbe44`,
          data,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        imageUrl = res.data.data.url;
      }

      await axios.post("http://localhost:8080/addMenu", {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        image: imageUrl,
      });

      alert("บันทึกสำเร็จ ✅");
      setOpen(false);
      setForm({ name: "", description: "", price: "", image: null });

      fetchMenus(); 
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาด ❌");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
   
      <button onClick={() => setOpen(true)}>➕ เพิ่มเมนู</button>


      {open && (
        <div className="popup">
          <div className="popup-inner">
            <h2>เพิ่มเมนู</h2>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                name="name"
                placeholder="ชื่อเมนู"
                value={form.name}
                onChange={handleChange}
                required
              />
              <textarea
                name="description"
                placeholder="รายละเอียด"
                value={form.description}
                onChange={handleChange}
              />
              <input
                type="number"
                name="price"
                placeholder="ราคา"
                value={form.price}
                onChange={handleChange}
                required
              />
              <input type="file" accept="image/*" onChange={handleFileChange} />
              <div className="button-group">
                <button type="submit">บันทึก</button>
                <button type="button" onClick={() => setOpen(false)}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      )}


      <h2 style={{ marginTop: "20px" }}>📋 เมนูทั้งหมด</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "15px",
          marginTop: "10px",
        }}
      >
        {menus.map((menu, idx) => (
          <div
            key={idx}
            style={{
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "10px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
              background: "#fff",
            }}
          >
            {menu.image && (
              <img
                src={menu.image}
                alt={menu.name}
                style={{ width: "100%", borderRadius: "6px", marginBottom: "10px" }}
              />
            )}
            <h3>{menu.name}</h3>
            <p style={{ fontSize: "14px", color: "#555" }}>{menu.description}</p>
            <strong>{menu.price} บาท</strong>
          </div>
        ))}
      </div>

    
      <style>{`
        .popup {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 999;
        }
        .popup-inner {
          background: #fff;
          padding: 20px;
          border-radius: 12px;
          width: 350px;
          max-width: 90%;
          box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        }
        form {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        input, textarea {
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 6px;
          font-size: 14px;
        }
        .button-group {
          display: flex;
          justify-content: space-between;
        }
        button {
          padding: 8px 12px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }
        button[type="submit"] {
          background: #1f5c2b;
          color: white;
        }
        button[type="button"] {
          background: #ccc;
        }
      `}</style>
    </div>
  );
}
