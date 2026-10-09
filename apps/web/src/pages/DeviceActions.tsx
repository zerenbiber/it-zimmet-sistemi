import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { api } from "../api/client";
import type { Device, DeviceStatus, Paginated, User } from "../api/types";
import { ErrorBox, Field, Modal } from "../components/ui";
import { fullName } from "../lib/format";
import { useDebouncedValue } from "../lib/hooks";
import { DEVICE_STATUS_LABELS } from "../lib/labels";

interface ActionProps {
  device: Device;
  onClose(): void;
}

function useDeviceMutation(device: Device, path: string, onDone: (updated: Device) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: object) => api<Device>(`/devices/${device.id}/${path}`, { method: "POST", body }),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ["devices"] });
      void queryClient.invalidateQueries({ queryKey: ["assignments"] });
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onDone(updated);
    },
  });
}

function ModalFooter({ formId, pending, label, onClose }: { formId: string; pending: boolean; label: string; onClose(): void }) {
  return (
    <>
      <button className="btn btn-ghost" onClick={onClose}>
        Vazgeç
      </button>
      <button className="btn btn-primary" type="submit" form={formId} disabled={pending}>
        {pending ? "İşleniyor…" : label}
      </button>
    </>
  );
}

export function AssignModal({ device, onClose }: ActionProps) {
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState("");
  const [note, setNote] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const navigate = useNavigate();
  // The hand-over form is opened right away so that it can be printed and signed.
  const mutation = useDeviceMutation(device, "assign", (updated) =>
    updated.currentAssignment ? navigate(`/zimmetler/${updated.currentAssignment.id}/tutanak`) : onClose(),
  );

  const users = useQuery({
    queryKey: ["users", "picker", debouncedSearch],
    queryFn: () => api<Paginated<User>>("/users", { query: { search: debouncedSearch, pageSize: 20 } }),
  });
  const activeUsers = users.data?.items.filter((user) => user.isActive) ?? [];

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ userId, note: note || undefined });
  }

  return (
    <Modal
      title={`${device.assetTag} zimmetle`}
      onClose={onClose}
      footer={<ModalFooter formId="assign-form" pending={mutation.isPending} label="Zimmetle" onClose={onClose} />}
    >
      <form id="assign-form" className="form-stack" onSubmit={onSubmit}>
        <ErrorBox error={mutation.error ?? users.error} />
        <Field label="Personel ara">
          <input type="search" placeholder="Ad, soyad veya e-posta" value={search} onChange={(event) => setSearch(event.target.value)} />
        </Field>
        <div className="picker" role="radiogroup" aria-label="Personel">
          {users.isPending ? (
            <p className="muted">Yükleniyor…</p>
          ) : activeUsers.length === 0 ? (
            <p className="muted">Aktif personel bulunamadı.</p>
          ) : (
            activeUsers.map((user) => (
              <label key={user.id} className={`picker-item${userId === user.id ? " selected" : ""}`}>
                <input type="radio" name="userId" value={user.id} checked={userId === user.id} onChange={() => setUserId(user.id)} required />
                <span>
                  <strong>{fullName(user)}</strong>
                  <span className="muted small">
                    {[user.department?.name, user.title, user.email].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </label>
            ))
          )}
        </div>
        <Field label="Not" hint="İsteğe bağlı — ör. teslim edilen aksesuarlar">
          <textarea rows={2} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}

export function ReturnModal({ device, onClose }: ActionProps) {
  const [status, setStatus] = useState<DeviceStatus>("IN_STOCK");
  const [note, setNote] = useState("");
  const navigate = useNavigate();
  const assignmentId = device.currentAssignment?.id;
  const mutation = useDeviceMutation(device, "return", () =>
    assignmentId ? navigate(`/zimmetler/${assignmentId}/tutanak?tur=iade`) : onClose(),
  );

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ status, note: note || undefined });
  }

  return (
    <Modal
      title={`${device.assetTag} iade al`}
      onClose={onClose}
      footer={<ModalFooter formId="return-form" pending={mutation.isPending} label="İade al" onClose={onClose} />}
    >
      <form id="return-form" className="form-stack" onSubmit={onSubmit}>
        <ErrorBox error={mutation.error} />
        <p>
          Zimmetli personel: <strong>{fullName(device.currentAssignment?.user)}</strong>
        </p>
        <Field label="Cihazın iade durumu">
          <select value={status} onChange={(event) => setStatus(event.target.value as DeviceStatus)}>
            <option value="IN_STOCK">Sağlam — stoğa al</option>
            <option value="FAULTY">Arızalı</option>
          </select>
        </Field>
        <Field label="Not" hint="İsteğe bağlı">
          <textarea rows={2} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}

const MANUAL_STATUSES: DeviceStatus[] = ["IN_STOCK", "FAULTY", "IN_REPAIR", "RETIRED"];

export function StatusModal({ device, onClose }: ActionProps) {
  const options = MANUAL_STATUSES.filter((status) => status !== device.status);
  const [status, setStatus] = useState<DeviceStatus>(options[0]!);
  const [note, setNote] = useState("");
  const mutation = useDeviceMutation(device, "status", onClose);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ status, note: note || undefined });
  }

  return (
    <Modal
      title={`${device.assetTag} durumunu değiştir`}
      onClose={onClose}
      footer={<ModalFooter formId="status-form" pending={mutation.isPending} label="Kaydet" onClose={onClose} />}
    >
      <form id="status-form" className="form-stack" onSubmit={onSubmit}>
        <ErrorBox error={mutation.error} />
        <Field label="Yeni durum">
          <select value={status} onChange={(event) => setStatus(event.target.value as DeviceStatus)}>
            {options.map((option) => (
              <option key={option} value={option}>
                {DEVICE_STATUS_LABELS[option]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Açıklama" hint="İsteğe bağlı — ör. arıza nedeni, servis bilgisi">
          <textarea rows={3} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
