import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Crea (o actualiza la contraseña de) la cuenta única del odontólogo — T018.
 * Sin esto no hay con qué iniciar sesión (no hay registro de usuarios desde la UI).
 */
async function main() {
  const nombre = process.env.SEED_ODONTOLOGO_NOMBRE;
  const email = process.env.SEED_ODONTOLOGO_EMAIL;
  const password = process.env.SEED_ODONTOLOGO_PASSWORD;

  if (!nombre || !email || !password) {
    throw new Error(
      "SEED_ODONTOLOGO_NOMBRE, SEED_ODONTOLOGO_EMAIL y SEED_ODONTOLOGO_PASSWORD son obligatorias (ver .env.example)",
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.usuario.upsert({
    where: { email },
    update: { nombre, passwordHash },
    create: { nombre, email, passwordHash },
  });

  console.log(`Cuenta del odontólogo lista: ${email}`);

  // Cuenta separada, exclusiva para los tests e2e — opcional (no todos los entornos la
  // necesitan), pero si está configurada se siembra acá para que un solo comando deje todo
  // listo. Nunca debe ser la misma cuenta que la de arriba: los tests le cambian
  // nombre/contraseña como parte de sus propios escenarios, y compartir cuenta con un uso
  // real hace que cada corrida de tests pise las credenciales reales sin aviso.
  const nombreE2E = process.env.E2E_ODONTOLOGO_NOMBRE;
  const emailE2E = process.env.E2E_ODONTOLOGO_EMAIL;
  const passwordE2E = process.env.E2E_ODONTOLOGO_PASSWORD;

  if (nombreE2E && emailE2E && passwordE2E) {
    if (emailE2E === email) {
      throw new Error(
        "E2E_ODONTOLOGO_EMAIL no puede ser igual a SEED_ODONTOLOGO_EMAIL — los tests e2e " +
          "necesitan una cuenta separada de la cuenta real (ver .env.example).",
      );
    }
    const passwordHashE2E = await bcrypt.hash(passwordE2E, 12);
    await prisma.usuario.upsert({
      where: { email: emailE2E },
      update: { nombre: nombreE2E, passwordHash: passwordHashE2E },
      create: { nombre: nombreE2E, email: emailE2E, passwordHash: passwordHashE2E },
    });
    console.log(`Cuenta de pruebas e2e lista: ${emailE2E}`);
  } else {
    console.log("E2E_ODONTOLOGO_* no configuradas — se omite la cuenta de pruebas e2e.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
