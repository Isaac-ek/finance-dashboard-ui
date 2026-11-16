import { useState } from "react";
import { api, type AccountUser } from "../lib/api";
export function AccountGate({
  onSignedIn,
}: {
  onSignedIn: (user: AccountUser) => Promise<void>;
}) {
  const [register, setRegister] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="account-shell">
      <section className="account-intro">
        <p className="eyebrow">FINANCE / LOCAL WORKSPACE</p>
        <h1>
          A clearer picture
          <br />
          of your money.
        </h1>
        <p>
          Your records, saved to the local server. Start with a CSV or add your
          first transaction.
        </p>
        <small>No bank connection. Amounts are recorded in USD.</small>
      </section>
      <section className="panel account-card">
        <p className="eyebrow">YOUR WORKSPACE</p>
        <h2>{register ? "Start your account." : "Welcome back."}</h2>
        <p>
          {register
            ? "Accounts start empty. Sample data stays in the separate public demo."
            : "Sign in to your locally stored records."}
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const data = new FormData(e.currentTarget);
            try {
              const r = await api<{ user: AccountUser }>(
                register ? "/auth/register" : "/auth/login",
                "POST",
                { email: data.get("email"), password: data.get("password") },
              );
              await onSignedIn(r.user);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Unable to sign in.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Email
            <input
              className="input-base"
              type="email"
              name="email"
              autoComplete="username"
              required
              maxLength={254}
            />
          </label>
          <label>
            Password
            <input
              className="input-base"
              type="password"
              name="password"
              autoComplete={register ? "new-password" : "current-password"}
              minLength={12}
              maxLength={128}
              required
            />
          </label>
          <small>Use 12–128 characters.</small>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button className="primary-button" disabled={busy}>
            {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
          </button>
        </form>
        <button
          className="text-button"
          onClick={() => {
            setRegister(!register);
            setError("");
          }}
          disabled={busy}
        >
          {register ? "Already registered? Sign in" : "Create a local account"}
        </button>
      </section>
    </main>
  );
}
