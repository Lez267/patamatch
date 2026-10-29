export function applicationAnchor(applicationId: string) {
  return `solicitud-${applicationId}`;
}

export function applicationHref(applicationId: string) {
  return `/adopciones#${encodeURIComponent(applicationAnchor(applicationId))}`;
}
