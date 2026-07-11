export function ok<T>(data: T) {
  return { success: true as const, data };
}

export function fail(message: string, code: string) {
  return { success: false as const, message, code };
}

