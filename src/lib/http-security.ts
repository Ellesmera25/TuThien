function getRequestOrigin(request: Request): string {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  if (forwardedHost) {
    return `${forwardedProto ?? "https"}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

function getHeaderOrigin(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function isSameOriginMutation(request: Request): boolean {
  const expectedOrigin = getRequestOrigin(request);
  const origin = getHeaderOrigin(request.headers.get("origin"));
  const referer = getHeaderOrigin(request.headers.get("referer"));

  if (origin) {
    return origin === expectedOrigin;
  }

  if (referer) {
    return referer === expectedOrigin;
  }

  return true;
}
