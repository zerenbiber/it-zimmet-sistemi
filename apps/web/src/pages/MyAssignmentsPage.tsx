import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { api } from "../api/client";
import type { Assignment, Paginated } from "../api/types";
import { useCurrentUser } from "../auth/AuthContext";
import { EmptyState, ErrorBox, Loading, PageHeader } from "../components/ui";
import { formatDateTime } from "../lib/format";
import { DEVICE_TYPE_LABELS } from "../lib/labels";

/** Personel ekranı: API listeyi giriş yapan kullanıcının kendi zimmetleriyle sınırlar. */
export function MyAssignmentsPage() {
  const user = useCurrentUser();
  const { data, error, isPending } = useQuery({
    queryKey: ["assignments", "mine"],
    queryFn: () => api<Paginated<Assignment>>("/assignments", { query: { pageSize: 100 } }),
  });

  const active = data?.items.filter((assignment) => !assignment.returnedAt) ?? [];
  const past = data?.items.filter((assignment) => assignment.returnedAt) ?? [];

  return (
    <>
      <PageHeader title={`Merhaba, ${user.firstName}`} subtitle="Üzerinize zimmetli cihazlar" />
      <ErrorBox error={error} />
      {isPending ? (
        <Loading />
      ) : (
        <>
          {active.length === 0 ? (
            <EmptyState>
              <p>Üzerinize zimmetli cihaz bulunmuyor.</p>
            </EmptyState>
          ) : (
            <div className="device-cards">
              {active.map((assignment) => (
                <article key={assignment.id} className="card device-card">
                  <span className="mono muted small">{assignment.device.assetTag}</span>
                  <h2>
                    {assignment.device.brand} {assignment.device.model}
                  </h2>
                  <p className="muted">{DEVICE_TYPE_LABELS[assignment.device.type]}</p>
                  <dl className="info-list compact">
                    <dt>Seri no</dt>
                    <dd className="mono">{assignment.device.serialNumber}</dd>
                    <dt>Teslim tarihi</dt>
                    <dd>{formatDateTime(assignment.assignedAt)}</dd>
                    {assignment.assignNote && (
                      <>
                        <dt>Not</dt>
                        <dd>{assignment.assignNote}</dd>
                      </>
                    )}
                  </dl>
                  <Link to={`/zimmetler/${assignment.id}/tutanak`} className="btn btn-secondary btn-sm card-action">
                    Zimmet tutanağı
                  </Link>
                </article>
              ))}
            </div>
          )}

          {past.length > 0 && (
            <section className="card table-card">
              <h2 className="card-title">Geçmiş zimmetler</h2>
              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Cihaz</th>
                      <th>Teslim</th>
                      <th>İade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {past.map((assignment) => (
                      <tr key={assignment.id}>
                        <td>
                          <span className="mono">{assignment.device.assetTag}</span> {assignment.device.brand} {assignment.device.model}
                        </td>
                        <td>{formatDateTime(assignment.assignedAt)}</td>
                        <td>{formatDateTime(assignment.returnedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
