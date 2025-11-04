// src/User/page/VendorSettings.jsx
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
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// ✅ i18n
import { m } from "@/paraglide/messages.js";

// reset leaflet icon path
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// หมวดหมู่
const CATEGORIES = [
  { key: "Maincourse", label: () => m.Maincourse() },
  { key: "Beverage", label: () => m.Beverage() },
  { key: "FastFoods", label: () => m.FastFoods() },
  { key: "Appetizer", label: () => m.Appetizer() },
  { key: "Dessert", label: () => m.Dessert() },
];

const BANGKOK = [13.7563, 100.5018];
const pickId = (obj) => obj?.id || obj?.ID || obj?.Id || "";
const toNum = (v, d = NaN) => (Number.isFinite(Number(v)) ? Number(v) : d);

function ClickToPlace({ onPlace }) {
  useMapEvents({
    click(e) {
      onPlace([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

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
      <Popup>{m.map_drag_tip()}</Popup>
    </Marker>
  );
}

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

function MapSearchBox({ onPick }) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const fetchIdRef = useRef(0);

  // ✅ ใช้ navigator.language แทน
  const lang =
    typeof navigator !== "undefined" && navigator.language
      ? `${navigator.language},en`
      : "th,en";

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
          placeholder={m.map_search_placeholder()}
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
            aria-label={m.clear()}
            title={m.clear()}
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
      {loading && <div className="vs-search-loading">{m.searching()}</div>}
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

  const [placeholderName, setPlaceholderName] = useState("");
  const [shopName, setShopName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");

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
        const name = target.shop_name || target.name || "";
        const desc = target.description || "";
        const t = target.type || "";
        const img = target.image || "";
        const _lat =
          target.lat ??
          target.latitude ??
          target?.location?.lat ??
          target?.geopoint?.lat;
        const _lng =
          target.lng ??
          target.longitude ??
          target?.location?.lng ??
          target?.geopoint?.lng;

        setPlaceholderName(name);
        setDescription(desc);
        setType(t);
        setImageUrl(img);
        setLat(_lat);
        setLng(_lng);
      } catch {
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const mapCenter = useMemo(() => {
    if (Number.isFinite(toNum(lat)) && Number.isFinite(toNum(lng)))
      return [toNum(lat), toNum(lng)];
    return BANGKOK;
  }, [lat, lng]);

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setPreview(f ? URL.createObjectURL(f) : "");
  };

  const uploadImage = async () => {
    if (!file) return Swal.fire(m.no_file(), m.please_choose_file(), "info");
    try {
      const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
      if (!apiKey)
        return Swal.fire(m.missing_key(), m.missing_imgbb_key(), "warning");
      const form = new FormData();
      form.append("key", apiKey);
      form.append("image", file);
      const res = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!data?.success || !data?.data?.url)
        return Swal.fire(m.upload_failed(), m.upload_failed_detail(), "error");
      setImageUrl(data.data.url);
      setFile(null);
      setPreview("");
      Swal.fire(m.uploaded(), m.uploaded_success(), "success");
    } catch (e) {
      Swal.fire(m.upload_failed(), e.message || m.error_occurred(), "error");
    }
  };

  const useMyLocation = () => {
    if (!("geolocation" in navigator))
      return Swal.fire(
        m.not_supported(),
        m.browser_no_geolocation(),
        "warning"
      );
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        Swal.fire(m.success_save(), m.set_position_from_device(), "success");
      },
      (err) =>
        Swal.fire(
          m.save_failed(),
          err.message || m.cannot_read_position(),
          "error"
        ),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const saveSettings = async () => {
    if (!shopId)
      return Swal.fire(m.shop_not_found(), m.please_select_shop(), "warning");
    const payload = {
      shop_name: shopName || placeholderName,
      description,
      type,
      image: imageUrl || undefined,
    };
    const _lat = toNum(lat, NaN);
    const _lng = toNum(lng, NaN);
    if (Number.isFinite(_lat) && Number.isFinite(_lng)) {
      payload.location = { lat: _lat, lng: _lng };
      payload.address = { latitude: _lat, longitude: _lng };
    }
    try {
      await axios.put(`/shops/${shopId}`, payload, { withCredentials: true });
      Swal.fire(m.saved(), m.saved_shop_settings(), "success");
      setPlaceholderName(shopName || placeholderName);
      setShopName("");
    } catch (e) {
      Swal.fire(
        m.save_failed(),
        e?.response?.data?.error || m.error_occurred(),
        "error"
      );
    }
  };

  if (loading) return <div className="vs-loading">{m.loading_data()}</div>;

  return (
    <div className="vs-container">
      <h1 className="vs-title">{m.shop_settings_title()}</h1>
      <p className="vs-subtitle">{m.shop_settings_subtitle()}</p>

      {!shopId ? (
        <div className="vs-no-shop">
          <p>{m.no_shop_message()}</p>
        </div>
      ) : (
        <div className="vs-layout">
          <div className="vs-left">
            <div className="vs-section">
              <h3>{m.shop_image()}</h3>
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
                      {m.upload_image()}
                    </button>
                    <button
                      onClick={() => {
                        setFile(null);
                        setPreview("");
                      }}
                    >
                      {m.cancel()}
                    </button>
                  </div>
                  <small>{m.or_paste_image_url()}</small>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="vs-section">
              <h3>{m.shop_info()}</h3>
              <label>{m.store_name()}</label>
              <input
                value={shopName}
                placeholder={placeholderName || m.store_name()}
                onChange={(e) => setShopName(e.target.value)}
              />
              <label>{m.description()}</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={m.store_description()}
              />
              <label>{m.Typefood()}</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">{m.select_category()}</option>
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.label()}>
                    {c.label()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="vs-right">
            <div className="vs-map-card">
              <div className="vs-map-header">
                <h3>{m.map_header_title()}</h3>
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
                  <MapFlyTo center={mapCenter} zoom={15} />
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

              <div className="vs-map-footer">
                <small>{m.map_footer_tip()}</small>
                <div className="vs-map-coords">
                  <div className="vs-map-coord">
                    <label>{m.lat()}</label>
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
                    <label>{m.lng()}</label>
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
                  <button onClick={useMyLocation}>{m.use_my_location()}</button>
                  <button className="vs-primary" onClick={saveSettings}>
                    {m.save_settings()}
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
