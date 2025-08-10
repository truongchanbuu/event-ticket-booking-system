export async function resolveParams<T>(params: T | Promise<T>): Promise<T> {
  return params instanceof Promise ? await params : params;
}
