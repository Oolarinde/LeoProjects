import { useState } from "react";
import { Select, MenuItem, Snackbar, Alert, Box } from "@mui/material";
import { Business } from "@mui/icons-material";
import { tokens } from "../theme/theme";
import { useAppStore } from "../utils/store";
import { authApi, companyApi } from "../services/api";
import { getErrorMessage } from "../services/api";

export default function CompanySwitcher() {
  const { companies, companyName, switchCompany, setUser, setCompanies, setCompanyGroup } = useAppStore();
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });
  const [switching, setSwitching] = useState(false);

  const effectiveRole = useAppStore((s) => s.user?.effective_role);

  // Only GROUP_ADMIN can see the company switcher
  if (effectiveRole !== "GROUP_ADMIN") return null;
  if (companies.length <= 1) return null;

  const currentCompany = companies.find((c) => c.is_default) ?? companies[0];

  const handleSwitch = async (companyId: string) => {
    if (companyId === currentCompany.id) return;
    const target = companies.find((c) => c.id === companyId);
    if (!target) return;

    if (!window.confirm(`Switch to ${target.name}?`)) return;

    setSwitching(true);
    try {
      const resp = await companyApi.switchCompany(companyId);
      switchCompany(companyId, resp.data, target.name);
      // Reload full profile to get fresh companies list + group context
      try {
        const meResp = await authApi.me();
        const meData = meResp.data;
        setUser(meData);
        if (meData.companies?.length) setCompanies(meData.companies);
        setCompanyGroup(
          meData.company_group_id || null,
          meData.company_group_name || null,
        );
      } catch {
        // Non-fatal — tokens already updated
      }
      setSnackbar({ open: true, message: `Switched to ${target.name}` });
    } catch (err) {
      setSnackbar({ open: true, message: getErrorMessage(err) });
    } finally {
      setSwitching(false);
    }
  };

  return (
    <>
      <Select
        size="small"
        value={currentCompany.id}
        onChange={(e) => handleSwitch(e.target.value as string)}
        disabled={switching}
        renderValue={() => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Business sx={{ fontSize: 13, color: tokens.primary }} />
            {companyName || currentCompany.name}
          </Box>
        )}
        sx={{
          fontSize: 11,
          fontWeight: 600,
          height: 30,
          minWidth: 160,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: tokens.border },
          borderRadius: 2,
        }}
      >
        {companies.map((c) => (
          <MenuItem key={c.id} value={c.id} sx={{ fontSize: 11 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Business sx={{ fontSize: 13, color: c.id === currentCompany.id ? tokens.primary : tokens.muted }} />
              {c.name}
              {c.entity_prefix && (
                <Box
                  component="span"
                  sx={{ fontSize: 9, color: tokens.muted, ml: 0.5 }}
                >
                  ({c.entity_prefix})
                </Box>
              )}
            </Box>
          </MenuItem>
        ))}
      </Select>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar({ open: false, message: "" })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity="success"
          onClose={() => setSnackbar({ open: false, message: "" })}
          sx={{ fontSize: 12 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
