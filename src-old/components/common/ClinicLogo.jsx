import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import {
  DEFAULT_LOGO_URL,
  getClinicLogoUrl,
} from "../../utils/clinicBranding";
import useSettingsStore from "../../stores/settingsStore";

export default function ClinicLogo({ alt, src: srcOverride, sx, ...props }) {
  const { settings } = useSettingsStore();
  const resolved =
    typeof srcOverride === "string" && srcOverride.trim()
      ? srcOverride.trim()
      : getClinicLogoUrl(settings);
  const [src, setSrc] = useState(resolved);

  useEffect(() => {
    setSrc(resolved);
  }, [resolved]);

  const handleError = () => {
    if (src !== DEFAULT_LOGO_URL) {
      setSrc(DEFAULT_LOGO_URL);
    }
  };

  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      onError={handleError}
      sx={sx}
      {...props}
    />
  );
}
