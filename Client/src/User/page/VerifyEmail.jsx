import { useContext, useEffect, useState } from "react";
import { AuthContext } from "@/context/ProtectRoute";
import OTPInput from "../component/OTPInput";
import { useNavigate } from "react-router-dom";
import { m } from "@/paraglide/messages.js";

const VerifyEmail = () => {
  const { auth, loading } = useContext(AuthContext);
  const [state, setState] = useState(false);
  const navigation = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!auth) {
      navigation("/", { replace: true });
    }
  }, [auth, loading]);

  return (
    <div className="container bg-image2">
      <div className="setcenter">
        <div className="box">
          {!state ? (
            <div
              className="columnset setcenterNF"
              style={{ textAlign: "center" }}
            >
              <p
                style={{
                  fontWeight: "bold",
                  fontSize: "25px",
                  marginBlock: 10,
                }}
              >
                {m.VerifyEmail()}
              </p>
              <p>{m.MustVerifyEmail()}</p>
              <button
                className="btn1"
                onClick={() => {
                  setState(!state);
                }}
              >
                {m.SendOTP()}
              </button>
            </div>
          ) : (
            <div>
              <p>{m.EnterOTP()}</p>
              <OTPInput />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
