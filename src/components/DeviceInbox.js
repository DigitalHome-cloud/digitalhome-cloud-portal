import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { useAuth } from "../context/AuthContext";
import { useSmartHome } from "../context/SmartHomeContext";
import { generateClient } from "aws-amplify/api";
import {
  listDeviceModels,
  listDeviceInstanceBySmartHomeId,
} from "../graphql/queries";
import {
  createDeviceModel,
  updateDeviceModel,
  createDeviceInstance,
  updateDeviceInstance,
} from "../graphql/mutations";
import { readInbox, writeInbox } from "../utils/s3";
import { CSV_TEMPLATE, rowsToInbox } from "../utils/csvTemplate";
import DeviceModelForm from "./DeviceModelForm";
import DeviceInstanceForm from "./DeviceInstanceForm";

/**
 * CSV mass-import inbox. Upload one combined CSV → devices/inbox.json, then a
 * two-stage review: Stage 1 Models (match by modelNumber), Stage 2 Devices
 * (match by serialNumber). Existing → prefilled modify, new → create.
 * Progress (`_status`) is persisted back to inbox.json after every action so
 * it survives reloads.
 */
const ownerIdOf = (user) =>
  user?.idTokenPayload?.sub || user?.userId || user?.username || null;

const STATUS_FALLBACK = {
  pending: "pending",
  done: "done",
  skipped: "skipped",
};

const DeviceInbox = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user, hasGroup } = useAuth();
  const { activeHome } = useSmartHome();
  const homeId = activeHome?.id || "";
  const isAdmin = hasGroup("dhc-admins");

  const [inbox, setInbox] = useState(null); // {importedAt, models, devices, skipped}
  const [models, setModels] = useState([]); // existing catalogue
  const [devices, setDevices] = useState([]); // existing instances (this home)
  const [stage, setStage] = useState("models"); // 'models' | 'devices'
  const [filter, setFilter] = useState("pending"); // 'pending' | 'all'
  const [editing, setEditing] = useState(null); // {kind, row}
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);

  const StatusPill = ({ s }) => {
    const key = STATUS_FALLBACK[s] ? s : "pending";
    return (
      <span className={`ov-pill ov-pill--${key}`}>
        {t(`inventory.status.${key}`, { defaultValue: STATUS_FALLBACK[key] })}
      </span>
    );
  };

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !homeId || typeof window === "undefined") return;
    setLoading(true);
    setError(null);
    try {
      const client = generateClient();
      const [mRes, dRes] = await Promise.all([
        client.graphql({ query: listDeviceModels }),
        client.graphql({
          query: listDeviceInstanceBySmartHomeId,
          variables: { smartHomeId: homeId },
        }),
      ]);
      setModels(mRes.data.listDeviceModels.items || []);
      setDevices(dRes.data.listDeviceInstanceBySmartHomeId.items || []);
      const existing = await readInbox(homeId);
      if (existing) setInbox(existing);
    } catch (err) {
      console.error("[DeviceInbox] load failed:", err);
      setError(
        t("inventory.error.inboxLoad", {
          defaultValue: "Failed to load the inbox / catalogue.",
        })
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, homeId, t]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "device-inventory-template.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setNote(null);
    try {
      const Papa = (await import("papaparse")).default;
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      if (parsed.errors?.length) {
        setError(
          t("inventory.inbox.parseError", {
            row: parsed.errors[0].row,
            message: parsed.errors[0].message,
            defaultValue: `CSV parse error (row ${parsed.errors[0].row}): ${parsed.errors[0].message}`,
          })
        );
        return;
      }
      const next = {
        importedAt: new Date().toISOString(),
        ...rowsToInbox(parsed.data),
      };
      await writeInbox(homeId, next);
      setInbox(next);
      setStage("models");
      setNote(
        t("inventory.inbox.imported", {
          models: next.models.length,
          devices: next.devices.length,
          defaultValue: `Imported ${next.models.length} model(s), ${next.devices.length} device(s)`,
        }) +
          (next.skipped?.length
            ? " — " +
              t("inventory.inbox.skippedRows", {
                count: next.skipped.length,
                defaultValue: `${next.skipped.length} row(s) skipped (no modelNumber/serialNumber)`,
              })
            : "")
      );
    } catch (err) {
      setError(err?.message || String(err));
    }
  };

  const persist = async (nextInbox) => {
    setInbox(nextInbox);
    try {
      await writeInbox(homeId, nextInbox);
    } catch (err) {
      setError(
        t("inventory.inbox.persistFailed", {
          message: err.message,
          defaultValue: `Saved locally but inbox.json write failed: ${err.message}`,
        })
      );
    }
  };

  const markRow = (kind, key, status) => {
    const list = kind === "model" ? "models" : "devices";
    const idField = kind === "model" ? "modelNumber" : "serialNumber";
    const next = {
      ...inbox,
      [list]: inbox[list].map((r) =>
        r[idField] === key ? { ...r, _status: status } : r
      ),
    };
    return persist(next);
  };

  const saveModel = async ({ _isEdit, ...input }) => {
    const client = generateClient();
    const exists = models.some((m) => m.modelNumber === input.modelNumber);
    await client.graphql({
      query: exists ? updateDeviceModel : createDeviceModel,
      variables: { input },
    });
    await markRow("model", input.modelNumber, "done");
    setEditing(null);
    const mRes = await client.graphql({ query: listDeviceModels });
    setModels(mRes.data.listDeviceModels.items || []);
  };

  const saveDevice = async (args) => {
    const client = generateClient();
    const existing = devices.find((d) => d.serialNumber === args.serialNumber);
    if (existing) {
      const { id, ...rest } = args;
      await client.graphql({
        query: updateDeviceInstance,
        variables: { input: { id: existing.id, ...rest } },
      });
    } else {
      const ownerId = ownerIdOf(user);
      await client.graphql({
        query: createDeviceInstance,
        variables: {
          input: {
            smartHomeId: homeId,
            owners: ownerId ? [ownerId] : [],
            ...args,
          },
        },
      });
    }
    await markRow("device", args.serialNumber, "done");
    setEditing(null);
    const dRes = await client.graphql({
      query: listDeviceInstanceBySmartHomeId,
      variables: { smartHomeId: homeId },
    });
    setDevices(dRes.data.listDeviceInstanceBySmartHomeId.items || []);
  };

  if (!homeId) {
    return (
      <p className="ov-empty">
        {t("inventory.inbox.noHome", {
          defaultValue: "Select a SmartHome to use the device import inbox.",
        })}
      </p>
    );
  }

  const modelRows = inbox?.models || [];
  const deviceRows = inbox?.devices || [];
  const modelsPending = modelRows.some((r) => r._status === "pending");
  const isPending = (r) => (r._status || "pending") === "pending";
  const visibleModelRows =
    filter === "pending" ? modelRows.filter(isPending) : modelRows;
  const visibleDeviceRows =
    filter === "pending" ? deviceRows.filter(isPending) : deviceRows;
  const pendingModelCount = modelRows.filter(isPending).length;
  const pendingDeviceCount = deviceRows.filter(isPending).length;

  const emptyRowsMessage = (total) =>
    total === 0
      ? t("inventory.inbox.noRows", {
          defaultValue: "No rows in this import.",
        })
      : filter === "pending"
        ? t("inventory.inbox.nothingPending", {
            defaultValue:
              "Nothing pending — switch to All to see resolved rows.",
          })
        : t("inventory.inbox.noMatch", {
            defaultValue: "No rows match this filter.",
          });

  const existsPill = (exists) => (
    <span className={exists ? "ov-pill" : "ov-pill ov-pill--new"}>
      {exists
        ? t("inventory.inbox.exists", { defaultValue: "exists → modify" })
        : t("inventory.inbox.new", { defaultValue: "new → create" })}
    </span>
  );

  return (
    <div>
      {/* Upload bar */}
      <div className="ov-bar">
        <span
          className="ov-pill"
          title={t("inventory.activeHome", { defaultValue: "Active SmartHome" })}
        >
          {homeId}
        </span>
        <button
          type="button"
          className="ov-btn ov-btn--ghost"
          onClick={downloadTemplate}
        >
          {t("inventory.inbox.downloadTemplate", {
            defaultValue: "Download CSV template",
          })}
        </button>
        <label className="ov-btn ov-btn--primary">
          {t("inventory.inbox.upload", { defaultValue: "Upload CSV" })}
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleUpload}
            hidden
            disabled={!isAuthenticated}
          />
        </label>
      </div>

      {note && <p className="ov-msg">{note}</p>}
      {error && <p className="ov-err">{error}</p>}

      {/* Stage + filter bar — only meaningful once an inbox exists */}
      {inbox && (
        <div className="ov-bar">
          <div className="ov-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={stage === "models"}
              className={stage === "models" ? "ov-tab ov-tab--active" : "ov-tab"}
              onClick={() => setStage("models")}
            >
              {t("inventory.inbox.stageModels", { defaultValue: "1 · Models" })}{" "}
              ({pendingModelCount}/{modelRows.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={stage === "devices"}
              className={
                stage === "devices" ? "ov-tab ov-tab--active" : "ov-tab"
              }
              onClick={() => setStage("devices")}
              disabled={modelsPending}
              title={
                modelsPending
                  ? t("inventory.inbox.resolveModelsFirst", {
                      defaultValue: "Resolve all model rows first",
                    })
                  : undefined
              }
            >
              {t("inventory.inbox.stageDevices", {
                defaultValue: "2 · Devices",
              })}{" "}
              ({pendingDeviceCount}/{deviceRows.length})
            </button>
          </div>
          <div className="ov-bar-spacer" />
          <button
            type="button"
            className={
              filter === "pending"
                ? "ov-btn ov-btn--primary"
                : "ov-btn ov-btn--ghost"
            }
            onClick={() => setFilter("pending")}
          >
            {t("inventory.inbox.filterPending", { defaultValue: "Pending" })}
          </button>
          <button
            type="button"
            className={
              filter === "all"
                ? "ov-btn ov-btn--primary"
                : "ov-btn ov-btn--ghost"
            }
            onClick={() => setFilter("all")}
          >
            {t("inventory.inbox.filterAll", { defaultValue: "All" })}
          </button>
        </div>
      )}

      {loading && (
        <p className="ov-empty">
          {t("inventory.loading", { defaultValue: "Loading…" })}
        </p>
      )}

      {!inbox && !loading && (
        <p className="ov-empty">
          {t("inventory.inbox.empty", {
            defaultValue:
              "No inbox yet. Download the template, fill it in, and upload the CSV.",
          })}
        </p>
      )}

      {editing && editing.kind === "model" && (
        <DeviceModelForm
          item={editing.row}
          onSave={saveModel}
          onCancel={() => setEditing(null)}
        />
      )}
      {editing && editing.kind === "device" && (
        <DeviceInstanceForm
          item={editing.row}
          models={models}
          onSave={saveDevice}
          onCancel={() => setEditing(null)}
        />
      )}

      {inbox && !editing && stage === "models" && (
        <div className="ov-tablewrap">
          <table className="ov-table">
            <thead>
              <tr>
                <th>
                  {t("inventory.col.modelNumber", { defaultValue: "Model #" })}
                </th>
                <th>{t("inventory.model.brand", { defaultValue: "Brand" })}</th>
                <th>{t("inventory.col.type", { defaultValue: "Type" })}</th>
                <th>
                  {t("inventory.col.inCatalogue", {
                    defaultValue: "In catalogue",
                  })}
                </th>
                <th>{t("inventory.col.row", { defaultValue: "Row" })}</th>
                <th className="ov-th-right">
                  {t("inventory.col.actions", { defaultValue: "Actions" })}
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleModelRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="ov-empty">
                    {emptyRowsMessage(modelRows.length)}
                  </td>
                </tr>
              ) : (
                visibleModelRows.map((r) => (
                  <tr key={r.modelNumber}>
                    <td className="ov-mono">{r.modelNumber}</td>
                    <td>{r.brand}</td>
                    <td>{r.deviceType}</td>
                    <td>
                      {existsPill(
                        models.some((m) => m.modelNumber === r.modelNumber)
                      )}
                    </td>
                    <td>
                      <StatusPill s={r._status} />
                    </td>
                    <td>
                      <div className="ov-cell-actions">
                        <button
                          type="button"
                          className="ov-btn ov-btn--ghost"
                          disabled={!isAdmin}
                          title={
                            !isAdmin
                              ? t("inventory.inbox.adminRequired", {
                                  defaultValue:
                                    "Catalogue writes require dhc-admins",
                                })
                              : undefined
                          }
                          onClick={() => setEditing({ kind: "model", row: r })}
                        >
                          {t("inventory.action.process", {
                            defaultValue: "Process",
                          })}
                        </button>
                        <button
                          type="button"
                          className="ov-btn ov-btn--ghost"
                          onClick={() =>
                            markRow("model", r.modelNumber, "skipped")
                          }
                        >
                          {t("inventory.action.skip", { defaultValue: "Skip" })}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {inbox && !editing && stage === "devices" && (
        <div className="ov-tablewrap">
          <table className="ov-table">
            <thead>
              <tr>
                <th>{t("inventory.col.serial", { defaultValue: "Serial" })}</th>
                <th>
                  {t("inventory.col.modelNumber", { defaultValue: "Model #" })}
                </th>
                <th>{t("inventory.col.type", { defaultValue: "Type" })}</th>
                <th>{t("inventory.col.state", { defaultValue: "State" })}</th>
                <th>{t("inventory.col.row", { defaultValue: "Row" })}</th>
                <th className="ov-th-right">
                  {t("inventory.col.actions", { defaultValue: "Actions" })}
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleDeviceRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="ov-empty">
                    {emptyRowsMessage(deviceRows.length)}
                  </td>
                </tr>
              ) : (
                visibleDeviceRows.map((r) => (
                  <tr key={r.serialNumber}>
                    <td className="ov-mono">{r.serialNumber}</td>
                    <td className="ov-mono">{r.modelNumber}</td>
                    <td>{r.deviceType}</td>
                    <td>
                      {existsPill(
                        devices.some((d) => d.serialNumber === r.serialNumber)
                      )}
                    </td>
                    <td>
                      <StatusPill s={r._status} />
                    </td>
                    <td>
                      <div className="ov-cell-actions">
                        <button
                          type="button"
                          className="ov-btn ov-btn--ghost"
                          onClick={() => setEditing({ kind: "device", row: r })}
                        >
                          {t("inventory.action.process", {
                            defaultValue: "Process",
                          })}
                        </button>
                        <button
                          type="button"
                          className="ov-btn ov-btn--ghost"
                          onClick={() =>
                            markRow("device", r.serialNumber, "skipped")
                          }
                        >
                          {t("inventory.action.skip", { defaultValue: "Skip" })}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DeviceInbox;
