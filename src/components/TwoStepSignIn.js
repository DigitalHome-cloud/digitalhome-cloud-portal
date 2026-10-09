import * as React from "react";
import {
  fetchAuthSession,
  fetchMFAPreference,
  setUpTOTP,
  verifyTOTPSetup,
  updateMFAPreference,
} from "aws-amplify/auth";

// Two-step sign-in with an authenticator app (TOTP). The pool's MFA is
// OPTIONAL: nobody is forced. Administrators need it: without it, the
// adminMfaGate trigger (repos/core) withholds the admin group from their
// tokens. Once on, every DHC app asks for the code at sign-in.

const ISSUER = "DigitalHome.Cloud";
const muted = { color: "var(--ov-muted)" };
const mono = { fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.78rem" };

const TwoStepSignIn = ({ email, reloadSession, style }) => {
  const [state, setState] = React.useState("loading"); // loading | off | setup | on
  const [setupUri, setSetupUri] = React.useState(null);
  const [secret, setSecret] = React.useState("");
  const [qr, setQr] = React.useState(null);
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  const load = React.useCallback(async () => {
    try {
      const pref = await fetchMFAPreference();
      setState((pref.enabled || []).includes("TOTP") ? "on" : "off");
    } catch (e) {
      setError(`Could not read your sign-in settings: ${e.message || e}`);
      setState("off");
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const start = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const details = await setUpTOTP();
      const uri = details.getSetupUri(ISSUER, email || undefined).toString();
      setSetupUri(uri);
      setSecret(details.sharedSecret);
      try {
        const QRCode = (await import("qrcode")).default;
        setQr(await QRCode.toDataURL(uri, { margin: 1, width: 180 }));
      } catch {
        setQr(null); // the secret below still works
      }
      setState("setup");
    } catch (e) {
      setError(`Could not start the setup: ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      await verifyTOTPSetup({ code: code.trim() });
      await updateMFAPreference({ totp: "PREFERRED" });
      // New tokens: with TOTP on, the admin group comes back without signing out.
      // forceRefresh, because group changes never reach the tokens already held.
      await fetchAuthSession({ forceRefresh: true });
      if (reloadSession) await reloadSession();
      setCode("");
      setSetupUri(null);
      setSecret("");
      setQr(null);
      setState("on");
      setMessage("Two-step sign-in is on. From now on every DigitalHome.Cloud app asks for a code from your app.");
    } catch (e) {
      setError(`That code did not work (${e.message || e}). Check the time on your phone and try the next code.`);
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Turn off two-step sign-in? Administrator rights need it and will be withheld.")
    )
      return;
    setBusy(true);
    setError("");
    try {
      await updateMFAPreference({ totp: "DISABLED" });
      await fetchAuthSession({ forceRefresh: true });
      if (reloadSession) await reloadSession();
      setState("off");
      setMessage("Two-step sign-in is off.");
    } catch (e) {
      setError(`Could not turn it off: ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ov-info-card" style={style}>
      <h3 style={{ marginTop: 0, fontSize: "0.95rem" }}>Two-step sign-in</h3>
      <p style={{ ...muted, fontSize: "0.78rem", margin: "0 0 0.8rem" }}>
        A code from an authenticator app (Aegis, Google Authenticator, 1Password …) at each sign-in.
        Required for administrators: without it, admin rights are withheld.
      </p>
      {error && <p className="ov-err">{error}</p>}
      {message && <p className="ov-msg">{message}</p>}

      {state === "loading" && <p style={muted}>…</p>}

      {state === "off" && (
        <button type="button" className="ov-btn ov-btn--primary" disabled={busy} onClick={start}>
          {busy ? "Starting…" : "Set up two-step sign-in"}
        </button>
      )}

      {state === "setup" && (
        <div style={{ display: "flex", gap: "1.2rem", flexWrap: "wrap", alignItems: "flex-start" }}>
          {qr && <img src={qr} alt="QR code for your authenticator app" width={180} height={180} />}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", maxWidth: 360 }}>
            <span style={{ fontSize: "0.82rem" }}>
              1. Scan the code with your authenticator app, or enter this key:
            </span>
            <code style={{ ...mono, wordBreak: "break-all" }}>{secret}</code>
            {setupUri && (
              <a href={setupUri} style={{ fontSize: "0.78rem" }}>
                Open in an authenticator app on this device
              </a>
            )}
            <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.82rem" }}>
              2. Enter the 6-digit code it shows:
              <input
                className="ov-input"
                style={{ maxWidth: 160, ...mono }}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                className="ov-btn ov-btn--primary"
                disabled={busy || code.length !== 6}
                onClick={confirm}
              >
                {busy ? "Checking…" : "Turn on"}
              </button>
              <button type="button" className="ov-btn" disabled={busy} onClick={() => setState("off")}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {state === "on" && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
          <span className="ov-pill">On</span>
          <button type="button" className="ov-btn ov-btn--danger" disabled={busy} onClick={turnOff}>
            Turn off
          </button>
        </div>
      )}
    </div>
  );
};

export default TwoStepSignIn;
