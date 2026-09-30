import { describe, expect, it } from "vitest";
import { resolverTema } from "../src/lib/theme";

describe("preferencia de tema", () => {
  it("respeta claro y oscuro elegidos por el usuario", () => {
    expect(resolverTema("light", true)).toBe("light");
    expect(resolverTema("dark", false)).toBe("dark");
  });

  it("usa el tema del sistema cuando la preferencia es system", () => {
    expect(resolverTema("system", true)).toBe("dark");
    expect(resolverTema("system", false)).toBe("light");
  });
});
