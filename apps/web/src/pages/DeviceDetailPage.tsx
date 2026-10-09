import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api } from "../api/client";
import type { DeviceDetail } from "../api/types";
import { ErrorBox, Loading, PageHeader, StatusBadge } from "../components/ui";
import { formatCalendarDate, formatDateTime, fullName } from "../lib/format";
import { DEVICE_EVENT_LABELS, DEVICE_STATUS_LABELS, DEVICE_TYPE_LABELS } from "../lib/labels";
import { AssignModal, ReturnModal, StatusModal } from "./DeviceActions";
import { DeviceFormModal } from "./DeviceFormModal";

type Dialog = "edit" | "assign" | "return" | "status" | null;

export function DeviceDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<Dialog>(null);

  const { data: device, error, isPending } = useQuery({
    queryKey: ["devices", "detail", id],
    queryFn: () => api<DeviceDetail>(`/devices/${id}`),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api(`/devices/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["devices"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigate("/cihazlar", { replace: true });
    },
  });

  if (isPending) {
    return <Loading />;
  }
  if (!device) {
    return (
      <>
        <Link to="/cihazlar" className="back-link">
          ← Cihazlar
        </Link>
        <ErrorBox error={error} />
      </>
    );
  }

  const isAssigned = device.status === "ASSIGNED";
  const close = () => setDialog(null);

  return (
    <>
      <Link to="/cihazlar" className="back-link no-print">
        ← Cihazlar
      </Link>
      <PageHeader
        title={
          <>
            <span className="mono">{device.assetTag}</span> <StatusBadge status={device.status} />
          </>
        }
        subtitle={`${DEVICE_TYPE_LABELS[device.type]} · ${device.brand} ${device.model}`}
        actions={
          <>
            {device.status === "IN_STOCK" && (
              <button className="btn btn-primary" onClick={() => setDialog("assign")}>
                Zimmetle
              </button>
            )}
            {isAssigned && (
              <button className="btn btn-primary" onClick={() => setDialog("return")}>
                İade al
              </button>
            )}
            {!isAssigned && (
              <button className="btn btn-secondary" onClick={() => setDialog("status")}>
                Durum değiştir
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => setDialog("edit")}>
              Düzenle
            </button>
            {!isAssigned && (
              <button
                className="btn btn-danger"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (confirm(`${device.assetTag} envanterden silinsin mi? Geçmiş kayıtları korunur.`)) {
                    deleteMutation.mutate();
                  }
                }}
              >
                Sil
              </button>
            )}
          </>
        }
      />
      <ErrorBox error={deleteMutation.error} />

      <div className="detail-grid">
        <section className="card">
          <h2 className="card-title">Cihaz bilgileri</h2>
          <dl className="info-list">
            <dt>Tür</dt>
            <dd>{DEVICE_TYPE_LABELS[device.type]}</dd>
            <dt>Marka</dt>
            <dd>{device.brand}</dd>
            <dt>Model</dt>
            <dd>{device.model}</dd>
            <dt>Seri numarası</dt>
            <dd className="mono">{device.serialNumber}</dd>
            <dt>Alış tarihi</dt>
            <dd>{formatCalendarDate(device.purchaseDate)}</dd>
            <dt>Garanti bitişi</dt>
            <dd>{formatCalendarDate(device.warrantyEndDate)}</dd>
            <dt>Zimmetli personel</dt>
            <dd>
              {device.currentAssignment ? (
                <>
                  <Link to={`/zimmetler?userId=${device.currentAssignment.user.id}&active=true`}>
                    {fullName(device.currentAssignment.user)}
                  </Link>
                  <span className="muted small"> · {formatDateTime(device.currentAssignment.assignedAt)} tarihinden beri</span>
                </>
              ) : (
                "—"
              )}
            </dd>
            {device.notes && (
              <>
                <dt>Notlar</dt>
                <dd className="pre-wrap">{device.notes}</dd>
              </>
            )}
          </dl>
        </section>

        <section className="card qr-card">
          <h2 className="card-title">QR etiketi</h2>
          <div className="qr-label print-area">
            <QRCodeSVG value={device.assetTag} size={148} marginSize={2} />
            <div>
              <strong className="mono">{device.assetTag}</strong>
              <div className="small">
                {device.brand} {device.model}
              </div>
              <div className="small mono">SN: {device.serialNumber}</div>
            </div>
          </div>
          <button className="btn btn-secondary no-print" onClick={() => window.print()}>
            Etiketi yazdır
          </button>
        </section>
      </div>

      <section className="card table-card no-print">
        <h2 className="card-title">Zimmet geçmişi</h2>
        {device.assignments.length === 0 ? (
          <p className="muted">Bu cihaz henüz kimseye zimmetlenmedi.</p>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Personel</th>
                  <th>Zimmet tarihi</th>
                  <th>Zimmetleyen</th>
                  <th>İade tarihi</th>
                  <th>İade alan</th>
                  <th>Notlar</th>
                  <th>Tutanak</th>
                </tr>
              </thead>
              <tbody>
                {device.assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>{fullName(assignment.user)}</td>
                    <td>{formatDateTime(assignment.assignedAt)}</td>
                    <td>{fullName(assignment.assignedBy)}</td>
                    <td>{assignment.returnedAt ? formatDateTime(assignment.returnedAt) : <span className="tag">Aktif</span>}</td>
                    <td>{fullName(assignment.returnedTo)}</td>
                    <td className="small">
                      {[assignment.assignNote, assignment.returnNote && `İade: ${assignment.returnNote}`].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="nowrap">
                      <Link to={`/zimmetler/${assignment.id}/tutanak`}>Zimmet</Link>
                      {assignment.returnedAt && (
                        <>
                          {" · "}
                          <Link to={`/zimmetler/${assignment.id}/tutanak?tur=iade`}>İade</Link>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card no-print">
        <h2 className="card-title">Hareket geçmişi</h2>
        <ol className="timeline">
          {device.events.map((event) => (
            <li key={event.id}>
              <div className="timeline-head">
                <strong>{DEVICE_EVENT_LABELS[event.type]}</strong>
                {event.fromStatus && event.toStatus && (
                  <span className="muted small">
                    {DEVICE_STATUS_LABELS[event.fromStatus]} → {DEVICE_STATUS_LABELS[event.toStatus]}
                  </span>
                )}
              </div>
              {event.description && <div className="small">{event.description}</div>}
              <div className="muted small">
                {formatDateTime(event.createdAt)} · {fullName(event.performedBy)}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {dialog === "edit" && <DeviceFormModal device={device} onClose={close} onSaved={close} />}
      {dialog === "assign" && <AssignModal device={device} onClose={close} />}
      {dialog === "return" && <ReturnModal device={device} onClose={close} />}
      {dialog === "status" && <StatusModal device={device} onClose={close} />}
    </>
  );
}
