"use client";

import { type CSSProperties, useState } from "react";
import { loginAction } from "../actions";

/**
 * Demo personas for the role picker on login — match the approved design
 * (reference CRM-PRO.dc.html, ROLES). `username` ties the card to the real
 * login (loginAction). The shared demo password is `demo1234`.
 */
interface Persona {
  readonly key: string;
  readonly username: string;
  readonly label: string;
  readonly sub: string;
  readonly name: string;
  readonly email: string;
  readonly init: string;
  readonly av: string;
}

const PERSONAS: readonly Persona[] = [
  {
    key: "head",
    username: "a.peterson",
    label: "Head of sales",
    sub: "Whole department",
    name: "Alan Peterson",
    email: "a.peterson@millbrookfoods.com",
    init: "AP",
    av: "linear-gradient(135deg,#8a90a0,#5b6070)",
  },
  {
    key: "mop",
    username: "d.owens",
    label: "Manager",
    sub: "My deals",
    name: "Daniel Owens",
    email: "d.owens@millbrookfoods.com",
    init: "DO",
    av: "linear-gradient(135deg,#7e8596,#4d5360)",
  },
  {
    key: "technologist",
    username: "m.kent",
    label: "Technologist",
    sub: "Tests and site visits",
    name: "Maria Kent",
    email: "m.kent@millbrookfoods.com",
    init: "MK",
    av: "linear-gradient(135deg,#5b8f86,#3c615b)",
  },
  {
    key: "procurement",
    username: "s.griffin",
    label: "Procurement",
    sub: "Supply and quotas",
    name: "Sam Griffin",
    email: "s.griffin@millbrookfoods.com",
    init: "SG",
    av: "linear-gradient(135deg,#9a8358,#6a5a3a)",
  },
  {
    key: "accountant",
    username: "o.mills",
    label: "Accountant",
    sub: "Invoices and payments",
    name: "Olivia Mills",
    email: "o.mills@millbrookfoods.com",
    init: "OM",
    av: "linear-gradient(135deg,#8f6b6b,#5f4444)",
  },
  {
    key: "logist",
    username: "p.grant",
    label: "Logistics",
    sub: "Routes",
    name: "Peter Grant",
    email: "p.grant@millbrookfoods.com",
    init: "PG",
    av: "linear-gradient(135deg,#6b7d8f,#44525f)",
  },
];

const DEMO_PASSWORD = "demo1234";

const inputStyle: CSSProperties = {
  width: "100%",
  font: "400 13px Arial",
  padding: "11px 13px",
  border: "1px solid #e8e1d9",
  borderRadius: "12px",
  background: "#fff",
  color: "#16181d",
  boxSizing: "border-box",
  outline: "none",
};

/**
 * Login screen: demo role picker cards (6 personas, 2 columns) + credentials +
 * "Log in · <name> →" button. Matches the design reference; login goes through
 * the server `loginAction` (by the selected persona's `username`).
 */
export function LoginRolePicker({ error }: { error: boolean }) {
  const [pickedKey, setPickedKey] = useState<string>("head");
  const [email, setEmail] = useState<string>(PERSONAS[0]!.email);
  const [password, setPassword] = useState<string>(DEMO_PASSWORD);

  const picked = PERSONAS.find((p) => p.key === pickedKey) ?? PERSONAS[0]!;

  function pick(p: Persona) {
    setPickedKey(p.key);
    setEmail(p.email);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "#F8F3EF",
        backgroundImage:
          "radial-gradient(820px 560px at 96% -6%, rgba(191,50,43,0.16), transparent 60%), radial-gradient(620px 560px at 40% 16%, rgba(227,179,43,0.18), transparent 62%), radial-gradient(760px 620px at 76% 110%, rgba(150,120,90,0.10), transparent 60%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial",
        padding: "20px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          width: "452px",
          maxWidth: "100%",
          background: "rgba(255,255,255,0.62)",
          backdropFilter: "blur(22px) saturate(1.3)",
          WebkitBackdropFilter: "blur(22px) saturate(1.3)",
          border: "1px solid rgba(255,255,255,0.7)",
          boxShadow: "0 12px 34px rgba(31,45,80,0.10), inset 0 1px 0 rgba(255,255,255,0.85)",
          borderRadius: "24px",
          padding: "34px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "11px", marginBottom: "24px" }}>
          <div
            aria-hidden
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "13px",
              background: "#BF322B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              font: "800 17px Arial",
            }}
          >
            C
          </div>
          <span style={{ font: "700 20px Arial", letterSpacing: "-.3px" }}>CRM Pro</span>
        </div>

        <div style={{ font: "700 22px Arial", letterSpacing: "-.4px" }}>Sign in</div>
        <div style={{ font: "400 13px Arial", color: "#9a9ea8", margin: "6px 0 22px" }}>
          Sales department · demo access ·{" "}
          <a href="https://btwstudio.dev/work/crm-pro" style={{ color: "inherit" }}>
            by BTW Studio
          </a>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "11px" }}>
          <span style={{ font: "700 11px Arial", color: "#9a9ea8", letterSpacing: ".6px" }}>
            DEMO ACCESS · CHOOSE A ROLE
          </span>
          <span style={{ flex: 1, height: "1px", background: "rgba(60,50,40,0.08)" }} />
        </div>

        <div
          className="r-role-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "9px",
            marginBottom: "18px",
          }}
        >
          {PERSONAS.map((p) => {
            const active = p.key === pickedKey;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => pick(p)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "9px 11px",
                  borderRadius: "13px",
                  background: active ? "rgba(191,50,43,0.08)" : "rgba(255,255,255,0.55)",
                  border: active ? "1.5px solid #BF322B" : "1px solid #e8e1d9",
                  cursor: "pointer",
                  minWidth: 0,
                  textAlign: "left",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: "32px",
                    height: "32px",
                    flex: "none",
                    borderRadius: "9px",
                    background: p.av,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    font: "700 11px Arial",
                  }}
                >
                  {p.init}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      font: "700 12.5px Arial",
                      color: active ? "#BF322B" : "#16181d",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {p.label}
                  </span>
                  <span
                    style={{
                      display: "block",
                      font: "400 10.5px Arial",
                      color: "#9a9ea8",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      marginTop: "1px",
                    }}
                  >
                    {p.sub}
                  </span>
                </span>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#BF322B"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  style={{ flex: "none", opacity: active ? 1 : 0 }}
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </button>
            );
          })}
        </div>

        {error ? (
          <div style={{ font: "600 12px Arial", color: "#BF322B", marginBottom: "12px" }}>
            Invalid email or password
          </div>
        ) : null}

        <form action={loginAction}>
          <input type="hidden" name="username" value={picked.username} readOnly />
          <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: "600 12px Arial", color: "#6b6f78", marginBottom: "6px" }}>
                Email
              </div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                aria-label="Email"
                style={inputStyle}
              />
            </div>
            <div style={{ width: "116px", flex: "none" }}>
              <div style={{ font: "600 12px Arial", color: "#6b6f78", marginBottom: "6px" }}>
                Password
              </div>
              <input
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
                aria-label="Password"
                style={inputStyle}
              />
            </div>
          </div>

          <button
            type="submit"
            style={{
              width: "100%",
              border: "none",
              background: "#1c1f27",
              color: "#fff",
              font: "600 14px Arial",
              padding: "13px",
              borderRadius: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            Log in · {picked.name}
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
