import { useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GeoSearchControl, OpenStreetMapProvider } from "leaflet-geosearch";
import "leaflet-geosearch/dist/geosearch.css";
import axios from "axios";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });
  return position ? <Marker position={position} icon={markerIcon} draggable /> : null;
}

function SearchBox({ setPosition }) {
  const map = useMapEvents({});
  const provider = new OpenStreetMapProvider();
  const searchControlRef = useRef(null);

  if (!searchControlRef.current) {
    searchControlRef.current = new GeoSearchControl({
      provider,
      style: "bar",
      showMarker: false,
      autoClose: true,
      keepResult: true,
      position: "topleft",
    });
    map.addControl(searchControlRef.current);

    map.on("geosearch/showlocation", (result) => {
      const { x, y } = result.location;
      setPosition({ lat: y, lng: x });
    });
  }
  return null;
}

export default function MapTest() {
  const [picked, setPicked] = useState(null);

  const saveLocation = async () => {
    if (!picked) {
      alert("กรุณาเลือกตำแหน่งก่อน");
      return;
    }

    try {
      const res = await axios.put("http://localhost:8080/setLocation/shop02", {
        latitude: picked.lat,
        longitude: picked.lng,
      });

      alert("บันทึกเรียบร้อย: " + JSON.stringify(res.data));
    } catch (err) {
      if (err.response) {
        // error จาก server (เช่น 404, 500)
        alert(
          `Server error (${err.response.status}): ${JSON.stringify(err.response.data)}`
        );
      } else if (err.request) {
        // ไม่ได้รับ response (เช่น CORS, server ไม่ตอบ)
        alert("ไม่สามารถติดต่อ backend ได้");
      } else {
        // error อื่น ๆ
        alert("Error: " + err.message);
      }
    }
  };

  return (
    <div style={{ width: "100%", height: "75vh" }}>
      <div style={{ width: "100%", height: "90%" }}>
        <MapContainer
          center={picked || [13.7563, 100.5018]}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <SearchBox setPosition={setPicked} />
          <LocationMarker position={picked} setPosition={setPicked} />
        </MapContainer>
      </div>

      <div style={{ textAlign: "center", marginTop: "10px" }}>
        <button onClick={saveLocation}>บันทึกตำแหน่ง</button>
      </div>
    </div>
  );
}
