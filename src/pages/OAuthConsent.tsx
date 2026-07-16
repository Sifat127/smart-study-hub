import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

// Local typed shim for the beta supabase.auth.oauth namespace.
type AuthorizationDetails = {
  client?: { client_id?: string; name?: string; client_name?: string };
  redirect_url?: string;
  redirect_to?: string;
  scope?: string;
  scopes?: string[];
  requested_scopes?: string[];
};
type OAuthResult = { data?: AuthorizationDetails; error?: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
const authOAuth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      setAccount(sess.session.user.email ?? sess.session.user.id);
      const { data, error: err } = await authOAuth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (err) {
        setError(err.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data ?? {});
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error: err } = approve
      ? await authOAuth.approveAuthorization(authorizationId)
      : await authOAuth.denyAuthorization(authorizationId);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  const scopes = details?.scopes ?? details?.requested_scopes ?? (details?.scope ? details.scope.split(/\s+/) : []);
  const clientName = details?.client?.name ?? details?.client?.client_name ?? "an app";

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-md w-full rounded-2xl border bg-card p-8 shadow-sm text-center space-y-3">
          <h1 className="text-xl font-semibold">Could not load this authorization request</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 py-12">
      <div className="max-w-md w-full rounded-2xl border bg-card p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <img src={logo} alt="DIU StudyBank" className="h-10 w-10 rounded-lg object-contain" />
          <div>
            <h1 className="text-lg font-semibold">Connect {clientName} to DIU StudyBank</h1>
            <p className="text-xs text-muted-foreground">Signed in as {account}</p>
          </div>
        </div>

        <p className="text-sm">
          {clientName} will be able to call this app's enabled tools while you are signed in.
        </p>

        {scopes.length > 0 && (
          <div className="text-sm">
            <p className="font-medium mb-2">Requested access</p>
            <ul className="space-y-1 text-muted-foreground">
              {scopes.map((s) => (
                <li key={s} className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          This does not bypass this app's permissions or backend policies. Access follows the same
          row-level rules that apply when you use DIU StudyBank directly.
        </p>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
            Cancel connection
          </Button>
          <Button className="flex-1 bg-gradient-primary text-primary-foreground" disabled={busy} onClick={() => decide(true)}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Approve
          </Button>
        </div>
      </div>
    </div>
  );
}
