import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { api } from "../api/client";
import type { Assignment, Paginated, User } from "../api/types";
import { EmptyState, ErrorBox, Loading, PageHeader, Pagination } from "../components/ui";
import { formatDateTime, fullName } from "../lib/format";
import { useUrlFilters } from "../lib/hooks";
import { DEVICE_TYPE_LABELS } from "../lib/labels";

const FILTER_KEYS = ["active", "userId"] as const;

export function AssignmentsPage() {
  const { values, page, update } = useUrlFilters(FILTER_KEYS);

  const { data, error, isPending } = useQuery({
    queryKey: ["assignments", "list", values, page],
    queryFn: () => api<Paginated<Assignment>>("/assignments", { query: { ...values, page } }),
    placeholderData: keepPreviousData,
  });

  const filteredUser = useQuery({
    queryKey: ["users", "detail", values.userId],
    queryFn: () => api<User>(`/users/${values.userId}`),
    enabled: Boolean(values.userId),
  });

  return (
    <>
      <PageHeader title="Zimmetler" subtitle="Cihazların kime, ne zaman teslim edildiği" />

      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Zimmet durumu">
          {[
            { value: "", label: "Tümü" },
            { value: "true", label: "Aktif" },
            { value: "false", label: "İade edilmiş" },
          ].map((option) => (
            <button
              key={option.value}
              className={values.active === option.value ? "active" : ""}
              aria-pressed={values.active === option.value}
              onClick={() => update({ active: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
        {values.userId && (
          <span className="filter-chip">
            Personel: {filteredUser.data ? fullName(filteredUser.data) : "…"}
            <button onClick={() => update({ userId: "" })} aria-label="Personel filtresini kaldır">
              ×
            </button>
          </span>
        )}
      </div>

      <ErrorBox error={error} />
      {isPending ? (
        <Loading />
      ) : data && data.items.length === 0 ? (
        <EmptyState>
          <p>Kayıtlı zimmet bulunamadı.</p>
        </EmptyState>
      ) : (
        data && (
          <div className="card table-card">
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Cihaz</th>
                    <th>Personel</th>
                    <th>Zimmet tarihi</th>
                    <th>Zimmetleyen</th>
                    <th>İade</th>
                    <th>Tutanak</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((assignment) => (
                    <tr key={assignment.id}>
                      <td>
                        <Link to={`/cihazlar/${assignment.device.id}`} className="mono">
                          {assignment.device.assetTag}
                        </Link>
                        <div className="muted small">
                          {DEVICE_TYPE_LABELS[assignment.device.type]} · {assignment.device.brand} {assignment.device.model}
                        </div>
                      </td>
                      <td>
                        <button className="link-btn" onClick={() => update({ userId: assignment.user.id })}>
                          {fullName(assignment.user)}
                        </button>
                        {assignment.user.department && <div className="muted small">{assignment.user.department.name}</div>}
                      </td>
                      <td>
                        {formatDateTime(assignment.assignedAt)}
                        {assignment.assignNote && <div className="muted small">{assignment.assignNote}</div>}
                      </td>
                      <td>{fullName(assignment.assignedBy)}</td>
                      <td>
                        {assignment.returnedAt ? (
                          <>
                            {formatDateTime(assignment.returnedAt)}
                            <div className="muted small">{fullName(assignment.returnedTo)}</div>
                          </>
                        ) : (
                          <span className="tag tag-info">Aktif</span>
                        )}
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
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={(next) => update({ page: next })} />
          </div>
        )
      )}
    </>
  );
}
