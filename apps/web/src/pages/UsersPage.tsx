import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../api/client";
import type { Department, Paginated, User } from "../api/types";
import { useCurrentUser } from "../auth/AuthContext";
import { EmptyState, ErrorBox, Loading, PageHeader, Pagination, SearchField } from "../components/ui";
import { fullName } from "../lib/format";
import { useDebouncedValue, useUrlFilters } from "../lib/hooks";
import { ROLE_LABELS } from "../lib/labels";
import { UserFormModal } from "./UserFormModal";

const FILTER_KEYS = ["search", "departmentId"] as const;

export function UsersPage() {
  const currentUser = useCurrentUser();
  const queryClient = useQueryClient();
  const { values, page, update } = useUrlFilters(FILTER_KEYS);
  const [searchInput, setSearchInput] = useState(values.search);
  const debouncedSearch = useDebouncedValue(searchInput);
  const [editing, setEditing] = useState<User | "new" | null>(null);

  useEffect(() => {
    if (debouncedSearch !== values.search) {
      update({ search: debouncedSearch });
    }
    // URL'ye sadece debounce edilmiş değer yazılsın.
  }, [debouncedSearch]);

  const departments = useQuery({
    queryKey: ["departments"],
    queryFn: () => api<{ items: Department[] }>("/departments"),
  });

  const { data, error, isPending } = useQuery({
    queryKey: ["users", "list", values, page],
    queryFn: () => api<Paginated<User>>("/users", { query: { ...values, page } }),
    placeholderData: keepPreviousData,
  });

  const [notice, setNotice] = useState<string | null>(null);

  const resetMutation = useMutation({
    mutationFn: (user: User) => api(`/users/${user.id}/reset-password`, { method: "POST" }),
    onSuccess: (_result, user) => {
      setNotice(`${fullName(user)} için yeni geçici şifre ${user.email} adresine gönderildi.`);
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: ["departments"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <>
      <PageHeader
        title="Personel"
        subtitle="Sisteme kayıtlı çalışanlar"
        actions={
          <button className="btn btn-primary" onClick={() => setEditing("new")}>
            <Plus size={16} strokeWidth={2.25} aria-hidden="true" />
            Yeni personel
          </button>
        }
      />

      <div className="toolbar">
        <SearchField
          placeholder="Ad, soyad veya e-posta ara…"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          aria-label="Personel ara"
        />
        <select value={values.departmentId} onChange={(event) => update({ departmentId: event.target.value })} aria-label="Departman">
          <option value="">Tüm departmanlar</option>
          {departments.data?.items.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      </div>

      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}
      <ErrorBox error={error ?? deleteMutation.error ?? resetMutation.error} />
      {isPending ? (
        <Loading />
      ) : data && data.items.length === 0 ? (
        <EmptyState>
          <p>Kriterlere uyan personel bulunamadı.</p>
        </EmptyState>
      ) : (
        data && (
          <div className="card table-card">
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ad Soyad</th>
                    <th>E-posta</th>
                    <th>Departman</th>
                    <th>Rol</th>
                    <th>Durum</th>
                    <th>Zimmetli cihaz</th>
                    <th aria-label="İşlemler" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <strong>{fullName(user)}</strong>
                        {user.title && <div className="muted small">{user.title}</div>}
                      </td>
                      <td>{user.email}</td>
                      <td>{user.department?.name ?? <span className="muted">—</span>}</td>
                      <td>{ROLE_LABELS[user.role]}</td>
                      <td>
                        {user.isActive ? <span className="tag tag-good">Aktif</span> : <span className="tag">Pasif</span>}
                        {user.isActive && user.mustChangePassword && (
                          <div className="muted small">Şifre belirlemedi</div>
                        )}
                      </td>
                      <td>
                        {user.activeAssignmentCount > 0 ? (
                          <Link to={`/zimmetler?userId=${user.id}&active=true`}>{user.activeAssignmentCount} cihaz</Link>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td className="row-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(user)}>
                          Düzenle
                        </button>
                        {user.id !== currentUser.id && user.isActive && (
                          <button
                            className="btn btn-ghost btn-sm"
                            disabled={resetMutation.isPending}
                            onClick={() => {
                              if (confirm(`${fullName(user)} için yeni bir geçici şifre üretilip ${user.email} adresine gönderilsin mi? Mevcut oturumları kapatılır.`)) {
                                setNotice(null);
                                resetMutation.mutate(user);
                              }
                            }}
                          >
                            Şifre sıfırla
                          </button>
                        )}
                        {user.id !== currentUser.id && (
                          <button
                            className="btn btn-ghost btn-sm text-danger"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (confirm(`${fullName(user)} silinsin mi? Zimmet geçmişi korunur.`)) {
                                deleteMutation.mutate(user.id);
                              }
                            }}
                          >
                            Sil
                          </button>
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

      {editing && (
        <UserFormModal
          user={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onCreated={(created) =>
            setNotice(`${fullName(created)} eklendi. Geçici şifresi ${created.email} adresine gönderildi.`)
          }
        />
      )}
    </>
  );
}
