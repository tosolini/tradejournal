import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AdminUserCreate, AdminUserUpdate,
  ApiError, User, UserUpdate,
  adminCreateUser, adminDeleteUser, adminListUsers, adminUpdateUser,
  getMe, updateMe, api,
} from "../lib/api";

type UserPreferencesPayload = {
  preferences?: { onboarding_completed?: boolean };
};

function OnboardingBanner({ user, onDismiss }: { user: User; onDismiss: () => void }) {
  const { t } = useTranslation();
  const isDefaultAdmin = user.username === "admin" && user.role === "admin";

  return (
    <section className="card border border-teal-500/40 bg-teal-500/5 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-teal-200">{t("settings.onboarding.title")}</h2>
          <p className="mt-1 text-sm text-slate-400">{t("settings.onboarding.description")}</p>
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 rounded bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-600"
        >
          {t("settings.onboarding.dismiss")}
        </button>
      </div>
      {isDefaultAdmin && (
        <div className="mb-3 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          {t("settings.onboarding.default_credentials_warning")}
        </div>
      )}
      <ol className="space-y-2 text-sm">
        <li className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-xs font-bold text-slate-900">✓</span>
          <span className="text-slate-300">{t("settings.onboarding.step_login")}</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-500 text-xs font-bold text-slate-400">2</span>
          <span className="text-slate-300">{t("settings.onboarding.step_credentials")}</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-500 text-xs font-bold text-slate-400">3</span>
          <span className="text-slate-300">
            {t("settings.onboarding.step_broker")}{" "}
            <Link to="/settings/brokers" className="text-teal-400 underline">{t("settings.registry.brokers_button")}</Link>
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-500 text-xs font-bold text-slate-400">4</span>
          <span className="text-slate-300">
            {t("settings.onboarding.step_account")}{" "}
            <Link to="/accounts" className="text-teal-400 underline">{t("layout.nav.accounts")}</Link>
          </span>
        </li>
      </ol>
    </section>
  );
}

function AccountSection({ user }: { user: User }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [email, setEmail] = useState(user.email);
  const [username, setUsername] = useState(user.username);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: UserUpdate) => updateMe(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMsg(t("settings.account.save_success"));
      setErrorMsg(null);
      setTimeout(() => setSuccessMsg(null), 3000);
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : t("settings.account.save_error");
      setErrorMsg(msg);
      setSuccessMsg(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      setErrorMsg(t("settings.account.password_mismatch"));
      return;
    }
    const payload: UserUpdate = {};
    if (email !== user.email) payload.email = email;
    if (username !== user.username) payload.username = username;
    if (newPassword) {
      payload.current_password = currentPassword;
      payload.new_password = newPassword;
    }
    if (Object.keys(payload).length === 0) return;
    mutation.mutate(payload);
  };

  return (
    <section className="card p-4">
      <h2 className="mb-1 text-lg font-semibold">{t("settings.account.title")}</h2>
      <p className="mb-4 text-sm text-slate-400">{t("settings.account.description")}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-slate-400">{t("settings.account.username")}</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">{t("settings.account.email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
            />
          </div>
        </div>
        <div className="border-t border-slate-700/60 pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{t("settings.account.change_password")}</p>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">{t("settings.account.current_password")}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">{t("settings.account.new_password")}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">{t("settings.account.confirm_password")}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>
        {errorMsg && <p className="text-sm text-rose-400">{errorMsg}</p>}
        {successMsg && <p className="text-sm text-teal-400">{successMsg}</p>}
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {t("settings.account.role_label")}: <span className="font-medium text-slate-300">{user.role}</span>
          </div>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
          >
            {mutation.isPending ? t("settings.account.saving") : t("settings.account.save")}
          </button>
        </div>
      </form>
    </section>
  );
}

type UserModalState = { mode: "create" } | { mode: "edit"; user: User };

function UserFormModal({
  state,
  onClose,
}: {
  state: UserModalState;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const isEdit = state.mode === "edit";
  const editUser = isEdit ? state.user : null;

  const [username, setUsername] = useState(editUser?.username ?? "");
  const [email, setEmail] = useState(editUser?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(editUser?.role ?? "user");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      if (isEdit && editUser) {
        const payload: AdminUserUpdate = {};
        if (username !== editUser.username) payload.username = username;
        if (email !== editUser.email) payload.email = email;
        if (password) payload.new_password = password;
        if (role !== editUser.role) payload.role = role;
        return adminUpdateUser(editUser.id, payload);
      }
      return adminCreateUser({ username, email, password, role } as AdminUserCreate);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      onClose();
    },
    onError: (err: unknown) => {
      setErrorMsg(err instanceof ApiError ? err.message : t("settings.admin_users.save_error"));
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-semibold text-teal-200">
          {isEdit ? t("settings.admin_users.edit_user") : t("settings.admin_users.new_user")}
        </h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">{t("settings.account.username")}</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">{t("settings.account.email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              {isEdit ? t("settings.admin_users.new_password_optional") : t("settings.account.new_password")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">{t("settings.account.role_label")}</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </div>
        </div>
        {errorMsg && <p className="mt-3 text-sm text-rose-400">{errorMsg}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded bg-slate-700 px-3 py-2 text-sm font-semibold text-slate-200"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !username || !email || (!isEdit && !password)}
            className="rounded-lg bg-teal-500 px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
          >
            {mutation.isPending ? t("settings.account.saving") : t("settings.account.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminUsersSection({ currentUser }: { currentUser: User }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [modalState, setModalState] = useState<UserModalState | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: users = [] } = useQuery({ queryKey: ["admin-users"], queryFn: adminListUsers });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminDeleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setDeleteId(null);
    },
  });

  return (
    <section className="card p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("settings.admin_users.title")}</h2>
          <p className="text-sm text-slate-400">{t("settings.admin_users.description")}</p>
        </div>
        <button
          onClick={() => setModalState({ mode: "create" })}
          className="rounded-lg bg-teal-500 px-3 py-2 text-sm font-semibold text-slate-900"
        >
          {t("settings.admin_users.new_user")}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-xs uppercase text-slate-400">
              <th className="px-3 py-2">{t("settings.account.username")}</th>
              <th className="px-3 py-2">{t("settings.account.email")}</th>
              <th className="px-3 py-2">{t("settings.account.role_label")}</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-800/80 hover:bg-slate-800/40">
                <td className="px-3 py-2 font-medium text-teal-200">
                  {u.username}
                  {u.id === currentUser.id && (
                    <span className="ml-2 rounded-full bg-teal-500/20 px-1.5 py-0.5 text-[10px] text-teal-300">
                      {t("settings.admin_users.you")}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-300">{u.email}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    u.role === "admin"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-slate-700/60 text-slate-400"
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setModalState({ mode: "edit", user: u })}
                      className="rounded bg-sky-500 p-2 text-slate-950"
                      title={t("assets.edit")}
                      aria-label={t("assets.edit")}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      </svg>
                    </button>
                    {u.id !== currentUser.id && (
                      <button
                        onClick={() => setDeleteId(u.id)}
                        className="rounded bg-red-500 p-2 text-white"
                        title={t("assets.delete")}
                        aria-label={t("assets.delete")}
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" x2="10" y1="11" y2="17" />
                          <line x1="14" x2="14" y1="11" y2="17" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalState && <UserFormModal state={modalState} onClose={() => setModalState(null)} />}

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <p className="mb-4 text-slate-200">{t("settings.admin_users.confirm_delete")}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded bg-slate-700 px-3 py-2 text-sm font-semibold text-slate-200"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
                className="rounded bg-red-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {t("assets.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const currentLanguage = i18n.resolvedLanguage === "it" ? "it" : "en";

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: getMe });

  const { data: prefData } = useQuery({
    queryKey: ["user-preferences"],
    queryFn: () => api<UserPreferencesPayload>("/api/auth/preferences"),
  });

  const onboardingCompleted = prefData?.preferences?.onboarding_completed === true;

  const dismissOnboarding = useMutation({
    mutationFn: () =>
      api("/api/auth/preferences", {
        method: "PATCH",
        body: JSON.stringify({ preferences: { onboarding_completed: true } }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-preferences"] }),
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">{t("settings.title")}</h1>

      {user && !onboardingCompleted && (
        <OnboardingBanner user={user} onDismiss={() => dismissOnboarding.mutate()} />
      )}

      {user && <AccountSection user={user} />}

      {user?.role === "admin" && <AdminUsersSection currentUser={user} />}

      <section className="card p-4">
        <h2 className="mb-2 text-lg font-semibold">{t("settings.language.title")}</h2>
        <p className="mb-4 text-sm text-slate-400">{t("settings.language.description")}</p>
        <label className="text-sm text-slate-200" htmlFor="language-switch">
          {t("settings.language.label")}
        </label>
        <select
          id="language-switch"
          className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 md:w-auto"
          value={currentLanguage}
          onChange={(event) => {
            void i18n.changeLanguage(event.target.value);
          }}
        >
          <option value="en">{t("settings.language.en")}</option>
          <option value="it">{t("settings.language.it")}</option>
        </select>
      </section>

      <section className="card p-4">
        <h2 className="mb-2 text-lg font-semibold">{t("settings.registry.title")}</h2>
        <p className="mb-4 text-sm text-slate-400">{t("settings.registry.description")}</p>
        <Link
          to="/settings/brokers"
          className="inline-flex rounded bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950"
        >
          {t("settings.registry.brokers_button")}
        </Link>
      </section>

      <section className="card p-4">
        <h2 className="mb-2 text-lg font-semibold">{t("settings.session.title")}</h2>
        <p className="mb-4 text-sm text-slate-400">{t("settings.session.description")}</p>
        <button
          onClick={() => {
            localStorage.removeItem("token");
            navigate("/login");
          }}
          className="rounded bg-red-500 px-3 py-2 text-sm font-semibold text-white"
        >
          {t("settings.session.logout")}
        </button>
      </section>
    </div>
  );
}
