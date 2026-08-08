/** ISO (YYYY-MM-DD) → DD/MM/AAAA para mostrar. Compartido entre el listado y la ficha. */
export function formatearFecha(iso: string): string {
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

/** Timestamp ISO completo (con hora) → DD/MM/AAAA HH:mm — usado por Cita (createdAt,
 * finalizadaEn), a diferencia de formatearFecha (solo fecha, sin hora). */
export function formatearFechaHora(iso: string): string {
  const fecha = new Date(iso);
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const anio = fecha.getFullYear();
  const horas = String(fecha.getHours()).padStart(2, "0");
  const minutos = String(fecha.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
}

/** Timestamp ISO completo (con hora) → DD/MM/AAAA, sin hora — mismo parseo que
 * formatearFechaHora, para vistas donde el momento exacto no importa (ej. Historial del
 * Odontograma: "Así se veía antes del último guardado — DD/MM/AAAA"). A diferencia de
 * formatearFecha (que espera YYYY-MM-DD y solo separa el string), esta sí necesita parsear
 * con Date porque la entrada trae hora/milisegundos/zona. */
export function formatearSoloFecha(iso: string): string {
  const fecha = new Date(iso);
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const anio = fecha.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

/** Edad actual en años a partir de una fecha de nacimiento ISO (YYYY-MM-DD). */
export function calcularEdad(fechaNacimientoIso: string): number {
  const partes = fechaNacimientoIso.split("-");
  const anio = Number(partes[0]);
  const mes = Number(partes[1]);
  const dia = Number(partes[2]);
  const hoy = new Date();
  let edad = hoy.getFullYear() - anio;
  const noHaCumplidoAun = hoy.getMonth() + 1 < mes || (hoy.getMonth() + 1 === mes && hoy.getDate() < dia);
  if (noHaCumplidoAun) edad -= 1;
  return edad;
}
