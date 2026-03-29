import { Box, Typography, Alert } from "@mui/material";
import { useLocation } from "react-router-dom";

export default function Placeholder() {
  const location = useLocation();
  const name = location.pathname.split("/").filter(Boolean).pop() ?? "Page";
  const title = name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");

  return (
    <Box>
      <Typography variant="h1" sx={{ mb: 2 }}>
        {title}
      </Typography>
      <Alert severity="info">
        This module will be implemented in a later phase.
      </Alert>
    </Box>
  );
}
