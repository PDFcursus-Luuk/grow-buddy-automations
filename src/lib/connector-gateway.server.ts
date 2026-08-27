const GATEWAY = "https://connector-gateway.lovable.dev";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Ontbrekende configuratie: ${name}`);
  return value;
}

async function gatewayFetch(connectorId: string, keyEnv: string, path: string, init?: RequestInit) {
  const lovableKey = requireEnv("LOVABLE_API_KEY");
  const connectionKey = requireEnv(keyEnv);
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${lovableKey}`);
  headers.set("X-Connection-Api-Key", connectionKey);
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`${GATEWAY}/${connectorId}${path}`, { ...init, headers });
  if (!response.ok) {
    const body = await response.text();
    console.error(`[gateway:${connectorId}] ${response.status} ${path} ${body}`);
    throw new Error(`${connectorId} gaf een fout [${response.status}]: ${body.slice(0, 500)}`);
  }
  return response;
}

export function gmailFetch(path: string, init?: RequestInit) {
  return gatewayFetch("google_mail", "GOOGLE_MAIL_API_KEY", `/gmail/v1${path}`, init);
}

export async function gmailJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await gmailFetch(path, init);
  return (await response.json()) as T;
}

export function driveFetch(path: string, init?: RequestInit) {
  return gatewayFetch("google_drive", "GOOGLE_DRIVE_API_KEY", `/drive/v3${path}`, init);
}

export async function driveJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await driveFetch(path, init);
  return (await response.json()) as T;
}
