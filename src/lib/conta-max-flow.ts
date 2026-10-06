type Tokens = { access_token: string; refresh_token: string };
type BridgeResponse = { data: Partial<Tokens> | null; error: unknown };
type SessionResponse = { data: { user: { id: string } | null }; error: unknown };

export type ContaMaxResult = "ok" | "missing_ticket" | "bridge_failed" | "session_failed" | "not_allowed";

export async function completeContaMaxLogin(ticket: string | null, options: {
  invoke: (ticket: string) => Promise<BridgeResponse>;
  setSession: (tokens: Tokens) => Promise<SessionResponse>;
  isAllowed: () => Promise<boolean>;
  signOut: () => Promise<unknown>;
  navigate: () => Promise<unknown>;
}): Promise<ContaMaxResult> {
  if (!ticket) return "missing_ticket";
  try {
    const { data, error } = await options.invoke(ticket);
    if (error || !data?.access_token || !data.refresh_token) return "bridge_failed";
    const session = await options.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    if (session.error || !session.data.user) return "session_failed";
    if (!(await options.isAllowed())) {
      await options.signOut();
      return "not_allowed";
    }
    await options.navigate();
    return "ok";
  } catch {
    return "bridge_failed";
  }
}
