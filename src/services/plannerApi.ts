import type { FileUploadResponse, JsonObject, PlannerDataResponse, SavePlannerDataResponse } from '@/types';
import { apiFetch, apiRequest } from './api';

export const fetchPlannerData = () => apiRequest<PlannerDataResponse>('/api/data');

export const savePlannerData = (data: JsonObject) =>
  apiRequest<SavePlannerDataResponse>('/api/data', { method: 'PUT', body: { data } });

/** Uploads a PDF/image `data:` URL to GridFS (deduplicated per user by SHA-256). */
export const uploadFile = (data: string, name: string) =>
  apiRequest<FileUploadResponse>('/api/files', { method: 'POST', body: { data, name } });

export async function downloadFile(id: string): Promise<Blob> {
  const response = await apiFetch(`/api/files/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error('تعذر تنزيل ملف مرفق من السحابة');
  return response.blob();
}
