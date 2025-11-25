import { describe, expect, test } from "bun:test";
import app from "./index"; // Asegúrate de exportar 'app' en tu index.ts

describe("Notifications Service", () => {
  test("GET / debe devolver 404 o mensaje de bienvenida", async () => {
    const req = new Request("http://localhost:3000/");
    const res = await app.fetch(req);
    // Como no tenemos ruta raíz definida, suele dar 404, lo cual es correcto
    expect(res.status).toBe(404); 
  });

  test("GET /preferences/fakeuser debe devolver 200 (aunque esté vacío)", async () => {
    const req = new Request("http://localhost:3000/preferences/fakeuser");
    const res = await app.fetch(req);
    expect(res.status).toBe(200);
  });
});