import { describe, expect, it } from "vitest";
import { normalizarPaginacionNovedades } from "../src/datos/repos/novedades";

describe("repositorio de novedades", () => {
  it("normaliza la paginacion del historial por empleado", () => {
    expect(normalizarPaginacionNovedades()).toEqual({ limite: 10, offset: 0 });
    expect(normalizarPaginacionNovedades({ limite: 500, offset: -10 })).toEqual({ limite: 50, offset: 0 });
    expect(normalizarPaginacionNovedades({ limite: 0, offset: 12.9 })).toEqual({ limite: 1, offset: 12 });
  });
});
