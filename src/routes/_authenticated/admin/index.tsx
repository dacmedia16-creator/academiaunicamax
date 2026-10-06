import { createFileRoute, redirect } from "@tanstack/react-router";

// Relatório de equipe será implementado após a policy restrita e a tela "Minha equipe".
// A rota antiga fazia leitura de pessoas da imobiliária inteira.
export const Route = createFileRoute("/_authenticated/admin/")({
  beforeLoad: () => { throw redirect({ to: "/admin/cursos" }); },
});
