import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { api } from "../api/client";
import type { AssignmentDocument } from "../api/types";
import { useCurrentUser } from "../auth/AuthContext";
import { ErrorBox, Loading } from "../components/ui";
import { formatCalendarDate, formatDate, formatDateTime, fullName } from "../lib/format";
import { DEVICE_TYPE_LABELS } from "../lib/labels";

/** Zimmet id'sinden türetilen kısa tutanak numarası. */
const documentNumber = (id: string, kind: "Z" | "I") => `${kind}-${id.slice(0, 8).toUpperCase()}`;

/** Yazdırılabilir teslim tutanağı (`?tur=zimmet`, varsayılan) ya da iade tutanağı (`?tur=iade`). */
export function AssignmentDocumentPage() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const user = useCurrentUser();

  const { data, error, isPending } = useQuery({
    queryKey: ["assignments", "document", id],
    queryFn: () => api<AssignmentDocument>(`/assignments/${id}`),
  });

  const isReturn = params.get("tur") === "iade" && Boolean(data?.returnedAt);

  useEffect(() => {
    if (data) {
      document.title = `${isReturn ? "İade" : "Zimmet"} Tutanağı - ${data.device.assetTag}`;
    }
    return () => {
      document.title = "IT Zimmet Sistemi";
    };
  }, [data, isReturn]);

  if (isPending) {
    return <Loading />;
  }
  if (!data) {
    return <ErrorBox error={error} />;
  }

  const { device } = data;
  const giver = isReturn ? data.user : data.assignedBy;
  const receiver = isReturn ? data.returnedTo : data.user;
  const date = isReturn ? data.returnedAt : data.assignedAt;
  const note = isReturn ? data.returnNote : data.assignNote;

  return (
    <>
      <div className="document-toolbar no-print">
        {user.role === "ADMIN" ? (
          <Link to={`/cihazlar/${device.id}`} className="back-link">
            ← {device.assetTag}
          </Link>
        ) : (
          <Link to="/" className="back-link">
            ← Zimmetlerim
          </Link>
        )}
        <div className="page-actions">
          {data.returnedAt && (
            <div className="segmented" role="group" aria-label="Tutanak türü">
              <button className={!isReturn ? "active" : ""} aria-pressed={!isReturn} onClick={() => setParams({})}>
                Zimmet tutanağı
              </button>
              <button className={isReturn ? "active" : ""} aria-pressed={isReturn} onClick={() => setParams({ tur: "iade" })}>
                İade tutanağı
              </button>
            </div>
          )}
          <button className="btn btn-primary" onClick={() => window.print()}>
            Yazdır / PDF
          </button>
        </div>
      </div>

      <article className="document print-area">
        <header className="document-header">
          <div>
            <div className="document-org">{data.organizationName}</div>
            <div className="document-unit">Bilgi İşlem Birimi</div>
          </div>
          <QRCodeSVG value={device.assetTag} size={64} marginSize={0} />
        </header>

        <h1 className="document-title">{isReturn ? "DEMİRBAŞ İADE TUTANAĞI" : "DEMİRBAŞ ZİMMET TUTANAĞI"}</h1>

        <table className="document-meta">
          <tbody>
            <tr>
              <th>Tutanak No</th>
              <td>{documentNumber(data.id, isReturn ? "I" : "Z")}</td>
              <th>Tarih</th>
              <td>{formatDateTime(date)}</td>
            </tr>
          </tbody>
        </table>

        <h2 className="document-section">{isReturn ? "İade Eden Personel" : "Teslim Alan Personel"}</h2>
        <table className="document-table">
          <tbody>
            <tr>
              <th>Adı Soyadı</th>
              <td>{fullName(data.user)}</td>
              <th>Unvanı</th>
              <td>{data.user.title ?? ""}</td>
            </tr>
            <tr>
              <th>Birimi</th>
              <td>{data.user.department?.name ?? ""}</td>
              <th>İletişim</th>
              <td>{[data.user.email, data.user.phone].filter(Boolean).join(" · ")}</td>
            </tr>
          </tbody>
        </table>

        <h2 className="document-section">Demirbaş Bilgileri</h2>
        <table className="document-table">
          <tbody>
            <tr>
              <th>Demirbaş No</th>
              <td className="mono">{device.assetTag}</td>
              <th>Cinsi</th>
              <td>{DEVICE_TYPE_LABELS[device.type]}</td>
            </tr>
            <tr>
              <th>Marka</th>
              <td>{device.brand}</td>
              <th>Model</th>
              <td>{device.model}</td>
            </tr>
            <tr>
              <th>Seri No</th>
              <td className="mono">{device.serialNumber}</td>
              <th>Alış Tarihi</th>
              <td>{formatCalendarDate(device.purchaseDate)}</td>
            </tr>
            <tr>
              <th>Garanti Bitişi</th>
              <td>{formatCalendarDate(device.warrantyEndDate)}</td>
              <th>{isReturn ? "Zimmet Tarihi" : "Adet"}</th>
              <td>{isReturn ? formatDate(data.assignedAt) : "1"}</td>
            </tr>
            <tr>
              <th>{isReturn ? "İade Notu" : "Açıklama / Aksesuarlar"}</th>
              <td colSpan={3} className="document-note">
                {note ?? ""}
              </td>
            </tr>
          </tbody>
        </table>

        <p className="document-statement">
          {isReturn ? (
            <>
              Yukarıda bilgileri yazılı demirbaş, <strong>{fullName(data.user)}</strong> tarafından{" "}
              <strong>{formatDate(data.returnedAt)}</strong> tarihinde bilgi işlem birimine iade edilmiş ve personelin
              üzerindeki zimmet kaydı kapatılmıştır.
            </>
          ) : (
            <>
              Yukarıda bilgileri yazılı demirbaşı sağlam ve çalışır durumda teslim aldım. Cihazı yalnızca görevim gereği ve
              özenle kullanacağımı; kaybolması, çalınması veya arızalanması durumunda derhal bilgi işlem birimine
              bildireceğimi; görevimden ayrılmam ya da talep edilmesi hâlinde eksiksiz olarak iade edeceğimi kabul ve
              taahhüt ederim.
            </>
          )}
        </p>

        <div className="document-signatures">
          <SignatureBox role="Teslim Eden" person={giver} />
          <SignatureBox role="Teslim Alan" person={receiver} />
        </div>

        <footer className="document-footer">
          Bu belge IT Zimmet Sistemi tarafından {formatDateTime(new Date().toISOString())} tarihinde oluşturulmuştur.
        </footer>
      </article>
    </>
  );
}

function SignatureBox({ role, person }: { role: string; person: AssignmentDocument["assignedBy"] | null }) {
  return (
    <div className="signature-box">
      <div className="signature-role">{role}</div>
      <div className="signature-name">{person ? fullName(person) : ""}</div>
      <div className="signature-title">{[person?.title, person?.department?.name].filter(Boolean).join(" · ")}</div>
      <div className="signature-line">İmza</div>
    </div>
  );
}
