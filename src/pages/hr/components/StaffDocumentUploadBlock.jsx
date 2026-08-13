import { useRef } from "react";
import {
  Box,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import UploadIcon from "@mui/icons-material/Upload";
import { DOCUMENT_TYPE_CONFIG } from "./staffProfileFormConstants";
import StaffDocumentPreviewCard from "./StaffDocumentPreviewCard";

export default function StaffDocumentUploadBlock({
  documents = [],
  onUpload,
  onDelete,
  uploadingType = null,
}) {
  const inputRefs = useRef({});

  const docsByType = documents.reduce((acc, doc) => {
    if (!acc[doc.document_type]) acc[doc.document_type] = [];
    acc[doc.document_type].push(doc);
    return acc;
  }, {});

  const handleFileChange = async (documentType, event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    for (const file of files) {
      await onUpload(documentType, file);
    }
  };

  return (
    <Stack spacing={2}>
      {Object.entries(DOCUMENT_TYPE_CONFIG).map(([type, config]) => {
        const typeDocs = docsByType[type] || [];
        const isUploading = uploadingType === type;

        return (
          <Box
            key={type}
            sx={{
              p: 1.5,
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            <Stack spacing={1.5}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                spacing={1}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {config.label}
                </Typography>
                <Button
                  component="label"
                  size="small"
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  disabled={isUploading || (!config.multiple && typeDocs.length > 0)}
                >
                  {isUploading ? "Uploading…" : "Upload"}
                  <input
                    ref={(el) => {
                      inputRefs.current[type] = el;
                    }}
                    hidden
                    type="file"
                    accept={config.accept}
                    multiple={config.multiple}
                    onChange={(e) => handleFileChange(type, e)}
                  />
                </Button>
              </Stack>

              {typeDocs.length > 0 ? (
                <Stack direction="row" flexWrap="wrap" gap={1.5}>
                  {typeDocs.map((doc) => (
                    <StaffDocumentPreviewCard
                      key={doc.id}
                      doc={doc}
                      label={config.label}
                      onRemove={() => onDelete(doc)}
                    />
                  ))}
                </Stack>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  No file uploaded
                </Typography>
              )}
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}
