// src/User/page/VendorMenu.jsx
import { useEffect, useRef, useState } from "react";
import axios from "@/api/axios";
import { useParams, useLocation } from "react-router-dom";
import "@css/pages/vendorMenu.css";
import { m } from "@/paraglide/messages.js";

const currencyTH = (n) =>
  (Number(n) || 0).toLocaleString("th-TH", {
    style: "currency",
    currency: "THB",
  });

export default function VendorMenu() {
  // --- resolve shopId: URL params → state → query → localStorage ---
  const params = useParams();
  const location = useLocation();
  const paramShopId = params.shopId || params.id || "";
  const stateShopId = location.state?.shopId || location.state?.shop?.id || "";
  const queryShopId = new URLSearchParams(location.search).get("shopId") || "";
  const storageShopId =
    typeof window !== "undefined"
      ? localStorage.getItem("currentShopId") || ""
      : "";
  const shopId = paramShopId || stateShopId || queryShopId || storageShopId;

  // --- menus & ui states ---
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);

  // create form
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [isAddPopupOpen, setIsAddPopupOpen] = useState(false);

  // edit form
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editImage, setEditImage] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState("");

  const menuListRef = useRef(null);
  const IMGBB_KEY = import.meta.env.VITE_IMGBB_API_KEY;

  // --- fetch menus only ---
  const fetchMenus = async () => {
    if (!shopId) {
      console.error("❌ ไม่มี shopId");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`/shops/${shopId}/menu`, {
        withCredentials: true,
      });
      const raw = res.data?.menus || res.data || [];
      const normalized = (Array.isArray(raw) ? raw : []).map((x) => ({
        ID: x.ID ?? x.id ?? x.Id ?? x.docId,
        Name: x.Name ?? x.name,
        Description: x.Description ?? x.description ?? "",
        Image: x.Image ?? x.image ?? "",
        Price: x.Price ?? x.price ?? 0,
        Active: (x.Active ?? x.active ?? true) === true,
      }));
      setMenus(normalized);
    } catch (err) {
      console.error("❌ โหลดเมนูไม่สำเร็จ:", err?.response?.data || err);
      alert(m.menu_fetch_error ? m.menu_fetch_error() : "โหลดเมนูไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  // --- imgbb upload ---
  const uploadImageToImgbb = async (file) => {
    if (!IMGBB_KEY) throw new Error(m.missing_imgbb_key ? m.missing_imgbb_key() : "ยังไม่ได้ตั้งค่า IMGBB API KEY");
    if (!file?.type?.startsWith("image/"))
      throw new Error(m.add_to_cart_error ? m.add_to_cart_error() : "ไฟล์ต้องเป็นรูปภาพ"); // ใช้คีย์เดิมเป็น fallback

    const toBase64 = (f) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });

    const base64 = await toBase64(file);
    const form = new FormData();
    form.append("image", base64);
    form.append("name", (file.name || "image").replace(/\.[^.]+$/, ""));

    const resp = await fetch(
      `https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`,
      {
        method: "POST",
        body: form,
      }
    );
    if (!resp.ok) {
      let msg = `อัปโหลดรูปไม่สำเร็จ (HTTP ${resp.status})`;
      try {
        const j = await resp.json();
        if (j?.error?.message) msg += `: ${j.error.message}`;
      } catch {}
      throw new Error(msg);
    }
    const data = await resp.json();
    if (!data?.success)
      throw new Error(data?.error?.message || (m.upload_failed ? m.upload_failed() : "อัปโหลดรูปไม่สำเร็จ"));
    return data.data.image?.url || data.data.display_url || data.data.url;
  };

  const onPickImage = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    const obj = URL.createObjectURL(f);
    setImagePreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return obj;
    });
  };

  // --- create menu ---
  const createMenu = async (e) => {
    e?.preventDefault();
    if (creating || uploadingImg) return;
    if (!shopId) return alert(m.missing_shopid ? m.missing_shopid() : "ไม่พบ shopId");

    if (!name.trim()) return alert(m.menu_name ? m.menu_name() : "กรุณากรอกชื่อเมนู");
    if (price === "" || isNaN(price)) return alert(m.price ? m.price() : "กรุณากรอกราคาให้ถูกต้อง");
    if (!desc.trim()) return alert(m.description ? m.description() : "กรุณากรอกรายละเอียดเมนู");
    if (!imageFile) return alert(m.add_to_cart_error ? m.add_to_cart_error() : "กรุณาเลือกรูปเมนู");

    setCreating(true);
    try {
      setUploadingImg(true);
      const imageUrl = await uploadImageToImgbb(imageFile);
      setUploadingImg(false);

      await axios.post(
        `/shops/${shopId}/menu`,
        {
          name: name.trim(),
          price: Number(price),
          description: desc.trim(),
          image: imageUrl,
        },
        { withCredentials: true }
      );

      setName("");
      setPrice("");
      setDesc("");
      if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
      setImageFile(null);
      setImagePreview("");
      setIsAddPopupOpen(false);
      await fetchMenus();
    } catch (err) {
      console.error("❌ createMenu error:", err?.response?.data || err);
      alert(m.error_occurred ? m.error_occurred() : "สร้างเมนูไม่สำเร็จ");
    } finally {
      setUploadingImg(false);
      setCreating(false);
    }
  };

  // --- edit menu ---
  const openEdit = (mnu) => {
    setEditing(mnu);
    setEditName(mnu.Name || "");
    setEditPrice(String(mnu.Price ?? 0));
    setEditDesc(mnu.Description || "");
    setEditImage(mnu.Image || "");
  };

  const saveEdit = async () => {
    if (!shopId || !editing?.ID) return;
    if (!editName.trim()) return alert(m.menu_name ? m.menu_name() : "กรุณากรอกชื่อเมนู");
    if (editPrice === "" || isNaN(editPrice))
      return alert(m.price ? m.price() : "กรุณากรอกราคาให้ถูกต้อง");

    setSavingEdit(true);
    try {
      await axios.patch(
        `/shops/${shopId}/menu/${editing.ID}`,
        {
          name: editName.trim(),
          price: Number(editPrice),
          description: editDesc.trim(),
          image: editImage.trim(),
        },
        { withCredentials: true }
      );
      setMenus((prev) =>
        prev.map((it) =>
          it.ID === editing.ID
            ? {
                ...it,
                Name: editName.trim(),
                Price: Number(editPrice),
                Description: editDesc.trim(),
                Image: editImage.trim(),
              }
            : it
        )
      );
      setEditing(null);
    } catch (e) {
      console.error("แก้ไขเมนูไม่สำเร็จ:", e?.response?.data || e);
      alert(m.error_occurred ? m.error_occurred() : "แก้ไขเมนูไม่สำเร็จ");
    } finally {
      setSavingEdit(false);
    }
  };

  // --- delete menu ---
  const deleteMenu = async () => {
    if (!shopId || !editing?.ID) {
      return alert(m.missing_shopid ? m.missing_shopid() : "ขาด shopId หรือ menuId");
    }
    const menuId = String(editing.ID).trim();

    setDeleting(true);
    try {
      await axios.delete(`/shops/${shopId}/menu/${encodeURIComponent(menuId)}`, {
        withCredentials: true,
      });
      setMenus((prev) => prev.filter((it) => String(it.ID) !== menuId));
      setEditing(null);
    } catch (e) {
      console.error("ลบเมนูไม่สำเร็จ:", e?.response?.data || e);
      alert(`${m.error_occurred ? m.error_occurred() : "ลบเมนูไม่สำเร็จ"}: ${e?.response?.data?.error || e.message}`);
    } finally {
      setDeleting(false);
    }
  };

  // --- toggle active ---
  const toggleActive = async (mnu) => {
    if (!shopId || !mnu?.ID) return;
    const prevActive = !!mnu.Active;

    setMenus((prev) =>
      prev.map((it) => (it.ID === mnu.ID ? { ...it, Active: !prevActive } : it))
    );

    setTogglingId(mnu.ID);
    try {
      await axios.patch(
        `/shops/${shopId}/menu/${mnu.ID}`,
        { active: !prevActive },
        { withCredentials: true }
      );
    } catch (e) {
      setMenus((prev) =>
        prev.map((it) => (it.ID === mnu.ID ? { ...it, Active: prevActive } : it))
      );
      console.error("สลับสถานะไม่สำเร็จ:", e?.response?.data || e);
      alert(m.error_occurred ? m.error_occurred() : "สลับสถานะไม่สำเร็จ");
    } finally {
      setTogglingId("");
    }
  };

  return (
    <div className="vm-container">
      <h1 className="vm-title">{m.manageMenu ? m.manageMenu() : "จัดการเมนูร้าน"}</h1>

      <div className="vm-CP_actions">
        <button type="button" onClick={() => setIsAddPopupOpen(true)}>
          {/* ➕ */} {m.add_menu ? m.add_menu() : "เพิ่มเมนู"}
        </button>
        <button type="button" onClick={fetchMenus} disabled={loading}>
          {loading ? m.loading_data() : (m.all_menus ? m.all_menus() : "โหลดเมนู")}
        </button>
      </div>

      {!loading && menus.length === 0 && (
        <div
          style={{
            padding: "12px 16px",
            background: "#f3f4f6",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            marginTop: 12,
          }}
        >
          {m.menu_not_found ? m.menu_not_found() : "ยังไม่มีเมนู — กรุณากดเพิ่มเมนู"}
        </div>
      )}

      <div ref={menuListRef} className="vm-table-wrap" style={{ marginTop: 12 }}>
        {!loading && menus.length > 0 && (
          <table className="vm-table">
            <thead style={{ background: "#f8fafc" }}>
              <tr>
                <th style={{ textAlign: "left" }}>{m.menu_name ? m.menu_name() : "ชื่อเมนู"}</th>
                <th style={{ textAlign: "left" }}>{m.description ? m.description() : "รายละเอียด"}</th>
                <th style={{ textAlign: "center" }}>{m.image ? m.image() : "รูป"}</th>
                <th style={{ textAlign: "right" }}>{m.price ? m.price() : "ราคา"}</th>
                <th style={{ textAlign: "center" }}>{m.status ? m.status() : "สถานะ"}</th>
                <th style={{ textAlign: "center" }}>{m.manageMenu ? m.manageMenu() : "จัดการ"}</th>
              </tr>
            </thead>
            <tbody>
              {menus.map((mnu) => (
                <tr key={mnu.ID || `${mnu.Name}-${mnu.Price}-${Math.random()}`}>
                  <td>{mnu.Name}</td>
                  <td>{mnu.Description || "-"}</td>
                  <td style={{ textAlign: "center" }}>
                    {mnu.Image ? <img src={mnu.Image} alt={mnu.Name} className="vm-img" /> : "—"}
                  </td>
                  <td style={{ textAlign: "right" }}>{currencyTH(mnu.Price)}</td>
                  <td style={{ textAlign: "center" }}>
                    <label
                      className={`vm-switch ${togglingId === mnu.ID ? "is-loading" : ""}`}
                      aria-label={`${m.status ? m.status() : "สถานะ"} ${mnu.Name}`}
                    >
                      <input
                        type="checkbox"
                        checked={!!mnu.Active}
                        onChange={() => toggleActive(mnu)}
                        disabled={togglingId === mnu.ID}
                      />
                      <span className="vm-slider"></span>
                    </label>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button onClick={() => openEdit(mnu)} style={{ marginRight: 8 }}>
                      ✏️ {m.editProfile ? m.editProfile() : "แก้ไข"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {loading && <p>{m.menu_loading ? m.menu_loading() : "กำลังโหลดข้อมูลเมนู..."}</p>}
      </div>

      {/* Popup: เพิ่มเมนู */}
      {isAddPopupOpen && (
        <div className="vm-modal" onClick={() => setIsAddPopupOpen(false)}>
          <div className="vm-modal__panel" onClick={(e) => e.stopPropagation()}>
            <div className="vm-modal__header">
              <strong>➕ {m.add_menu ? m.add_menu() : "เพิ่มเมนูใหม่"}</strong>
              <button type="button" onClick={() => setIsAddPopupOpen(false)}>
                ✖ {m.close ? m.close() : "ปิด"}
              </button>
            </div>
            <div className="vm-modal__body">
              <div className="vm-form">
                <div className="vm-field">
                  <label style={{ fontWeight: 600 }}>
                    {m.menu_name ? m.menu_name() : "ชื่อเมนู"}
                  </label>
                  <input
                    className="vm-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={m.menu_name ? m.menu_name() : "เช่น ข้าวกะเพรา"}
                  />
                </div>
                <div className="vm-field">
                  <label style={{ fontWeight: 600 }}>
                    {m.price ? m.price() : "ราคา"} ({m.thb ? m.thb() : "บาท"})
                  </label>
                  <input
                    className="vm-input"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="69"
                  />
                </div>
                <div className="vm-field">
                  <label style={{ fontWeight: 600 }}>
                    {m.description ? m.description() : "รายละเอียดเมนู"}
                  </label>
                  <textarea
                    className="vm-textarea"
                    rows="3"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder={m.store_description ? m.store_description() : "รายละเอียดเมนู"}
                  />
                </div>
                <div className="vm-field">
                  <label style={{ fontWeight: 600 }}>
                    {m.upload_image ? m.upload_image() : "เลือกรูปเมนู (อัป imgbb)"}
                  </label>
                  <input type="file" accept="image/*" onChange={onPickImage} />
                  {imagePreview && (
                    <div style={{ marginTop: 8 }}>
                      <img src={imagePreview} alt="preview" className="vm-preview" />
                    </div>
                  )}
                </div>
                <div className="vm-buttons">
                  <button type="button" onClick={createMenu} disabled={creating || uploadingImg}>
                    {uploadingImg
                      ? (m.uploading ? m.uploading() : "📤 กำลังอัปโหลดรูป...")
                      : creating
                      ? (m.loading_data ? m.loading_data() : "กำลังสร้าง...")
                      : (m.confirm_add_cart ? m.confirm_add_cart() : "✅ สร้างเมนู")}
                  </button>
                  <button type="button" onClick={() => setIsAddPopupOpen(false)}>
                    {m.cancel ? m.cancel() : "ยกเลิก"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup: แก้ไขเมนู + ปุ่มลบเมนู */}
      {editing && (
        <div className="vm-modal" onClick={() => setEditing(null)}>
          <div className="vm-modal__panel" onClick={(e) => e.stopPropagation()}>
            <div className="vm-modal__header">
              <strong>✏️ {m.editProfile ? m.editProfile() : "แก้ไขเมนู"}</strong>
              <button type="button" onClick={() => setEditing(null)}>
                ✖ {m.close ? m.close() : "ปิด"}
              </button>
            </div>
            <div className="vm-modal__body">
              <div className="vm-form">
                <div className="vm-field">
                  <label style={{ fontWeight: 600 }}>
                    {m.menu_name ? m.menu_name() : "ชื่อเมนู"}
                  </label>
                  <input
                    className="vm-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="vm-field">
                  <label style={{ fontWeight: 600 }}>
                    {m.price ? m.price() : "ราคา"} ({m.thb ? m.thb() : "บาท"})
                  </label>
                  <input
                    className="vm-input"
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                  />
                </div>
                <div className="vm-field">
                  <label style={{ fontWeight: 600 }}>
                    {m.description ? m.description() : "รายละเอียดเมนู"}
                  </label>
                  <textarea
                    className="vm-textarea"
                    rows="3"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                  />
                </div>
                <div className="vm-field">
                  <label style={{ fontWeight: 600 }}>
                    {m.image ? m.image() : "รูป (URL)"}
                  </label>
                  <input
                    className="vm-input"
                    value={editImage}
                    onChange={(e) => setEditImage(e.target.value)}
                    placeholder="https://..."
                  />
                  {editImage && (
                    <div style={{ marginTop: 8 }}>
                      <img src={editImage} alt="preview" className="vm-preview" />
                    </div>
                  )}
                </div>
                <div className="vm-buttons">
                  <button type="button" onClick={saveEdit} disabled={savingEdit}>
                    {savingEdit ? (m.loading_data ? m.loading_data() : "กำลังบันทึก...") : (m.save ? m.save() : "💾 บันทึก")}
                  </button>
                  <button type="button" onClick={() => setEditing(null)}>
                    {m.cancel ? m.cancel() : "ยกเลิก"}
                  </button>
                  <button
                    type="button"
                    onClick={deleteMenu}
                    disabled={deleting}
                    style={{ marginLeft: "auto", background: "#ef4444", color: "#fff" }}
                  >
                    {deleting ? (m.loading_data ? m.loading_data() : "กำลังลบ...") : (m.delete ? m.delete() : "🗑️ ลบเมนู")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
