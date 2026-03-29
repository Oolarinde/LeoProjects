import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Card, TextField, Typography, Alert } from "@mui/material";
import { authApi } from "../services/api";
import { useAppStore } from "../utils/store";
import { tokens } from "../theme/theme";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: tokens.bg,
      }}
    >
      <Card sx={{ p: 4, maxWidth: 420, width: "100%", borderRadius: 3 }}>
        {/* Logo */}
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <img src="/ta-logo.webp" alt="Talents Apartment" style={{ height: 48, objectFit: "contain" }} />
          <Typography sx={{ fontSize: 12, color: tokens.muted, mt: 1 }}>
            Accounting Information System
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleLogin}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
            required
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 3 }}
            required
          />
          <Button
            fullWidth
            variant="contained"
            type="submit"
            disabled={loading}
            size="large"
            sx={{
              background: tokens.gradPrimary,
              py: 1.25,
              fontSize: 14,
              fontWeight: 700,
              "&:hover": { background: tokens.gradPrimary, opacity: 0.9 },
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </Card>
    </Box>
  );
}
