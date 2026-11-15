import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { useAuth } from "../context/AuthContext";
import { generateClient } from "aws-amplify/api";
import { listDeviceInstances } from "../graphql/queries";
import { DEVICE_CATEGORIES, CATEGORY_LABEL } from "../constants/deviceTypes";
import DeviceModelForm from "./DeviceModelForm";
import SellersAdmin from "./SellersAdmin";
import {
  listSellers,
  loadModels,
  saveModel,
  removeModel,
} from "../utils/market";

const CAPS = [
  ["hasActorCapability", "actor", "A"],
  ["hasSensorCapability", "sensor", "S"],
  ["hasControllerCapability", "controller", "C"],
  ["hasIOTCapability", "iot", "I"],
];

/**
 * The digitalhome.cloud marketplace: every seller's catalogue graph, read as
 * articles (utils/market.js). Any signed-in user browses and **views**; a
 * seller's editors (group market-<seller>, with an authenticator app) add,
 * modify and remove that seller's articles. dhc-admins manage the sellers.
 * An article can only be removed when no DeviceInstance uses it.
 */
const DeviceCatalogue = () => {
  const { t } = useTranslation();
  const { isAuthenticated, hasGroup } = useAuth();
  const isAdmin = hasGroup("dhc-admins");

  const [sellers, setSellers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sellerFilter, setSellerFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formMode, setFormMode] = useState("edit"); // 'view' | 'edit'
  const [newSeller, setNewSeller] = useState("");
  const [showSellers, setShowSellers] = useState(false);

  const editable = sellers.filter((s) => s.mayEdit);
  const sellerName = (id) => sellers.find((s) => s.id === id)?.name || id;
  const mayEdit = (id) => !!sellers.find((s) => s.id === id)?.mayEdit;

  // Category ids are stored; their labels are display-only, so they translate.
  const catLabel = (id) =>
    id
      ? t(`device.category.${id}`, { defaultValue: CATEGORY_LABEL[id] || id })
      : "—";

  const fetchAll = useCallback(async () => {
    if (!isAuthenticated || typeof window === "undefined") return;
    setLoading(true);
    setError(null);
    try {
      const [s, m] = await Promise.all([listSellers(), loadModels()]);
      setSellers(s);
      setItems(m.models);
    } catch (err) {
      console.error("[Marketplace] fetch failed:", err);
      setError(
        t("inventory.error.catalogueLoad", {
          defaultValue: "Failed to load the marketplace.",
        })
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, t]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!newSeller && editable.length) setNewSeller(editable[0].id);
  }, [editable, newSeller]);

  const filtered = items.filter((it) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (it.brand || "").toLowerCase().includes(q) ||
      (it.modelNumber || "").toLowerCase().includes(q) ||
      (it.deviceType || "").toLowerCase().includes(q) ||
      (it.description || "").toLowerCase().includes(q);
    const matchesCat = !categoryFilter || it.category === categoryFilter;
    const matchesSeller = !sellerFilter || it.seller === sellerFilter;
    return matchesSearch && matchesCat && matchesSeller;
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

  // The form throws on a refusal, so a conflict or an invalid article shows
  // in the form, and the person's input stays.
  const handleSave = async ({ _isEdit, files, ...values }) => {
    const seller = editing?.seller || newSeller;
    await saveModel(seller, editing, values, {
      image: files?.image || null,
      docs: files?.docs || [],
    });
    closeForm();
    await fetchAll();
  };

  const handleDelete = async (it) => {
    const client = generateClient();
    try {
      // Guard: refuse if any DeviceInstance uses this article.
      const linked = await client.graphql({
        query: listDeviceInstances,
        variables: {
          filter: {
            or: [
              { article: { eq: it.article } },
              { modelNumber: { eq: it.modelNumber } },
            ],
          },
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
      await removeModel(it);
      fetchAll();
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
          value={sellerFilter}
          onChange={(e) => setSellerFilter(e.target.value)}
          aria-label={t("market.seller", { defaultValue: "Seller" })}
        >
          <option value="">
            {t("market.allSellers", { defaultValue: "All sellers" })}
          </option>
          {sellers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.articles ?? 0})
            </option>
          ))}
        </select>
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
        {isAdmin && (
          <button
            type="button"
            className="ov-btn ov-btn--ghost"
            onClick={() => setShowSellers((v) => !v)}
          >
            {t("market.manageSellers", { defaultValue: "Sellers" })}
          </button>
        )}
        {editable.length > 0 && !showForm && (
          <>
            {editable.length > 1 && (
              <select
                className="ov-input"
                value={newSeller}
                onChange={(e) => setNewSeller(e.target.value)}
                aria-label={t("market.addFor", {
                  defaultValue: "Add an article for",
                })}
              >
                {editable.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              className="ov-btn ov-btn--primary"
              onClick={() => {
                setEditing(null);
                setFormMode("edit");
                setShowForm(true);
              }}
            >
              {t("market.addArticle", {
                seller: sellerName(newSeller),
                defaultValue: `+ Add article (${sellerName(newSeller)})`,
              })}
            </button>
          </>
        )}
      </div>

      {error && <p className="ov-err">{error}</p>}

      {isAdmin && showSellers && (
        <SellersAdmin sellers={sellers} onChanged={fetchAll} />
      )}

      {showForm && (
        <DeviceModelForm
          item={editing}
          mode={formMode}
          canEdit={editing ? mayEdit(editing.seller) : true}
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
            <article className="ov-devcard" key={it.article}>
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
                <span
                  className="ov-pill"
                  title={t("market.seller", { defaultValue: "Seller" })}
                >
                  {sellerName(it.seller)}
                </span>
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
                {mayEdit(it.seller) && (
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
