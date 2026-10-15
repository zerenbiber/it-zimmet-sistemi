import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
});

interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendMail(mail: Mail): Promise<void> {
  await transporter.sendMail({ from: env.MAIL_FROM, ...mail });
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/** "Şifremi unuttum" ile istenen 6 haneli doğrulama kodu. */
export function passwordResetCodeMail(params: { to: string; firstName: string; code: string; validMinutes: number }): Mail {
  return {
    to: params.to,
    subject: "IT Zimmet Sistemi şifre sıfırlama kodu",
    text: [
      `Merhaba ${params.firstName},`,
      "",
      `Şifre sıfırlama kodunuz: ${params.code}`,
      "",
      `Kod ${params.validMinutes} dakika geçerlidir. Kodu şifre sıfırlama ekranına girip yeni şifrenizi belirleyin.`,
      "Bu işlemi siz talep etmediyseniz bu e-postayı dikkate almayın; mevcut şifreniz değişmedi.",
    ].join("\n"),
    html: `
      <div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#0b0b0b;max-width:520px">
        <p>Merhaba ${escapeHtml(params.firstName)},</p>
        <p>Şifre sıfırlama kodunuz:</p>
        <p><code style="font-size:24px;letter-spacing:4px;background:#f0efec;padding:8px 14px;border-radius:6px">${escapeHtml(params.code)}</code></p>
        <p>Kod ${params.validMinutes} dakika geçerlidir. Kodu şifre sıfırlama ekranına girip yeni şifrenizi belirleyin.</p>
        <p style="color:#52514e;font-size:12px">Bu işlemi siz talep etmediyseniz bu e-postayı dikkate almayın; mevcut şifreniz değişmedi.</p>
      </div>`,
  };
}

/** Geçici şifreyi kullanıcıya gönderen e-posta. */
export function temporaryPasswordMail(params: {
  to: string;
  firstName: string;
  password: string;
  reason: "created" | "reset";
}): Mail {
  const intro =
    params.reason === "created"
      ? `${env.ORGANIZATION_NAME} IT Zimmet Sistemi için hesabınız oluşturuldu.`
      : "Hesabınızın şifresi yönetici tarafından sıfırlandı.";
  const loginUrl = `${env.APP_URL.replace(/\/$/, "")}/giris`;

  return {
    to: params.to,
    subject: params.reason === "created" ? "IT Zimmet Sistemi hesabınız" : "IT Zimmet Sistemi şifre sıfırlama",
    text: [
      `Merhaba ${params.firstName},`,
      "",
      intro,
      "",
      `Kullanıcı adı: ${params.to}`,
      `Geçici şifre: ${params.password}`,
      "",
      `Giriş adresi: ${loginUrl}`,
      "",
      "İlk girişinizde bu geçici şifreyi kendi belirleyeceğiniz bir şifreyle değiştirmeniz istenecek.",
      "Bu işlemi siz talep etmediyseniz bilgi işlem birimine haber verin.",
    ].join("\n"),
    html: `
      <div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#0b0b0b;max-width:520px">
        <p>Merhaba ${escapeHtml(params.firstName)},</p>
        <p>${escapeHtml(intro)}</p>
        <table style="border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:4px 12px 4px 0;color:#52514e">Kullanıcı adı</td><td><strong>${escapeHtml(params.to)}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#52514e">Geçici şifre</td>
              <td><code style="font-size:16px;background:#f0efec;padding:4px 8px;border-radius:4px">${escapeHtml(params.password)}</code></td></tr>
        </table>
        <p><a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#2a78d6;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Giriş yap</a></p>
        <p>İlk girişinizde bu geçici şifreyi kendi belirleyeceğiniz bir şifreyle değiştirmeniz istenecek.</p>
        <p style="color:#52514e;font-size:12px">Bu işlemi siz talep etmediyseniz bilgi işlem birimine haber verin.</p>
      </div>`,
  };
}
