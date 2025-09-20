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

// custom marker
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Marker ที่วางด้วยการคลิก
function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position ? (
    <Marker position={position} icon={markerIcon} draggable={true} />
  ) : null;
}

// กล่องค้นหา Leaflet GeoSearch
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

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPicked({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => {
          alert("ไม่สามารถดึงพิกัดจากเครื่องได้: " + err.message);
        }
      );
    } else {
      alert("Browser ของคุณไม่รองรับการหาพิกัด (Geolocation)");
    }
  };

  return (
    <div style={{ width: "75vw", height: "75vh"}}>
      {/* แผนที่ด้านซ้าย */}
      <div style={{ width: "50%", height: "100%" }}>
        <MapContainer
          center={picked || [13.7563, 100.5018]} // ถ้าไม่มี picked ใช้กรุงเทพ
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

    </div>
  );
}
