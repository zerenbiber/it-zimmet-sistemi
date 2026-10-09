import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api } from "../api/client";
import type { Device, DeviceType } from "../api/types";
import { ErrorBox, Field, Modal } from "../components/ui";
import { toDateInput } from "../lib/format";
import { DEVICE_TYPE_LABELS, DEVICE_TYPES } from "../lib/labels";

interface Props {
  device?: Device;
  onClose(): void;
  onSaved(device: Device): void;
}

export function DeviceFormModal({ device, onClose, onSaved }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    type: device?.type ?? ("LAPTOP" as DeviceType),
    brand: device?.brand ?? "",
    model: device?.model ?? "",
    serialNumber: device?.serialNumber ?? "",
    purchaseDate: toDateInput(device?.purchaseDate) || new Date().toISOString().slice(0, 10),
    warrantyEndDate: toDateInput(device?.warrantyEndDate),
    notes: device?.notes ?? "",
  });

  const mutation = useMutation({
    mutationFn: () => {
      const body = { ...form, warrantyEndDate: form.warrantyEndDate || null };
      return device
        ? api<Device>(`/devices/${device.id}`, { method: "PATCH", body })
        : api<Device>("/devices", { method: "POST", body });
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["devices"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onSaved(saved);
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
      title={device ? `${device.assetTag} düzenle` : "Yeni cihaz"}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Vazgeç
          </button>
          <button className="btn btn-primary" type="submit" form="device-form" disabled={mutation.isPending}>
            {mutation.isPending ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </>
      }
    >
      <form id="device-form" className="form-grid" onSubmit={onSubmit}>
        <ErrorBox error={mutation.error} />
        <Field label="Tür">
          <select value={form.type} onChange={(event) => set("type", event.target.value as DeviceType)}>
            {DEVICE_TYPES.map((type) => (
              <option key={type} value={type}>
                {DEVICE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Seri numarası">
          <input required maxLength={100} value={form.serialNumber} onChange={(event) => set("serialNumber", event.target.value)} />
        </Field>
        <Field label="Marka">
          <input required maxLength={100} value={form.brand} onChange={(event) => set("brand", event.target.value)} />
        </Field>
        <Field label="Model">
          <input required maxLength={100} value={form.model} onChange={(event) => set("model", event.target.value)} />
        </Field>
        <Field label="Alış tarihi">
          <input type="date" required value={form.purchaseDate} onChange={(event) => set("purchaseDate", event.target.value)} />
        </Field>
        <Field label="Garanti bitiş tarihi" hint="Boş bırakılabilir">
          <input type="date" value={form.warrantyEndDate} onChange={(event) => set("warrantyEndDate", event.target.value)} />
        </Field>
        <div className="span-2">
          <Field label="Notlar">
            <textarea rows={3} maxLength={2000} value={form.notes} onChange={(event) => set("notes", event.target.value)} />
          </Field>
        </div>
        {!device && <p className="muted small span-2">Demirbaş numarası kayıt sırasında otomatik verilir.</p>}
      </form>
    </Modal>
  );
}
