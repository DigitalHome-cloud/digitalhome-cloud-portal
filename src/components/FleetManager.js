import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useSmartHome } from "../context/SmartHomeContext";
import { useTier } from "../utils/useTier";
import { UpgradePrompt } from "./UpgradePrompt";
import SmartHomeForm from "./SmartHomeForm";
import { generateClient } from "aws-amplify/api";
import { listDigitalHomes } from "../graphql/queries";
import {
  initiateDigitalHome,
  updateDigitalHome,
  deleteDigitalHome,
} from "../graphql/mutations";

// Fleet — the Manager (Digital Homes) and Edges merged into one screen. Each home
// lists its paired edge(s) nested beneath it, with live status + firmware version.
// Pairing is initiated from the edge box itself (no "pair" button here); a small
// assign control remains only for edges that have registered but aren't placed
// under a home yet.

const client = generateClient();

const LIST_MY_EDGES = /* GraphQL */ `
  query ListMyEdges {
    listMyEdges {
      edge_id
      home_id
      machine_id
      hostname
      dhe_version
      status
      last_telemetry_at
      linked_at
    }
  }
`;
const LINK_EDGE_TO_HOME = /* GraphQL */ `
  mutation LinkEdgeToHome($edge_id: String!, $home_id: String) {
    linkEdgeToHome(edge_id: $edge_id, home_id: $home_id) {
      edge_id
      home_id
    }
  }
`;

const ACTIVE_WINDOW_MS = 15 * 60 * 1000; // "active" = telemetry within 15 min
const shortId = (id) => (id ? id.replace(/^e-/, "").slice(0, 8) : "—");
const isEdgeActive = (e) =>
  !!e.last_telemetry_at &&
  Date.now() - new Date(e.last_telemetry_at).getTime() < ACTIVE_WINDOW_MS;

const relTime = (iso) => {
  if (!iso) return "never";
  const s = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  );
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const StatusPill = ({ active }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "0.4rem",
      fontSize: "0.78rem",
      fontWeight: 600,
      color: active ? "#4ade80" : "#9ca3af",
    }}
  >
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: active ? "#22c55e" : "#6b7280",
        boxShadow: active ? "0 0 6px #22c55e" : "none",
      }}
    />
    {active ? "Active" : "Down"}
  </span>
);

const EdgeRow = ({
  e,
  homes,
  onAssign,
  busy,
  assignable,
  choice,
  setChoice,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "0.9rem",
      flexWrap: "wrap",
      padding: "0.6rem 0.75rem",
      borderTop: "1px solid rgba(148,163,184,0.1)",
    }}
  >
    <span style={{ fontSize: "1rem" }} aria-hidden="true">
      🔌
    </span>
    <div style={{ minWidth: 150, flex: "1 1 150px" }}>
      <strong style={{ fontSize: "0.85rem" }}>
        {e.hostname || shortId(e.edge_id)}
      </strong>
      <div style={{ fontSize: "0.68rem", color: "#9ca3af" }}>
        {e.machine_id || shortId(e.edge_id)} · seen{" "}
        {relTime(e.last_telemetry_at)}
      </div>
    </div>
    <StatusPill active={isEdgeActive(e)} />
    <span
      style={{
        fontFamily: "monospace",
        fontSize: "0.78rem",
        color: "#cbd5f5",
        minWidth: 64,
      }}
    >
      {e.dhe_version ? `v${e.dhe_version}` : "—"}
    </span>
    <button
      type="button"
      className="dhc-button-base dhc-button-ghost"
      disabled
      title="Firmware updates from the Portal are coming soon"
      style={{ opacity: 0.45, cursor: "not-allowed" }}
    >
      Update
    </button>
    {assignable && (
      <span style={{ display: "inline-flex", gap: "0.4rem" }}>
        <select
          className="dhc-form-input"
          style={{ maxWidth: 200, display: "inline-block" }}
          value={choice[e.edge_id] ?? ""}
          onChange={(ev) =>
            setChoice((c) => ({ ...c, [e.edge_id]: ev.target.value }))
          }
        >
          <option value="">— assign to home —</option>
          {homes.map((h) => (
            <option key={h.smartHomeId} value={h.smartHomeId}>
              {h.smartHomeId}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="dhc-button-base dhc-button-primary"
          disabled={busy === e.edge_id || !choice[e.edge_id]}
          onClick={() => onAssign(e.edge_id, choice[e.edge_id])}
        >
          {busy === e.edge_id ? "…" : "Assign"}
        </button>
      </span>
    )}
    {!assignable && (
      <button
        type="button"
        className="dhc-button-base dhc-button-ghost"
        disabled={busy === e.edge_id}
        onClick={() => onAssign(e.edge_id, null)}
        title="Unassign this edge from the home"
        style={{ marginLeft: "auto", fontSize: "0.75rem" }}
      >
        {busy === e.edge_id ? "…" : "Unassign"}
      </button>
    )}
  </div>
);

const FleetManager = () => {
  const auth = useAuth();
  const { authState, isAuthenticated } = auth;
  const { activeHome, setActiveHome } = useSmartHome();
  const { tier, can } = useTier(auth);
  const createResult = can("create.new_home");

  const [homes, setHomes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [busy, setBusy] = useState("");
  const [choice, setChoice] = useState({});

  const fetchAll = useCallback(async () => {
    if (!isAuthenticated || typeof window === "undefined") return;
    setLoading(true);
    setError(null);
    try {
      const [homesRes, edgesRes] = await Promise.all([
        client.graphql({ query: listDigitalHomes }),
        client.graphql({ query: LIST_MY_EDGES, authMode: "userPool" }),
      ]);
      setHomes(homesRes.data.listDigitalHomes.items || []);
      setEdges(edgesRes?.data?.listMyEdges || []);
    } catch (err) {
      console.error("[Fleet] load failed:", err);
      setError("Failed to load your fleet.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSave = async (args) => {
    if (typeof window === "undefined") return;
    if (editingItem) {
      await client.graphql({
        query: updateDigitalHome,
        variables: {
          input: {
            smartHomeId: args.smartHomeId,
            city: args.city,
            addressLine1: args.addressLine1,
            addressLine2: args.addressLine2,
          },
        },
      });
    } else {
      const result = await client.graphql({
        query: initiateDigitalHome,
        variables: args,
      });
      const created = result.data.initiateDigitalHome;
      if (created?.smartHomeId) setActiveHome(created.smartHomeId);
    }
    setShowForm(false);
    setEditingItem(null);
    await fetchAll();
  };

  const handleDelete = async (item) => {
    if (
      !window.confirm(
        `Delete DigitalHome ${item.smartHomeId}?\n\nThis removes the metadata row only — the S3 designtime files and Cognito group are not removed by this action.`
      )
    )
      return;
    await client.graphql({
      query: deleteDigitalHome,
      variables: { input: { smartHomeId: item.smartHomeId } },
    });
    fetchAll();
  };

  const assign = async (edgeId, homeId) => {
    setBusy(edgeId);
    setError(null);
    setMessage("");
    try {
      await client.graphql({
        query: LINK_EDGE_TO_HOME,
        variables: { edge_id: edgeId, home_id: homeId || null },
        authMode: "userPool",
      });
      setMessage(homeId ? `Edge assigned to ${homeId}.` : "Edge unassigned.");
      await fetchAll();
    } catch (err) {
      console.error("linkEdgeToHome failed", err);
      setError(
        "Could not update the edge. You must own both the edge and the home."
      );
    } finally {
      setBusy("");
    }
  };

  const edgesByHome = edges.reduce((acc, e) => {
    if (e.home_id) (acc[e.home_id] = acc[e.home_id] || []).push(e);
    return acc;
  }, {});
  const unassigned = edges.filter(
    (e) => !e.home_id || !homes.some((h) => h.smartHomeId === e.home_id)
  );

  const formatAddress = (item) =>
    [item.addressLine1, item.city, item.postalCode]
      .filter(Boolean)
      .join(", ") || "—";

  return (
    <div className="dhc-manager-list">
      {!showForm && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          <button
            type="button"
            className="dhc-button-primary"
            onClick={() => {
              setEditingItem(null);
              setShowForm(true);
            }}
            disabled={!isAuthenticated || !createResult.allowed}
            title={
              !isAuthenticated
                ? "Sign in to create a DigitalHome"
                : !createResult.allowed
                ? "Your tier does not allow creating new homes"
                : undefined
            }
          >
            + Create DigitalHome
          </button>
          {isAuthenticated && !createResult.allowed && tier !== "guest" && (
            <UpgradePrompt
              required={createResult.requiredTier}
              current={tier}
              compact
            />
          )}
        </div>
      )}

      {error && (
        <p style={{ color: "#fca5a5", fontSize: "0.85rem" }}>{error}</p>
      )}
      {message && <p className="dhc-message">{message}</p>}

      {showForm && (
        <div style={{ marginBottom: "1.5rem" }}>
          <SmartHomeForm
            item={editingItem}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingItem(null);
            }}
          />
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: "0.85rem", color: "#9ca3af" }}>Loading…</p>
      ) : homes.length === 0 ? (
        <p style={{ color: "#9ca3af" }}>
          {authState === "authenticated"
            ? "No DigitalHomes yet. Click + Create DigitalHome to start."
            : "Sign in to create and manage your DigitalHomes."}
        </p>
      ) : (
        homes.map((home) => {
          const isActive = activeHome?.id === home.smartHomeId;
          const homeEdges = edgesByHome[home.smartHomeId] || [];
          return (
            <div
              key={home.smartHomeId}
              style={{
                border: "1px solid #2b3346",
                borderRadius: 10,
                marginBottom: "1rem",
                overflow: "hidden",
                background: "rgba(148,163,184,0.03)",
              }}
            >
              {/* home header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.9rem",
                  flexWrap: "wrap",
                  padding: "0.8rem 0.9rem",
                }}
              >
                <button
                  type="button"
                  className={`dhc-home-pick${
                    isActive ? " dhc-home-pick--active" : ""
                  }`}
                  onClick={() => setActiveHome(home.smartHomeId)}
                >
                  <span className="dhc-home-pick-check" aria-hidden="true">
                    {isActive ? "✓" : ""}
                  </span>
                  <span className="dhc-home-pick-id">{home.smartHomeId}</span>
                </button>
                <span
                  style={{ fontSize: "0.82rem", color: "#cbd5f5", flex: 1 }}
                >
                  {formatAddress(home)} · {home.country}
                </span>
                <span className="dhc-nav-pill">
                  {home.isDemo ? "Demo" : "Real"}
                </span>
                <button
                  type="button"
                  className="dhc-button-ghost"
                  onClick={() => {
                    setEditingItem(home);
                    setShowForm(true);
                  }}
                >
                  Modify
                </button>
                <button
                  type="button"
                  className="dhc-button-danger"
                  onClick={() => handleDelete(home)}
                >
                  Delete
                </button>
              </div>
              {/* nested edges */}
              {homeEdges.length > 0 ? (
                homeEdges.map((e) => (
                  <EdgeRow
                    key={e.edge_id}
                    e={e}
                    onAssign={assign}
                    busy={busy}
                  />
                ))
              ) : (
                <div
                  style={{
                    padding: "0.55rem 0.9rem",
                    borderTop: "1px solid rgba(148,163,184,0.1)",
                    fontSize: "0.78rem",
                    color: "#6b7280",
                    fontStyle: "italic",
                  }}
                >
                  No edge paired — pair it from the edge box.
                </div>
              )}
            </div>
          );
        })
      )}

      {/* unassigned edges */}
      {unassigned.length > 0 && (
        <div
          style={{
            border: "1px dashed #3b4252",
            borderRadius: 10,
            marginTop: "1.5rem",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "0.7rem 0.9rem",
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "#f59e0b",
            }}
          >
            Unassigned edges ({unassigned.length}) — assign each to one of your
            homes
          </div>
          {unassigned.map((e) => (
            <EdgeRow
              key={e.edge_id}
              e={e}
              homes={homes}
              onAssign={assign}
              busy={busy}
              assignable
              choice={choice}
              setChoice={setChoice}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FleetManager;
