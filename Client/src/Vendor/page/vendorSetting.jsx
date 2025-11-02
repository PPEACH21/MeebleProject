// src/Vendor/page/VendorSettings.jsx
import { useContext, useEffect, useState } from "react";
import axios from "@/api/axios";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import "@css/pages/vendorSettings.css";
import { AuthContext } from "@/context/ProtectRoute";

const CATEGORIES = ["Appetizer", "Beverage", "Fast food", "Main course", "Dessert"];

export default function VendorSettings() {
  const { auth } = useContext(AuthContext);
  const userId = auth?.user_id || "";
  const [shopId, setShopId] = useState(localStorage.getItem("currentShopId") || "");
  const [loading, setLoading] = useState(true);

  // form states
  const [placeholderName, setPlaceholderName] = useState("");
  const [shopName, setShopName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");

  // helper: extract ID
  const pickId = (obj) => obj?.id || obj?.ID || obj?.Id || "";

  // โหลดร้านจาก by-vendor
  useEffect(() => {
    const load = async () => {
      if (!userId) return setLoading(false);
      try {
        const res = await axios.get(`/shops/by-vendor/${userId}`, { withCredentials: true });
        const shops = Array.isArray(res.data?.shops) ? res.data.shops : [];
        if (shops.length === 0) return setLoading(false);

        let currentId = shopId;
        if (!currentId) {
          currentId = pickId(shops[0]);
          localStorage.setItem("currentShopId", currentId);
          setShopId(currentId);
        }

        const target = shops.find((s) => pickId(s) === currentId) || shops[0];
        const id = pickId(target);

        const name = target.shop_name || target.name || "";
        const desc = target.description || "";
        const t = target.type || "";
        const img = target.image || "";

        // ตั้งค่า placeholder และค่า form
        setPlaceholderName(name);
        setShopName("");
        setDescription(desc);
        setType(t);
        setImageUrl(img);

        console.group(`Shop loaded (by-vendor): ${id}`);
        console.table({
          id,
          shop_name: name,
          description: desc,
          type: t,
          image: img,
          status: !!target.status,
          reserve_active: !!target.reserve_active,
          order_active: !!target.order_active,
        });
        console.groupEnd();
      } catch (e) {
        console.warn("Failed to load shops by vendor", e?.response?.data || e?.message);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setPreview(f ? URL.createObjectURL(f) : "");
  };

  // ⭐ อัปโหลดรูปขึ้น imgbb โดยตรง (ไม่เรียก backend)
  const uploadImage = async () => {
    if (!file) return Swal.fire("No file", "กรุณาเลือกไฟล์รูปก่อน", "info");
    try {
      const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
      if (!apiKey) {
        return Swal.fire("Missing key", "ยังไม่ได้ตั้งค่า VITE_IMGBB_API_KEY ใน frontend", "warning");
      }

      const form = new FormData();
      form.append("key", apiKey);
      form.append("image", file);

      const res = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();

      if (!data?.success || !data?.data?.url) {
        console.error("imgbb upload failed:", data);
        return Swal.fire("Upload failed", "ไม่สามารถอัปโหลดรูปไป imgbb ได้", "error");
      }

      const url = data.data.url;
      setImageUrl(url);
      setFile(null);
      setPreview("");
      Swal.fire("Uploaded", "อัปโหลดรูปเรียบร้อย", "success");
    } catch (e) {
      console.error("Upload error:", e);
      Swal.fire("Upload failed", e.message || "เกิดข้อผิดพลาด", "error");
    }
  };

  const saveSettings = async () => {
    if (!shopId) return Swal.fire("ไม่พบร้าน", "ยังไม่ได้เลือกหรือโหลดร้าน", "warning");

    console.group(`Saving shop: ${shopId}`);
    console.table({ shop_name: shopName || placeholderName, description, type, image: imageUrl });
    console.groupEnd();

    try {
      await axios.put(
        `/shops/${shopId}`, // ถ้า axios ของคุณตั้ง baseURL="/api" จะยิง /api/shops/:id ให้เอง
        {
          shop_name: shopName || placeholderName,
          description,
          type,
          image: imageUrl || undefined,
        },
        { withCredentials: true }
      );
      Swal.fire("Saved", "บันทึกการตั้งค่าร้านเรียบร้อย", "success");
      setPlaceholderName(shopName || placeholderName);
      setShopName("");
    } catch (e) {
      console.error("Save failed:", e?.response?.data || e);
      Swal.fire("Save failed", e?.response?.data?.error || "เกิดข้อผิดพลาด", "error");
    }
  };

  if (loading) return <div className="vs-loading">Loading...</div>;

  return (
    <div className="vs-container">
      <h1 className="vs-title">Shop Settings</h1>
      <p className="vs-subtitle">หน้าตั้งค่าร้านอาหารของคุณ</p>

      {!shopId ? (
        <div className="vs-no-shop">
          <p>ยังไม่มีร้าน กรุณาเข้าสู่ระบบหรือสร้างร้านก่อน</p>
        </div>
      ) : (
        <div className="vs-content">
          {/* รูปร้าน */}
          <div className="vs-section">
            <h3>รูปภาพร้าน</h3>
            <div className="vs-image-box">
              <img
                src={preview || imageUrl || "https://via.placeholder.com/200x200?text=No+Image"}
                alt="shop"
                className="vs-image"
              />
              <div className="vs-image-controls">
                <input type="file" accept="image/*" onChange={onFileChange} />
                <div className="vs-row">
                  <button onClick={uploadImage} disabled={!file}>Upload รูป</button>
                  <button onClick={() => { setFile(null); setPreview(""); }}>ยกเลิก</button>
                </div>
                <small>หรือวาง URL รูปเอง:</small>
                <input
                  type="url"
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ข้อมูลร้าน */}
          <div className="vs-section">
            <h3>ข้อมูลร้าน</h3>

            <label>ชื่อร้าน</label>
            <input
              value={shopName}
              placeholder={placeholderName || "ชื่อร้าน"}
              onChange={(e) => setShopName(e.target.value)}
            />

            <label>คำอธิบาย</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="รายละเอียดร้านของคุณ..."
            />

            <label>ประเภทอาหาร</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">— เลือกประเภท —</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="vs-actions">
            <button onClick={saveSettings}>บันทึกการตั้งค่า</button>
          </div>
        </div>
      )}
    </div>
  );
}
