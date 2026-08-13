import { Box } from "@mui/material";
import loadingGif from "../../assets/loading.gif";

export default function LoadingIndicator({ size = 80, sx }) {
  return (
    <Box
      component="img"
      src={loadingGif}
      alt=""
      aria-hidden
      sx={{
        width: size,
        height: size,
        objectFit: "contain",
        ...sx,
      }}
    />
  );
}
