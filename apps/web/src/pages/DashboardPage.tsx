import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { api } from "../api/client";
import type { DashboardStats, DeviceStatus } from "../api/types";
import { useCurrentUser } from "../auth/AuthContext";
import { ErrorBox, Loading, PageHeader, StatusBadge } from "../components/ui";
import { formatCalendarDate, formatDateTime, fullName } from "../lib/format";
import { DEVICE_EVENT_LABELS, DEVICE_STATUSES, DEVICE_TYPE_LABELS } from "../lib/labels";

export function DashboardPage() {
  const user = useCurrentUser();
  const { data, error, isPending } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardStats>("/dashboard"),
  });

  return (
    <>
      <PageHeader title={`Hoş geldin, ${user.firstName}`} subtitle="Envanterin genel durumu" />
      <ErrorBox error={error} />
      {isPending ? (
        <Loading />
      ) : (
        data && (
          <>
            <section className="stat-grid" aria-label="Özet">
              <StatTile label="Toplam cihaz" value={data.totalDevices} to="/cihazlar" />
              <StatTile label="Zimmetli" value={data.statusCounts.ASSIGNED} to="/cihazlar?status=ASSIGNED" />
              <StatTile label="Stokta" value={data.statusCounts.IN_STOCK} to="/cihazlar?status=IN_STOCK" />
              <StatTile
                label="Arızalı / tamirde"
                value={data.statusCounts.FAULTY + data.statusCounts.IN_REPAIR}
                to="/cihazlar?status=FAULTY"
              />
              <StatTile label="Aktif personel" value={data.activeUserCount} to="/personel" />
            </section>

            <div className="dashboard-grid">
              <section className="card">
                <h2 className="card-title">Durumlara göre cihazlar</h2>
                <ul className="status-list">
                  {DEVICE_STATUSES.map((status: DeviceStatus) => (
                    <li key={status}>
                      <Link to={`/cihazlar?status=${status}`}>
                        <StatusBadge status={status} />
                      </Link>
                      <strong>{data.statusCounts[status]}</strong>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="card">
                <h2 className="card-title">Türlere göre cihazlar</h2>
                <TypeBars rows={data.typeCounts} />
              </section>

              <section className="card">
                <h2 className="card-title">Garantisi 30 gün içinde bitecekler</h2>
                {data.expiringWarranties.length === 0 ? (
                  <p className="muted">Yakında garantisi bitecek cihaz yok.</p>
                ) : (
                  <ul className="simple-list">
                    {data.expiringWarranties.map((device) => (
                      <li key={device.id}>
                        <Link to={`/cihazlar/${device.id}`}>
                          <span className="mono">{device.assetTag}</span> {device.brand} {device.model}
                        </Link>
                        <span className="muted">{formatCalendarDate(device.warrantyEndDate)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="card">
                <h2 className="card-title">Son hareketler</h2>
                {data.recentEvents.length === 0 ? (
                  <p className="muted">Henüz bir hareket yok.</p>
                ) : (
                  <ul className="simple-list">
                    {data.recentEvents.map((event) => (
                      <li key={event.id}>
                        <div>
                          <Link to={`/cihazlar/${event.device.id}`} className="mono">
                            {event.device.assetTag}
                          </Link>{" "}
                          {DEVICE_EVENT_LABELS[event.type]}
                          <div className="muted small">{fullName(event.performedBy)}</div>
                        </div>
                        <span className="muted small">{formatDateTime(event.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        )
      )}
    </>
  );
}

function StatTile({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Link to={to} className="stat-tile">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value.toLocaleString("tr-TR")}</span>
    </Link>
  );
}

/** Single-series bar list: one hue, values printed beside each bar. */
function TypeBars({ rows }: { rows: DashboardStats["typeCounts"] }) {
  if (rows.length === 0) {
    return <p className="muted">Henüz cihaz eklenmedi.</p>;
  }
  const sorted = [...rows].sort((a, b) => b.count - a.count);
  const max = sorted[0]!.count;

  return (
    <ul className="bar-list">
      {sorted.map((row) => (
        <li key={row.type} title={`${DEVICE_TYPE_LABELS[row.type]}: ${row.count}`}>
          <Link to={`/cihazlar?type=${row.type}`} className="bar-label">
            {DEVICE_TYPE_LABELS[row.type]}
          </Link>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${(row.count / max) * 100}%` }} />
          </span>
          <span className="bar-value">{row.count}</span>
        </li>
      ))}
    </ul>
  );
}
