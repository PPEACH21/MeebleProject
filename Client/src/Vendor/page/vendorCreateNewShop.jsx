// src/User/page/CreateShopWithMap.jsx
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "@/api/axios";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import "@css/pages/vendorSettings.css";
import { useNavigate } from "react-router-dom";

import { AuthContext } from "@/context/ProtectRoute";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";

// ✅ Leaflet core + CSS
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ✅ ให้ Vite จัดการ asset ไอคอน
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// ✅ i18n (ใช้เฉพาะ m)
import { m } from "@/paraglide/messages.js";

// 🔧 รีเซ็ต path ปริยาย
delete L.Icon.Default.prototype._getIconUrl;

// ✅ ตั้ง default icon ให้ Marker ทั้งแอป
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const CATEGORIES = ["Maincourse", "Beverage", "FastFoods", "Appetizer", "Dessert"];
const BANGKOK = [13.7563, 100.5018];

/* ---------------- helpers ---------------- */
const toNum = (v, d = NaN) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// คลิกแผนที่เพื่อวางหมุด
function ClickToPlace({ onPlace }) {
  useMapEvents({
    click(e) {
      onPlace([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

// ลากหมุดเพื่อเปลี่ยนพิกัด
function DraggableMarker({ position, onDragEnd }) {
  const [pos, setPos] = useState(position);
  useEffect(() => setPos(position), [position]);
  return (
    <Marker
      position={pos}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const ll = e.target.getLatLng();
          const p = [ll.lat, ll.lng];
          setPos(p);
          onDragEnd(p);
        },
      }}
    >
      <Popup>{m.map_drag_tip ? m.map_drag_tip() : "ลากเพื่อเปลี่ยนตำแหน่ง"}</Popup>
    </Marker>
  );
}

function MapFlyTo({ center, zoom = 15 }) {
  const map = useMap();
  useEffect(() => {
    if (Array.isArray(center) && Number.isFinite(center[0]) && Number.isFinite(center[1])) {
      map.flyTo(center, zoom, { duration: 0.8 });
    }
  }, [center, zoom, map]);
  return null;
}

// ช่องค้นหาสถานที่
function MapSearchBox({ onPick }) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const fetchIdRef = useRef(0);

  // ใช้ภาษาจากเบราว์เซอร์ (fallback th,en)
  const lang =
    (typeof navigator !== "undefined" && navigator.language) ? `${navigator.language},en` : "th,en";

  useEffect(() => {
    const handle = setTimeout(async () => {
      const query = q.trim();
      if (!query) {
        setItems([]);
        return;
      }
      setLoading(true);
      const myId = ++fetchIdRef.current;
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&q=${encodeURIComponent(
          query
        )}`;
        const res = await fetch(url, { headers: { "Accept-Language": lang } });
        const data = await res.json();
        if (myId === fetchIdRef.current) {
          setItems(
            (Array.isArray(data) ? data : []).map((d) => ({
              key: `${d.lat},${d.lon}`,
              name: d.display_name,
              lat: Number(d.lat),
              lng: Number(d.lon),
            }))
          );
        }
      } catch {
        // เงียบไว้
      } finally {
        if (myId === fetchIdRef.current) setLoading(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [q, lang]);

  return (
    <div className="vs-search">
      <div className="vs-search-row">
        <input
          className="vs-search-input"
          type="text"
          placeholder={m.map_search_placeholder ? m.map_search_placeholder() : "ค้นหาสถานที่ (ถนน, ซอย, ตำบล, จังหวัด)"}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && (
          <button
            type="button"
            className="vs-search-clear"
            onClick={() => {
              setQ("");
              setItems([]);
            }}
            aria-label={m.clear ? m.clear() : "ล้าง"}
            title={m.clear ? m.clear() : "ล้าง"}
          >
            ✕
          </button>
        )}
      </div>
      {!!items.length && (
        <ul className="vs-search-list">
          {items.map((it) => (
            <li
              key={it.key}
              className="vs-search-item"
              onClick={() => {
                onPick([it.lat, it.lng], it);
                setQ(it.name);
                setItems([]);
              }}
              title={it.name}
            >
              {it.name}
            </li>
          ))}
        </ul>
      )}
      {loading && <div className="vs-search-loading">{m.searching ? m.searching() : "กำลังค้นหา…"}</div>}
    </div>
  );
}

export default function CreateShopWithMap() {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const vendorId = auth?.user_id || "";

  // ฟอร์ม
  const [shopName, setShopName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // อัปโหลดรูป
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);

  // พิกัด
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  const mapCenter = useMemo(() => {
    if (Number.isFinite(toNum(lat)) && Number.isFinite(toNum(lng))) {
      return [toNum(lat), toNum(lng)];
    }
    return BANGKOK;
  }, [lat, lng]);

  const validate = () => {
    if (!shopName.trim()) return m.store_name ? m.store_name() : "กรุณากรอกชื่อร้าน";
    if (!description.trim()) return m.store_description ? m.store_description() : "กรุณากรอกคำอธิบายร้าน";
    if (!type.trim()) return m.Typefood ? m.Typefood() : "กรุณาเลือกประเภทร้าน";
    if (!vendorId) return m.missing_credential ? m.missing_credential() : "ไม่พบ vendor_id (กรุณาเข้าสู่ระบบใหม่)";
    if (!Number.isFinite(toNum(lat)) || !Number.isFinite(toNum(lng)))
      return m.store_not_set_location ? m.store_not_set_location() : "กรุณาเลือกตำแหน่งร้านบนแผนที่";
    return null;
  };

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      return Swal.fire(
        m.not_supported ? m.not_supported() : "ไม่รองรับ",
        m.browser_no_geolocation ? m.browser_no_geolocation() : "เบราว์เซอร์ไม่รองรับ Geolocation",
        "warning"
      );
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        Swal.fire(
          m.success_save ? m.success_save() : "บันทึกสำเร็จ",
          m.set_position_from_device ? m.set_position_from_device() : "ตั้งตำแหน่งจากอุปกรณ์แล้ว",
          "success"
        );
      },
      (err) => {
        Swal.fire(
          m.save_failed ? m.save_failed() : "ไม่สำเร็จ",
          err.message || (m.cannot_read_position ? m.cannot_read_position() : "ไม่สามารถอ่านตำแหน่งได้"),
          "error"
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ---------------- Upload image to imgbb ----------------
  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setPreview(f ? URL.createObjectURL(f) : "");
  };

  const uploadImage = async () => {
    if (!file)
      return Swal.fire(
        m.no_file ? m.no_file() : "ยังไม่ได้เลือกไฟล์",
        m.please_choose_file ? m.please_choose_file() : "กรุณาเลือกไฟล์รูปก่อน",
        "info"
      );

    const MAX_MB = 5;
    if (file.size > MAX_MB * 1024 * 1024) {
      return Swal.fire(
        m.image_too_large ? m.image_too_large() : "ไฟล์ใหญ่เกินไป",
        (m.max_file_size ? m.max_file_size() : "จำกัด") + ` ${MAX_MB}MB`,
        "warning"
      );
    }

    try {
      const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
      if (!apiKey) {
        return Swal.fire(
          m.missing_key ? m.missing_key() : "ยังไม่ได้ตั้งค่า",
          m.missing_imgbb_key ? m.missing_imgbb_key() : "กรุณาตั้งค่า VITE_IMGBB_API_KEY ใน .env",
          "warning"
        );
      }

      setUploading(true);

      const form = new FormData();
      form.append("key", apiKey);
      form.append("image", file);

      const res = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();

      if (!data?.success || !data?.data?.url) {
        return Swal.fire(
          m.upload_failed ? m.upload_failed() : "อัปโหลดไม่สำเร็จ",
          m.upload_failed_detail ? m.upload_failed_detail() : "ไม่สามารถอัปโหลดไป imgbb",
          "error"
        );
      }

      setImageUrl(data.data.url);
      setFile(null);
      setPreview("");
      Swal.fire(
        m.uploaded ? m.uploaded() : "อัปโหลดแล้ว",
        m.uploaded_success ? m.uploaded_success() : "ระบบใส่ URL ให้เรียบร้อย",
        "success"
      );
    } catch (e) {
      Swal.fire(m.upload_failed ? m.upload_failed() : "อัปโหลดไม่สำเร็จ", e.message || (m.error_occurred ? m.error_occurred() : "เกิดข้อผิดพลาด"), "error");
    } finally {
      setUploading(false);
    }
  };
  // -------------------------------------------------------

  const submit = async (e) => {
    e.preventDefault();
    const msg = validate();
    if (msg) return Swal.fire(m.Agree ? m.Agree() : "กรอกไม่ครบ", msg, "warning");

    const payload = {
      shop_name: shopName.trim(),
      description: description.trim(),
      type: type.trim(),
      image: imageUrl.trim(),
      vendor_id: vendorId,
      address: { latitude: toNum(lat), longitude: toNum(lng) },
      order_active: false,
      reserve_active: false,
      status: false,
    };

    try {
      setSubmitting(true);
      await axios.post("/shop", payload, { withCredentials: true });
      await Swal.fire(
        m.success_save ? m.success_save() : "สำเร็จ",
        m.saved ? m.saved() : "สร้างร้านเรียบร้อยแล้ว",
        "success"
      );
      navigate("/vendor/home");
    } catch (e) {
      Swal.fire(
        m.save_failed ? m.save_failed() : "ไม่สำเร็จ",
        e?.response?.data?.error || e?.response?.data?.message || (m.error_occurred ? m.error_occurred() : "สร้างร้านไม่สำเร็จ"),
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="vs-container">
      <h1 className="vs-title">{m.create_shop_title ? m.create_shop_title() : "Create Shop"}</h1>
      <p className="vs-subtitle">
        {m.create_shop_subtitle ? m.create_shop_subtitle() : "กรอกข้อมูลให้ครบถ้วนและปักหมุดตำแหน่งร้านบนแผนที่"}
      </p>

      <form className="vs-layout" onSubmit={submit}>
        {/* LEFT: รายละเอียดร้าน */}
        <div className="vs-left">
          <div className="vs-section">
            <h3>{m.shop_info ? m.shop_info() : "ข้อมูลร้าน"}</h3>

            <label>
              {m.store_name ? m.store_name() : "ชื่อร้าน"} <span className="req">*</span>
            </label>
            <input
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder={m.store_name ? m.store_name() : "เช่น Fin CAFEEE"}
            />

            <label>
              {m.store_description ? m.store_description() : "คำอธิบาย"} <span className="req">*</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={m.store_description ? m.store_description() : "จุดเด่น / เมนูแนะนำ / เวลาเปิด-ปิด"}
            />

            <label>
              {m.Typefood ? m.Typefood() : "ประเภท"} <span className="req">*</span>
            </label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">{m.select_category ? m.select_category() : "— เลือกประเภท —"}</option>
              {CATEGORIES.map((key) => (
                <option key={key} value={key}>
                  {/* แสดงป้ายแปลจาก key ที่มีใน messages */}
                  {key === "Maincourse"
                    ? (m.Maincourse ? m.Maincourse() : "อาหารหลัก")
                    : key === "Beverage"
                    ? (m.Beverage ? m.Beverage() : "เครื่องดื่ม")
                    : key === "FastFoods"
                    ? (m.FastFoods ? m.FastFoods() : "อาหารจานด่วน")
                    : key === "Appetizer"
                    ? (m.Appetizer ? m.Appetizer() : "ของกินเล่น")
                    : (m.Dessert ? m.Dessert() : "ของหวาน")}
                </option>
              ))}
            </select>

            {/* อัปโหลดรูปภาพ */}
            <label>{m.shop_image ? m.shop_image() : "รูปภาพหน้าร้าน"}</label>
            <div className="vs-image-box" style={{ alignItems: "center" }}>
              <img
                src={preview || imageUrl || "https://via.placeholder.com/200x200?text=No+Image"}
                alt="preview"
                className="vs-image"
                style={{ width: 200, height: 200, objectFit: "cover", borderRadius: 12, border: "1px solid #ddd" }}
              />
              <div className="vs-image-controls">
                <input type="file" accept="image/*" onChange={onFileChange} />
                <div className="vs-row">
                  <button type="button" onClick={uploadImage} disabled={!file || uploading}>
                    {uploading ? (m.uploading ? m.uploading() : "กำลังอัปโหลด...") : (m.upload_image ? m.upload_image() : "Upload รูป")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setPreview("");
                    }}
                  >
                    {m.clear ? m.clear() : "ล้างไฟล์"}
                  </button>
                </div>
                <small>{m.or_paste_image_url ? m.or_paste_image_url() : "หรือวาง URL เอง:"}</small>
                <input
                  type="url"
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: แผนที่ปักหมุด */}
        <div className="vs-right">
          <div className="vs-map-card">
            <div className="vs-map-header">
              <h3>{m.map_header_title ? m.map_header_title() : "แผนที่ร้าน — คลิกเพื่อวางหมุด / ลากเพื่อเปลี่ยนตำแหน่ง"}</h3>
              <MapSearchBox onPick={([la, ln]) => { setLat(la); setLng(ln); }} />
            </div>

            <div className="vs-map-wrap">
              <MapContainer center={mapCenter} zoom={13} scrollWheelZoom className="vs-map">
                <MapFlyTo center={mapCenter} zoom={15} />
                <TileLayer
                  attribution="&copy; OpenStreetMap"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ClickToPlace onPlace={([la, ln]) => { setLat(la); setLng(ln); }} />
                {Number.isFinite(toNum(lat)) && Number.isFinite(toNum(lng)) && (
                  <DraggableMarker
                    position={[toNum(lat), toNum(lng)]}
                    onDragEnd={([la, ln]) => { setLat(la); setLng(ln); }}
                  />
                )}
              </MapContainer>
            </div>

            <div className="vs-map-footer">
              <small>{m.map_footer_tip ? m.map_footer_tip() : "คลิกแผนที่เพื่อวางหมุด หรือ ลากหมุดเพื่อเปลี่ยนตำแหน่ง"}</small>
              <div className="vs-map-coords">
                <div className="vs-map-coord">
                  <label>{m.lat ? m.lat() : "Lat"}</label>
                  <input type="text" readOnly value={Number.isFinite(Number(lat)) ? Number(lat).toFixed(6) : ""} />
                </div>
                <div className="vs-map-coord">
                  <label>{m.lng ? m.lng() : "Lng"}</label>
                  <input type="text" readOnly value={Number.isFinite(Number(lng)) ? Number(lng).toFixed(6) : ""} />
                </div>
              </div>

              <div className="vs-row" style={{ marginTop: ".25rem" }}>
                <button type="button" onClick={useMyLocation}>
                  {m.use_my_location ? m.use_my_location() : "ใช้ตำแหน่งฉันตอนนี้"}
                </button>
                <button type="submit" className="vs-primary" disabled={submitting}>
                  {submitting ? (m.loading_data ? m.loading_data() : "กำลังสร้าง...") : (m.create_shop ? m.create_shop() : "สร้างร้าน")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
