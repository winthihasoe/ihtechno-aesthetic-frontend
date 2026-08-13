import apiClient from "./apiClient";

// ── Forms ─────────────────────────────────────
export const getForms = () => apiClient.get("/forms").then((r) => r.data);

/** Published (active) consent + questionnaire definitions for visit workflows. */
export const getPublishedConsentQuestionnaireForms = async () => {
  const forms = await getForms();
  return (forms || []).filter(
    (f) =>
      f.is_active &&
      (f.form_type === "questionnaire" || f.form_type === "consent"),
  );
};

export const getFormByCode = async (code) => {
  const forms = await getForms();
  return forms.find((form) => form.code === code) ?? null;
};

export const getForm = (id) =>
  apiClient.get(`/forms/${id}`).then((r) => r.data); // { form, fields }

export const getFormVersion = (formId, versionId) =>
  apiClient.get(`/forms/${formId}`, { params: { version_id: versionId } }).then((r) => r.data);

export const createForm = (data) =>
  apiClient.post("/forms", data).then((r) => r.data);

export const updateForm = (id, data) =>
  apiClient.put(`/forms/${id}`, data).then((r) => r.data);

export const createOrGetDraftVersion = (formId) =>
  apiClient.post(`/forms/${formId}/draft`).then((r) => r.data);

export const updateFormVersion = (versionId, data) =>
  apiClient.put(`/form-versions/${versionId}`, data).then((r) => r.data);

export const publishFormVersion = (versionId) =>
  apiClient.post(`/form-versions/${versionId}/publish`).then((r) => r.data);

export const deleteForm = (id) =>
  apiClient.delete(`/forms/${id}`).then((r) => r.data);

// ── Fields ────────────────────────────────────
export const createField = (formId, data) =>
  apiClient.post(`/forms/${formId}/fields`, data).then((r) => r.data);

export const updateField = (formId, fieldId, data) =>
  apiClient.put(`/forms/${formId}/fields/${fieldId}`, data).then((r) => r.data);

export const deleteField = (formId, fieldId) =>
  apiClient.delete(`/forms/${formId}/fields/${fieldId}`).then((r) => r.data);

export const reorderFields = (formId, orderedIds) =>
  apiClient
    .post(`/forms/${formId}/fields/reorder`, { ordered_ids: orderedIds })
    .then((r) => r.data);

// ── Responses ─────────────────────────────────
export const getResponses = (formId) =>
  apiClient.get(`/forms/${formId}/responses`).then((r) => r.data);

export const submitResponse = (formId, payload) =>
  apiClient.post(`/forms/${formId}/submit`, payload).then((r) => r.data);

export const updateResponse = (responseId, payload) =>
  apiClient.put(`/form-responses/${responseId}`, payload).then((r) => r.data);

export const deleteResponse = (responseId) =>
  apiClient.delete(`/form-responses/${responseId}`).then((r) => r.data);

export const getLatestVisitFormResponses = async (
  visitId,
  { formTypes = ["questionnaire", "consent"] } = {},
) => {
  if (!visitId) return [];
  const forms = await getForms();
  const scopedForms = (forms || []).filter(
    (f) => f.is_active && formTypes.includes(f.form_type),
  );
  const rows = await Promise.all(
    scopedForms.map(async (form) => {
      const responses = await getResponses(form.id).catch(() => []);
      const visitMatches = (responses || [])
        .filter((r) => String(r?.visit_id ?? "") === String(visitId))
        .sort(
          (a, b) =>
            new Date(b?.updated_at ?? b?.created_at ?? 0).getTime() -
            new Date(a?.updated_at ?? a?.created_at ?? 0).getTime(),
        );
      if (!visitMatches.length) return null;
      return {
        ...visitMatches[0],
        form_id: form.id,
        form_name: form.name,
        form_type: form.form_type,
      };
    }),
  );
  return rows.filter(Boolean);
};

/**
 * Latest response per procedure form linked to a treatment template, scoped to one visit + treatment session.
 * @param {number|string} visitId
 * @param {number|string} treatmentId
 * @param {Array<{ form_definition_id: number, is_required?: boolean, form_definition?: { name?: string, form_type?: string } }>} requiredFormLinks
 */
export const getProcedureFormRowsForSession = async (visitId, treatmentId, requiredFormLinks) => {
  if (!visitId || !treatmentId || !requiredFormLinks?.length) return [];
  const procedureLinks = requiredFormLinks.filter(
    (l) => l.form_definition?.form_type === "procedure",
  );
  const rows = await Promise.all(
    procedureLinks.map(async (link) => {
      const formId = link.form_definition_id;
      const responses = await getResponses(formId).catch(() => []);
      const matches = (responses || [])
        .filter(
          (r) =>
            String(r?.visit_id ?? "") === String(visitId) &&
            String(r?.treatment_id ?? "") === String(treatmentId),
        )
        .sort(
          (a, b) =>
            new Date(b?.updated_at ?? b?.created_at ?? 0).getTime() -
            new Date(a?.updated_at ?? a?.created_at ?? 0).getTime(),
        );
      const latest = matches[0];
      const submitterId =
        latest?.submitted_by && typeof latest.submitted_by === "object"
          ? latest.submitted_by.id
          : latest?.submitted_by;
      return {
        ...(latest || { id: null, data: {}, submitted_by: null }),
        submitted_by: submitterId ?? latest?.submitted_by,
        form_id: formId,
        form_name: link.form_definition?.name ?? "Procedure form",
        form_type: "procedure",
        is_required: Boolean(link.is_required),
      };
    }),
  );
  return rows;
};
