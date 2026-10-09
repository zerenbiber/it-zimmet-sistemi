import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ApiError, downloadFile, uploadFile } from "../api/client";
import type { ImportResult, ImportRowError } from "../api/types";
import { ErrorBox, Field, Modal } from "../components/ui";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function rowErrors(error: unknown): ImportRowError[] {
  return error instanceof ApiError && error.code === "IMPORT_VALIDATION_FAILED" && Array.isArray(error.details)
    ? (error.details as ImportRowError[])
    : [];
}

export function DeviceImportModal({ onClose }: { onClose(): void }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [templateError, setTemplateError] = useState<unknown>(null);

  const mutation = useMutation({
    mutationFn: (selected: File) => uploadFile<ImportResult>("/devices/import", selected),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["devices"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const errors = rowErrors(mutation.error);
  const tooLarge = file !== null && file.size > MAX_FILE_BYTES;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (file && !tooLarge) {
      mutation.mutate(file);
    }
  }

  async function downloadTemplate() {
    setTemplateError(null);
    try {
      await downloadFile("/devices/import-template");
    } catch (error) {
      setTemplateError(error);
    }
  }

  const result = mutation.data;

  return (
    <Modal
      title="Excel'den cihaz içe aktar"
      onClose={onClose}
      footer={
        result ? (
          <button className="btn btn-primary" onClick={onClose}>
            Tamam
          </button>
        ) : (
          <>
            <button className="btn btn-ghost" onClick={onClose}>
              Vazgeç
            </button>
            <button
              className="btn btn-primary"
              type="submit"
              form="import-form"
              disabled={!file || tooLarge || mutation.isPending}
            >
              {mutation.isPending ? "İçe aktarılıyor…" : "İçe aktar"}
            </button>
          </>
        )
      }
    >
      {result ? (
        <div className="alert alert-success" role="status">
          <strong>{result.created} cihaz eklendi.</strong> Demirbaş numaraları: {result.firstAssetTag}
          {result.created > 1 && ` – ${result.lastAssetTag}`}
        </div>
      ) : (
        <form id="import-form" className="form-stack" onSubmit={onSubmit}>
          <ol className="steps">
            <li>
              Şablonu indirin ve cihazları <strong>Cihazlar</strong> sayfasına girin.{" "}
              <button type="button" className="link-btn" onClick={() => void downloadTemplate()}>
                Şablonu indir (.xlsx)
              </button>
            </li>
            <li>Doldurduğunuz dosyayı aşağıdan seçip içe aktarın.</li>
          </ol>
          <ErrorBox error={templateError} />
          <Field label="Excel dosyası" hint="En fazla 1000 satır, 5 MB. Demirbaş numaraları otomatik verilir.">
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                mutation.reset();
              }}
            />
          </Field>
          {tooLarge && <p className="text-danger small">Dosya 5 MB sınırını aşıyor.</p>}

          {errors.length > 0 ? (
            <div className="import-errors">
              <div className="alert alert-error" role="alert">
                {(mutation.error as ApiError).message}
              </div>
              <div className="table-scroll import-error-table">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Satır</th>
                      <th>Hata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errors.map((error) => (
                      <tr key={error.row}>
                        <td>{error.row}</td>
                        <td>
                          {error.messages.map((message) => (
                            <div key={message}>{message}</div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <ErrorBox error={mutation.error} />
          )}
        </form>
      )}
    </Modal>
  );
}
