import apiClient from "./apiClient";
import { prepareVisitPhotoForUpload } from "../utils/compressVisitPhoto";

export const getPhotos = async (visitId) => {
  const { data } = await apiClient.get(`/visits/${visitId}/photos`);
  return data;
};

export const uploadPhoto = async (visitId, file, type, stage, meta = {}) => {
  const prepared = await prepareVisitPhotoForUpload(file);
  const formData = new FormData();
  formData.append("photo", prepared);
  formData.append("type", type); // before | after
  formData.append("stage", stage); // consultation | preparation | treatment
  formData.append("body_area", meta.body_area ?? "face");
  if (meta.side) {
    formData.append("side", meta.side);
  }
  const { data } = await apiClient.post(`/visits/${visitId}/photos`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const deletePhoto = async (photoId) => {
  const { data } = await apiClient.delete(`/photos/${photoId}`);
  return data;
};

export const getPhotoAnnotations = async (photoId) => {
  const { data } = await apiClient.get(`/photos/${photoId}/annotations`);
  return Array.isArray(data) ? data : [];
};

export const createPhotoAnnotation = async (photoId, annotationData) => {
  const { data } = await apiClient.post(`/photos/${photoId}/annotations`, {
    annotation_data: annotationData,
  });
  return data;
};
