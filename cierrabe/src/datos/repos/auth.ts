import { eq } from "drizzle-orm";
import type { AuthPasswordRepo, EspacioAcceso, UsuarioAuth } from "../../auth";
import type { EmpresaId, EstudioId, RolEmpresa, RolEstudio, UsuarioId } from "../contexto";
import type { Db } from "../db";
import { credencialesPassword, membresiaEmpresas, membresias, usuarios } from "../schema";

type RolLegacy = "admin" | "liquidador" | "lectura";

function rolEstudio(rol: RolLegacy): RolEstudio {
  if (rol === "liquidador") return "payroll_operator";
  if (rol === "lectura") return "studio_readonly";
  return "studio_admin";
}

function rolEmpresa(rol: RolLegacy): RolEmpresa {
  if (rol === "liquidador") return "company_operator";
  if (rol === "lectura") return "company_readonly";
  return "company_owner";
}

export function crearAuthPasswordRepo(db: Db): AuthPasswordRepo {
  return {
    async obtenerPorEmail(email) {
      const rows = await db
        .select({
          usuario: usuarios,
          passwordHash: credencialesPassword.passwordHash,
          membresiaId: membresias.id,
          estudioId: membresias.estudioId,
          rol: membresias.rol,
          empresaId: membresiaEmpresas.empresaId,
        })
        .from(usuarios)
        .leftJoin(credencialesPassword, eq(credencialesPassword.usuarioId, usuarios.id))
        .leftJoin(membresias, eq(membresias.usuarioId, usuarios.id))
        .leftJoin(membresiaEmpresas, eq(membresiaEmpresas.membresiaId, membresias.id))
        .where(eq(usuarios.email, email));

      const first = rows[0];
      if (!first) return null;

      const usuario: UsuarioAuth = {
        id: first.usuario.id as UsuarioId,
        email: first.usuario.email,
        nombre: first.usuario.nombre,
        estado: first.usuario.estado,
        temaPreferido: first.usuario.temaPreferido,
        mfaActivo: first.usuario.mfaActivo,
      };

      const estudios = new Map<string, { estudioId: EstudioId; rol: RolLegacy; empresas: EmpresaId[] }>();
      for (const row of rows) {
        if (!row.membresiaId || !row.estudioId || !row.rol) continue;
        const actual = estudios.get(row.membresiaId) ?? {
          estudioId: row.estudioId as EstudioId,
          rol: row.rol,
          empresas: [],
        };
        if (row.empresaId) actual.empresas.push(row.empresaId as EmpresaId);
        estudios.set(row.membresiaId, actual);
      }

      const espacios: EspacioAcceso[] = [];
      for (const membresia of estudios.values()) {
        if (membresia.empresas.length === 0) {
          espacios.push({
            actorTipo: "estudio",
            estudioId: membresia.estudioId,
            rol: rolEstudio(membresia.rol),
            empresasPermitidas: "todas",
          });
          continue;
        }
        for (const empresaId of membresia.empresas) {
          espacios.push({
            actorTipo: "empresa",
            estudioId: membresia.estudioId,
            empresaId,
            rol: rolEmpresa(membresia.rol),
          });
        }
      }

      return {
        usuario,
        passwordHash: first.passwordHash,
        espacios,
      };
    },

    async registrarUltimoAcceso(usuarioId, fecha) {
      await db.update(usuarios).set({ ultimoAcceso: fecha }).where(eq(usuarios.id, usuarioId));
    },
  };
}
