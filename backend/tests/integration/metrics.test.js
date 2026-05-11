const request = require("supertest");
const app = require("../../app");

describe("Prometheus metrics API", () => {
  it("should expose backend health, request, latency, and error metrics", async () => {
    await request(app).get("/api/health");
    await request(app).get("/missing-route");

    const res = await request(app).get("/metrics");

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.text).toContain("city_transition_up 1");
    expect(res.text).toContain("city_transition_http_requests_total");
    expect(res.text).toContain("city_transition_http_errors_total");
    expect(res.text).toContain("city_transition_http_request_duration_seconds_bucket");
    expect(res.text).toContain("city_transition_process_resident_memory_bytes");
    expect(res.text).toContain("city_transition_process_cpu_seconds_total");
    expect(res.text).toContain('route="/api/health"');
    expect(res.text).toContain('status_code="404"');
  });
});
