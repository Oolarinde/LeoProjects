import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  Link,
} from "@mui/material";
import { Person, Lock, Wifi, MenuBook } from "@mui/icons-material";
import { authApi } from "../services/api";
import { useAppStore } from "../utils/store";
import { tokens } from "../theme/theme";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "book">("login");
  const navigate = useNavigate();
  const { setTokens, setUser } = useAppStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const resp = await authApi.login(email, password);
      setTokens(resp.data.access_token, resp.data.refresh_token);
      const meResp = await authApi.me();
      setUser(meResp.data);
      navigate("/dashboard");
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Hero section with dark overlay */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, rgba(20,23,39,0.82), rgba(27,42,74,0.78)), url("/ta-hero.jpg") center/cover no-repeat`,
          backgroundColor: tokens.navy,
          minHeight: "72vh",
        }}
      >
        <Card
          sx={{
            width: 360,
            maxWidth: "92vw",
            p: "32px 28px 24px",
            borderRadius: 3,
            textAlign: "center",
          }}
        >
          {/* Logo */}
          <Box sx={{ mb: 2.25 }}>
            <Box
              component="img"
              src="/ta-logo.webp"
              alt="Talents Apartments"
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                e.currentTarget.style.display = "none";
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = "block";
              }}
              sx={{ height: 48, objectFit: "contain" }}
            />
            <Box sx={{ display: "none" }}>
              <Typography sx={{ fontSize: 22, fontWeight: 800, color: tokens.primary, fontStyle: "italic" }}>
                Talents
              </Typography>
              <Typography sx={{ fontSize: 9, color: tokens.danger, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", mt: -0.25 }}>
                APARTMENTS
              </Typography>
            </Box>
          </Box>

          {/* Login / Book toggle tabs */}
          <Box sx={{ display: "flex", gap: 0.75, justifyContent: "center", mb: 2.75 }}>
            <Button
              variant={activeTab === "login" ? "contained" : "outlined"}
              startIcon={<Wifi sx={{ fontSize: 15 }} />}
              onClick={() => setActiveTab("login")}
              aria-pressed={activeTab === "login"}
              sx={{
                fontSize: 12,
                fontWeight: 700,
                px: 2.75,
                py: 0.75,
                borderRadius: 1.5,
                ...(activeTab === "login"
                  ? { bgcolor: tokens.navy, color: "#fff", "&:hover": { bgcolor: "#243558" } }
                  : { borderColor: tokens.border, color: tokens.muted }),
              }}
            >
              Login
            </Button>
            <Button
              variant={activeTab === "book" ? "contained" : "outlined"}
              startIcon={<MenuBook sx={{ fontSize: 15 }} />}
              onClick={() => setActiveTab("book")}
              aria-pressed={activeTab === "book"}
              sx={{
                fontSize: 12,
                fontWeight: 700,
                px: 2.75,
                py: 0.75,
                borderRadius: 1.5,
                ...(activeTab === "book"
                  ? { bgcolor: tokens.navy, color: "#fff", "&:hover": { bgcolor: "#243558" } }
                  : { borderColor: tokens.border, color: tokens.muted }),
              }}
            >
              Book
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2, fontSize: 12 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleLogin}>
            {/* Email */}
            <Box sx={{ textAlign: "left", mb: 1.75 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: tokens.heading, mb: 0.625 }}>
                Email
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="email"
                placeholder="admin@site.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person sx={{ fontSize: 17, color: tokens.secondaryText }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    fontSize: 13,
                    borderRadius: 1.5,
                  },
                }}
              />
            </Box>

            {/* Password */}
            <Box sx={{ textAlign: "left", mb: 1.75 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: tokens.heading, mb: 0.625 }}>
                Password
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ fontSize: 17, color: tokens.secondaryText }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    fontSize: 13,
                    borderRadius: 1.5,
                  },
                }}
              />
            </Box>

            {/* Remember me + Lost password */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.25 }}>
              <FormControlLabel
                control={<Checkbox size="small" sx={{ p: 0.5, "& .MuiSvgIcon-root": { fontSize: 16 } }} />}
                label={
                  <Typography sx={{ fontSize: 12, color: tokens.muted, fontWeight: 500 }}>
                    Remember Me
                  </Typography>
                }
                sx={{ ml: -0.5 }}
              />
              <Link href="#" underline="hover" sx={{ fontSize: 11, fontWeight: 600, color: tokens.heading }}>
                Lost Your Password?
              </Link>
            </Box>

            {/* Login button — flat navy per portal */}
            <Button
              fullWidth
              variant="contained"
              type="submit"
              disabled={loading}
              sx={{
                bgcolor: tokens.navy,
                py: 1.25,
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 1.5,
                "&:hover": { bgcolor: "#243558" },
              }}
            >
              {loading ? "Signing in..." : "Login"}
            </Button>
          </form>

          {/* Register link */}
          <Typography sx={{ mt: 1.75, fontSize: 13, color: tokens.muted }}>
            Don&apos;t have an account?{" "}
            <Link href="#" underline="none" sx={{ fontWeight: 700, color: tokens.heading, "&:hover": { color: tokens.primary } }}>
              Register
            </Link>
          </Typography>
        </Card>
      </Box>

      {/* CTA bar */}
      <Box
        sx={{
          bgcolor: tokens.navy,
          color: "#fff",
          px: 5,
          py: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 800 }}>Do You Have Questions ?</Typography>
          <Typography sx={{ fontSize: 13, opacity: 0.6, mt: 0.5 }}>You can request a call back.</Typography>
        </Box>
        <Button
          variant="outlined"
          sx={{
            borderColor: "#fff",
            color: "#fff",
            borderRadius: 5,
            fontWeight: 700,
            fontSize: 13,
            px: 3,
            "&:hover": { bgcolor: "#fff", color: tokens.navy },
          }}
        >
          Call Me Back
        </Button>
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          bgcolor: tokens.navyDark,
          color: "rgba(255,255,255,0.5)",
          px: 5,
          py: 4.5,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.5fr 1fr 1fr" },
          gap: 5,
          fontSize: 13,
          lineHeight: 1.8,
        }}
      >
        <Box>
          <Typography sx={{ mb: 1.5, color: "rgba(255,255,255,0.5)", fontSize: 13, lineHeight: 1.6 }}>
            Receive updates, new listings, discounts sent straight to your inbox every month
          </Typography>
          <Box sx={{ display: "flex", gap: 0.75 }}>
            <TextField
              size="small"
              placeholder="Email Address"
              sx={{
                flex: 1,
                "& .MuiOutlinedInput-root": {
                  fontSize: 12,
                  color: "#fff",
                  bgcolor: "rgba(255,255,255,0.05)",
                  borderRadius: 1,
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.15)" },
                },
              }}
            />
            <Button
              variant="contained"
              sx={{ bgcolor: tokens.primary, fontSize: 12, fontWeight: 700, borderRadius: 1, px: 2 }}
            >
              Subscribe
            </Button>
          </Box>
        </Box>
        <Box>
          <Typography sx={{ color: tokens.primary, fontSize: 12, fontWeight: 700, mb: 1.25, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Contact
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 13, lineHeight: 1.8 }}>
            Phone: +234 806 9078 636<br />
            Email: reservations@talentsapartments.com<br />
            No 6 NABU street, Agbowo Ibadan Oyo State.
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ color: tokens.primary, fontSize: 12, fontWeight: 700, mb: 1.25, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Links
          </Typography>
          {["Home", "Login", "Rooms", "Features", "Contact Us"].map((link) => (
            <Link key={link} href="#" underline="hover" display="block" sx={{ color: "rgba(255,255,255,0.5)", fontSize: 13, mb: 0.5, "&:hover": { color: "#fff" } }}>
              {link}
            </Link>
          ))}
        </Box>
      </Box>
      <Box sx={{ bgcolor: "#0a1220", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 12, py: 1.5 }}>
        All rights reserved. &copy; {new Date().getFullYear()} Talents Apartments.
      </Box>
    </Box>
  );
}
