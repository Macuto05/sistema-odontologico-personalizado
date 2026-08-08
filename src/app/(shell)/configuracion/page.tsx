"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLiveQuery } from "dexie-react-hooks";
import { v4 as uuid } from "uuid";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { crearConsultorio } from "@/application/use-cases/crearConsultorio";
import { eliminarConsultorio } from "@/application/use-cases/eliminarConsultorio";
import { ConsultorioRepositoryDexie } from "@/infrastructure/db/dexie/ConsultorioRepositoryDexie";
import { db } from "@/infrastructure/db/dexie/db";
import { NombreConsultorioDuplicadoError } from "@/domain/errors";
import { Consultorio } from "@/domain/entities/Consultorio";
import { Tema, useTema } from "@/hooks/useTema";
import styles from "./configuracion.module.css";

const OPCIONES_TEMA: { valor: Tema; etiqueta: string; colorSwatch: string }[] = [
  { valor: "azul", etiqueta: "Azul", colorSwatch: "var(--color-cyan-700)" },
  { valor: "morado", etiqueta: "Morado", colorSwatch: "var(--color-purple-700)" },
];

const consultorioRepo = new ConsultorioRepositoryDexie();

type EstadoEnvio = "idle" | "enviando" | "ok" | "error";

// Formato genérico de email (requiere "@" y un dominio con punto) — no se restringe a
// ".com" para no rechazar emails legítimos con otras extensiones (.net, .com.ar, etc.).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ReglaPassword {
  id: string;
  etiqueta: string;
  cumple: (password: string) => boolean;
}

// Validaciones clásicas de contraseña, evaluadas en vivo mientras se escribe.
const REGLAS_PASSWORD: ReglaPassword[] = [
  { id: "longitud", etiqueta: "Al menos 8 caracteres", cumple: (p) => p.length >= 8 },
  { id: "mayuscula", etiqueta: "Al menos una mayúscula", cumple: (p) => /[A-Z]/.test(p) },
  { id: "numero", etiqueta: "Al menos un número", cumple: (p) => /[0-9]/.test(p) },
  {
    id: "especial",
    etiqueta: "Al menos un carácter especial",
    cumple: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

/**
 * Configuración: editar nombre/email y cambiar contraseña (US4, FR-011 a FR-014).
 * Online-only por diseño (research.md #1) — cualquier fallo de red se muestra de forma
 * visible, nunca en silencio (Principio VIII, plan.md §Constraints).
 */
export default function ConfiguracionPage() {
  const { update: actualizarSesion } = useSession();
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const { tema, setTema } = useTema();
  const [perfilCargado, setPerfilCargado] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [estadoPerfil, setEstadoPerfil] = useState<EstadoEnvio>("idle");
  const [errorPerfil, setErrorPerfil] = useState<string | null>(null);

  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [estadoPassword, setEstadoPassword] = useState<EstadoEnvio>("idle");
  const [errorPassword, setErrorPassword] = useState<string | null>(null);

  // Email: se valida en vivo, pero el mensaje de error solo aparece una vez que hay texto
  // (un campo vacío ya se marca como "(Requerido)" — no hace falta duplicar el aviso).
  const emailConTexto = email.trim().length > 0;
  const emailValido = EMAIL_REGEX.test(email.trim());

  // Contraseña nueva: checklist de reglas clásicas, evaluado en cada tecleo.
  const reglasPasswordEstado = REGLAS_PASSWORD.map((regla) => ({
    ...regla,
    cumplida: regla.cumple(passwordNueva),
  }));
  const passwordNuevaValida = reglasPasswordEstado.every((regla) => regla.cumplida);

  const [nombreConsultorio, setNombreConsultorio] = useState("");
  const [errorConsultorio, setErrorConsultorio] = useState<string | null>(null);
  // Local-first (research.md #1 de 004-consultorios) — a diferencia del perfil, funciona
  // sin conexión: se lee/escribe siempre contra Dexie, nunca contra la API directamente.
  const consultorios = useLiveQuery<Consultorio[] | undefined>(() => consultorioRepo.listar(), []);
  // Ids con una creación rechazada por nombre duplicado al sincronizar (research.md #3):
  // el registro local existe (optimista) pero nunca llegó al servidor — Principio III
  // exige que esto sea visible, no solo "no perdido" en el outbox.
  const idsConConflicto = useLiveQuery(
    () =>
      db.outboxOperations
        // "entidad"/"tipo" no están indexados — el outbox es chico, un filtro en memoria
        // alcanza (Principio VIII no exige indexar lo que no se consulta seguido).
        .where("estado")
        .equals("CONFLICTO")
        .and((op) => op.entidad === "CONSULTORIO" && op.tipo === "CREAR")
        .toArray()
        .then((ops) => new Set(ops.map((op) => op.entidadId))),
    [],
  );

  // El formulario solo se renderiza después de que esto resuelve (perfilCargado) — evita
  // que la carga inicial pise una edición que el odontólogo ya haya empezado a escribir.
  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then((data) => {
        if (data.usuario) {
          setNombre(data.usuario.nombre);
          setEmail(data.usuario.email);
        }
      })
      .catch(() => {
        // Sin conexión al cargar: los campos quedan vacíos, el guardado avisará igual.
      })
      .finally(() => setPerfilCargado(true));
  }, []);

  async function onGuardarPerfil(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || !emailValido) return;
    setEstadoPerfil("enviando");
    setErrorPerfil(null);

    try {
      const respuesta = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email }),
      });
      if (!respuesta.ok) {
        const cuerpo = await respuesta.json();
        if (cuerpo.error === "DATOS_INVALIDOS") {
          setErrorPerfil("Revisa los datos: el nombre o el email tienen un formato inválido.");
        } else {
          setErrorPerfil("No se pudo guardar. Intenta de nuevo.");
        }
        setEstadoPerfil("error");
        return;
      }
      // Refresca el JWT con el nombre nuevo (research.md, auth.config.ts) para que el
      // saludo del inicio lo muestre sin exigir cerrar e iniciar sesión de nuevo.
      await actualizarSesion({ nombre });
      setEstadoPerfil("ok");
    } catch {
      setErrorPerfil("No se pudo guardar por un problema de conexión. Revisa tu conexión a internet e intenta de nuevo.");
      setEstadoPerfil("error");
    }
  }

  async function onCambiarPassword(e: FormEvent) {
    e.preventDefault();
    if (!passwordActual || !passwordNuevaValida) return;
    setEstadoPassword("enviando");
    setErrorPassword(null);

    try {
      const respuesta = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwordActual, passwordNueva }),
      });
      if (!respuesta.ok) {
        const cuerpo = await respuesta.json();
        if (cuerpo.error === "PASSWORD_ACTUAL_INCORRECTA") {
          setErrorPassword("La contraseña actual ingresada es incorrecta.");
        } else {
          setErrorPassword("No se pudo cambiar la contraseña. Revisa los datos ingresados.");
        }
        setEstadoPassword("error");
        return;
      }
      setPasswordActual("");
      setPasswordNueva("");
      setEstadoPassword("ok");
    } catch {
      setErrorPassword("No se pudo cambiar la contraseña por un problema de conexión.");
      setEstadoPassword("error");
    }
  }

  async function onAgregarConsultorio(e: FormEvent) {
    e.preventDefault();
    setErrorConsultorio(null);
    try {
      await crearConsultorio(consultorioRepo, { id: uuid(), nombre: nombreConsultorio });
      setNombreConsultorio("");
    } catch (err) {
      if (err instanceof NombreConsultorioDuplicadoError) {
        setErrorConsultorio(
          `Ya existe un consultorio con ese nombre: ${err.consultorioExistente.nombre}.`,
        );
      } else {
        setErrorConsultorio("El nombre del consultorio es obligatorio.");
      }
    }
  }

  async function onEliminarConsultorio(id: string) {
    await eliminarConsultorio(consultorioRepo, id);
  }

  function onBuscarPaciente() {
    const texto = busqueda.trim();
    if (!texto) return;
    router.push(`/pacientes?q=${encodeURIComponent(texto)}`);
  }

  return (
    <>
      <TopAppBar
        searchValue={busqueda}
        onSearchChange={setBusqueda}
        searchPlaceholder="Buscar por nombre o documento..."
        searchAriaLabel="Buscar por nombre o documento"
        onSearchSubmit={onBuscarPaciente}
      />
      <main className={styles.main}>
      <header className={styles.headerSeccion}>
        <h1 className={styles.titulo}>Configuración</h1>
        <p className={styles.subtitulo}>
          Gestiona tu perfil personal y las preferencias de la clínica.
        </p>
      </header>

      <div className={styles.grid}>
        <div className={styles.colIzquierda}>
          <Card className="hover-elevate">
            <CardHeader>
              <h2 className="text-heading">Tus datos</h2>
            </CardHeader>
            <CardContent>
              {!perfilCargado && <p className="text-body-sm">Cargando…</p>}
              {perfilCargado && (
                <form
                  onSubmit={onGuardarPerfil}
                  noValidate
                  style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
                >
                  {estadoPerfil === "ok" && (
                    <Alert variant="success">Perfil guardado correctamente.</Alert>
                  )}
                  {estadoPerfil === "error" && errorPerfil && (
                    <Alert variant="error">{errorPerfil}</Alert>
                  )}
                  <Input
                    label="Nombre"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                  />
                  <Input
                    label="Email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={emailConTexto && !emailValido ? "Formato de email inválido, ej. nombre@dominio.com" : undefined}
                    helperText={!emailConTexto || emailValido ? "Ej. nombre@dominio.com" : undefined}
                  />
                  <Button
                    type="submit"
                    disabled={estadoPerfil === "enviando" || !nombre.trim() || !emailValido}
                    style={{ alignSelf: "flex-start" }}
                  >
                    {estadoPerfil === "enviando" ? "Guardando…" : "Guardar perfil"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <h2 className="text-heading">Cambiar contraseña</h2>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={onCambiarPassword}
                noValidate
                style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
              >
                {estadoPassword === "ok" && (
                  <Alert variant="success">Contraseña actualizada correctamente.</Alert>
                )}
                {estadoPassword === "error" && errorPassword && (
                  <Alert variant="error">{errorPassword}</Alert>
                )}
                <Input
                  label="Contraseña actual"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                />
                <div>
                  <Input
                    label="Contraseña nueva"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={passwordNueva}
                    onChange={(e) => setPasswordNueva(e.target.value)}
                  />
                  {passwordNueva.length > 0 && (
                    <ul className={styles.checklistPassword} aria-live="polite">
                      {reglasPasswordEstado.map((regla) => (
                        <li
                          key={regla.id}
                          className={`text-caption ${styles.checklistItem} ${
                            regla.cumplida ? styles.checklistItemOk : styles.checklistItemPendiente
                          }`}
                        >
                          <span aria-hidden="true">{regla.cumplida ? "✓" : "○"}</span> {regla.etiqueta}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={estadoPassword === "enviando" || !passwordActual || !passwordNuevaValida}
                  style={{ alignSelf: "flex-start" }}
                >
                  {estadoPassword === "enviando" ? "Cambiando…" : "Cambiar contraseña"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <h2 className="text-heading">Apariencia</h2>
            </CardHeader>
            <CardContent>
              <div style={{ display: "flex", gap: "var(--space-6)" }}>
                {OPCIONES_TEMA.map((opcion) => {
                  const seleccionado = tema === opcion.valor;
                  return (
                    <button
                      key={opcion.valor}
                      type="button"
                      aria-pressed={seleccionado}
                      aria-label={`Tema ${opcion.etiqueta}`}
                      onClick={() => setTema(opcion.valor)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "var(--space-2)",
                        padding: "var(--space-3)",
                        minWidth: 44,
                        background: "none",
                        border: "none",
                        borderRadius: "var(--radius-lg)",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          display: "block",
                          width: 40,
                          height: 40,
                          borderRadius: "9999px",
                          background: opcion.colorSwatch,
                          boxShadow: seleccionado
                            ? "0 0 0 3px var(--color-card), 0 0 0 5px var(--color-ring)"
                            : "none",
                        }}
                      />
                      <span className="text-body-sm">{opcion.etiqueta}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className={`hover-elevate ${styles.cardConsultorios}`}>
            <CardHeader>
              <h2 className="text-heading">Consultorios</h2>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={onAgregarConsultorio}
                noValidate
                style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}
              >
                <div style={{ flex: 1 }}>
                  <Input
                    label="Nombre del consultorio"
                    placeholder="Ej. Sede Norte"
                    value={nombreConsultorio}
                    onChange={(e) => setNombreConsultorio(e.target.value)}
                  />
                </div>
                <Button type="submit" style={{ marginTop: 24 }}>
                  Agregar consultorio
                </Button>
              </form>

              {errorConsultorio && (
                <div style={{ marginTop: "var(--space-3)" }}>
                  <Alert variant="error">{errorConsultorio}</Alert>
                </div>
              )}

              <ul style={{ marginTop: "var(--space-4)", listStyle: "none", padding: 0 }}>
                {consultorios?.length === 0 && (
                  <p className="text-body-sm" style={{ color: "var(--color-muted-foreground)" }}>
                    Todavía no cargaste ningún consultorio.
                  </p>
                )}
                {consultorios?.map((c) => (
                  <li
                    key={c.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "var(--space-3) 0",
                      borderBottom: "1px solid var(--color-border)",
                      gap: "var(--space-3)",
                    }}
                  >
                    <span className="text-body-sm">
                      {c.nombre}
                      {idsConConflicto?.has(c.id) && (
                        <span
                          className="text-caption"
                          style={{ color: "var(--color-error)", display: "block" }}
                        >
                          No se pudo sincronizar: ya existe un consultorio con este nombre en el
                          servidor. Eliminalo y renombralo para reintentar.
                        </span>
                      )}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`Eliminar ${c.nombre}`}
                      onClick={() => onEliminarConsultorio(c.id)}
                    >
                      Eliminar
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
      </main>
    </>
  );
}
