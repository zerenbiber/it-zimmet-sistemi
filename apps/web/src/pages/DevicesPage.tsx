import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { api, downloadFile } from "../api/client";
import type { Device, Paginated } from "../api/types";
import { EmptyState, ErrorBox, Loading, PageHeader, Pagination, StatusBadge } from "../components/ui";
import { fullName } from "../lib/format";
import { useDebouncedValue, useUrlFilters } from "../lib/hooks";
import { DEVICE_STATUS_LABELS, DEVICE_STATUSES, DEVICE_TYPE_LABELS, DEVICE_TYPES } from "../lib/labels";
import { DeviceFormModal } from "./DeviceFormModal";
import { DeviceImportModal } from "./DeviceImportModal";

const FILTER_KEYS = ["search", "status", "type"] as const;

export function DevicesPage() {
  const navigate = useNavigate();
  const { values, page, update } = useUrlFilters(FILTER_KEYS);
  const [searchInput, setSearchInput] = useState(values.search);
  const debouncedSearch = useDebouncedValue(searchInput);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<unknown>(null);

  // The export honours the filters currently applied to the list.
  async function exportToExcel() {
    setExporting(true);
    setExportError(null);
    try {
      await downloadFile("/devices/export", values);
    } catch (error) {
      setExportError(error);
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    if (debouncedSearch !== values.search) {
      update({ search: debouncedSearch });
    }
    // Only the debounced input should push into the URL.
  }, [debouncedSearch]);

  const { data, error, isPending } = useQuery({
    queryKey: ["devices", "list", values, page],
    queryFn: () => api<Paginated<Device>>("/devices", { query: { ...values, page } }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="Cihazlar"
        subtitle="Envanterdeki tüm demirbaşlar"
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => void exportToExcel()} disabled={exporting}>
              {exporting ? "Hazırlanıyor…" : "Excel'e aktar"}
            </button>
            <button className="btn btn-secondary" onClick={() => setImporting(true)}>
              Excel'den içe aktar
            </button>
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              + Yeni cihaz
            </button>
          </>
        }
      />

      <div className="toolbar">
        <input
          type="search"
          className="toolbar-search"
          placeholder="Demirbaş no, seri no, marka, model veya personel ara…"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          aria-label="Cihaz ara"
        />
        <select value={values.status} onChange={(event) => update({ status: event.target.value })} aria-label="Durum">
          <option value="">Tüm durumlar</option>
          {DEVICE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {DEVICE_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <select value={values.type} onChange={(event) => update({ type: event.target.value })} aria-label="Tür">
          <option value="">Tüm türler</option>
          {DEVICE_TYPES.map((type) => (
            <option key={type} value={type}>
              {DEVICE_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <ErrorBox error={error ?? exportError} />
      {isPending ? (
        <Loading />
      ) : data && data.items.length === 0 ? (
        <EmptyState>
          <p>Kriterlere uyan cihaz bulunamadı.</p>
        </EmptyState>
      ) : (
        data && (
          <div className="card table-card">
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Demirbaş No</th>
                    <th>Tür</th>
                    <th>Marka / Model</th>
                    <th>Seri No</th>
                    <th>Durum</th>
                    <th>Zimmetli Personel</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((device) => (
                    <tr key={device.id} className="row-link" onClick={() => navigate(`/cihazlar/${device.id}`)}>
                      <td>
                        <Link to={`/cihazlar/${device.id}`} className="mono" onClick={(event) => event.stopPropagation()}>
                          {device.assetTag}
                        </Link>
                      </td>
                      <td>{DEVICE_TYPE_LABELS[device.type]}</td>
                      <td>
                        {device.brand} {device.model}
                      </td>
                      <td className="mono">{device.serialNumber}</td>
                      <td>
                        <StatusBadge status={device.status} />
                      </td>
                      <td>
                        {device.currentAssignment ? (
                          <>
                            {fullName(device.currentAssignment.user)}
                            {device.currentAssignment.user.department && (
                              <div className="muted small">{device.currentAssignment.user.department.name}</div>
                            )}
                          </>
                        ) : (
                          <span className="muted">—</span>
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

      {importing && <DeviceImportModal onClose={() => setImporting(false)} />}
      {creating && (
        <DeviceFormModal onClose={() => setCreating(false)} onSaved={(device) => navigate(`/cihazlar/${device.id}`)} />
      )}
    </>
  );
}
