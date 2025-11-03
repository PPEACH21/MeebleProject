import { useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "@/api/axios";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import "@css/pages/vendorSettings.css";
import { AuthContext } from "@/context/ProtectRoute";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";

// ✅ Leaflet core + CSS (สำคัญมาก)
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ✅ ให้ Vite จัดการ asset ไอคอนแล้วอ้าง path ที่ถูกต้อง
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// 🔧 รีเซ็ต method เก่า (กันไปดึง path ปริยายที่ผิด)
delete L.Icon.Default.prototype._getIconUrl;

// ✅ ตั้ง default icon ให้ Marker ทั้งแอป
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// หมวดหมู่ตัวอย่าง
const CATEGORIES = [
  "MainCourse",
  "Beverage",
  "Fast Foods",
  "Appetizer",
  "Dessert",
];

// ค่ากรุงเทพเป็น fallback/ค่าเริ่มต้น
const BANGKOK = [13.7563, 100.5018];

/* ---------------- helpers ---------------- */
const pickId = (obj) => obj?.id || obj?.ID || obj?.Id || "";
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
      <Popup>ลากเพื่อเปลี่ยนตำแหน่ง</Popup>
    </Marker>
  );
}

// ควบคุมแผนที่ให้เลื่อนไปยังพิกัดล่าสุด (เช่นหลังค้นหา/เลือกสถานที่)
function MapFlyTo({ center, zoom = 15 }) {
  const map = useMap();
  useEffect(() => {
    if (
      Array.isArray(center) &&
      Number.isFinite(center[0]) &&
      Number.isFinite(center[1])
    ) {
      map.flyTo(center, zoom, { duration: 0.8 });
    }
  }, [center, zoom, map]);
  return null;
}

// ช่องค้นหา (ใช้ OSM Nominatim)
function MapSearchBox({ onPick }) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const fetchIdRef = useRef(0);

  // debounce เล็ก ๆ
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
        // Nominatim: ไม่ต้องใช้ key (ระวัง rate limit)
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&q=${encodeURIComponent(
          query
        )}`;
        const res = await fetch(url, {
          headers: {
            // แนะนำให้ตั้ง user-agent ของโปรเจกต์คุณเองใน production
            "Accept-Language": "th,en",
          },
        });
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
      } catch (e) {
        // เงียบ ๆ พอ
      } finally {
        if (myId === fetchIdRef.current) setLoading(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [q]);

  return (
    <div className="vs-search">
      <div className="vs-search-row">
        <input
          className="vs-search-input"
          type="text"
          placeholder="ค้นหาสถานที่ (ถนน, ตรอก, ตำบล, เขต ฯลฯ)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && (
          <button
            className="vs-search-clear"
            onClick={() => {
              setQ("");
              setItems([]);
            }}
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
      {loading && <div className="vs-search-loading">กำลังค้นหา…</div>}
    </div>
  );
}

export default function VendorSettings() {
  const { auth } = useContext(AuthContext);
  const userId = auth?.user_id || "";
  const [shopId, setShopId] = useState(
    localStorage.getItem("currentShopId") || ""
  );
  const [loading, setLoading] = useState(true);

  // form states
  const [placeholderName, setPlaceholderName] = useState("");
  const [shopName, setShopName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // geo states
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);

  // image
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");

  // ===== โหลดร้านจาก by-vendor =====
  useEffect(() => {
    const load = async () => {
      if (!userId) return setLoading(false);
      try {
        const res = await axios.get(`/shops/by-vendor/${userId}`, {
          withCredentials: true,
        });
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

        // รองรับหลายรูปแบบ field ที่เก็บพิกัด
        const _lat =
          target.lat ??
          target.latitude ??
          target?.location?.lat ??
          target?.geopoint?.lat ??
          null;
        const _lng =
          target.lng ??
          target.longitude ??
          target?.location?.lng ??
          target?.geopoint?.lng ??
          null;

        setPlaceholderName(name);
        setShopName("");
        setDescription(desc);
        setType(t);
        setImageUrl(img);
        setLat(_lat);
        setLng(_lng);
      } catch (e) {
        // เงียบพอ
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ❗เริ่มต้นที่กรุงเทพเป็นหลัก: ถ้าไม่มี lat/lng จากร้าน ให้ใช้ BANGKOK
  const mapCenter = useMemo(() => {
    if (Number.isFinite(toNum(lat)) && Number.isFinite(toNum(lng))) {
      return [toNum(lat), toNum(lng)];
    }
    return BANGKOK; // เริ่มต้นกรุงเทพ
  }, [lat, lng]);

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
        return Swal.fire(
          "Missing key",
          "ยังไม่ได้ตั้งค่า VITE_IMGBB_API_KEY ใน frontend",
          "warning"
        );
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
        return Swal.fire(
          "Upload failed",
          "ไม่สามารถอัปโหลดรูปไป imgbb ได้",
          "error"
        );
      }

      const url = data.data.url;
      setImageUrl(url);
      setFile(null);
      setPreview("");
      Swal.fire("Uploaded", "อัปโหลดรูปเรียบร้อย", "success");
    } catch (e) {
      Swal.fire("Upload failed", e.message || "เกิดข้อผิดพลาด", "error");
    }
  };

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      return Swal.fire(
        "ไม่รองรับ",
        "เบราว์เซอร์ไม่รองรับ Geolocation",
        "warning"
      );
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        Swal.fire("สำเร็จ", "ตั้งตำแหน่งจากอุปกรณ์แล้ว", "success");
      },
      (err) => {
        Swal.fire(
          "ไม่สำเร็จ",
          err.message || "ไม่สามารถอ่านตำแหน่งได้",
          "error"
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const saveSettings = async () => {
    if (!shopId)
      return Swal.fire("ไม่พบร้าน", "ยังไม่ได้เลือกหรือโหลดร้าน", "warning");

    const payload = {
      shop_name: shopName || placeholderName,
      description,
      type,
      image: imageUrl || undefined,
    };

    // แนบพิกัดหากมี
    const _lat = toNum(lat, NaN);
    const _lng = toNum(lng, NaN);
    if (Number.isFinite(_lat) && Number.isFinite(_lng)) {
      payload.location = { lat: _lat, lng: _lng };
      payload.address = {
        latitude: _lat,
        longitude: _lng,
      };
    }

    try {
      await axios.put(`/shops/${shopId}`, payload, { withCredentials: true });
      Swal.fire("Saved", "บันทึกการตั้งค่าร้าน + ตำแหน่ง เรียบร้อย", "success");
      console.log(payload);
      setPlaceholderName(shopName || placeholderName);
      setShopName("");
    } catch (e) {
      Swal.fire(
        "Save failed",
        e?.response?.data?.error || "เกิดข้อผิดพลาด",
        "error"
      );
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
        <div className="vs-layout">
          {/* LEFT: รายละเอียดร้าน */}
          <div className="vs-left">
            {/* รูปร้าน */}
            <div className="vs-section">
              <h3>รูปภาพร้าน</h3>
              <div className="vs-image-box">
                <img
                  src={
                    preview ||
                    imageUrl ||
                    "https://via.placeholder.com/200x200?text=No+Image"
                  }
                  alt="shop"
                  className="vs-image"
                />
                <div className="vs-image-controls">
                  <input type="file" accept="image/*" onChange={onFileChange} />
                  <div className="vs-row">
                    <button onClick={uploadImage} disabled={!file}>
                      Upload รูป
                    </button>
                    <button
                      onClick={() => {
                        setFile(null);
                        setPreview("");
                      }}
                    >
                      ยกเลิก
                    </button>
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
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* RIGHT: แผนที่ปักหมุด */}
          <div className="vs-right">
            <div className="vs-map-card">
              <div className="vs-map-header">
                <h3>
                  แผนที่ร้าน (OpenStreetMap) — คลิกเพื่อวางหมุด /
                  ลากเพื่อเปลี่ยนตำแหน่ง
                </h3>
                {/* 🔎 กล่องค้นหา */}
                <MapSearchBox
                  onPick={([la, ln]) => {
                    setLat(la);
                    setLng(ln);
                  }}
                />
              </div>

              <div className="vs-map-wrap">
                <MapContainer
                  center={mapCenter}
                  zoom={13}
                  scrollWheelZoom
                  className="vs-map"
                >
                  {/* ย้าย/บินไปยังพิกัดล่าสุดเมื่อ lat/lng เปลี่ยน */}
                  <MapFlyTo center={mapCenter} zoom={15} />

                  {/* ✅ OpenStreetMap TileLayer */}
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <ClickToPlace
                    onPlace={([la, ln]) => {
                      setLat(la);
                      setLng(ln);
                    }}
                  />
                  {Number.isFinite(toNum(lat)) &&
                    Number.isFinite(toNum(lng)) && (
                      <DraggableMarker
                        position={[toNum(lat), toNum(lng)]}
                        onDragEnd={([la, ln]) => {
                          setLat(la);
                          setLng(ln);
                        }}
                      />
                    )}
                </MapContainer>
              </div>

              {/* Lat/Lng ใต้แผนที่ + ปุ่มใช้งาน */}
              <div className="vs-map-footer">
                <small>
                  คลิกแผนที่เพื่อวางหมุด หรือ ลากหมุดเพื่อเปลี่ยนตำแหน่ง
                </small>

                <div className="vs-map-coords">
                  <div className="vs-map-coord">
                    <label>Lat</label>
                    <input
                      type="text"
                      readOnly
                      value={
                        Number.isFinite(Number(lat))
                          ? Number(lat).toFixed(6)
                          : ""
                      }
                    />
                  </div>

                  <div className="vs-map-coord">
                    <label>Lng</label>
                    <input
                      type="text"
                      readOnly
                      value={
                        Number.isFinite(Number(lng))
                          ? Number(lng).toFixed(6)
                          : ""
                      }
                    />
                  </div>
                </div>

                <div className="vs-row" style={{ marginTop: ".25rem" }}>
                  <button onClick={useMyLocation}>ใช้ตำแหน่งฉันตอนนี้</button>
                  <button className="vs-primary" onClick={saveSettings}>
                    บันทึกการตั้งค่า
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
