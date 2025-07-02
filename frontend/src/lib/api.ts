const API_BASE_URL = "http://localhost:5000";

export async function fetchAPI<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, options);
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${path}`);
  }

  const data = (await res.json()) as T;
  return data;
}

// Event
export async function fetchEventById<T>(eventId: string): Promise<T> {
  return fetchAPI<T>(`/api/events/${eventId}`);
}
