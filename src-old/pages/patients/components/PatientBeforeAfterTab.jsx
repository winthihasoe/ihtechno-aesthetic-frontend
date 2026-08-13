import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import UploadIcon from "@mui/icons-material/Upload";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Slider,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../../../components/common/LoadingIndicator";
import VisitReferenceHeader from "./VisitReferenceHeader";
import {
  createPhotoAnnotation,
  getPhotoAnnotations,
} from "../../../services/photoService";
import PatientTabEmptyState from "./PatientTabEmptyState";

export default function PatientBeforeAfterTab({
  visits,
  canManagePatient,
  uploadingVisitId,
  uploadingType,
  handleUploadPhoto,
  loadingPhotos,
  photosByVisit,
  handleDeletePhoto,
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(45);
  const [annotationByPhotoId, setAnnotationByPhotoId] = useState({});
  const [annotationDraftByPhotoId, setAnnotationDraftByPhotoId] = useState({});
  const [annotationError, setAnnotationError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraVisitId, setCameraVisitId] = useState("");
  const [cameraType, setCameraType] = useState("before");
  const [cameraOverlaySrc, setCameraOverlaySrc] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [cameraOverlayOpacity, setCameraOverlayOpacity] = useState(45);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const allPhotos = useMemo(
    () =>
      (visits ?? []).flatMap((visit) => {
        const vid = String(visit.id);
        const photos = photosByVisit[vid] ?? visit.photos ?? [];
        return photos.map((photo) => ({ ...photo, _visitId: vid }));
      }),
    [visits, photosByVisit],
  );

  useEffect(() => {
    let active = true;
    const targetPhotos = allPhotos.slice(0, 20);
    Promise.all(
      targetPhotos.map(async (photo) => {
        try {
          const annotations = await getPhotoAnnotations(photo.id);
          return [photo.id, annotations];
        } catch {
          return [photo.id, []];
        }
      }),
    ).then((pairs) => {
      if (!active) return;
      setAnnotationByPhotoId(Object.fromEntries(pairs));
    });
    return () => {
      active = false;
    };
  }, [allPhotos]);

  useEffect(() => {
    if (!cameraOpen) return;
    let active = true;
    (async () => {
      try {
        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error("Camera is not supported on this browser.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraError("");
      } catch (err) {
        setCameraError(err?.message || "Could not access camera.");
      }
    })();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [cameraOpen]);

  const openCameraCapture = (visitId, type, photos) => {
    const latestSameType = [...(photos ?? [])]
      .filter((photo) => photo.type === type)
      .sort((a, b) => {
        const ta = dayjs(a.taken_at ?? a.created_at).valueOf();
        const tb = dayjs(b.taken_at ?? b.created_at).valueOf();
        return tb - ta;
      })[0];
    setCameraVisitId(String(visitId));
    setCameraType(type);
    setCameraOverlaySrc(latestSameType?.url ?? "");
    setCameraOverlayOpacity(45);
    setCameraError("");
    setCameraOpen(true);
  };

  const handleCaptureAndUpload = async () => {
    if (!videoRef.current || !cameraVisitId) return;
    setCapturing(true);
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not prepare camera capture.");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error("Capture failed."));
        }, "image/jpeg", 0.92);
      });
      const capturedFile = new File(
        [blob],
        `emr-${cameraType}-${Date.now()}.jpg`,
        { type: "image/jpeg" },
      );
      await handleUploadPhoto(cameraVisitId, capturedFile, cameraType);
      setCameraOpen(false);
    } catch (err) {
      setCameraError(err?.message || "Could not capture photo.");
    } finally {
      setCapturing(false);
    }
  };

  if (!visits?.length) {
    return (
      <PatientTabEmptyState
        title="No visits available for photo tracking"
        description="Before/after documentation is organized by visit. Once visits exist, upload or capture progress photos here."
        steps={[
          "Create a visit by checking in the patient.",
          "Upload or capture Before and After photos.",
          "Select two images to compare with the overlay viewer.",
        ]}
        previewFields={["Before photo", "After photo", "Annotations", "Compare viewer"]}
      />
    );
  }

  const sorted = [...visits].sort((a, b) => {
    const ta = dayjs(a.visit_time ?? a.created_at).valueOf();
    const tb = dayjs(b.visit_time ?? b.created_at).valueOf();
    return tb - ta;
  });

  return (
    <Stack spacing={3}>
      {loadingPhotos && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
          <LoadingIndicator size={24} />
        </Box>
      )}
      {sorted.map((visit) => {
        const vid = String(visit.id);
        const photos = photosByVisit[vid] ?? visit.photos ?? [];

        return (
          <Card key={visit.id} variant="outlined" sx={{ p: 2 }}>
            <VisitReferenceHeader visit={visit} sx={{ mb: 1.5 }} />
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>
              Visit #{visit.id}
            </Typography>

            <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              <Button
                component="label"
                variant="outlined"
                size="small"
                startIcon={<UploadIcon />}
                disabled={
                  !canManagePatient ||
                  uploadingVisitId === vid ||
                  uploadingType === "before"
                }
              >
                {uploadingVisitId === vid && uploadingType === "before"
                  ? "Uploading..."
                  : "Upload Before"}
                <input
                  type="file"
                  accept="image/*,image/heic,image/heif,.heic,.heif"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    handleUploadPhoto(vid, file, "before");
                  }}
                />
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<CameraAltIcon />}
                disabled={
                  !canManagePatient ||
                  uploadingVisitId === vid ||
                  uploadingType === "before"
                }
                onClick={() => openCameraCapture(vid, "before", photos)}
              >
                Capture Before
              </Button>
              <Button
                component="label"
                variant="outlined"
                size="small"
                startIcon={<UploadIcon />}
                disabled={
                  !canManagePatient ||
                  uploadingVisitId === vid ||
                  uploadingType === "after"
                }
              >
                {uploadingVisitId === vid && uploadingType === "after"
                  ? "Uploading..."
                  : "Upload After"}
                <input
                  type="file"
                  accept="image/*,image/heic,image/heif,.heic,.heif"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    handleUploadPhoto(vid, file, "after");
                  }}
                />
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<CameraAltIcon />}
                disabled={
                  !canManagePatient ||
                  uploadingVisitId === vid ||
                  uploadingType === "after"
                }
                onClick={() => openCameraCapture(vid, "after", photos)}
              >
                Capture After
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.25 }}>
              Select two photos to compare (side-by-side + ghost overlay slider).
            </Typography>

            {photos.length === 0 ? (
              <PatientTabEmptyState
                title={`No photos yet for Visit #${visit.id}`}
                description="Capture standardized before/after images to track treatment outcomes."
                steps={[
                  "Use Upload or Capture buttons above.",
                  "Add short annotation notes if needed.",
                  "Use Compare to review progress between two photos.",
                ]}
                previewFields={["Photo type", "Taken at", "Annotation", "Comparison"]}
              />
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gap: 1.25,
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "1fr 1fr",
                    md: "1fr 1fr 1fr",
                  },
                }}
              >
                {photos.map((photo) => (
                  <Card key={photo.id} variant="outlined" sx={{ p: 1.25 }}>
                    <Box
                      component="img"
                      src={photo.url}
                      alt={`${photo.type} photo`}
                      sx={{
                        width: "100%",
                        height: 160,
                        objectFit: "cover",
                        mb: 1,
                      }}
                    />
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack spacing={0.2}>
                        <Button
                          size="small"
                          variant={selectedIds.includes(photo.id) ? "contained" : "text"}
                          onClick={() =>
                            setSelectedIds((prev) => {
                              if (prev.includes(photo.id)) return prev.filter((id) => id !== photo.id);
                              if (prev.length >= 2) return [prev[1], photo.id];
                              return [...prev, photo.id];
                            })
                          }
                          sx={{ minWidth: 0, px: 1, width: "fit-content" }}
                        >
                          {selectedIds.includes(photo.id) ? "Selected" : "Compare"}
                        </Button>
                        <Chip
                          label={photo.type === "before" ? "Before" : "After"}
                          size="small"
                          sx={{ width: "fit-content", textTransform: "capitalize" }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {photo.taken_at
                            ? dayjs(photo.taken_at).format("D MMM YYYY, HH:mm")
                            : "-"}
                        </Typography>
                        <TextField
                          size="small"
                          placeholder="Annotation note (e.g. injection zone)"
                          value={annotationDraftByPhotoId[photo.id] ?? ""}
                          onChange={(e) =>
                            setAnnotationDraftByPhotoId((prev) => ({
                              ...prev,
                              [photo.id]: e.target.value,
                            }))
                          }
                          sx={{ mt: 0.5 }}
                        />
                        <Button
                          size="small"
                          onClick={async () => {
                            const draft = (annotationDraftByPhotoId[photo.id] ?? "").trim();
                            if (!draft) return;
                            try {
                              const created = await createPhotoAnnotation(photo.id, {
                                type: "text",
                                text: draft,
                              });
                              setAnnotationByPhotoId((prev) => ({
                                ...prev,
                                [photo.id]: [created, ...(prev[photo.id] ?? [])],
                              }));
                              setAnnotationDraftByPhotoId((prev) => ({ ...prev, [photo.id]: "" }));
                              setAnnotationError("");
                            } catch {
                              setAnnotationError("Could not save annotation.");
                            }
                          }}
                        >
                          Save annotation
                        </Button>
                        {(annotationByPhotoId[photo.id] ?? []).slice(0, 1).map((a) => (
                          <Typography key={a.id} variant="caption" color="text.secondary">
                            Last note: {a.annotation_data?.text ?? "—"}
                          </Typography>
                        ))}
                      </Stack>
                      <Tooltip title="Delete photo">
                        <IconButton
                          size="small"
                          color="error"
                          disabled={!canManagePatient}
                          onClick={() => handleDeletePhoto(vid, photo)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Card>
                ))}
              </Box>
            )}
          </Card>
        );
      })}
      {selectedIds.length === 2 && (
        <Button variant="contained" onClick={() => setCompareOpen(true)} sx={{ alignSelf: "flex-start" }}>
          Open compare viewer
        </Button>
      )}
      {annotationError && <Alert severity="error">{annotationError}</Alert>}
      <Dialog open={compareOpen} onClose={() => setCompareOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Before / After Comparison</DialogTitle>
        <DialogContent>
          {(() => {
            const selected = allPhotos.filter((p) => selectedIds.includes(p.id));
            if (selected.length !== 2) return <Typography variant="body2">Select two photos.</Typography>;
            const [a, b] = selected;
            return (
              <Stack spacing={2}>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                  <Box component="img" src={a.url} alt="compare-left" sx={{ width: "100%", borderRadius: 1 }} />
                  <Box component="img" src={b.url} alt="compare-right" sx={{ width: "100%", borderRadius: 1 }} />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Ghost overlay opacity
                </Typography>
                <Slider
                  value={overlayOpacity}
                  min={0}
                  max={100}
                  onChange={(_, value) => setOverlayOpacity(Number(value))}
                />
                <Box sx={{ position: "relative", borderRadius: 1, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
                  <Box component="img" src={a.url} alt="base-photo" sx={{ width: "100%", display: "block" }} />
                  <Box
                    component="img"
                    src={b.url}
                    alt="overlay-photo"
                    sx={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      opacity: overlayOpacity / 100,
                    }}
                  />
                </Box>
              </Stack>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompareOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Capture {cameraType === "before" ? "Before" : "After"} photo
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            {cameraError && <Alert severity="error">{cameraError}</Alert>}
            <Box
              sx={{
                position: "relative",
                borderRadius: 1,
                overflow: "hidden",
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "black",
              }}
            >
              <Box
                component="video"
                ref={videoRef}
                autoPlay
                muted
                playsInline
                sx={{ width: "100%", display: "block" }}
              />
              {cameraOverlaySrc ? (
                <Box
                  component="img"
                  src={cameraOverlaySrc}
                  alt="ghost-guideline-overlay"
                  sx={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: cameraOverlayOpacity / 100,
                    pointerEvents: "none",
                  }}
                />
              ) : null}
            </Box>
            <Typography variant="caption" color="text.secondary">
              Guideline opacity
            </Typography>
            <Slider
              value={cameraOverlayOpacity}
              min={0}
              max={100}
              onChange={(_, value) => setCameraOverlayOpacity(Number(value))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCameraOpen(false)} disabled={capturing}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCaptureAndUpload}
            disabled={capturing}
          >
            {capturing ? "Capturing..." : "Capture & Upload"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
