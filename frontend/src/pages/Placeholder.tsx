import { Box, Typography, Alert } from "@mui/material";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Placeholder() {
  const { t } = useTranslation();
  const location = useLocation();
  const name = location.pathname.split("/").filter(Boolean).pop() ?? "Page";
  const title = name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");

  return (
    <Box>
      <Typography variant="h1" sx={{ mb: 2 }}>
        {title}
      </Typography>
      <Alert severity="info">
        {t("placeholder.laterPhase")}
      </Alert>
    </Box>
  );
}
