import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  ArrowUpRight,
  Boxes,
  CalendarDays,
  PackageCheck,
  ShieldAlert,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { api } from "../api/client";
import type { DashboardStats } from "../api/types";
import { useCurrentUser } from "../auth/AuthContext";
import { DeviceTypeIcon, EventIcon, type Tone } from "../components/icons";
import { ErrorBox, Loading, STATUS_TONE } from "../components/ui";
import { formatCalendarDate, formatDateTime, formatRelative, fullName } from "../lib/format";
import { DEVICE_EVENT_LABELS, DEVICE_STATUS_LABELS, DEVICE_STATUSES, DEVICE_TYPE_LABELS } from "../lib/labels";

const todayLabel = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" });

function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 6) return "İyi geceler";
  if (hour < 12) return "Günaydın";
  if (hour < 18) return "Hoş geldin";
  return "İyi akşamlar";
}

const percent = (part: number, total: number) => (total === 0 ? 0 : Math.round((part / total) * 100));

export function DashboardPage() {
  const user = useCurrentUser();
  const { data, error, isPending } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardStats>("/dashboard"),
  });

  return (
    <div className="dashboard">
      <header className="hero">
        <div>
          <span className="date-badge">
            <CalendarDays size={14} strokeWidth={2} aria-hidden="true" />
            {todayLabel.format(new Date())}
          </span>
          <h1 className="hero-title">
            {greeting()}, {user.firstName}
          </h1>
          <p className="hero-subtitle">Envanterinin bugünkü durumu tek bakışta burada.</p>
        </div>
        <div className="hero-actions">
          <Link to="/zimmetler?active=true" className="btn btn-secondary">
            Aktif zimmetler
          </Link>
          <Link to="/cihazlar" className="btn btn-primary">
            Cihazlara git
            <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <ErrorBox error={error} />
      {isPending ? (
        <Loading />
      ) : (
        data && (
          <>
            <section className="kpi-grid" aria-label="Özet göstergeler">
              <KpiCard
                icon={Boxes}
                tone="accent"
                label="Toplam cihaz"
                value={data.totalDevices}
                note={`${data.typeCounts.length} farklı türde`}
                to="/cihazlar"
              />
              <KpiCard
                icon={ArrowLeftRight}
                tone="info"
                label="Zimmetli"
                value={data.statusCounts.ASSIGNED}
                note={`Kullanım oranı %${percent(data.statusCounts.ASSIGNED, data.totalDevices)}`}
                to="/cihazlar?status=ASSIGNED"
              />
              <KpiCard
                icon={PackageCheck}
                tone="good"
                label="Stokta"
                value={data.statusCounts.IN_STOCK}
                note="Zimmete hazır"
                to="/cihazlar?status=IN_STOCK"
              />
              <KpiCard
                icon={Wrench}
                tone="critical"
                label="Arızalı / tamirde"
                value={data.statusCounts.FAULTY + data.statusCounts.IN_REPAIR}
                note="Müdahale bekliyor"
                to="/cihazlar?status=FAULTY"
              />
              <KpiCard
                icon={Users}
                tone="neutral"
                label="Aktif personel"
                value={data.activeUserCount}
                note="Sisteme kayıtlı"
                to="/personel"
              />
            </section>

            {data.expiringWarranties.length > 0 && <WarrantyAlert devices={data.expiringWarranties} />}

            <div className="dashboard-grid">
              <section className="panel">
                <PanelHeader title="Envanter durumu" subtitle={`${data.totalDevices} cihazın dağılımı`} />
                <ul className="status-bars">
                  {DEVICE_STATUSES.map((status) => {
                    const count = data.statusCounts[status];
                    const share = percent(count, data.totalDevices);
                    return (
                      <li key={status}>
                        <Link
                          to={`/cihazlar?status=${status}`}
                          className="status-bar-row"
                          title={`${DEVICE_STATUS_LABELS[status]}: ${count} cihaz (%${share})`}
                        >
                          <span className="status-bar-label">
                            <span className={`dot tone-${STATUS_TONE[status]}`} aria-hidden="true" />
                            {DEVICE_STATUS_LABELS[status]}
                          </span>
                          <span className="status-bar-value">
                            <strong>{count}</strong>
                            <span>%{share}</span>
                          </span>
                          <span className="track" aria-hidden="true">
                            <span
                              className={`fill tone-${STATUS_TONE[status]}`}
                              style={{ width: count === 0 ? 0 : `max(${share}%, 6px)` }}
                            />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                <div className="panel-divider" />
                <PanelHeader title="Türlere göre" />
                {data.typeCounts.length === 0 ? (
                  <p className="muted">Henüz cihaz eklenmedi.</p>
                ) : (
                  <ul className="type-list">
                    {[...data.typeCounts]
                      .sort((a, b) => b.count - a.count)
                      .map((row) => (
                        <li key={row.type}>
                          <Link to={`/cihazlar?type=${row.type}`} className="type-chip">
                            <DeviceTypeIcon type={row.type} size={15} />
                            <span>{DEVICE_TYPE_LABELS[row.type]}</span>
                            <strong>{row.count}</strong>
                          </Link>
                        </li>
                      ))}
                  </ul>
                )}
              </section>

              <section className="panel">
                <PanelHeader
                  title="Son hareketler"
                  subtitle="Envanterdeki en son 10 işlem"
                  action={
                    <Link to="/zimmetler" className="link-subtle">
                      Tümü
                    </Link>
                  }
                />
                {data.recentEvents.length === 0 ? (
                  <p className="muted">Henüz bir hareket yok.</p>
                ) : (
                  <ol className="activity">
                    {data.recentEvents.map((event) => (
                      <li key={event.id}>
                        <EventIcon type={event.type} />
                        <div className="activity-body">
                          <p>
                            <Link to={`/cihazlar/${event.device.id}`} className="mono-link">
                              {event.device.assetTag}
                            </Link>{" "}
                            <span className="activity-action">{DEVICE_EVENT_LABELS[event.type].toLocaleLowerCase("tr-TR")}</span>
                          </p>
                          <p className="activity-meta">
                            {event.device.brand} {event.device.model} · {fullName(event.performedBy)}
                          </p>
                        </div>
                        <time dateTime={event.createdAt} title={formatDateTime(event.createdAt)}>
                          {formatRelative(event.createdAt)}
                        </time>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          </>
        )
      )}
    </div>
  );
}

function PanelHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="panel-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  tone,
  label,
  value,
  note,
  to,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: number;
  note: string;
  to: string;
}) {
  return (
    <Link to={to} className={`kpi tone-${tone}`}>
      <span className="kpi-top">
        <span className="kpi-label">{label}</span>
        <span className="kpi-icon" aria-hidden="true">
          <Icon size={16} strokeWidth={2} />
        </span>
      </span>
      <span className="kpi-value">{value.toLocaleString("tr-TR")}</span>
      <span className="kpi-note">{note}</span>
    </Link>
  );
}

function daysUntil(date: string): number {
  const end = new Date(date).getTime();
  const today = Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  return Math.max(0, Math.round((end - today) / 86_400_000));
}

function WarrantyAlert({ devices }: { devices: DashboardStats["expiringWarranties"] }) {
  return (
    <section className="alert-card" aria-labelledby="warranty-alert-title">
      <div className="alert-card-head">
        <span className="alert-card-icon" aria-hidden="true">
          <ShieldAlert size={18} strokeWidth={2} />
        </span>
        <div>
          <h2 id="warranty-alert-title">Garanti süresi dolmak üzere</h2>
          <p>
            {devices.length} cihazın garantisi önümüzdeki 30 gün içinde bitiyor. Gerekirse servis veya uzatma işlemlerini
            şimdiden planlayın.
          </p>
        </div>
      </div>
      <ul className="alert-card-list">
        {devices.map((device) => {
          const days = device.warrantyEndDate ? daysUntil(device.warrantyEndDate) : 0;
          return (
            <li key={device.id}>
              <Link to={`/cihazlar/${device.id}`} title={`Garanti bitişi: ${formatCalendarDate(device.warrantyEndDate)}`}>
                <span className="mono">{device.assetTag}</span>
                <span className="alert-card-device">
                  {device.brand} {device.model}
                </span>
                <span className="alert-card-days">{days === 0 ? "Bugün" : `${days} gün`}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
