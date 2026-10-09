import { useState, type FormEvent } from "react";
import { useAuth, useCurrentUser } from "../auth/AuthContext";
import { ErrorBox, Field, PageHeader } from "../components/ui";
import { formatDateTime, fullName } from "../lib/format";
import { ROLE_LABELS } from "../lib/labels";

/** Mirrors the API's password policy so problems show up while typing. */
const PASSWORD_RULES = [
  { label: "En az 10 karakter", test: (value: string) => value.length >= 10 },
  { label: "Bir büyük harf", test: (value: string) => /[A-ZÇĞİÖŞÜ]/.test(value) },
  { label: "Bir küçük harf", test: (value: string) => /[a-zçğıöşü]/.test(value) },
  { label: "Bir rakam", test: (value: string) => /\d/.test(value) },
];

function ChangePasswordForm({ onDone, submitLabel }: { onDone?(): void; submitLabel: string }) {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  const rulesMet = PASSWORD_RULES.every((rule) => rule.test(newPassword));
  const matches = newPassword.length > 0 && newPassword === confirmPassword;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onDone?.();
    } catch (changeError) {
      setError(changeError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={onSubmit}>
      <ErrorBox error={error} />
      <Field label="Mevcut şifre">
        <input
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
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
      <ul className="rule-list" aria-label="Şifre kuralları">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(newPassword);
          return (
            <li key={rule.label} className={ok ? "ok" : ""}>
              <span aria-hidden="true">{ok ? "✓" : "○"}</span> {rule.label}
              <span className="visually-hidden">{ok ? " (sağlandı)" : " (sağlanmadı)"}</span>
            </li>
          );
        })}
      </ul>
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
      <button className="btn btn-primary" type="submit" disabled={submitting || !rulesMet || !matches}>
        {submitting ? "Kaydediliyor…" : submitLabel}
      </button>
    </form>
  );
}

/** Shown instead of the app while the user still holds a temporary password. */
export function ForcedPasswordChangePage() {
  const user = useCurrentUser();
  const { logout } = useAuth();

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <img src="/favicon.svg" alt="" width={40} height={40} />
          <div>
            <h1>Yeni şifre belirleyin</h1>
            <p className="muted">{user.email}</p>
          </div>
        </div>
        <div className="alert alert-info">
          Geçici bir şifreyle giriş yaptınız. Devam etmek için yalnızca sizin bileceğiniz yeni bir şifre belirleyin.
        </div>
        <ChangePasswordForm submitLabel="Şifreyi kaydet ve devam et" />
        <button className="btn btn-ghost" onClick={() => void logout()}>
          Çıkış yap
        </button>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const user = useCurrentUser();
  const [saved, setSaved] = useState(false);

  return (
    <>
      <PageHeader title="Profilim" />
      <div className="detail-grid profile-grid">
        <section className="card">
          <h2 className="card-title">Hesap bilgileri</h2>
          <dl className="info-list">
            <dt>Ad Soyad</dt>
            <dd>{fullName(user)}</dd>
            <dt>E-posta</dt>
            <dd>{user.email}</dd>
            <dt>Rol</dt>
            <dd>{ROLE_LABELS[user.role]}</dd>
            <dt>Departman</dt>
            <dd>{user.department?.name ?? "—"}</dd>
            <dt>Unvan</dt>
            <dd>{user.title ?? "—"}</dd>
            <dt>Son giriş</dt>
            <dd>{formatDateTime(user.lastLoginAt)}</dd>
          </dl>
        </section>
        <section className="card">
          <h2 className="card-title">Şifre değiştir</h2>
          {saved && (
            <div className="alert alert-success" role="status">
              Şifreniz değiştirildi. Diğer cihazlardaki oturumlarınız kapatıldı.
            </div>
          )}
          <ChangePasswordForm submitLabel="Şifreyi değiştir" onDone={() => setSaved(true)} />
        </section>
      </div>
    </>
  );
}
