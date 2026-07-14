import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { useAuth } from "../context/AuthContext";
import { useSmartHome } from "../context/SmartHomeContext";
import DeviceInstanceForm from "./DeviceInstanceForm";
import { generateClient } from "aws-amplify/api";
import {
  listDeviceInstanceBySmartHomeId,
  listDeviceModels,
} from "../graphql/queries";
import {
  createDeviceInstance,
  updateDeviceInstance,
  deleteDeviceInstance,
} from "../graphql/mutations";

// DeviceLifecycle enum → fallback label + pill tone.
const LIFECYCLE = {
  NEW: ["New", "new"],
  ACTIVE: ["Active", "done"],
  END_OF_LIFE: ["End of life", "skipped"],
  DECOMMISSIONED: ["Decommissioned", "pending"],
};

/**
 * Per-SmartHome device inventory. List + form toggle + GraphQL CRUD, scoped to
 * the active home via the smartHomeId secondary index. Writes require the
 * caller to be a home owner (the new row is created with owners=[caller]) or
 * dhc-admins.
 */
const ownerIdOf = (user) =>
  user?.idTokenPayload?.sub || user?.userId || user?.username || null;

const DeviceInventoryManager = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const { activeHome } = useSmartHome();
  const homeId = activeHome?.id || "";

  const [items, setItems] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formMode, setFormMode] = useState("edit"); // 'view' | 'edit'

  const thumbOf = (mn) => {
    const src = (models.find((m) => m.modelNumber === mn) || {}).thumbnail;
    return src ? (
      <img className="ov-thumb" src={src} alt="" />
    ) : (
      <span className="ov-thumb--none">—</span>
    );
  };

  const fetchInstances = useCallback(async () => {
    if (!isAuthenticated || !homeId || typeof window === "undefined") return;
    setLoading(true);
    setError(null);
    try {
      const client = generateClient();
      const [instRes, modelRes] = await Promise.all([
        client.graphql({
          query: listDeviceInstanceBySmartHomeId,
          variables: { smartHomeId: homeId },
        }),
        client.graphql({ query: listDeviceModels }),
      ]);
      setItems(instRes.data.listDeviceInstanceBySmartHomeId.items || []);
      setModels(modelRes.data.listDeviceModels.items || []);
    } catch (err) {
      console.error("[DeviceInventory] fetch failed:", err);
      setError(
        t("inventory.error.devicesLoad", {
          defaultValue: "Failed to load devices for this SmartHome.",
        })
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, homeId, t]);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  const handleSave = async (args) => {
    if (typeof window === "undefined") return;
    const client = generateClient();
    if (args.id) {
      const { id, ...rest } = args;
      await client.graphql({
        query: updateDeviceInstance,
        variables: { input: { id, ...rest } },
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
    setShowForm(false);
    setEditingItem(null);
    await fetchInstances();
  };

  const handleDelete = async (it) => {
    if (
      !window.confirm(
        t("inventory.devices.deleteConfirm", {
          serial: it.serialNumber,
          home: homeId,
          defaultValue: `Remove device ${it.serialNumber} from ${homeId}?`,
        })
      )
    ) {
      return;
    }
    try {
      const client = generateClient();
      await client.graphql({
        query: deleteDeviceInstance,
        variables: { input: { id: it.id } },
      });
      fetchInstances();
    } catch (err) {
      setError(err?.errors?.[0]?.message || err?.message || String(err));
    }
  };

  if (!homeId) {
    return (
      <p className="ov-empty">
        {t("inventory.devices.noHome", {
          defaultValue:
            "Select a SmartHome to view and manage its device inventory.",
        })}
      </p>
    );
  }

  const openForm = (item, mode) => {
    setEditingItem(item);
    setFormMode(mode);
    setShowForm(true);
  };

  return (
    <div>
      <div className="ov-bar">
        <span
          className="ov-pill"
          title={t("inventory.activeHome", { defaultValue: "Active SmartHome" })}
        >
          {homeId}
        </span>
        <div className="ov-bar-spacer" />
        {!showForm && (
          <button
            type="button"
            className="ov-btn ov-btn--primary"
            onClick={() => openForm(null, "edit")}
            disabled={!isAuthenticated}
          >
            {t("inventory.devices.add", { defaultValue: "+ Add device" })}
          </button>
        )}
      </div>

      {error && <p className="ov-err">{error}</p>}

      {showForm && (
        <DeviceInstanceForm
          item={editingItem}
          models={models}
          mode={formMode}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        />
      )}

      {loading ? (
        <p className="ov-empty">
          {t("inventory.loading", { defaultValue: "Loading…" })}
        </p>
      ) : items.length === 0 ? (
        <p className="ov-empty">
          {t("inventory.devices.empty", {
            defaultValue: "No devices recorded for this SmartHome yet.",
          })}
        </p>
      ) : (
        <div className="ov-tablewrap">
          <table className="ov-table">
            <thead>
              <tr>
                <th>{t("inventory.col.image", { defaultValue: "Img" })}</th>
                <th>{t("inventory.col.serial", { defaultValue: "Serial" })}</th>
                <th>{t("inventory.col.model", { defaultValue: "Model" })}</th>
                <th>{t("inventory.col.type", { defaultValue: "Type" })}</th>
                <th>
                  {t("inventory.col.lifecycle", { defaultValue: "Lifecycle" })}
                </th>
                <th>
                  {t("inventory.col.installed", { defaultValue: "Installed" })}
                </th>
                <th className="ov-th-right">
                  {t("inventory.col.actions", { defaultValue: "Actions" })}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const [fallback, tone] = LIFECYCLE[it.lifecycleState] || [
                  it.lifecycleState || "—",
                  "pending",
                ];
                return (
                  <tr key={it.id}>
                    <td>{thumbOf(it.modelNumber)}</td>
                    <td className="ov-mono">{it.serialNumber}</td>
                    <td className="ov-mono">{it.modelNumber}</td>
                    <td>{it.deviceType}</td>
                    <td>
                      <span className={`ov-pill ov-pill--${tone}`}>
                        {it.lifecycleState
                          ? t(`device.lifecycle.${it.lifecycleState}`, {
                              defaultValue: fallback,
                            })
                          : "—"}
                      </span>
                    </td>
                    <td>{it.installationDate || "—"}</td>
                    <td>
                      <div className="ov-cell-actions">
                        <button
                          type="button"
                          className="ov-btn ov-btn--ghost"
                          onClick={() => openForm(it, "view")}
                        >
                          {t("inventory.action.view", { defaultValue: "View" })}
                        </button>
                        <button
                          type="button"
                          className="ov-btn ov-btn--ghost"
                          onClick={() => openForm(it, "edit")}
                        >
                          {t("inventory.action.modify", {
                            defaultValue: "Modify",
                          })}
                        </button>
                        <button
                          type="button"
                          className="ov-btn ov-btn--danger"
                          onClick={() => handleDelete(it)}
                        >
                          {t("inventory.action.delete", {
                            defaultValue: "Delete",
                          })}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DeviceInventoryManager;
