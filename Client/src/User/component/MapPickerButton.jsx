import { useState } from "react"
import MapTest from "./MapTest"

 const overlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  };

  const contentStyle = {
    background: "#fff",
    padding: 0,
    borderRadius: "10px",
    width: "36%",
    height: "75%",
    position: "relative",
    boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
    overflow: "hidden",
  };

  const closeStyle = {
    position: "absolute",
    top: "8px",
    right: "12px",
    background: "transparent",
    border: "none",
    fontSize: "22px",
    cursor: "pointer",
    zIndex: 1100,
  };

export default function MapPickerButton(){
    const [open,setOpen] = useState(false)
     return (
    <div>
      <button onClick={() => setOpen(true)}>
        Click to Choose Location
      </button>

      {open && (
        <div style={overlayStyle}>
          <div style={contentStyle}>
            <button style={closeStyle} onClick={() => setOpen(false)}>
              ✖
            </button>
            <MapTest /> {/* ใส่แผนที่ */}
          </div>
        </div>
      )}
    </div>
  );
}