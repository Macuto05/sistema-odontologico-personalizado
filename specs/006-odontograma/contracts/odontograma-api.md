# Contrato: API de Odontograma

Todas las rutas requieren sesión válida (Auth.js) — sin sesión, `401`. Los tipos siguen
`data-model.md` (`Odontograma`, `HallazgoDental`, `CambioOdontograma`, `ItemPlanTratamiento`).
Igual que `Paciente`/`Consultorio`/`Cita`, todas las mutaciones viajan a través de `POST
/api/sync` (ver extensión del contrato de sync más abajo) — la UI escribe primero en Dexie y
encola la operación; esta feature no tiene ninguna excepción online-only (a diferencia de
`contracts/archivos-estudio-api.md` de 005), consistente con FR-018.

## `GET /api/patients/:id/odontogramas`

Usado por la UI al abrir el tab Odontograma de un paciente — trae los (hasta dos)
`Odontograma` de ese paciente, uno por `denticion`.

**200**:

```json
{
  "odontogramas": [
    {
      "id": "...",
      "pacienteId": "...",
      "denticion": "ADULTO",
      "hallazgos": [
        {
          "id": "...",
          "condicionId": "CARIES",
          "dientes": ["16"],
          "superficie": "OCLUSAL_INCISAL",
          "variante": null,
          "estadoColor": null,
          "nota": null,
          "registradoEn": "..."
        }
      ],
      "version": 3,
      "conflictoPendiente": null,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

## `GET /api/odontogramas` (pull incremental global, mismo criterio que `GET /api/citas` de 005)

Usado por `syncEngine.ts` en segundo plano, no por ninguna pantalla directamente. Mismos
query params `desde`/`pagina`/`limite` que el resto de pulls incrementales
(`specs/003-historia-clinica-paciente/research.md #12`).

## `GET /api/patients/:id/odontogramas/:denticion/historial`

Usado por el panel de "Historial de cambios" (User Story 4) — lista `CambioOdontograma` de
**un** `Odontograma` (identificado por paciente + dentición), ordenado de más reciente a más
antiguo. Paginado igual que el resto de listados del proyecto.

**200**:

```json
{
  "cambios": [
    {
      "id": "...",
      "odontogramaId": "...",
      "tipoCambio": "AGREGADO",
      "hallazgoId": "...",
      "dientes": ["16"],
      "superficie": "OCLUSAL_INCISAL",
      "descripcion": "Caries agregada en superficie oclusal del diente 16",
      "registradoEn": "..."
    }
  ]
}
```

## `GET /api/cambios-odontograma` (pull incremental global)

Mismo criterio que `GET /api/odontogramas` — solo para el motor de sync en segundo plano.
Dado que `CambioOdontograma` es append-only (research.md #4), el pull incremental nunca
necesita reconciliar ediciones, solo agregar filas nuevas.

## `GET /api/patients/:id/plan-tratamiento`

Lista los `ItemPlanTratamiento` de un paciente, ordenados por `fecha` descendente.

## `GET /api/plan-tratamiento` (pull incremental global)

Mismo criterio que el resto.

## Extensión de `POST /api/sync`

Se agregan tres `entidad` nuevos al payload de operaciones ya existente
(`specs/004-consultorios/contracts` generalizó este contrato): `"ODONTOGRAMA"`,
`"CAMBIO_ODONTOGRAMA"`, `"ITEM_PLAN_TRATAMIENTO"`.

| `entidad` | `tipo` soportados | Notas |
|---|---|---|
| `ODONTOGRAMA` | `CREAR`, `EDITAR` | `EDITAR` reemplaza el array `hallazgos` completo (mismo criterio que `Cita.recetaItems`/`estudioItems`, research.md #2) — usa `baseVersion` para detección de conflicto. |
| `CAMBIO_ODONTOGRAMA` | `CREAR` únicamente | Nunca `EDITAR` (research.md #4) — el servidor rechaza cualquier operación `EDITAR`/`ELIMINAR` sobre esta entidad con `400`. |
| `ITEM_PLAN_TRATAMIENTO` | `CREAR`, `EDITAR`, `ELIMINAR` | Mismo mecanismo `version`/`conflictoPendiente` que `Paciente`. |

Todas verifican pertenencia de registro (Principio VII) — una operación sobre un
`Odontograma`/`ItemPlanTratamiento` que no pertenece al `pacienteId` implícito en la sesión
del odontólogo único igual se valida por existencia del recurso, mismo criterio que el resto
de endpoints de este proyecto de un solo usuario.
