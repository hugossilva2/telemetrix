import { supabase } from "@/integrations/supabase/client";

export const DOCS_BUCKET = "vehicle-docs";

export async function uploadDocFile(file: File, folder: string): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Sessão expirada");
  const ext = file.name.split(".").pop() || "bin";
  const path = `${uid}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from(DOCS_BUCKET)
    .upload(path, file, { contentType: file.type || "application/octet-stream" });
  if (error) throw error;
  return path;
}

export async function openDocFile(path: string) {
  const { data, error } = await supabase.storage
    .from(DOCS_BUCKET)
    .createSignedUrl(path, 60 * 5);
  if (error) throw error;
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}
