import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { api } from "../api/client";
import type { Department } from "../api/types";
import { ErrorBox, Loading, PageHeader } from "../components/ui";

export function DepartmentsPage() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  const { data, error, isPending } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api<{ items: Department[] }>("/departments"),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["departments"] });

  const createMutation = useMutation({
    mutationFn: (name: string) => api("/departments", { method: "POST", body: { name } }),
    onSuccess: () => {
      setNewName("");
      void invalidate();
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api(`/departments/${id}`, { method: "PATCH", body: { name } }),
    onSuccess: () => {
      setEditing(null);
      void invalidate();
      // Department names are embedded in user and device listings.
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/departments/${id}`, { method: "DELETE" }),
    onSuccess: () => void invalidate(),
  });

  function onCreate(event: FormEvent) {
    event.preventDefault();
    createMutation.mutate(newName);
  }

  function onRename(event: FormEvent) {
    event.preventDefault();
    if (editing) {
      renameMutation.mutate(editing);
    }
  }

  return (
    <>
      <PageHeader title="Departmanlar" subtitle="Personelin bağlı olduğu birimler" />

      <form className="toolbar" onSubmit={onCreate}>
        <input
          className="toolbar-search"
          placeholder="Yeni departman adı"
          minLength={2}
          maxLength={100}
          required
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          aria-label="Yeni departman adı"
        />
        <button className="btn btn-primary" type="submit" disabled={createMutation.isPending}>
          <Plus size={16} strokeWidth={2.25} aria-hidden="true" />
          Ekle
        </button>
      </form>

      <ErrorBox error={error ?? createMutation.error ?? renameMutation.error ?? deleteMutation.error} />
      {isPending ? (
        <Loading />
      ) : (
        data && (
          <div className="card table-card">
            <table className="table">
              <thead>
                <tr>
                  <th>Departman</th>
                  <th>Personel sayısı</th>
                  <th aria-label="İşlemler" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((department) => (
                  <tr key={department.id}>
                    <td>
                      {editing?.id === department.id ? (
                        <form className="inline-form" onSubmit={onRename}>
                          <input
                            autoFocus
                            minLength={2}
                            maxLength={100}
                            required
                            value={editing.name}
                            onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                            aria-label="Departman adı"
                          />
                          <button className="btn btn-primary btn-sm" type="submit" disabled={renameMutation.isPending}>
                            Kaydet
                          </button>
                          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditing(null)}>
                            Vazgeç
                          </button>
                        </form>
                      ) : (
                        <strong>{department.name}</strong>
                      )}
                    </td>
                    <td>
                      {department.userCount > 0 ? (
                        <Link to={`/personel?departmentId=${department.id}`}>{department.userCount} kişi</Link>
                      ) : (
                        <span className="muted">0</span>
                      )}
                    </td>
                    <td className="row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ id: department.id, name: department.name })}>
                        Yeniden adlandır
                      </button>
                      <button
                        className="btn btn-ghost btn-sm text-danger"
                        disabled={department.userCount > 0 || deleteMutation.isPending}
                        title={department.userCount > 0 ? "Personeli olan departman silinemez" : undefined}
                        onClick={() => {
                          if (confirm(`"${department.name}" departmanı silinsin mi?`)) {
                            deleteMutation.mutate(department.id);
                          }
                        }}
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </>
  );
}
