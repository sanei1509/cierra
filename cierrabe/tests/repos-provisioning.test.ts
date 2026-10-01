import { describe, expect, it } from "vitest";
import { rolLegacyProvisioning } from "../src/datos/repos";

describe("repositorios de altas", () => {
  it("mapea roles finos al modelo de membresias actual", () => {
    expect(rolLegacyProvisioning("studio_owner")).toBe("admin");
    expect(rolLegacyProvisioning("company_owner")).toBe("admin");
    expect(rolLegacyProvisioning("payroll_operator")).toBe("liquidador");
    expect(rolLegacyProvisioning("company_operator")).toBe("liquidador");
    expect(rolLegacyProvisioning("employee_self")).toBe("lectura");
  });
});
