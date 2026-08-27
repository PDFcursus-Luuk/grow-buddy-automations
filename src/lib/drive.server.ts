import { driveFetch, driveJson } from "./connector-gateway.server";

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  version?: string;
};

const DOC_MIME = "application/vnd.google-apps.document";

export async function findFolderId(name: string): Promise<string | null> {
  const query = encodeURIComponent(
    `mimeType='application/vnd.google-apps.folder' and name='${name.replace(/'/g, "\\'")}' and trashed=false`,
  );
  const data = await driveJson<{ files?: DriveFile[] }>(`/files?q=${query}&pageSize=5&fields=files(id,name)`);
  return data.files?.[0]?.id ?? null;
}

export async function listNoteFilesSince(folderId: string, sinceIso: string | null): Promise<DriveFile[]> {
  const clauses = [
    `'${folderId}' in parents`,
    "trashed=false",
    `(mimeType='${DOC_MIME}' or mimeType='text/plain')`,
  ];
  if (sinceIso) clauses.push(`modifiedTime > '${sinceIso}'`);
  const query = encodeURIComponent(clauses.join(" and "));
  const data = await driveJson<{ files?: DriveFile[] }>(
    `/files?q=${query}&pageSize=50&orderBy=modifiedTime desc&fields=files(id,name,mimeType,modifiedTime,version)`,
  );
  return data.files ?? [];
}

export async function readNoteText(file: DriveFile, maxChars = 4000): Promise<string> {
  const path =
    file.mimeType === DOC_MIME
      ? `/files/${file.id}/export?mimeType=text/plain`
      : `/files/${file.id}?alt=media`;
  const response = await driveFetch(path);
  const text = await response.text();
  return text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, maxChars);
}
