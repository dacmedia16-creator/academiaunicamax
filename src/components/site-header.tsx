import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useIsStaff, useUser } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Menu, Shield, User as UserIcon } from "lucide-react";
import logoAsset from "@/assets/academia-remax-logo.png.asset.json";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2">
      <img src={logoAsset.url} alt="Academia RE/MAX" className="h-9 w-9 shrink-0 rounded-full object-contain sm:h-10 sm:w-10" />
      {!compact && (
        <div className="min-w-0 leading-tight">
          <div className="whitespace-pre-line font-display text-sm font-extrabold tracking-tight sm:text-base">
            REMAX&nbsp;{"\n"}Única Escolha&nbsp;<span className="text-[color:var(--color-brand-red)]">Academy</span>
          </div>
          <div className="hidden text-[10px] uppercase tracking-widest text-muted-foreground sm:block">Treinamentos</div>
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
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    setOpen(false);
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto grid h-14 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 sm:px-4 md:h-16">
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
              <span className="hidden items-center gap-1 text-xs text-muted-foreground lg:inline-flex">
                <UserIcon className="h-3.5 w-3.5" />{user.email}
              </span>
              <Button variant="outline" size="sm" className="hidden md:inline-flex" onClick={handleSignOut}>
                <LogOut className="mr-1 h-4 w-4" />Sair
              </Button>

              {/* Mobile menu */}
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-11 w-11 md:hidden" aria-label="Abrir menu">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 p-0">
                  <SheetHeader className="border-b border-border p-4 text-left">
                    <SheetTitle className="text-base">Menu</SheetTitle>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <UserIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                  </SheetHeader>
                  <nav className="flex flex-col p-2">
                    <MobileNavLink to="/app" onClick={() => setOpen(false)}>Início</MobileNavLink>
                    <MobileNavLink to="/app/cursos" onClick={() => setOpen(false)}>Cursos</MobileNavLink>
                    <MobileNavLink to="/app/perfil" onClick={() => setOpen(false)}>Perfil</MobileNavLink>
                    {isStaff && (
                      <MobileNavLink to="/admin" onClick={() => setOpen(false)} accent>
                        <Shield className="h-4 w-4" /> Painel
                      </MobileNavLink>
                    )}
                    <div className="mt-2 border-t border-border pt-2">
                      <button
                        onClick={handleSignOut}
                        className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <LogOut className="h-4 w-4" /> Sair
                      </button>
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            <Button size="sm" asChild><Link to="/auth">Entrar</Link></Button>
          )}
        </div>
      </div>
    </header>
  );
}

function MobileNavLink({
  to,
  onClick,
  accent,
  children,
}: {
  to: string;
  onClick?: () => void;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-foreground ${
        accent ? "text-[color:var(--color-brand-red)]" : "text-foreground"
      }`}
      activeProps={{ className: "bg-accent text-foreground" }}
    >
      {children}
    </Link>
  );
}
