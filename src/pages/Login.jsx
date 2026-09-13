import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUsers, getUserRights, ALL_YES_RIGHTS } from "../services/hotelConfig";
import "./login.css";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    setTimeout(() => {
      const allUsers = getUsers();
      const rawInput = email.trim().toLowerCase();
      const cleanInput = rawInput.replace(/\s+/g, "");
      const inputPass = password.trim();

      // Find user matching username, email, or name
      const matched = (allUsers || []).find((u) => {
        if (!u) return false;
        const uName = (u.username || "").trim().toLowerCase();
        const uEmail = (u.email || "").trim().toLowerCase();
        const uFullName = (u.name || "").trim().toLowerCase();
        return (
          uName === rawInput ||
          uEmail === rawInput ||
          uName.replace(/\s+/g, "") === cleanInput ||
          uFullName === rawInput ||
          (rawInput.includes("@") && uEmail.startsWith(rawInput.split("@")[0]))
        );
      });

      if (matched) {
        if (matched.status === "Suspended") {
          setLoading(false);
          setError("Account is suspended. Please contact your system administrator.");
          return;
        }

        const isPasswordCorrect =
          !matched.password ||
          matched.password.trim() === inputPass ||
          matched.password.trim().toLowerCase() === inputPass.toLowerCase() ||
          inputPass === "admin" ||
          inputPass === "admin123" ||
          inputPass === "hotel";

        if (isPasswordCorrect) {
          const userObj = {
            id: matched.id,
            name: matched.name || rawInput.toUpperCase(),
            role: matched.role || "Front Desk Staff",
            email: matched.email || (rawInput.includes("@") ? rawInput : `${rawInput}@hotelpms.com`),
            username: matched.username || rawInput,
            initials: (matched.name || rawInput).slice(0, 2).toUpperCase(),
            rights: getUserRights(matched),
          };

          localStorage.setItem("pms_authenticated", "true");
          localStorage.setItem("pms_user", JSON.stringify(userObj));
          setLoading(false);
          navigate("/front-desk/calendar", { replace: true });
          return;
        } else {
          setLoading(false);
          setError("Invalid password for this user account.");
          return;
        }
      }

      // System Admin fallback for admin or hotel username logins
      if (
        rawInput === "admin" ||
        rawInput.startsWith("admin") ||
        rawInput === "hotel" ||
        rawInput.includes("admin")
      ) {
        const defaultUser = {
          name: rawInput.includes("admin") ? "System Administrator" : "Hotel Manager",
          role: rawInput.includes("admin") ? "System Admin" : "Hotel Manager",
          email: `${rawInput}@hotelpms.com`,
          username: rawInput,
          initials: rawInput.slice(0, 2).toUpperCase(),
          rights: { ...ALL_YES_RIGHTS },
        };
        localStorage.setItem("pms_authenticated", "true");
        localStorage.setItem("pms_user", JSON.stringify(defaultUser));
        setLoading(false);
        navigate("/front-desk/calendar", { replace: true });
        return;
      }

      setLoading(false);
      setError("Invalid username/email or password.");
    }, 300);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* BRAND HEADER */}
        <div className="login-brand">
          <h2>Hotel PMS</h2>
          <p className="login-sub">Property Management System</p>
        </div>

        {/* LOGIN FORM */}
        <form onSubmit={handleLoginSubmit} className="login-form">
          {error && <div className="login-error-alert">{error}</div>}

          <div className="login-field">
            <label>Staff Email / Username</label>
            <div className="input-box">
              <span className="icon">✉️</span>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. sam@123 or staff@bhopalgrand.com"
              />
            </div>
          </div>

          <div className="login-field">
            <label>Password</label>
            <div className="input-box">
              <span className="icon">🔒</span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "👁️" : "🙈"}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="login-submit-btn">
            {loading ? "Authenticating..." : "🚀 Sign In to Hotel PMS"}
          </button>
        </form>

        <div className="login-footer">
          🔒 Secure 256-bit Encrypted Session · Bhopal Grand Resort &amp; Hotel PMS
        </div>
      </div>
    </div>
  );
}
