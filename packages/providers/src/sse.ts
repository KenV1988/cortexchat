/**
 * Minimal Server-Sent-Events line reader shared by every HTTP-based adapter.
 * Deliberately dependency-free (no `eventsource-parser` et al.) — this is
 * ~20 lines of code, not worth a package, and keeping the dependency tree
 * thin is part of the "minimum compute" ethos of this project.
 */
export async function* readSSE(response: Response): AsyncGenerator<string> {
  if (!response.body) {
    throw new Error('Response has no readable body for SSE streaming.');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice('data:'.length).trim();
        if (payload) yield payload;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
