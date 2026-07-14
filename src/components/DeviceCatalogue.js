import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { useAuth } from "../context/AuthContext";
import { generateClient } from "aws-amplify/api";
import { listDeviceModels, listDeviceInstances } from "../graphql/queries";
import {
  createDeviceModel,
  updateDeviceModel,
  deleteDeviceModel,
} from "../graphql/mutations";
import { DEVICE_CATEGORIES, CATEGORY_LABEL } from "../constants/deviceTypes";
import DeviceModelForm from "./DeviceModelForm";

const CAPS = [
  ["hasActorCapability", "actor", "A"],
  ["hasSensorCapability", "sensor", "S"],
  ["hasControllerCapability", "controller", "C"],
  ["hasIOTCapability", "iot", "I"],
];

/**
 * Device-product catalogue (DeviceModel). Any signed-in user can browse and
 * **View** a model (read-only); dhc-admins can add / modify / delete via the
 * shared DeviceModelForm. A model can only be deleted when no DeviceInstance
 * references its modelNumber.
 */
const DeviceCatalogue = () => {
  const { t } = useTranslation();
  const { isAuthenticated, hasGroup } = useAuth();
  const isAdmin = hasGroup("dhc-admins");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formMode, setFormMode] = useState("edit"); // 'view' | 'edit'

  // Category ids are stored; their labels are display-only, so they translate.
  const catLabel = (id) =>
    id
      ? t(`device.category.${id}`, { defaultValue: CATEGORY_LABEL[id] || id })
      : "—";

  const fetchModels = useCallback(async () => {
    if (!isAuthenticated || typeof window === "undefined") return;
    setLoading(true);
    setError(null);
    try {
      const client = generateClient();
      const result = await client.graphql({ query: listDeviceModels });
      setItems(result.data.listDeviceModels.items || []);
    } catch (err) {
      console.error("[DeviceCatalogue] fetch failed:", err);
      setError(
        t("inventory.error.catalogueLoad", {
          defaultValue: "Failed to load the device catalogue.",
        })
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, t]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const filtered = items.filter((it) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (it.brand || "").toLowerCase().includes(q) ||
      (it.modelNumber || "").toLowerCase().includes(q) ||
      (it.deviceType || "").toLowerCase().includes(q) ||
      (it.description || "").toLowerCase().includes(q);
    const matchesCat = !categoryFilter || it.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const open = (it, m) => {
    setEditing(it);
    setFormMode(m);
    setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleSave = async ({ _isEdit, ...input }) => {
    const client = generateClient();
    await client.graphql({
      query: _isEdit ? updateDeviceModel : createDeviceModel,
      variables: { input },
    });
    closeForm();
    await fetchModels();
  };

  const handleDelete = async (it) => {
    const client = generateClient();
    try {
      // Guard: refuse if any DeviceInstance references this model.
      const linked = await client.graphql({
        query: listDeviceInstances,
        variables: {
          filter: { modelNumber: { eq: it.modelNumber } },
          limit: 1,
        },
      });
      const inUse = (linked.data.listDeviceInstances.items || []).length > 0;
      if (inUse) {
        window.alert(
          t("inventory.catalogue.deleteInUse", {
            model: it.modelNumber,
            defaultValue: `Cannot delete ${it.modelNumber}: at least one device instance is linked to this model. Remove those devices first.`,
          })
        );
        return;
      }
      if (
        !window.confirm(
          t("inventory.catalogue.deleteConfirm", {
            model: it.modelNumber,
            defaultValue: `Remove catalogue model ${it.modelNumber}?`,
          })
        )
      ) {
        return;
      }
      await client.graphql({
        query: deleteDeviceModel,
        variables: { input: { modelNumber: it.modelNumber } },
      });
      fetchModels();
    } catch (err) {
      setError(err?.errors?.[0]?.message || err?.message || String(err));
    }
  };

  return (
    <div>
      <div className="ov-bar">
        <input
          type="text"
          className="ov-input ov-input--search"
          placeholder={t("inventory.catalogue.searchPlaceholder", {
            defaultValue: "Search brand / model / type…",
          })}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="ov-input"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label={t("inventory.catalogue.category", {
            defaultValue: "Category",
          })}
        >
          <option value="">
            {t("inventory.catalogue.allCategories", {
              defaultValue: "All categories",
            })}
          </option>
          {DEVICE_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {catLabel(c.id)}
            </option>
          ))}
        </select>
        <div className="ov-bar-spacer" />
        {isAdmin && !showForm && (
          <button
            type="button"
            className="ov-btn ov-btn--primary"
            onClick={() => {
              setEditing(null);
              setFormMode("edit");
              setShowForm(true);
            }}
          >
            {t("inventory.catalogue.add", { defaultValue: "+ Add model" })}
          </button>
        )}
      </div>

      {error && <p className="ov-err">{error}</p>}

      {showForm && (
        <DeviceModelForm
          item={editing}
          mode={formMode}
          canEdit={isAdmin}
          onSave={handleSave}
          onCancel={closeForm}
        />
      )}

      {loading ? (
        <p className="ov-empty">
          {t("inventory.loading", { defaultValue: "Loading…" })}
        </p>
      ) : filtered.length === 0 ? (
        <p className="ov-empty">
          {isAuthenticated
            ? t("inventory.catalogue.empty", {
                defaultValue: "No catalogue models match.",
              })
            : t("inventory.catalogue.signIn", {
                defaultValue: "Sign in to browse the device catalogue.",
              })}
        </p>
      ) : (
        <div className="ov-devgrid">
          {filtered.map((it) => (
            <article className="ov-devcard" key={it.modelNumber}>
              <div className="ov-devcard-top">
                {it.thumbnail ? (
                  <img className="ov-thumb" src={it.thumbnail} alt="" />
                ) : (
                  <span className="ov-thumb--none">—</span>
                )}
                <div className="ov-devcard-id">
                  <p className="ov-devcard-model">{it.modelNumber}</p>
                  <p className="ov-devcard-brand">
                    {it.brand}
                    {it.deviceType ? ` · ${it.deviceType}` : ""}
                  </p>
                </div>
              </div>

              {it.description && (
                <p className="ov-devcard-desc">{it.description}</p>
              )}

              <div className="ov-devcard-meta">
                <span className="ov-pill">{catLabel(it.category)}</span>
                <span className="ov-caps">
                  {CAPS.filter(([k]) => it[k]).map(([k, tone, letter]) => (
                    <span
                      key={k}
                      className={`ov-cap ov-cap--${tone}`}
                      title={t(`device.capability.${tone}`, {
                        defaultValue: tone,
                      })}
                    >
                      {letter}
                    </span>
                  ))}
                </span>
              </div>

              <div className="ov-devcard-actions">
                <button
                  type="button"
                  className="ov-btn ov-btn--ghost"
                  onClick={() => open(it, "view")}
                >
                  {t("inventory.action.view", { defaultValue: "View" })}
                </button>
                {isAdmin && (
                  <>
                    <button
                      type="button"
                      className="ov-btn ov-btn--ghost"
                      onClick={() => open(it, "edit")}
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
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeviceCatalogue;
