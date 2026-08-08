"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";

/**
 * Pantalla mínima de login (T019) — no es una historia de usuario del spec, es el acceso
 * indispensable para poder usar cualquiera de las 4 historias de gestión de pacientes.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    const resultado = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setEnviando(false);
    if (resultado?.error) {
      setError("Email o contraseña incorrectos.");
      return;
    }
    router.push("/");
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-4)",
      }}
    >
      <Card style={{ width: "100%", maxWidth: 400 }}>
        <CardHeader>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-2)" }}>
            <Image src="/logo-diente.png" alt="" width={51} height={60} priority />
          </div>
          <h1 className="text-heading" style={{ textAlign: "center" }}>
            Sistema Odontológico
          </h1>
          <p
            className="text-body-sm"
            style={{ color: "var(--color-muted-foreground)", textAlign: "center" }}
          >
            Iniciá sesión para gestionar tus pacientes
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {error && <Alert variant="error">{error}</Alert>}
            <Input
              label="Email"
              type="email"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Contraseña"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" disabled={enviando} style={{ width: "100%" }}>
              {enviando ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
