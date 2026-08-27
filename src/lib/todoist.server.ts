export function todoistEnabled(): boolean {
  return Boolean(process.env["TODOIST_API_TOKEN"]);
}

export async function createTodoistTask(input: {
  content: string;
  description?: string | null;
  dueDate?: string | null;
  projectId?: string | null;
}): Promise<string | null> {
  const token = process.env["TODOIST_API_TOKEN"];
  if (!token) return null;

  const body: Record<string, unknown> = { content: input.content };
  if (input.description) body["description"] = input.description;
  if (input.dueDate) body["due_date"] = input.dueDate;
  if (input.projectId) body["project_id"] = input.projectId;

  const response = await fetch("https://api.todoist.com/rest/v2/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[todoist] ${response.status} ${text}`);
    throw new Error(`Todoist gaf een fout [${response.status}]: ${text.slice(0, 300)}`);
  }
  const task = (await response.json()) as { id: string };
  return task.id;
}
