import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useIsStaff, useUser } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Shield, User as UserIcon } from "lucide-react";
import logoAsset from "@/assets/academia-remax-logo.png.asset.json";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2">
      <img src={logoAsset.url} alt="Academia RE/MAX" className="h-10 w-10 object-contain" />

      {!compact && (
        <div className="leading-tight">
          <div className="font-display text-base font-extrabold tracking-tight">RE/MAX <span className="text-[color:var(--color-brand-red)]">Academy</span></div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Treinamentos</div>
        </div>
      )}
    </Link>
  );
}

export function SiteHeader() {
  const user = useUser();
  const isStaff = useIsStaff();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
        <BrandMark />
        <nav className="hidden items-center gap-1 md:flex">
          {user && (
            <>
              <Link to="/app" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground" activeProps={{ className: "bg-accent text-foreground" }}>Início</Link>
              <Link to="/app/cursos" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground" activeProps={{ className: "bg-accent text-foreground" }}>Cursos</Link>
              <Link to="/app/perfil" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground" activeProps={{ className: "bg-accent text-foreground" }}>Perfil</Link>
              {isStaff && (
                <Link to="/admin" className="rounded-md px-3 py-2 text-sm font-medium text-[color:var(--color-brand-red)] hover:bg-accent" activeProps={{ className: "bg-accent" }}>
                  <span className="inline-flex items-center gap-1"><Shield className="h-4 w-4" />Painel</span>
                </Link>
              )}
            </>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden text-xs text-muted-foreground sm:inline-flex items-center gap-1"><UserIcon className="h-3.5 w-3.5" />{user.email}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-1 h-4 w-4" />Sair
              </Button>
            </>
          ) : (
            <Button size="sm" asChild><Link to="/auth">Entrar</Link></Button>
          )}
        </div>
      </div>
    </header>
  );
}
