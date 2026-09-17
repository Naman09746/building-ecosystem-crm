import { NextRequest } from "next/server";
import crypto from "crypto";
import {
  apiSuccess,
  apiError,
  checkRateLimit,
} from "@repo/core/lib/server/api-security";
import {
  getApiAuthContext,
  getAuthenticatedServerClient,
  getServiceRoleClient,
  isLiveSupabaseAvailable,
} from "@repo/core/lib/server/supabase-server";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

// POST /api/documents/upload - Upload file to private Supabase Storage and register document metadata
export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext();
  if (!auth) {
    return apiError("Authentication required", 401, "UNAUTHORIZED");
  }

  const rateCheck = checkRateLimit(`doc_upload_${auth.userId}`, 20, 60000);
  if (!rateCheck.allowed) {
    return apiError("Rate limit exceeded for document uploads", 429, "RATE_LIMIT_EXCEEDED");
  }

  const supabase = await getAuthenticatedServerClient();
  const serviceClient = getServiceRoleClient();
  if (!supabase || !isLiveSupabaseAvailable || !serviceClient) {
    return apiError("Storage service is unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string) || file?.name || "Untitled Document";
    const type = (formData.get("type") as string) || "brochure";
    const projectId = (formData.get("projectId") as string) || null;
    const leadId = (formData.get("leadId") as string) || null;

    if (!file) {
      return apiError("File is required for document upload", 400, "MISSING_FILE");
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return apiError(
        "Invalid file type. Allowed formats: PDF, PNG, JPEG, WebP",
        415,
        "UNSUPPORTED_MEDIA_TYPE"
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return apiError("File size exceeds 15MB limit", 413, "FILE_TOO_LARGE");
    }

    const docId = crypto.randomUUID();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${auth.orgId}/${docId}/${sanitizedFilename}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Upload to Supabase Storage bucket 'crm-documents'
    const { error: storageErr } = await serviceClient.storage
      .from("crm-documents")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (storageErr) {
      console.error("[STORAGE_UPLOAD_ERROR]", storageErr);
      return apiError("Failed to store file in document vault", 500, "STORAGE_ERROR");
    }

    // 2. Generate a signed URL for immediate viewing (60 minutes validity)
    const { data: signedUrlData } = await serviceClient.storage
      .from("crm-documents")
      .createSignedUrl(storagePath, 3600);

    const fileUrl = signedUrlData?.signedUrl || storagePath;

    // 3. Register document in database
    const { data: documentRow, error: docDbErr } = await supabase
      .from("documents")
      .insert({
        id: docId,
        org_id: auth.orgId,
        project_id: projectId,
        lead_id: leadId,
        title: title.slice(0, 200),
        file_url: fileUrl,
        type: type,
      })
      .select()
      .single();

    if (docDbErr) {
      console.error("[DOC_METADATA_INSERT_ERROR]", docDbErr);
      // Clean up orphaned storage object
      await serviceClient.storage.from("crm-documents").remove([storagePath]);
      return apiError("Failed to save document record", 500, "DB_INSERT_ERROR");
    }

    return apiSuccess(
      {
        id: documentRow.id,
        orgId: documentRow.org_id,
        projectId: documentRow.project_id,
        leadId: documentRow.lead_id,
        title: documentRow.title,
        fileUrl: documentRow.file_url,
        type: documentRow.type,
        createdAt: documentRow.created_at,
      },
      201
    );
  } catch (err) {
    console.error("[DOC_UPLOAD_EXCEPTION]", err);
    return apiError("Failed to process document upload", 500, "SERVER_ERROR");
  }
}
