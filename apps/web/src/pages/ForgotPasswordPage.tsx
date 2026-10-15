import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { api } from "../api/client";
import { ErrorBox, Field } from "../components/ui";
import { PASSWORD_RULES, PasswordRuleList } from "./ChangePasswordPages";

type Step = "email" | "code" | "done";

/**
 * Şifremi unuttum: önce e-postaya 6 haneli kod istenir, sonra kod ve yeni şifre girilir.
 * Mevcut şifre kod doğrulanana kadar değişmez.
 */
export function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  const rulesMet = PASSWORD_RULES.every((rule) => rule.test(newPassword));
  const matches = newPassword.length > 0 && newPassword === confirmPassword;

  async function run(action: () => Promise<void>) {
    setSubmitting(true);
    setError(null);
    try {
      await action();
    } catch (actionError) {
      setError(actionError);
    } finally {
      setSubmitting(false);
    }
  }

  function sendCode(event?: FormEvent) {
    event?.preventDefault();
    return run(async () => {
      await api("/auth/forgot-password", { method: "POST", body: { email } });
      setCode("");
      setStep("code");
    });
  }

  function resetPassword(event: FormEvent) {
    event.preventDefault();
    return run(async () => {
      await api("/auth/reset-password", { method: "POST", body: { email, code, newPassword } });
      setStep("done");
    });
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <img src="/favicon.svg" alt="" width={40} height={40} />
          <div>
            <h1>Şifremi unuttum</h1>
            <p className="muted">
              {step === "email" && "E-posta adresinize bir doğrulama kodu göndereceğiz."}
              {step === "code" && "E-postanıza gelen kodu ve yeni şifrenizi girin."}
              {step === "done" && "Şifreniz güncellendi."}
            </p>
          </div>
        </div>

        {step === "email" && (
          <form className="form-stack" onSubmit={sendCode}>
            <ErrorBox error={error} />
            <Field label="E-posta">
              <input
                type="email"
                autoComplete="username"
                required
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
              {submitting ? "Gönderiliyor…" : "Kod gönder"}
            </button>
          </form>
        )}

        {step === "code" && (
          <form className="form-stack" onSubmit={resetPassword}>
            <div className="alert alert-info">
              <span>
                <strong>{email}</strong> sistemde kayıtlıysa 6 haneli bir kod gönderildi. Kod 15 dakika geçerli.
              </span>
            </div>
            <ErrorBox error={error} />
            <Field label="Doğrulama kodu">
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                autoFocus
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              />
            </Field>
            <Field label="Yeni şifre">
              <input
                type="password"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </Field>
            <PasswordRuleList value={newPassword} />
            <Field label="Yeni şifre (tekrar)">
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </Field>
            {confirmPassword && !matches && <p className="text-danger small">Şifreler eşleşmiyor.</p>}
            <button
              className="btn btn-primary btn-block"
              type="submit"
              disabled={submitting || code.length !== 6 || !rulesMet || !matches}
            >
              {submitting ? "Kaydediliyor…" : "Şifreyi değiştir"}
            </button>
            <button className="link-btn small" type="button" onClick={() => sendCode()} disabled={submitting}>
              Kodu tekrar gönder
            </button>
          </form>
        )}

        {step === "done" && (
          <>
            <div className="alert alert-success">
              <span>Yeni şifrenizle giriş yapabilirsiniz. Diğer cihazlardaki oturumlarınız kapatıldı.</span>
            </div>
            <Link className="btn btn-primary btn-block" to="/giris">
              Girişe dön
            </Link>
          </>
        )}

        {step !== "done" && (
          <div className="login-footer">
            <Link className="link-subtle" to="/giris">
              ← Girişe dön
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
