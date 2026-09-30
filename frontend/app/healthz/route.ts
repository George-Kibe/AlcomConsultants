// Liveness probe for Docker and uptime monitors. Lives outside /api, which Nginx routes to Django.
export function GET() {
  return Response.json({ status: "ok" });
}
