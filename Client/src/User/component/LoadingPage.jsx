import { m } from "@/paraglide/messages.js";
import { useState, useEffect } from "react";
import logo from "@/assets/LOGO.jpg";

export const runloadting = (delay = 2000) => {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return { loading, setLoading, LoadingPage };
};

const LoadingPage = () => {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        color: "#FFA467",
        zIndex: 9999,
        transition: "1s",
        backdropFilter: "blur(3px)",
        gap: "10px",
      }}
    >
      <img className="spinner" src={logo} />
      <h3>{m.loading()}...</h3>
    </div>
  );
};

export default LoadingPage;
