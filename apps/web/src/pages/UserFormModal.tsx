import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api } from "../api/client";
import type { Department, Role, User } from "../api/types";
import { useCurrentUser } from "../auth/AuthContext";
import { ErrorBox, Field, Modal } from "../components/ui";
import { ROLE_LABELS } from "../lib/labels";

export function UserFormModal({ user, onClose }: { user?: User; onClose(): void }) {
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const isSelf = user?.id === currentUser.id;

  const departments = useQuery({
    queryKey: ["departments"],
    queryFn: () => api<{ items: Department[] }>("/departments"),
  });

  const [form, setForm] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    email: user?.email ?? "",
    title: user?.title ?? "",
    phone: user?.phone ?? "",
    departmentId: user?.department?.id ?? "",
    role: user?.role ?? ("STAFF" as Role),
    isActive: user?.isActive ?? true,
    password: "",
  });

  const mutation = useMutation({
    mutationFn: () => {
      const { password, isActive, ...rest } = form;
      const body = {
        ...rest,
        departmentId: rest.departmentId || null,
        ...(password && { password }),
        ...(user && { isActive }),
      };
      return user
        ? api<User>(`/users/${user.id}`, { method: "PATCH", body })
        : api<User>("/users", { method: "POST", body });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: ["departments"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onClose();
    },
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <Modal
      title={user ? "Personeli düzenle" : "Yeni personel"}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Vazgeç
          </button>
          <button className="btn btn-primary" type="submit" form="user-form" disabled={mutation.isPending}>
            {mutation.isPending ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </>
      }
    >
      <form id="user-form" className="form-grid" onSubmit={onSubmit}>
        <ErrorBox error={mutation.error} />
        <Field label="Ad">
          <input required maxLength={50} value={form.firstName} onChange={(event) => set("firstName", event.target.value)} />
        </Field>
        <Field label="Soyad">
          <input required maxLength={50} value={form.lastName} onChange={(event) => set("lastName", event.target.value)} />
        </Field>
        <Field label="E-posta">
          <input type="email" required value={form.email} onChange={(event) => set("email", event.target.value)} />
        </Field>
        <Field label="Telefon">
          <input type="tel" maxLength={20} value={form.phone} onChange={(event) => set("phone", event.target.value)} />
        </Field>
        <Field label="Departman">
          <select value={form.departmentId} onChange={(event) => set("departmentId", event.target.value)}>
            <option value="">— Seçilmedi —</option>
            {departments.data?.items.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Unvan">
          <input maxLength={100} value={form.title} onChange={(event) => set("title", event.target.value)} />
        </Field>
        <Field label="Rol" hint={isSelf ? "Kendi rolünüzü değiştiremezsiniz." : undefined}>
          <select value={form.role} disabled={isSelf} onChange={(event) => set("role", event.target.value as Role)}>
            {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={user ? "Yeni şifre" : "Şifre"} hint={user ? "Değiştirmek istemiyorsanız boş bırakın." : "En az 8 karakter"}>
          <input
            type="password"
            autoComplete="new-password"
            minLength={8}
            required={!user}
            value={form.password}
            onChange={(event) => set("password", event.target.value)}
          />
        </Field>
        {user && !isSelf && (
          <label className="checkbox span-2">
            <input type="checkbox" checked={form.isActive} onChange={(event) => set("isActive", event.target.checked)} />
            Hesap aktif (pasif hesaplar giriş yapamaz ve zimmet alamaz)
          </label>
        )}
      </form>
    </Modal>
  );
}
