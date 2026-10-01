import { expect, test, type BrowserContext, type Page } from "@playwright/test";

type Tema = "light" | "dark";
type Actor = "estudio" | "empresa" | "empleado";

const sesiones = {
  estudio: {
    accesoId: "studio_admin",
    email: "lucia@estudiopereira.uy",
    usuarioId: "u1",
    actor: "estudio",
    delegadoPor: null,
  },
  empresa: {
    accesoId: "company_owner",
    email: "walter@tallercolon.uy",
    usuarioId: null,
    actor: "empresa",
    delegadoPor: null,
  },
  empleado: {
    accesoId: "employee_self",
    email: "valentina.correa@gmail.com",
    usuarioId: null,
    actor: "empleado",
    delegadoPor: null,
  },
} as const;

async function prepararTema(page: Page, tema: Tema) {
  await page.emulateMedia({ colorScheme: tema });
  await page.addInitScript(() => {
    window.localStorage.removeItem("cierra-demo-v1");
  });
}

async function autenticar(context: BrowserContext, actor: Actor) {
  await context.addCookies([
    {
      name: "cierra_dev_session",
      value: JSON.stringify(sesiones[actor]),
      url: "http://localhost:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

async function capturar(page: Page, nombre: string) {
  await page.screenshot({ path: test.info().outputPath(`${nombre}.png`), fullPage: true });
}

test.describe("Cierra visual audit", () => {
  test("login desktop and mobile stays readable", async ({ page }, testInfo) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Entrar a Cierra" })).toBeVisible();
    await expect(page.getByPlaceholder("tu@email.com")).toBeVisible();
    await capturar(page, `login-${testInfo.project.name}`);
  });

  for (const tema of ["light", "dark"] as const) {
    test(`study dashboard ${tema} theme has readable shell and cards`, async ({ page, context }, testInfo) => {
      await prepararTema(page, tema);
      await autenticar(context, "estudio");

      await page.goto("/");
      await expect(page.getByText("Cierre de septiembre 2026")).toBeVisible();
      await expect(page.getByText("Dev roles")).toBeVisible();

      const theme = await page.locator("html").getAttribute("data-theme");
      expect(theme).toBe(tema);
      await capturar(page, `dashboard-${tema}-${testInfo.project.name}`);
    });
  }

  test("employee portal dark theme keeps blue cards readable", async ({ page, context }, testInfo) => {
    await prepararTema(page, "dark");
    await autenticar(context, "empleado");

    await page.goto("/portal/espiga-3");
    await expect(page.getByRole("heading", { name: /Hola,/ })).toBeVisible();
    await expect(page.getByText("Líquido a cobrar")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await capturar(page, `portal-empleado-dark-${testInfo.project.name}`);
  });

  test("receipt document ignores dark theme and stays on document palette", async ({ page, context }, testInfo) => {
    await prepararTema(page, "dark");
    await autenticar(context, "empleado");

    await page.goto("/recibo/espiga-3/2026-09");
    await expect(page.getByText("Recibo de sueldo")).toBeVisible();
    await expect(page.getByText("Líquido a cobrar")).toBeVisible();

    const colors = await page.locator(".document-surface").evaluate((el) => {
      const style = window.getComputedStyle(el);
      return { background: style.backgroundColor, color: style.color };
    });
    expect(colors.background).toBe("rgb(255, 255, 255)");
    expect(colors.color).toBe("rgb(16, 34, 71)");
    await capturar(page, `recibo-document-${testInfo.project.name}`);
  });
});
