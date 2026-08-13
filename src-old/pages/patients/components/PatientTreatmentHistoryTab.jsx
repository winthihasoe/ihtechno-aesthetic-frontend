import dayjs from "dayjs";
import {
  Box,
  Card,
  Chip,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import VisitReferenceHeader from "./VisitReferenceHeader";
import {
  DIAGRAM_OPTION_BY_KEY,
  resolveDefaultDiagramKeyByGender,
} from "../../../utils/diagramProfiles";
import {
  ANNOTATION_TYPES,
  MAP_TOOLS,
  extractLabelAndNote,
  resolveAnnotationType,
  resolvePathStyle,
} from "../../../utils/diagramAnnotations";
import TreatmentDiagramCanvas from "../../../components/LiveBoard/TreatmentDiagramCanvas";
import PatientTabEmptyState from "./PatientTabEmptyState";

function procedureFormTitle(response) {
  const def = response.form?.definition;
  return (
    def?.name ||
    response.form?.name ||
    response.form_definition?.name ||
    "Procedure record"
  );
}

function normalizeTreatmentFormResponses(treatment) {
  const raw = treatment.form_responses ?? treatment.formResponses ?? [];
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return [...raw].sort(
    (a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf(),
  );
}

function buildPointNumberById(points) {
  const seq = new Map();
  [...points]
    .filter((point) => resolveAnnotationType(point) === ANNOTATION_TYPES.POINT)
    .sort((a, b) => Number(a.id) - Number(b.id))
    .forEach((point, index) => {
      seq.set(Number(point.id), index + 1);
    });
  return seq;
}

function annotationListPrefix(point, pointNumberById) {
  const type = resolveAnnotationType(point);
  if (type === ANNOTATION_TYPES.PATH) {
    return resolvePathStyle(point) === MAP_TOOLS.SUTURE ? "Suture" : "Incision";
  }
  if (type === ANNOTATION_TYPES.TEXT) {
    return "Text";
  }
  return `#${pointNumberById.get(Number(point.id)) || "?"}`;
}

function formatPointClinicalDetails(point) {
  const chunks = [];
  const productName =
    point?.product?.name ||
    (point?.product_id ? `Product #${point.product_id}` : "");
  if (productName) chunks.push(`Product: ${productName}`);
  if (point?.unit) chunks.push(`Dosage/Unit: ${point.unit}`);
  return chunks.join(" · ");
}

export default function PatientTreatmentHistoryTab({ visits }) {
  const sortedVisits = [...(visits ?? [])].sort((a, b) => {
    const ta = dayjs(a.visit_time ?? a.created_at).valueOf();
    const tb = dayjs(b.visit_time ?? b.created_at).valueOf();
    return tb - ta;
  });

  const blocks = sortedVisits.flatMap((visit) =>
    (visit.treatments ?? []).map((treatment) => ({ visit, treatment })),
  );

  if (!blocks.length) {
    return (
      <PatientTabEmptyState
        title="No treatment history recorded yet"
        description="Treatment procedures, products, dosage, mapped points, and approvals will appear here after consultation or treatment-room documentation."
        steps={[
          "Open Consultation tab and complete diagnosis/treatment plan.",
          "Create treatment entry from visit workflow.",
          "Add procedure items and product usage, then save.",
        ]}
        previewFields={["Procedure", "Product", "Dosage", "Area", "Approval status"]}
      />
    );
  }

  return (
    <Stack spacing={2}>
      {blocks.map(({ visit, treatment }) => {
        const items = treatment.items ?? treatment.treatment_items ?? [];
        const sessionProducts =
          treatment.session_products ?? treatment.sessionProducts ?? [];
        const committedProducts =
          treatment.patient_treatment_products ??
          treatment.patientTreatmentProducts ??
          [];
        const procedureForms = normalizeTreatmentFormResponses(treatment);
        const mapPoints = Array.isArray(
          treatment.map_points ?? treatment.mapPoints,
        )
          ? (treatment.map_points ?? treatment.mapPoints)
          : [];
        const approvals = Array.isArray(treatment.approvals)
          ? treatment.approvals
          : [];
        const latestApproval = [...approvals].sort((a, b) => {
          const ta = dayjs(a.reviewed_at ?? a.created_at).valueOf();
          const tb = dayjs(b.reviewed_at ?? b.created_at).valueOf();
          return tb - ta;
        })[0];
        const pointsByPhoto = mapPoints.reduce((acc, point) => {
          const diagramKey =
            point.diagram_key ||
            resolveDefaultDiagramKeyByGender(visit?.patient?.gender);
          const key =
            point.photo_id != null
              ? `photo:${point.photo_id}`
              : `diagram:${diagramKey}`;
          acc[key] = [...(acc[key] || []), point];
          return acc;
        }, {});
        const pointPhotos = Object.entries(pointsByPhoto)
          .filter(([key]) => !key.startsWith("diagram:"))
          .map(([key, points]) => {
            const p = points[0];
            const photo = p?.photo;
            return { key, points, photo };
          })
          .filter((row) => row.photo?.url);
        const diagramGroups = Object.entries(pointsByPhoto)
          .filter(([key]) => key.startsWith("diagram:"))
          .map(([key, points]) => ({
            key,
            points,
            diagramKey: key.replace("diagram:", ""),
          }));
        const performedBy =
          treatment.therapist?.name?.trim() ||
          treatment.performed_by_user?.name?.trim() ||
          null;
        const treatmentDate = treatment.treatment_date
          ? dayjs(treatment.treatment_date).format("D MMM YYYY")
          : null;

        return (
          <Card
            key={`${visit.id}-${treatment.id}`}
            variant="outlined"
            sx={{ p: 2 }}
          >
            <VisitReferenceHeader visit={visit} sx={{ mb: 1 }} />
            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
              {treatment.name || "Treatment"}
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              sx={{ mb: 1 }}
            >
              {treatmentDate && (
                <Typography variant="caption" color="text.secondary">
                  Performed: {treatmentDate}
                </Typography>
              )}
              {performedBy && (
                <Typography variant="caption" color="text.secondary">
                  By: {performedBy}
                </Typography>
              )}
            </Stack>
            {treatment.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1, whiteSpace: "pre-wrap" }}
              >
                {treatment.description}
              </Typography>
            )}
            {treatment.notes && (
              <Typography
                variant="body2"
                sx={{ mb: 1, whiteSpace: "pre-wrap" }}
              >
                {treatment.notes}
              </Typography>
            )}

            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              sx={{ mb: 1 }}
            >
              <Chip
                size="small"
                color={
                  treatment.approval_status === "approved"
                    ? "success"
                    : treatment.approval_status === "rejected"
                      ? "error"
                      : "warning"
                }
                label={
                  treatment.approval_status === "approved"
                    ? "Approved"
                    : treatment.approval_status === "rejected"
                      ? "Rejected"
                      : "Pending approval"
                }
              />
              {latestApproval?.reviewer?.name && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ alignSelf: "center" }}
                >
                  Reviewed by: {latestApproval.reviewer.name}
                  {latestApproval.reviewed_at
                    ? ` · ${dayjs(latestApproval.reviewed_at).format("D MMM YYYY, HH:mm")}`
                    : ""}
                </Typography>
              )}
            </Stack>
            {latestApproval?.comment && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Approval note: {latestApproval.comment}
              </Typography>
            )}

            {pointPhotos.length > 0 && (
              <Box sx={{ mb: 1.5 }}>
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  sx={{ mb: 0.75 }}
                >
                  Anatomical mapping photos
                </Typography>
                <Stack spacing={1.25}>
                  {pointPhotos.map(({ key, points, photo }) => {
                    const pointNumberById = buildPointNumberById(points);
                    return (
                    <Box
                      key={key}
                      sx={{
                        border: 1,
                        borderColor: "divider",
                        borderRadius: 1,
                        p: 1,
                      }}
                    >
                      <Box sx={{ maxWidth: 360, mb: 0.75 }}>
                        <TreatmentDiagramCanvas
                          imageUrl={photo.url}
                          imageAlt={`treatment-map-${photo.id}`}
                          editable={false}
                          annotations={points}
                          pointNumberById={pointNumberById}
                        />
                      </Box>
                      <Stack spacing={0.5}>
                        {points.map((point) => {
                          const parsed = extractLabelAndNote(point.note);
                          const clinical = formatPointClinicalDetails(point);
                          const prefix = annotationListPrefix(
                            point,
                            pointNumberById,
                          );
                          return (
                            <Box key={point.id}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {prefix}{" "}
                                {parsed.label ? `[${parsed.label}] ` : ""}
                                {resolveAnnotationType(point) ===
                                ANNOTATION_TYPES.TEXT
                                  ? point.geometry?.text ||
                                    parsed.note ||
                                    "Text label"
                                  : parsed.note || "Treatment annotation"}
                              </Typography>
                              {clinical && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ display: "block" }}
                                >
                                  {clinical}
                                </Typography>
                              )}
                            </Box>
                          );
                        })}
                      </Stack>
                    </Box>
                    );
                  })}
                </Stack>
              </Box>
            )}

            {diagramGroups.length > 0 && (
              <Box sx={{ mb: 1.5 }}>
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  sx={{ mb: 0.5 }}
                >
                  Diagram annotations
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                  {diagramGroups.map((group) => {
                    const diagram = DIAGRAM_OPTION_BY_KEY[group.diagramKey];
                    const pointNumberById = buildPointNumberById(group.points);
                    return (
                      <Box
                        key={group.key}
                        sx={{
                          border: 1,
                          borderColor: "divider",
                          borderRadius: 1,
                          p: 1,
                        }}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mb: 0.5 }}
                        >
                          {diagram?.label || "Face diagram"}
                        </Typography>
                        {diagram?.src && (
                          <Box sx={{ maxWidth: 360, mb: 0.75 }}>
                            <TreatmentDiagramCanvas
                              imageUrl={diagram.src}
                              imageAlt={diagram.label || "diagram"}
                              editable={false}
                              annotations={group.points}
                              pointNumberById={pointNumberById}
                            />
                          </Box>
                        )}
                        <Stack spacing={0.4}>
                          {group.points.map((point) => {
                            const parsed = extractLabelAndNote(point.note);
                            const clinical = formatPointClinicalDetails(point);
                            const prefix = annotationListPrefix(
                              point,
                              pointNumberById,
                            );
                            return (
                              <Box key={point.id}>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {prefix}{" "}
                                  {parsed.label ? `[${parsed.label}] ` : ""}
                                  {resolveAnnotationType(point) ===
                                  ANNOTATION_TYPES.TEXT
                                    ? point.geometry?.text ||
                                      parsed.note ||
                                      "Text label"
                                    : parsed.note || "Treatment annotation"}
                                </Typography>
                                {clinical && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: "block" }}
                                  >
                                    {clinical}
                                  </Typography>
                                )}
                              </Box>
                            );
                          })}
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            )}

            {(committedProducts.length > 0 || sessionProducts.length > 0) && (
              <Box sx={{ mt: 1.25 }}>
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  sx={{ mb: 0.5 }}
                >
                  Product usage
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Qty used</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Unit</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Batch</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Source</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {committedProducts.map((line) => (
                      <TableRow key={`committed-${line.id}`}>
                        <TableCell>{line.product?.name || "—"}</TableCell>
                        <TableCell>{line.quantity_used ?? "—"}</TableCell>
                        <TableCell>{line.product?.unit || "—"}</TableCell>
                        <TableCell>
                          {line.batch?.batch_number || line.batch_id || "—"}
                        </TableCell>
                        <TableCell>Committed</TableCell>
                      </TableRow>
                    ))}
                    {committedProducts.length === 0 &&
                      sessionProducts.map((line) => (
                        <TableRow key={`session-${line.id}`}>
                          <TableCell>{line.product?.name || "—"}</TableCell>
                          <TableCell>{line.quantity ?? "—"}</TableCell>
                          <TableCell>{line.product?.unit || "—"}</TableCell>
                          <TableCell>—</TableCell>
                          <TableCell>Session draft</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </Box>
            )}

            {items.length > 0 ? (
              <Table size="small" sx={{ mt: 1 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Procedure</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Dosage</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Unit</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Area</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.procedure_name || "—"}</TableCell>
                      <TableCell>{item.product_name || "—"}</TableCell>
                      <TableCell>{item.dosage || "—"}</TableCell>
                      <TableCell>{item.unit || "—"}</TableCell>
                      <TableCell>{item.treatment_area || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No procedure line items recorded for this treatment.
              </Typography>
            )}

            {procedureForms.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                  Procedure forms
                </Typography>
                <Stack spacing={1.25}>
                  {procedureForms.map((response) => {
                    const submitter =
                      response.submitted_by?.name ??
                      response.submittedBy?.name ??
                      "Unknown";
                    return (
                      <Box
                        key={response.id}
                        sx={{
                          borderRadius: 1,
                          border: 1,
                          borderColor: "divider",
                          p: 1.25,
                          bgcolor: "action.hover",
                        }}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          {procedureFormTitle(response)}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block" }}
                        >
                          Submitted by {submitter}
                          {response.created_at
                            ? ` on ${dayjs(response.created_at).format("D MMM YYYY, HH:mm")}`
                            : ""}
                        </Typography>
                        <Stack spacing={0.75} sx={{ mt: 1 }}>
                          {Object.entries(response.data ?? {}).map(
                            ([key, value]) => (
                              <Box key={key}>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{
                                    fontWeight: 600,
                                    textTransform: "capitalize",
                                  }}
                                >
                                  {key.replace(/_/g, " ")}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{ whiteSpace: "pre-wrap" }}
                                >
                                  {Array.isArray(value)
                                    ? value.join(", ") || "—"
                                    : (value ?? "—")}
                                </Typography>
                              </Box>
                            ),
                          )}
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            )}

            <Divider sx={{ mt: 2 }} />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: "block" }}
            >
              Visit #{visit.id}
            </Typography>
          </Card>
        );
      })}
    </Stack>
  );
}
