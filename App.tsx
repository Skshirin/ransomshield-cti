import { useState } from "react";
import {
  Shield, Eye, EyeOff, ChevronLeft, Mail, Check, X, Bell,
  Search, LayoutDashboard, Monitor, AlertTriangle, Globe,
  Settings, MoreVertical, Download, ChevronRight, ChevronDown,
  Copy, ExternalLink, Lock, Loader2, Plus, FileText,
  Activity, Database, CheckCircle2, AlertCircle,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

type Page = "home" | "login" | "register" | "forgot-password" | "dashboard" | "endpoints" | "detections" | "cti-center" | "cti-feed";

const P = "#17313E";     // primary dark teal
const STORM = "#415E72"; // storm blue
const LAV = "#C5B0CD";   // lavender haze
const BG = "#F8FAFC";
const TEXT = "#111827";
const MUTED = "#6B7280";
const BORDER = "#E5E7EB";
const RED = "#DC2626";
const AMBER = "#F59E0B";
const GREEN = "#16A34A";

// ─── DATA ───────────────────────────────────────────────────────────────────

const lineData = [
  { d: 1, v: 3 }, { d: 2, v: 5 }, { d: 3, v: 2 }, { d: 4, v: 8 },
  { d: 5, v: 12 }, { d: 6, v: 6 }, { d: 7, v: 3 }, { d: 8, v: 4 },
  { d: 9, v: 7 }, { d: 10, v: 9 }, { d: 11, v: 14 }, { d: 12, v: 11 },
  { d: 13, v: 5 }, { d: 14, v: 3 }, { d: 15, v: 8 }, { d: 16, v: 6 },
  { d: 17, v: 4 }, { d: 18, v: 9 }, { d: 19, v: 16 }, { d: 20, v: 13 },
  { d: 21, v: 7 }, { d: 22, v: 5 }, { d: 23, v: 3 }, { d: 24, v: 6 },
  { d: 25, v: 8 }, { d: 26, v: 11 }, { d: 27, v: 9 }, { d: 28, v: 4 },
  { d: 29, v: 6 }, { d: 30, v: 3 },
];

const pieData = [
  { name: "Online", value: 48, color: GREEN },
  { name: "Offline", value: 2, color: MUTED },
  { name: "At Risk", value: 3, color: AMBER },
];

const riskData = [
  { label: "Low", count: 24, color: GREEN },
  { label: "Medium", count: 14, color: AMBER },
  { label: "High", count: 8, color: "#F97316" },
  { label: "Critical", count: 3, color: RED },
];

const ENDPOINTS = [
  { id: 1, name: "WORKSTATION-A01", status: "Online", lastSeen: "2 min ago", os: "Windows 11 22H2", cpu: 34, ram: 62, disk: 45 },
  { id: 2, name: "WORKSTATION-B07", status: "Online", lastSeen: "5 min ago", os: "Windows 10 21H2", cpu: 78, ram: 81, disk: 67 },
  { id: 3, name: "SERVER-MAIN-01", status: "At Risk", lastSeen: "12 min ago", os: "Ubuntu 22.04 LTS", cpu: 91, ram: 87, disk: 73 },
  { id: 4, name: "LAPTOP-EXEC-04", status: "Offline", lastSeen: "3 hrs ago", os: "macOS Ventura 13.4", cpu: 0, ram: 0, disk: 0 },
  { id: 5, name: "WORKSTATION-C12", status: "Online", lastSeen: "1 min ago", os: "Windows 11 22H2", cpu: 22, ram: 41, disk: 38 },
  { id: 6, name: "SERVER-DB-02", status: "Online", lastSeen: "8 min ago", os: "Ubuntu 20.04 LTS", cpu: 55, ram: 69, disk: 82 },
];

const DETECTIONS = [
  { id: 1, time: "2024-01-15 14:23:07", endpoint: "SERVER-MAIN-01", score: 96, status: "New", severity: "Critical" },
  { id: 2, time: "2024-01-15 11:04:33", endpoint: "WORKSTATION-B07", score: 72, status: "Investigating", severity: "High" },
  { id: 3, time: "2024-01-14 22:17:51", endpoint: "LAPTOP-EXEC-04", score: 38, status: "Resolved", severity: "Low" },
  { id: 4, time: "2024-01-14 09:42:18", endpoint: "WORKSTATION-A01", score: 61, status: "Resolved", severity: "Medium" },
  { id: 5, time: "2024-01-13 16:55:44", endpoint: "SERVER-DB-02", score: 88, status: "New", severity: "High" },
];

const CTI_FEED = [
  { id: 1, org: "ThreatWatch Inc.", type: "Ransomware", preview: "LockBit 3.0 variant detected targeting healthcare sector infrastructure via RDP brute-force...", time: "2 hrs ago", verified: true },
  { id: 2, org: "Anonymous", type: "Phishing", preview: "Credential harvesting campaign using fake Microsoft 365 login pages, spoofing internal IT...", time: "5 hrs ago", verified: true },
  { id: 3, org: "CyberSentinel", type: "Supply Chain", preview: "Compromised npm package 'auth-utils@2.1.4' exfiltrating environment variables on install...", time: "1 day ago", verified: false },
  { id: 4, org: "RedTeam Labs", type: "Ransomware", preview: "Novel encryption routine targeting network shares with double-extortion ransom demand...", time: "2 days ago", verified: true },
];

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    Online:       { bg: "#DCFCE7", color: GREEN },
    Offline:      { bg: "#F3F4F6", color: MUTED },
    "At Risk":    { bg: "#FEF3C7", color: "#92400E" },
    New:          { bg: "#EEF2FF", color: "#4338CA" },
    Investigating:{ bg: "#FEF3C7", color: "#92400E" },
    Resolved:     { bg: "#DCFCE7", color: GREEN },
  };
  const s = map[status] ?? { bg: "#F3F4F6", color: MUTED };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {status}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const bg = score > 75 ? RED : score > 40 ? AMBER : GREEN;
  return (
    <span
      className="inline-flex items-center justify-center w-9 h-9 rounded-full text-[12px] font-bold text-white flex-shrink-0"
      style={{ backgroundColor: bg }}
    >
      {score}
    </span>
  );
}

function FieldInput({
  label, type = "text", placeholder, value, onChange, error, right,
}: {
  label?: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void;
  error?: string | null; right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[13px] font-medium" style={{ color: MUTED }}>{label}</label>
      )}
      <div className="relative">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-11 px-3 rounded-xl text-[14px] border outline-none transition-colors"
          style={{
            borderColor: error ? RED : BORDER,
            backgroundColor: error ? "rgba(220,38,38,0.04)" : "white",
            color: TEXT,
          }}
        />
        {right && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>
        )}
      </div>
      {error && <p className="text-[12px]" style={{ color: RED }}>{error}</p>}
    </div>
  );
}

function PrimaryBtn({
  children, onClick, disabled, loading, full = true,
}: {
  children: React.ReactNode; onClick?: () => void;
  disabled?: boolean; loading?: boolean; full?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="h-11 px-5 rounded-[10px] text-[14px] font-semibold text-white flex items-center justify-center gap-2 transition-opacity"
      style={{
        width: full ? "100%" : undefined,
        backgroundColor: disabled ? BORDER : P,
        color: disabled ? MUTED : "white",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: loading ? 0.85 : 1,
      }}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

// ─── HOME / ONBOARDING ───────────────────────────────────────────────────────

function HomeScreen({ nav }: { nav: (p: Page) => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: BG }}>
      {/* Wordmark */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: P }}
        >
          <Shield className="w-5 h-5 text-white" />
        </div>
        <span className="text-[26px] font-bold tracking-tight" style={{ color: TEXT }}>SentinelIQ</span>
      </div>
      <p className="text-[14px] mb-12" style={{ color: MUTED }}>Cyber Threat Intelligence Platform</p>

      {/* Option cards */}
      <div className="w-full max-w-[480px] flex flex-col gap-3">
        {/* Create Organization */}
        <div
          className="bg-white border rounded-2xl p-6 shadow-sm flex items-start gap-5 group cursor-pointer hover:shadow-md transition-all"
          style={{ borderColor: BORDER }}
          onClick={() => nav("register")}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ backgroundColor: "rgba(23,49,62,0.07)" }}
          >
            <Plus className="w-5 h-5" style={{ color: P }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-bold mb-1" style={{ color: TEXT }}>Create Organization</h2>
            <p className="text-[13px] leading-relaxed mb-4" style={{ color: MUTED }}>
              Set up a new SentinelIQ organization and become its administrator.
            </p>
            <button
              className="flex items-center gap-1.5 text-[13px] font-semibold transition-opacity group-hover:opacity-80"
              style={{ color: P }}
            >
              Create Organization <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Join Organization */}
        <div
          className="bg-white border rounded-2xl p-6 shadow-sm flex items-start gap-5 group cursor-pointer hover:shadow-md transition-all"
          style={{ borderColor: BORDER }}
          onClick={() => nav("login")}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ backgroundColor: "rgba(65,94,114,0.08)" }}
          >
            <Globe className="w-5 h-5" style={{ color: STORM }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-bold mb-1" style={{ color: TEXT }}>Join Organization</h2>
            <p className="text-[13px] leading-relaxed mb-4" style={{ color: MUTED }}>
              Join an existing SentinelIQ organization using an invitation.
            </p>
            <button
              className="flex items-center gap-1.5 text-[13px] font-semibold transition-opacity group-hover:opacity-80"
              style={{ color: STORM }}
            >
              Join Organization <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sign in link */}
      <p className="mt-8 text-[13px]" style={{ color: MUTED }}>
        Already have an account?{" "}
        <button
          onClick={() => nav("login")}
          className="hover:opacity-75 transition-opacity"
          style={{ color: STORM }}
        >
          Sign in
        </button>
      </p>
    </div>
  );
}

// ─── AUTH: LOGIN ─────────────────────────────────────────────────────────────

function LoginScreen({ nav }: { nav: (p: Page) => void }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = () => {
    if (!email || !pw) { setError(true); return; }
    setError(false);
    setLoading(true);
    setTimeout(() => { setLoading(false); nav("dashboard"); }, 900);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: BG }}>
      <div className="w-full max-w-[420px]">
        <div className="bg-white rounded-2xl border p-8 shadow-sm" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: P }}>
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-[20px] font-bold tracking-tight" style={{ color: TEXT }}>SentinelIQ</span>
          </div>

          <div className="flex flex-col gap-4">
            <FieldInput
              label="Work Email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={setEmail}
              error={error && !email ? "Email is required." : error && email ? "Invalid email or password." : null}
            />
            <div className="flex flex-col gap-1">
              <FieldInput
                label="Password"
                type="password"
                placeholder="••••••••"
                value={pw}
                onChange={setPw}
                error={error && !pw ? "Password is required." : null}
              />
              <div className="flex justify-end">
                <button
                  onClick={() => nav("forgot-password")}
                  className="text-[13px] hover:opacity-75 transition-opacity"
                  style={{ color: STORM }}
                >
                  Forgot password?
                </button>
              </div>
            </div>
            <div className="mt-1">
              <PrimaryBtn onClick={submit} loading={loading}>Log In</PrimaryBtn>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t text-center" style={{ borderColor: BORDER }}>
            <p className="text-[13px]" style={{ color: MUTED }}>
              {"Don't have an account? "}
              <button onClick={() => nav("register")} className="hover:opacity-75" style={{ color: STORM }}>Create one</button>
            </p>
          </div>
        </div>

        <p className="text-center mt-5 text-[11px] flex items-center justify-center gap-1" style={{ color: MUTED }}>
          <Lock className="w-3 h-3 opacity-60" />
          Enterprise-grade security · SSO available · SOC 2 Type II
        </p>
      </div>
    </div>
  );
}

// ─── AUTH: REGISTER ──────────────────────────────────────────────────────────

function RegisterScreen({ nav }: { nav: (p: Page) => void }) {
  const [form, setForm] = useState({ org: "", name: "", email: "", pw: "" });
  const [agreed, setAgreed] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = () => {
    if (form.email === "taken@company.com") { setEmailError(true); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); setSuccess(true); }, 900);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: BG }}>
        <div className="w-full max-w-[440px] bg-white rounded-2xl border p-10 shadow-sm text-center" style={{ borderColor: BORDER }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: "rgba(22,163,74,0.1)" }}>
            <CheckCircle2 className="w-7 h-7" style={{ color: GREEN }} />
          </div>
          <h2 className="text-[20px] font-bold mb-2" style={{ color: TEXT }}>Check your email</h2>
          <p className="text-[14px] mb-5" style={{ color: MUTED }}>
            {"We've sent a confirmation link to "}
            <strong style={{ color: TEXT }}>{form.email || "your@email.com"}</strong>
          </p>
          <button className="text-[13px] hover:opacity-75" style={{ color: STORM }}>Resend email</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ backgroundColor: BG }}>
      <div className="w-full max-w-[440px]">
        <div className="bg-white rounded-2xl border p-8 shadow-sm" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: P }}>
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-[20px] font-bold" style={{ color: TEXT }}>SentinelIQ</span>
          </div>

          <h1 className="text-[22px] font-bold mb-1" style={{ color: TEXT }}>Create your organization</h1>
          <p className="text-[14px] mb-6" style={{ color: MUTED }}>Set up your security workspace in under 2 minutes.</p>

          <div className="flex flex-col gap-4">
            <FieldInput label="Organization Name" placeholder="Acme Corp" value={form.org} onChange={set("org")} />
            <FieldInput label="Admin Full Name" placeholder="Jane Smith" value={form.name} onChange={set("name")} />
            <FieldInput
              label="Work Email"
              type="email"
              placeholder="jane@acme.com"
              value={form.email}
              onChange={(v) => { set("email")(v); setEmailError(false); }}
              error={emailError ? "This email is already registered." : null}
            />
            <FieldInput
              label="Password"
              type={showPw ? "text" : "password"}
              placeholder="••••••••"
              value={form.pw}
              onChange={set("pw")}
              right={
                <button onClick={() => setShowPw(s => !s)} style={{ color: MUTED }}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <div className="flex items-start gap-3 mt-1">
              <button
                onClick={() => setAgreed(a => !a)}
                className="w-4 h-4 mt-0.5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors"
                style={{ backgroundColor: agreed ? P : "white", borderColor: agreed ? P : BORDER }}
              >
                {agreed && <Check className="w-2.5 h-2.5 text-white" />}
              </button>
              <p className="text-[13px]" style={{ color: MUTED }}>
                {"I agree to the "}
                <span className="cursor-pointer hover:opacity-75" style={{ color: STORM }}>Terms of Service</span>
                {" and "}
                <span className="cursor-pointer hover:opacity-75" style={{ color: STORM }}>Privacy Policy</span>
              </p>
            </div>

            <div className="mt-1">
              <PrimaryBtn onClick={submit} disabled={!agreed} loading={loading}>Create Account</PrimaryBtn>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t text-center" style={{ borderColor: BORDER }}>
            <p className="text-[13px]" style={{ color: MUTED }}>
              Already have an account?{" "}
              <button onClick={() => nav("login")} className="hover:opacity-75" style={{ color: STORM }}>Log in</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AUTH: FORGOT PASSWORD ───────────────────────────────────────────────────

function ForgotPasswordScreen({ nav }: { nav: (p: Page) => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [strength, setStrength] = useState(0);
  const [loading, setLoading] = useState(false);

  const calcStrength = (v: string) => {
    let s = 0;
    if (v.length >= 8) s++;
    if (/[A-Z]/.test(v)) s++;
    if (/[0-9]/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v)) s++;
    return s;
  };

  const strengthColors = ["#E5E7EB", RED, AMBER, AMBER, GREEN];
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

  const doSend = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); setStep(2); }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: BG }}>
      <div className="w-full max-w-[420px]">
        <button
          onClick={() => step === 1 ? nav("login") : setStep(s => (s - 1) as 1 | 2 | 3)}
          className="flex items-center gap-1.5 text-[13px] mb-6 hover:opacity-70 transition-opacity"
          style={{ color: MUTED }}
        >
          <ChevronLeft className="w-4 h-4" /> Back to login
        </button>

        <div className="bg-white rounded-2xl border p-8 shadow-sm" style={{ borderColor: BORDER }}>
          {step === 1 && (
            <>
              <h2 className="text-[20px] font-bold mb-1" style={{ color: TEXT }}>Reset your password</h2>
              <p className="text-[14px] mb-6" style={{ color: MUTED }}>{"Enter your email and we'll send you a reset link."}</p>
              <div className="flex flex-col gap-4">
                <FieldInput label="Work Email" type="email" placeholder="you@company.com" value={email} onChange={setEmail} />
                <PrimaryBtn onClick={doSend} loading={loading}>Send Reset Link</PrimaryBtn>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ backgroundColor: "rgba(65,94,114,0.1)" }}>
                <Mail className="w-7 h-7" style={{ color: STORM }} />
              </div>
              <h2 className="text-[20px] font-bold mb-2" style={{ color: TEXT }}>Check your inbox</h2>
              <p className="text-[14px] mb-4" style={{ color: MUTED }}>
                {"We've sent a reset link to "}
                <strong style={{ color: TEXT }}>{email || "your@email.com"}</strong>
              </p>
              <button className="text-[13px] hover:opacity-70" style={{ color: MUTED }}>{"Didn't get it? Resend"}</button>
              <div className="mt-6">
                <PrimaryBtn onClick={() => setStep(3)}>Set New Password</PrimaryBtn>
              </div>
            </div>
          )}

          {step === 3 && (
            <>
              <div className="mb-4 px-4 py-3 rounded-xl text-[13px] flex items-center gap-2"
                style={{ backgroundColor: "rgba(245,158,11,0.08)", color: "#92400E" }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Link expired — request a new one
              </div>
              <h2 className="text-[20px] font-bold mb-1" style={{ color: TEXT }}>Set a new password</h2>
              <p className="text-[14px] mb-6" style={{ color: MUTED }}>Choose a strong password for your account.</p>
              <div className="flex flex-col gap-4">
                <div>
                  <FieldInput
                    label="New Password"
                    type="password"
                    placeholder="••••••••"
                    value={pw}
                    onChange={(v) => { setPw(v); setStrength(calcStrength(v)); }}
                  />
                  {pw.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map(i => (
                          <div
                            key={i}
                            className="h-1 flex-1 rounded-full transition-colors"
                            style={{ backgroundColor: i <= strength ? strengthColors[strength] : BORDER }}
                          />
                        ))}
                      </div>
                      <p className="text-[11px] mt-1" style={{ color: MUTED }}>{strengthLabels[strength]}</p>
                    </div>
                  )}
                </div>
                <FieldInput
                  label="Confirm Password"
                  type="password"
                  placeholder="••••••••"
                  value={pw2}
                  onChange={setPw2}
                  error={pw2.length > 0 && pw !== pw2 ? "Passwords do not match." : null}
                />
                <PrimaryBtn onClick={() => nav("login")}>Update Password</PrimaryBtn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── LAYOUT ──────────────────────────────────────────────────────────────────

const NAV = [
  { id: "dashboard" as Page, label: "Dashboard", Icon: LayoutDashboard },
  { id: "endpoints" as Page, label: "Endpoints", Icon: Monitor },
  { id: "detections" as Page, label: "Detections", Icon: AlertTriangle },
  { id: "cti-center" as Page, label: "CTI Center", Icon: FileText },
  { id: "cti-feed" as Page, label: "CTI Feed", Icon: Globe },
];

function AppLayout({ page, nav, children }: { page: Page; nav: (p: Page) => void; children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: BG }}>
      {/* Sidebar */}
      <aside className="w-[240px] flex-shrink-0 flex flex-col bg-white border-r" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-2.5 px-5 py-[18px] border-b" style={{ borderColor: BORDER }}>
          <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: P }}>
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-[15px]" style={{ color: TEXT }}>SentinelIQ</span>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
          {NAV.map(({ id, label, Icon }) => {
            const active = page === id;
            return (
              <button
                key={id}
                onClick={() => nav(id)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium w-full text-left transition-colors"
                style={{
                  backgroundColor: active ? "rgba(23,49,62,0.08)" : "transparent",
                  color: active ? P : MUTED,
                }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </button>
            );
          })}
          <button
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium w-full text-left mt-auto"
            style={{ color: MUTED }}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            Settings
          </button>
        </nav>

        <div className="px-4 py-4 border-t flex items-center gap-2.5" style={{ borderColor: BORDER }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
            style={{ backgroundColor: STORM }}>JS</div>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold truncate" style={{ color: TEXT }}>Jane Smith</p>
            <p className="text-[11px]" style={{ color: MUTED }}>Admin</p>
          </div>
        </div>
      </aside>

      {/* Right side */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex-shrink-0 flex items-center px-6 gap-4 bg-white border-b" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[13px] font-semibold" style={{ color: TEXT }}>Acme Corp</span>
            <ChevronDown className="w-3.5 h-3.5" style={{ color: MUTED }} />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-2 px-3 h-9 rounded-[10px] border w-full max-w-[300px]"
              style={{ backgroundColor: BG, borderColor: BORDER }}>
              <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: MUTED }} />
              <input
                placeholder="Search or press ⌘K"
                className="flex-1 text-[13px] bg-transparent outline-none"
                style={{ color: TEXT }}
              />
              <kbd className="text-[10px] px-1.5 py-0.5 rounded border" style={{ color: MUTED, borderColor: BORDER }}>⌘K</kbd>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button className="relative p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              <Bell className="w-4 h-4" style={{ color: MUTED }} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full border-2 border-white"
                style={{ backgroundColor: RED }} />
            </button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
              style={{ backgroundColor: STORM }}>JS</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

function Dashboard() {
  return (
    <div className="p-6 flex flex-col gap-7">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-3">
        {([
          { label: "ENDPOINTS ONLINE", value: "48 / 50", sub: "2 offline", dot: GREEN },
          { label: "ACTIVE DETECTIONS", value: "7", sub: "Requires review", dot: RED, alert: true },
          { label: "CTI PUBLISHED", value: "14", sub: "Reports on-chain", accent: LAV },
          { label: "CTI RECEIVED", value: "31", sub: "From network feed" },
        ] as const).map((c, i) => (
          <div key={i} className="bg-white border rounded-[10px] p-5 shadow-sm" style={{ borderColor: BORDER }}>
            <p className="text-[10px] font-bold tracking-[0.1em] mb-3 uppercase" style={{ color: MUTED }}>{c.label}</p>
            <div className="flex items-center gap-2">
              <span className="text-[28px] font-bold leading-none" style={{ color: "alert" in c && c.alert ? RED : TEXT }}>
                {c.value}
              </span>
              {"dot" in c && c.dot && (
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: c.dot,
                    boxShadow: "alert" in c && c.alert ? `0 0 0 4px rgba(220,38,38,0.15)` : "none",
                  }}
                />
              )}
              {"accent" in c && c.accent && (
                <div className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: "rgba(197,176,205,0.15)" }}>
                  <Globe className="w-3 h-3" style={{ color: LAV }} />
                </div>
              )}
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: MUTED }}>{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Line chart */}
        <div className="col-span-2 bg-white border rounded-[10px] p-5 shadow-sm" style={{ borderColor: BORDER }}>
          <p className="text-[13px] font-semibold mb-4" style={{ color: TEXT }}>Detections — Last 30 Days</p>
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={lineData} margin={{ top: 5, right: 8, bottom: 0, left: -24 }}>
              <defs>
                <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={STORM} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={STORM} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
              <XAxis dataKey="d" tick={{ fontSize: 10, fill: MUTED }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: MUTED }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${BORDER}`, color: TEXT }}
                itemStyle={{ color: STORM }}
              />
              <Line
                type="monotone"
                dataKey="v"
                stroke={STORM}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: STORM }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Donut */}
        <div className="bg-white border rounded-[10px] p-5 shadow-sm" style={{ borderColor: BORDER }}>
          <p className="text-[13px] font-semibold mb-4" style={{ color: TEXT }}>Endpoint Status</p>
          <div className="flex items-center gap-3">
            <PieChart width={96} height={96}>
              <Pie data={pieData} cx={44} cy={44} innerRadius={28} outerRadius={44} dataKey="value" strokeWidth={0}>
                {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
            </PieChart>
            <div className="flex flex-col gap-2.5">
              {pieData.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-[12px]" style={{ color: MUTED }}>{d.name}</span>
                  <span className="text-[12px] font-bold ml-auto pl-3" style={{ color: TEXT }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Risk bars */}
          <div className="mt-5 pt-4 border-t" style={{ borderColor: BORDER }}>
            <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Risk Distribution</p>
            {riskData.map((r) => (
              <div key={r.label} className="flex items-center gap-2 mb-2">
                <span className="text-[11px] w-14" style={{ color: MUTED }}>{r.label}</span>
                <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: BORDER }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${(r.count / 49) * 100}%`, backgroundColor: r.color }} />
                </div>
                <span className="text-[11px] font-semibold w-5 text-right" style={{ color: TEXT }}>{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-2 gap-4">
        {/* Recent Detections */}
        <div className="bg-white border rounded-[10px] shadow-sm overflow-hidden" style={{ borderColor: BORDER }}>
          <div className="px-5 py-3.5 border-b" style={{ borderColor: BORDER }}>
            <p className="text-[13px] font-semibold" style={{ color: TEXT }}>Recent Detections</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: BORDER }}>
                {["Endpoint", "Time", "Score", "Status"].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DETECTIONS.slice(0, 4).map((d) => (
                <tr key={d.id} className="border-b hover:bg-[#F8FAFC] transition-colors" style={{ borderColor: BORDER }}>
                  <td className="px-4 py-3 text-[12px] font-medium" style={{ color: TEXT }}>{d.endpoint}</td>
                  <td className="px-4 py-3 text-[11px] font-mono" style={{ color: MUTED, fontFamily: "var(--font-mono, monospace)" }}>{d.time.split(" ")[1]}</td>
                  <td className="px-4 py-3"><ScoreBadge score={d.score} /></td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CTI Activity */}
        <div className="bg-white border rounded-[10px] shadow-sm overflow-hidden" style={{ borderColor: BORDER }}>
          <div className="px-5 py-3.5 border-b" style={{ borderColor: BORDER }}>
            <p className="text-[13px] font-semibold" style={{ color: TEXT }}>Recent CTI Activity</p>
          </div>
          {CTI_FEED.map((c) => (
            <div key={c.id} className="flex items-start gap-3 px-5 py-3.5 border-b hover:bg-[#F8FAFC] transition-colors" style={{ borderColor: BORDER }}>
              <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: "rgba(197,176,205,0.15)" }}>
                <Globe className="w-3.5 h-3.5" style={{ color: LAV }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-semibold" style={{ color: TEXT }}>{c.type}</p>
                  {c.verified && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ backgroundColor: "rgba(22,163,74,0.1)", color: GREEN }}>Verified</span>
                  )}
                </div>
                <p className="text-[11px] truncate" style={{ color: MUTED }}>{c.org} · {c.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ENDPOINTS ───────────────────────────────────────────────────────────────

function EndpointsScreen() {
  type EP = typeof ENDPOINTS[0];
  const [selected, setSelected] = useState<EP | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const filtered = ENDPOINTS.filter(e =>
    (filter === "All" || e.status === filter) &&
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[24px] font-bold" style={{ color: TEXT }}>Endpoints</h1>
          <p className="text-[14px]" style={{ color: MUTED }}>52 total, 48 online</p>
        </div>
        <button
          onClick={() => { setAddOpen(true); setGenerated(false); }}
          className="flex items-center gap-2 h-10 px-4 rounded-[10px] text-[13px] font-semibold text-white"
          style={{ backgroundColor: P }}
        >
          <Plus className="w-4 h-4" /> Add Endpoint
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 h-9 rounded-lg border bg-white"
          style={{ borderColor: BORDER, width: 280 }}>
          <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: MUTED }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search endpoints..."
            className="flex-1 text-[13px] outline-none bg-transparent"
            style={{ color: TEXT }}
          />
        </div>
        {["All", "Online", "At Risk", "Offline"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 h-9 rounded-lg text-[13px] font-medium border transition-colors"
            style={{
              borderColor: filter === f ? P : BORDER,
              backgroundColor: filter === f ? "rgba(23,49,62,0.07)" : "white",
              color: filter === f ? P : MUTED,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border rounded-[10px] shadow-sm overflow-hidden" style={{ borderColor: BORDER }}>
        <table className="w-full">
          <thead>
            <tr className="border-b bg-white" style={{ borderColor: BORDER }}>
              {["Endpoint Name", "Status", "Last Check-in", "OS Version", ""].map((h, i) => (
                <th key={i} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((ep) => (
              <tr
                key={ep.id}
                onClick={() => setSelected(ep)}
                className="border-b cursor-pointer hover:bg-[#F8FAFC] hover:shadow-inner transition-all"
                style={{ borderColor: BORDER }}
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-3.5 h-3.5 flex-shrink-0" style={{ color: MUTED }} />
                    <span className="text-[13px] font-semibold" style={{ color: TEXT }}>{ep.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5"><StatusBadge status={ep.status} /></td>
                <td className="px-5 py-3.5 text-[13px]" style={{ color: MUTED }}>{ep.lastSeen}</td>
                <td className="px-5 py-3.5 text-[13px]" style={{ color: MUTED }}>{ep.os}</td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                    onClick={e => e.stopPropagation()}
                  >
                    <MoreVertical className="w-4 h-4" style={{ color: MUTED }} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Endpoint Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setSelected(null)} />
          <div className="relative w-[480px] bg-white h-full shadow-2xl flex flex-col overflow-y-auto">
            <div className="flex items-start justify-between px-6 py-5 border-b" style={{ borderColor: BORDER }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-[16px] font-bold" style={{ color: TEXT }}>{selected.name}</h2>
                  <StatusBadge status={selected.status} />
                </div>
                <p className="text-[12px]" style={{ color: MUTED }}>Last seen {selected.lastSeen} · {selected.os}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded hover:bg-gray-100 mt-0.5">
                <X className="w-4 h-4" style={{ color: MUTED }} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6">
              {/* Specs */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>System Specs</p>
                {[
                  { label: "CPU Usage", val: selected.cpu },
                  { label: "RAM Usage", val: selected.ram },
                  { label: "Disk Usage", val: selected.disk },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-3 mb-2.5">
                    <span className="text-[12px] w-20" style={{ color: MUTED }}>{s.label}</span>
                    <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: BORDER }}>
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${s.val}%`, backgroundColor: s.val > 80 ? RED : STORM }}
                      />
                    </div>
                    <span className="text-[12px] font-semibold w-7 text-right" style={{ color: TEXT }}>{s.val}%</span>
                  </div>
                ))}
              </div>

              {/* File activity */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Recent File Activity</p>
                {[
                  { path: "C:\\Users\\Admin\\Documents\\report_q4.docx", warn: false },
                  { path: "C:\\Windows\\System32\\cmd.exe", warn: false },
                  { path: "C:\\Users\\Admin\\AppData\\Local\\Temp\\~tmp482.dat", warn: true },
                ].map(({ path, warn }, i) => (
                  <div key={i} className="flex items-start gap-2 py-2 border-b" style={{ borderColor: BORDER }}>
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: warn ? RED : BORDER }} />
                    <span className="text-[11px] break-all" style={{ color: MUTED, fontFamily: "var(--font-mono, monospace)" }}>{path}</span>
                  </div>
                ))}
              </div>

              {/* Detection history */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Detection History</p>
                {DETECTIONS.filter(d => d.endpoint === selected.name).length === 0
                  ? <p className="text-[12px]" style={{ color: MUTED }}>No detections for this endpoint.</p>
                  : DETECTIONS.filter(d => d.endpoint === selected.name).map(d => (
                    <div key={d.id} className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: BORDER }}>
                      <span className="text-[11px]" style={{ color: MUTED, fontFamily: "var(--font-mono, monospace)" }}>{d.time}</span>
                      <div className="flex items-center gap-2">
                        <ScoreBadge score={d.score} />
                        <StatusBadge status={d.status} />
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>

            <div className="mt-auto px-6 py-4 border-t flex gap-3" style={{ borderColor: BORDER }}>
              <button className="flex-1 h-10 rounded-lg text-[13px] font-medium border transition-colors hover:bg-gray-50"
                style={{ borderColor: BORDER, color: TEXT }}>Rename</button>
              <button className="flex-1 h-10 rounded-lg text-[13px] font-medium border transition-colors hover:bg-red-50"
                style={{ borderColor: RED, color: RED }}>Deactivate</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Endpoint Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => setAddOpen(false)} />
          <div className="relative w-[480px] bg-white rounded-2xl shadow-2xl p-7">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[18px] font-bold" style={{ color: TEXT }}>Add New Endpoint</h2>
              <button onClick={() => setAddOpen(false)} className="hover:opacity-70">
                <X className="w-4 h-4" style={{ color: MUTED }} />
              </button>
            </div>
            <FieldInput label="Endpoint Name" placeholder="e.g. WORKSTATION-A05" value="" onChange={() => {}} />
            {!generated
              ? (
                <div className="mt-4">
                  <PrimaryBtn onClick={() => setGenerated(true)}>Generate Installer</PrimaryBtn>
                </div>
              )
              : (
                <div className="mt-4 flex flex-col gap-4">
                  <div>
                    <p className="text-[12px] font-semibold mb-2" style={{ color: MUTED }}>Installation Token</p>
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border"
                      style={{ borderColor: BORDER, backgroundColor: BG }}>
                      <span className="flex-1 text-[12px] truncate" style={{ color: TEXT, fontFamily: "var(--font-mono, monospace)" }}>
                        SENTIQ-4F2A-7B9C-E1D3-8A6F
                      </span>
                      <button><Copy className="w-3.5 h-3.5" style={{ color: MUTED }} /></button>
                    </div>
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold mb-2.5" style={{ color: MUTED }}>Installation Steps</p>
                    {[
                      "Download the installer package below",
                      "Run installer with administrator privileges",
                      "Enter the token when prompted, then restart",
                    ].map((s, i) => (
                      <div key={i} className="flex gap-3 mb-2.5">
                        <span
                          className="w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0 text-white"
                          style={{ backgroundColor: P }}
                        >{i + 1}</span>
                        <span className="text-[13px]" style={{ color: TEXT }}>{s}</span>
                      </div>
                    ))}
                  </div>
                  <PrimaryBtn>Download Installer</PrimaryBtn>
                </div>
              )
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DETECTIONS ───────────────────────────────────────────────────────────────

function DetectionsScreen() {
  type DET = typeof DETECTIONS[0];
  const [selected, setSelected] = useState<DET | null>(null);
  const [resolved, setResolved] = useState(false);

  const open = (d: DET) => { setSelected(d); setResolved(false); };

  const sevColor = (s: string) =>
    s === "Critical" ? RED : s === "High" ? "#F97316" : s === "Medium" ? AMBER : GREEN;

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[24px] font-bold" style={{ color: TEXT }}>Detections</h1>
          <p className="text-[14px]" style={{ color: MUTED }}>5 incidents recorded</p>
        </div>
        <button className="flex items-center gap-2 h-10 px-4 rounded-[10px] text-[13px] font-medium border transition-colors hover:bg-gray-50"
          style={{ borderColor: BORDER, color: TEXT }}>
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4 px-4 py-2.5 rounded-xl"
        style={{ backgroundColor: BG, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2 px-3 h-8 rounded-lg border bg-white" style={{ borderColor: BORDER }}>
          <Search className="w-3 h-3 flex-shrink-0" style={{ color: MUTED }} />
          <input placeholder="Search detections..." className="text-[12px] outline-none w-40 bg-transparent" />
        </div>
        {["Date Range", "Endpoint", "Severity"].map(f => (
          <button key={f} className="flex items-center gap-1.5 px-3 h-8 rounded-lg border bg-white text-[12px] font-medium"
            style={{ borderColor: BORDER, color: MUTED }}>
            {f} <ChevronDown className="w-3 h-3" />
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border rounded-[10px] shadow-sm overflow-hidden" style={{ borderColor: BORDER }}>
        <table className="w-full">
          <thead>
            <tr className="bg-white border-b" style={{ borderColor: BORDER }}>
              {["Date / Time", "Endpoint", "Risk Score", "Status", "Severity"].map(h => (
                <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DETECTIONS.map((d) => (
              <tr
                key={d.id}
                onClick={() => open(d)}
                className="border-b cursor-pointer hover:bg-[#F8FAFC] transition-all"
                style={{
                  borderColor: BORDER,
                  borderLeft: d.status === "New" ? `3px solid ${RED}` : `3px solid transparent`,
                }}
              >
                <td className="px-5 py-3.5 text-[12px]" style={{ color: MUTED, fontFamily: "var(--font-mono, monospace)" }}>
                  {d.time}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-3.5 h-3.5 flex-shrink-0" style={{ color: MUTED }} />
                    <span className="text-[13px] font-medium" style={{ color: TEXT }}>{d.endpoint}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5"><ScoreBadge score={d.score} /></td>
                <td className="px-5 py-3.5"><StatusBadge status={d.status} /></td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sevColor(d.severity) }} />
                    <span className="text-[12px]" style={{ color: MUTED }}>{d.severity}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Pagination */}
        <div className="flex items-center justify-center gap-1 px-5 py-3 border-t" style={{ borderColor: BORDER }}>
          <button className="px-3 h-7 rounded text-[13px]" style={{ color: MUTED }}>Previous</button>
          {[1, 2, 3].map(p => (
            <button key={p} className="w-7 h-7 rounded text-[13px] font-medium transition-colors"
              style={{ backgroundColor: p === 1 ? P : "transparent", color: p === 1 ? "white" : MUTED }}>
              {p}
            </button>
          ))}
          <button className="px-3 h-7 rounded text-[13px]" style={{ color: MUTED }}>Next</button>
        </div>
      </div>

      {/* Detection Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setSelected(null)} />
          <div className="relative w-[560px] bg-white h-full shadow-2xl flex flex-col overflow-y-auto">
            {resolved && (
              <div className="flex items-center gap-2 px-6 py-3 text-[13px] font-medium"
                style={{ backgroundColor: "rgba(22,163,74,0.08)", color: GREEN }}>
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                Detection marked as resolved.
              </div>
            )}

            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: BORDER }}>
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-[16px] font-bold" style={{ color: TEXT }}>{selected.endpoint}</h2>
                  <p className="text-[11px] mt-0.5" style={{ color: MUTED, fontFamily: "var(--font-mono, monospace)" }}>{selected.time}</p>
                </div>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[15px] font-bold"
                  style={{ backgroundColor: selected.score > 75 ? RED : AMBER }}
                >
                  {selected.score}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded hover:bg-gray-100">
                <X className="w-4 h-4" style={{ color: MUTED }} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6 flex-1">
              {/* Summary */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Summary</p>
                <div className="p-4 rounded-[10px] text-[13px] leading-relaxed" style={{ backgroundColor: BG, color: TEXT }}>
                  A {selected.severity.toLowerCase()}-severity ransomware signature was detected on {selected.endpoint}.
                  Rapid encryption of user files was identified across network shares, with associated lateral movement
                  patterns suggesting initial compromise via a phishing vector.
                </div>
              </div>

              {/* Behaviour indicators */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Behaviour Indicators</p>
                {[
                  { Icon: FileText, label: "Files encrypted", val: "1,204" },
                  { Icon: Activity, label: "Processes involved", val: "3" },
                  { Icon: Database, label: "Registry modifications", val: "12" },
                ].map(({ Icon, label, val }) => (
                  <div key={label} className="flex items-center gap-3 py-2.5 border-b" style={{ borderColor: BORDER }}>
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: STORM }} />
                    <span className="text-[13px] flex-1" style={{ color: TEXT }}>{label}</span>
                    <span className="text-[13px] font-bold" style={{ color: TEXT }}>{val}</span>
                  </div>
                ))}
              </div>

              {/* Timeline */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Timeline</p>
                {[
                  { time: "14:21:03", label: "Suspicious process spawned: vssadmin.exe", critical: true },
                  { time: "14:21:47", label: "Shadow copy deletion attempted", critical: true },
                  { time: "14:22:15", label: "Mass file rename detected (.locked extension)", critical: true },
                  { time: "14:23:01", label: "Network share enumeration began", critical: false },
                  { time: "14:23:07", label: "Alert triggered — endpoint quarantined", critical: false },
                ].map((ev, i, arr) => (
                  <div key={i} className="flex gap-3 pb-4 relative">
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: ev.critical ? RED : MUTED }} />
                      {i < arr.length - 1 && (
                        <div className="flex-1 w-px mt-1" style={{ backgroundColor: BORDER }} />
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] mb-0.5" style={{ color: MUTED, fontFamily: "var(--font-mono, monospace)" }}>{ev.time}</p>
                      <p className="text-[13px]" style={{ color: TEXT }}>{ev.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="sticky bottom-0 px-6 py-4 border-t bg-white flex items-center gap-3" style={{ borderColor: BORDER }}>
              <button className="text-[13px] hover:opacity-70" style={{ color: MUTED }}>Ignore / False Positive</button>
              <button
                onClick={() => setResolved(true)}
                className="ml-auto h-9 px-4 rounded-lg text-[13px] font-medium border hover:bg-gray-50 transition-colors"
                style={{ borderColor: BORDER, color: TEXT }}
              >
                Mark as Resolved
              </button>
              <button className="h-9 px-4 rounded-lg text-[13px] font-semibold text-white" style={{ backgroundColor: P }}>
                Generate CTI Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CTI CENTER ───────────────────────────────────────────────────────────────

function CTICenterScreen() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [visibility, setVisibility] = useState<"org" | "network">("network");
  const [publishing, setPublishing] = useState(false);

  const stepLabels = ["Review Draft", "Publish", "Verify"];

  const doPublish = () => {
    setPublishing(true);
    setTimeout(() => { setPublishing(false); setStep(3); }, 2200);
  };

  return (
    <div className="p-6">
      <h1 className="text-[24px] font-bold mb-6" style={{ color: TEXT }}>CTI Center</h1>

      {/* Step indicator */}
      <div className="flex items-start justify-center gap-0 mb-8">
        {stepLabels.map((label, i) => {
          const n = i + 1 as 1 | 2 | 3;
          const done = n < step;
          const active = n === step;
          return (
            <div key={n} className="flex items-start">
              <div className="flex flex-col items-center gap-2 w-28">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold border-2 transition-all"
                  style={{
                    backgroundColor: done ? GREEN : active ? P : "white",
                    borderColor: done ? GREEN : active ? P : BORDER,
                    color: done || active ? "white" : MUTED,
                  }}
                >
                  {done ? <Check className="w-4 h-4" /> : n}
                </div>
                <span className="text-[12px] font-medium text-center" style={{ color: active ? TEXT : MUTED }}>{label}</span>
              </div>
              {i < 2 && (
                <div className="w-24 h-px mt-4" style={{ backgroundColor: done ? GREEN : BORDER }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Stage 1 */}
      {step === 1 && (
        <>
          <div className="grid grid-cols-5 gap-6">
            <div className="col-span-3 flex flex-col gap-4">
              <div className="border rounded-[10px] overflow-hidden" style={{ borderColor: BORDER }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: BORDER, backgroundColor: BG }}>
                  <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>Attack Summary</p>
                </div>
                <p className="p-4 text-[13px] leading-relaxed" style={{ color: TEXT }}>
                  LockBit 3.0 ransomware variant detected targeting network shares via lateral movement.
                  Initial access achieved through a phishing email with a macro-enabled document. The attacker
                  executed vssadmin.exe to delete shadow copies before initiating mass file encryption
                  with the .locked extension. Estimated 1,204 files affected across 3 network shares.
                </p>
              </div>

              <div className="border rounded-[10px] overflow-hidden" style={{ borderColor: BORDER }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: BORDER, backgroundColor: BG }}>
                  <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>Indicators of Compromise</p>
                </div>
                <div className="p-4 flex flex-wrap gap-2">
                  {["3f2a1b4c5d6e7f8a9b0c", "192.168.1.47", "vssadmin.exe", "C:\\Temp\\~tmp482.dat", "*.locked", "SHA256:a1b2c3d4"].map(ioc => (
                    <span key={ioc} className="px-2.5 py-1 rounded border text-[11px]"
                      style={{ borderColor: BORDER, backgroundColor: BG, color: TEXT, fontFamily: "var(--font-mono, monospace)" }}>
                      {ioc}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border rounded-[10px] overflow-hidden" style={{ borderColor: BORDER }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: BORDER, backgroundColor: BG }}>
                  <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>Recommended Actions</p>
                </div>
                <ul className="p-4 flex flex-col gap-2.5">
                  {[
                    "Isolate affected endpoint immediately from network",
                    "Restore from last clean backup (pre-14:21 UTC)",
                    "Reset credentials for all accounts accessed from affected host",
                    "Patch email gateway — block macro-enabled attachments",
                  ].map((a, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[13px]" style={{ color: TEXT }}>
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: P }} />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Sidebar */}
            <div className="col-span-2">
              <div className="sticky top-4 border rounded-[10px] overflow-hidden" style={{ borderColor: BORDER }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: BORDER, backgroundColor: BG }}>
                  <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>Affected Endpoint</p>
                </div>
                <div className="p-4 flex flex-col gap-2.5 border-b" style={{ borderColor: BORDER }}>
                  {[
                    ["Hostname", "SERVER-MAIN-01"],
                    ["OS", "Ubuntu 22.04 LTS"],
                    ["Risk Score", "96 / 100"],
                    ["Detection Time", "2024-01-15 14:23:07"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-[12px]" style={{ color: MUTED }}>{k}</span>
                      <span className="text-[12px] font-semibold" style={{ color: TEXT }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 border-b" style={{ borderColor: BORDER, backgroundColor: BG }}>
                  <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>Analyst Notes</p>
                </div>
                <div className="p-4">
                  <textarea
                    rows={5}
                    className="w-full text-[12px] outline-none resize-none bg-transparent"
                    style={{ color: TEXT }}
                    defaultValue="Confirmed ransomware. Pattern matches LockBit 3.0 IOCs. No exfiltration evidence yet — network capture ongoing."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mt-6 pt-5 border-t" style={{ borderColor: BORDER }}>
            <button className="text-[13px] hover:opacity-70 transition-opacity" style={{ color: RED }}>Discard</button>
            <button
              onClick={() => setStep(2)}
              className="h-10 px-6 rounded-[10px] text-[13px] font-semibold text-white flex items-center gap-2"
              style={{ backgroundColor: P }}
            >
              Publish to Blockchain <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {/* Stage 2 */}
      {step === 2 && (
        <div className="flex justify-center">
          <div className="w-full max-w-[560px] bg-white border rounded-2xl p-7 shadow-sm" style={{ borderColor: BORDER }}>
            <h2 className="text-[18px] font-bold mb-1" style={{ color: TEXT }}>{"You're about to publish this CTI report."}</h2>
            <p className="text-[13px] mb-5" style={{ color: MUTED }}>This action is permanent and cannot be reversed.</p>

            <div className="p-4 rounded-[10px] border mb-5" style={{ borderColor: BORDER, backgroundColor: BG }}>
              <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>What will be published on-chain</p>
              {[
                ["Report hash (SHA-256)", "3f2a1b4c5d6e7f8a..."],
                ["Attack type", "Ransomware"],
                ["Timestamp", "2024-01-15 14:23:07 UTC"],
                ["Author org hash", "Anonymized"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1.5">
                  <span className="text-[12px]" style={{ color: MUTED }}>{k}</span>
                  <span className="text-[12px] font-semibold" style={{ color: TEXT, fontFamily: "var(--font-mono, monospace)" }}>{v}</span>
                </div>
              ))}
              <div className="mt-3 flex items-center gap-1.5 text-[11px]" style={{ color: GREEN }}>
                <Lock className="w-3 h-3" /> No sensitive files included
              </div>
            </div>

            <div className="flex flex-col gap-2 mb-6">
              <p className="text-[12px] font-semibold" style={{ color: MUTED }}>Visibility</p>
              <div className="flex gap-2">
                {(["org", "network"] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setVisibility(v)}
                    className="flex-1 py-2.5 rounded-lg text-[13px] font-medium border transition-colors"
                    style={{
                      borderColor: visibility === v ? P : BORDER,
                      backgroundColor: visibility === v ? "rgba(23,49,62,0.07)" : "white",
                      color: visibility === v ? P : MUTED,
                    }}
                  >
                    {v === "org" ? "Organization Only" : "Network-wide"}
                  </button>
                ))}
              </div>
            </div>

            {publishing
              ? (
                <div className="flex flex-col items-center py-5 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: STORM }} />
                  <p className="text-[13px]" style={{ color: MUTED }}>Publishing to Polygon...</p>
                  <div className="w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: BORDER }}>
                    <div className="h-1 rounded-full w-2/3 animate-pulse" style={{ backgroundColor: STORM }} />
                  </div>
                </div>
              )
              : (
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 h-10 rounded-[10px] text-[13px] font-medium border hover:bg-gray-50 transition-colors"
                    style={{ borderColor: BORDER, color: TEXT }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={doPublish}
                    className="flex-1 h-10 rounded-[10px] text-[13px] font-semibold text-white"
                    style={{ backgroundColor: P }}
                  >
                    Confirm & Publish
                  </button>
                </div>
              )
            }
          </div>
        </div>
      )}

      {/* Stage 3 */}
      {step === 3 && (
        <div className="flex flex-col items-center gap-5">
          <div className="w-full px-5 py-3 rounded-xl flex items-center gap-2 text-[13px] font-medium"
            style={{ backgroundColor: "rgba(22,163,74,0.08)", color: GREEN }}>
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            CTI published successfully. Transaction confirmed on Polygon.
          </div>
          <div className="w-full max-w-[560px] bg-white border rounded-2xl p-7 shadow-sm" style={{ borderColor: BORDER }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-bold" style={{ color: TEXT }}>Blockchain Verification</h2>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                style={{ backgroundColor: "rgba(22,163,74,0.1)", color: GREEN }}>
                <Check className="w-3.5 h-3.5" /> Verified
              </span>
            </div>
            {[
              ["Transaction Hash", "0x4a7b9c2f1d8e3a6b5c0f2e1d..."],
              ["Block Number", "47,291,834"],
              ["Timestamp", "2024-01-15 14:31:22 UTC"],
              ["Network", "Polygon Mainnet"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2.5 border-b" style={{ borderColor: BORDER }}>
                <span className="text-[12px]" style={{ color: MUTED }}>{k}</span>
                <span className="text-[12px]" style={{ color: TEXT, fontFamily: "var(--font-mono, monospace)" }}>{v}</span>
              </div>
            ))}
            <div className="mt-5 flex items-center justify-between">
              <button className="text-[13px] hover:opacity-70" style={{ color: MUTED }} onClick={() => setStep(1)}>
                Publish another report
              </button>
              <button className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-medium border hover:bg-gray-50 transition-colors"
                style={{ borderColor: BORDER, color: TEXT }}>
                <ExternalLink className="w-3.5 h-3.5" /> Open in Block Explorer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CTI FEED ────────────────────────────────────────────────────────────────

function CTIFeedScreen() {
  type FEED = typeof CTI_FEED[0];
  const [selected, setSelected] = useState<FEED | null>(null);
  const [reviewed, setReviewed] = useState<number[]>([]);
  const [activeFilter, setActiveFilter] = useState("All");

  const filtered = CTI_FEED.filter(c => activeFilter === "All" || c.type === activeFilter);

  const typeColor = (t: string) =>
    t === "Ransomware" ? RED : t === "Phishing" ? AMBER : STORM;
  const typeBg = (t: string) =>
    t === "Ransomware" ? "rgba(220,38,38,0.08)" : t === "Phishing" ? "rgba(245,158,11,0.08)" : "rgba(65,94,114,0.08)";

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-[24px] font-bold" style={{ color: TEXT }}>CTI Feed</h1>
        <p className="text-[14px]" style={{ color: MUTED }}>Threat intelligence shared across the network.</p>
      </div>

      <div className="flex items-center gap-2 mb-6">
        {["All", "Ransomware", "Phishing", "Supply Chain"].map(t => (
          <button
            key={t}
            onClick={() => setActiveFilter(t)}
            className="px-3 h-8 rounded-full text-[12px] font-medium border transition-colors"
            style={{
              borderColor: activeFilter === t ? P : BORDER,
              backgroundColor: activeFilter === t ? "rgba(23,49,62,0.07)" : "white",
              color: activeFilter === t ? P : MUTED,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map((c) => (
          <div
            key={c.id}
            onClick={() => setSelected(c)}
            className="bg-white border rounded-[10px] p-5 cursor-pointer transition-all hover:shadow-md"
            style={{ borderColor: BORDER }}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: typeBg(c.type) }}>
                <AlertTriangle className="w-4 h-4" style={{ color: typeColor(c.type) }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[13px] font-bold" style={{ color: TEXT }}>{c.type}</span>
                  <span className="text-[12px]" style={{ color: MUTED }}>
                    — {c.org === "Anonymous" ? <em style={{ color: MUTED }}>Anonymous</em> : c.org}
                  </span>
                </div>
                <p className="text-[13px] truncate mb-1.5" style={{ color: MUTED }}>{c.preview}</p>
                <span className="text-[11px]" style={{ color: MUTED }}>{c.time}</span>
              </div>
              <div className="flex-shrink-0">
                {c.verified
                  ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                      style={{ backgroundColor: "rgba(22,163,74,0.1)", color: GREEN }}>
                      <Check className="w-3 h-3" /> Verified
                    </span>
                  )
                  : (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                      style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#92400E" }}>
                      Pending
                    </span>
                  )
                }
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTI Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setSelected(null)} />
          <div className="relative w-[560px] bg-white h-full shadow-2xl flex flex-col overflow-y-auto">
            <div className="flex items-start justify-between px-6 py-5 border-b" style={{ borderColor: BORDER }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-[16px] font-bold" style={{ color: TEXT }}>{selected.type}</h2>
                  {selected.verified
                    ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{ backgroundColor: "rgba(22,163,74,0.1)", color: GREEN }}>
                        <Check className="w-3 h-3" /> Verified
                      </span>
                    )
                    : (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#92400E" }}>
                        Pending
                      </span>
                    )
                  }
                </div>
                <p className="text-[12px]" style={{ color: MUTED }}>Source: {selected.org} · {selected.time}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded hover:bg-gray-100 mt-0.5">
                <X className="w-4 h-4" style={{ color: MUTED }} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Full Description</p>
                <p className="text-[13px] leading-relaxed" style={{ color: TEXT }}>
                  {selected.preview} Attackers were observed using multiple evasion techniques including process
                  injection and legitimate tool abuse (LOLBaS). Initial access vector confirmed as spear-phishing
                  with weaponized Office documents containing malicious macro payloads.
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Indicators of Compromise</p>
                <div className="flex flex-wrap gap-2">
                  {["3f2a1b4c5d6e7f8a", "185.220.101.47", "malicious-doc.xlsm", "C:\\Temp\\loader.exe"].map(ioc => (
                    <span key={ioc} className="px-2.5 py-1 rounded border text-[11px]"
                      style={{ borderColor: BORDER, backgroundColor: BG, color: TEXT, fontFamily: "var(--font-mono, monospace)" }}>
                      {ioc}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Affected Systems</p>
                {[
                  "Endpoint Type: Workstation",
                  "OS: Windows 10 / Windows 11",
                  "Sector: Healthcare, Finance",
                ].map(s => (
                  <div key={s} className="flex items-center gap-2 py-2.5 border-b text-[13px]" style={{ borderColor: BORDER, color: TEXT }}>
                    <Monitor className="w-3.5 h-3.5 flex-shrink-0" style={{ color: MUTED }} />
                    {s}
                  </div>
                ))}
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Recommended Actions</p>
                {[
                  "Block listed IPs at perimeter firewall",
                  "Scan all endpoints for IOC file hashes",
                  "Enable MFA on all remote access services",
                  "Patch CVE-2023-36884 on all Windows hosts",
                ].map((a, i) => (
                  <div key={i} className="flex items-start gap-2.5 py-2.5 border-b" style={{ borderColor: BORDER }}>
                    <div className="w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center"
                      style={{ borderColor: GREEN }}>
                      <Check className="w-2.5 h-2.5" style={{ color: GREEN }} />
                    </div>
                    <span className="text-[13px]" style={{ color: TEXT }}>{a}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="sticky bottom-0 px-6 py-4 border-t bg-white flex items-center gap-2" style={{ borderColor: BORDER }}>
              <button className="h-9 px-4 rounded-lg text-[13px] font-medium border hover:bg-gray-50 transition-colors"
                style={{ borderColor: BORDER, color: TEXT }}>
                Download Report
              </button>
              <button className="h-9 px-4 rounded-lg text-[13px] font-medium border hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                style={{ borderColor: BORDER, color: TEXT }}>
                <ExternalLink className="w-3.5 h-3.5" /> View on Blockchain
              </button>
              <button
                onClick={() => !reviewed.includes(selected.id) && setReviewed(r => [...r, selected.id])}
                disabled={reviewed.includes(selected.id)}
                className="ml-auto h-9 px-4 rounded-lg text-[13px] font-semibold text-white transition-colors"
                style={{
                  backgroundColor: reviewed.includes(selected.id) ? GREEN : P,
                  cursor: reviewed.includes(selected.id) ? "default" : "pointer",
                }}
              >
                {reviewed.includes(selected.id) ? "Reviewed ✓" : "Mark as Reviewed"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────

const AUTH_PAGES: Page[] = ["home", "login", "register", "forgot-password"];

export default function App() {
  const [page, setPage] = useState<Page>("home");

  if (AUTH_PAGES.includes(page)) {
    return (
      <>
        {page === "home" && <HomeScreen nav={setPage} />}
        {page === "login" && <LoginScreen nav={setPage} />}
        {page === "register" && <RegisterScreen nav={setPage} />}
        {page === "forgot-password" && <ForgotPasswordScreen nav={setPage} />}
      </>
    );
  }

  return (
    <AppLayout page={page} nav={setPage}>
      {page === "dashboard" && <Dashboard />}
      {page === "endpoints" && <EndpointsScreen />}
      {page === "detections" && <DetectionsScreen />}
      {page === "cti-center" && <CTICenterScreen />}
      {page === "cti-feed" && <CTIFeedScreen />}
    </AppLayout>
  );
}
