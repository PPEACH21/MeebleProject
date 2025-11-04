import { useState, useRef, useEffect, useContext } from "react";
import axios from "@/api/axios";
import { AuthContext } from "@/context/ProtectRoute";
import { useNavigate } from "react-router-dom";
import LoadingPage from "./LoadingPage";
import { m } from "@/paraglide/messages";

export const OTPInput = ({ email = false, state, setState }) => {
  const { auth, setAuth } = useContext(AuthContext);
  const [otp, setOTP] = useState(new Array(6).fill(""));
  const navigate = useNavigate();
  const inputRef = useRef([]);
  const [Loading, setLoading] = useState(false);

  useEffect(() => {
    sendmessage();
  }, []);

  const sendmessage = () => {
    if (!email) {
      SendOTP();
    } else {
      SendOTPRepassword(email);
    }
    if (inputRef.current[0]) {
      inputRef.current[0].focus();
    }
  };

  const SendOTPRepassword = async (email) => {
    try {
      const res = await axios.post("/sendotp_repassword", { email });
      console.log("OTP sent successfully:", res.data);
    } catch (err) {
      console.error("Error sending OTP:", err);
    }
  };

  const SendOTP = async () => {
    try {
      const res = await axios.post(
        "/sendotp",
        {
          username: auth?.username,
          email: auth?.email,
        },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );
      console.log("OTP sent successfully:", res.data);
    } catch (err) {
      console.error("Error sending OTP:", err);
    }
  };

  const handleChange = (index, e) => {
    const value = e.target.value;
    if (isNaN(value)) return;

    const newOTP = [...otp];
    newOTP[index] = value.substring(value.length - 1);
    setOTP(newOTP);

    if (value && index < otp.length - 1) {
      inputRef.current[index + 1].focus();
    }
  };

  const handleClick = (index) => {
    inputRef.current[index].setSelectionRange(1, 1);
  };
  const handleKeydown = (index, e) => {
    if (e.key === "Backspace") {
      if (otp[index] === "" && index > 0) {
        inputRef.current[index - 1].focus();
      }
    }
  };

  const handleSubmit = async () => {
    const otpCode = otp.join("");
    console.log("OTP submitted:", otpCode);
    setLoading(true);
    try {
      if (!email) {
        // ✅ Verify signup/login email flow
        const checkOTP = await axios.post(`/checkotp`, { otp: otpCode, email: auth?.email });
        console.log("checkOTP Success", checkOTP?.status);

        const updatadata = await axios.put(
          `/verifiedEmail/${auth?.user_id}`,
          {},
          {
            headers: { "Content-Type": "application/json" },
            withCredentials: true, // จะได้ cookie token ใหม่ที่ฝั่ง server ใส่ role มาให้
          }
        );
        console.log("Verified success:", updatadata?.data);

        // อัปเดต context ให้ verified = true
        // (พยายามรักษา role จาก server response ถ้ามี; ถ้าไม่มี ใช้ของเดิมใน auth)
        const roleFromServer =
          updatadata?.data?.role ||
          updatadata?.data?.data?.role || // กันกรณี response ห่ออีกชั้น
          auth?.role;

        const updatedAuth = { ...auth, verified: true, role: roleFromServer };
        setAuth(updatedAuth);
        console.log("Updated Auth:", updatedAuth);

        // ✅ นำทางตาม role
        if (roleFromServer === "vendor" || updatedAuth?.role === "vendor" || updatedAuth?.isVendor || updatedAuth?.vendorId) {
          navigate("/vendor/home");
        } else {
          navigate("/home");
        }

        setLoading(false);
      } else {
        // ✅ Forgot password flow
        const checkOTP = await axios.post(`/checkotp`, { otp: otpCode, email });
        console.log("checkOTP Success", checkOTP?.status);
        console.log("Changepassword Page");
        setState(state + 1);
        setLoading(false);
      }
    } catch (err) {
      console.error("Error OTP Not Correct:", err);
      setLoading(false);
      alert(m.tryagain());
    }
  };

  if (Loading) return <LoadingPage />;
  return (
    <div>
      {otp.map((value, index) => {
        return (
          <input
            className="otpinput"
            key={index}
            ref={(input) => (inputRef.current[index] = input)}
            text="text"
            value={value}
            onChange={(e) => handleChange(index, e)}
            onClick={() => handleClick(index)}
            onKeyDown={(e) => handleKeydown(index, e)}
          />
        );
      })}

      <div style={{ textAlign: "end", marginTop: "10px" }}>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            sendmessage();
          }}
        >
          {m.SendOTP()}
        </a>
      </div>
      <div className="setcenterNF" style={{ marginTop: "10px" }}>
        <button className="btn" style={{ width: "80%" }} onClick={handleSubmit}>
          {m.VerifyEmail()}
        </button>
      </div>
    </div>
  );
};
export default OTPInput;
