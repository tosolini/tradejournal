import { NavLink } from "react-router-dom";
import { PropsWithChildren, useEffect, useState } from "react";
import { TradeCreateModal } from "./TradeCreateModal";
import packageJson from "../../package.json";
import bullVectLogo from "../assets/bull_vect.svg";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/calendar", label: "Calendar" },
  { to: "/accounts", label: "Accounts" },
  { to: "/trades", label: "Trades" },
  { to: "/stats", label: "Stats" },
  { to: "/notes", label: "Notes" },
  { to: "/settings", label: "Settings" },
];

const LIGHT_THEME_LOGO_URL = "https://www.tosolini.info/wp-content/uploads/2021/01/tosolini-logo-200.png";
const DARK_THEME_LOGO_URL = "https://www.tosolini.info/wp-content/uploads/2021/01/tosolini_nero_200.png";

function prefersLightTheme(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches;
}

export function Layout({ children }: PropsWithChildren) {
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isLightTheme, setIsLightTheme] = useState(prefersLightTheme);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    const onThemeChange = (event: MediaQueryListEvent) => {
      setIsLightTheme(event.matches);
    };
    mediaQuery.addEventListener("change", onThemeChange);
    return () => mediaQuery.removeEventListener("change", onThemeChange);
  }, []);

  const appVersion = packageJson.version;
  const currentYear = new Date().getFullYear();
  const logoUrl = isLightTheme ? LIGHT_THEME_LOGO_URL : DARK_THEME_LOGO_URL;

  return (
    <>
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[240px_1fr]">
        <aside className="flex flex-col border-r border-slate-700/60 bg-slate-950/70 p-5 backdrop-blur">
          <div className="mb-8 flex items-center gap-2.5 text-xl font-semibold tracking-wide text-teal-300">
            <img src={bullVectLogo} alt="Bull logo" className="h-6 w-6 object-contain" loading="eager" />
            <span>TradeJournal</span>
          </div>
          <nav className="space-y-2">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-sm transition ${
                    isActive
                      ? "bg-teal-500/20 text-teal-200"
                      : "text-slate-300 hover:bg-slate-800/80"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-6 border-t border-slate-700/60 pt-4">
            <button
              type="button"
              onClick={() => setIsTradeModalOpen(true)}
              className="w-full rounded-lg bg-teal-500 px-3 py-2 text-sm font-semibold text-slate-900"
            >
              New Trade
            </button>
          </div>
          <div className="mt-auto border-t border-slate-700/60 pt-4">
            <div className="text-xs text-slate-400">Versione v{appVersion}</div>
            <div className="mt-3">
              <a
                href="https://www.tosolini.info"
                target="_blank"
                rel="noreferrer"
                aria-label="Sito Tosolini"
              >
                <img
                  src={logoUrl}
                  alt="Tosolini"
                  className="h-auto w-24 opacity-90 transition-opacity hover:opacity-100 md:w-28"
                  loading="lazy"
                />
              </a>
            </div>
            <div className="mt-2 text-xs text-slate-500">© {currentYear} Tosolini. All rights reserved.</div>
          </div>
        </aside>
        <main className="p-4 md:p-8">{children}</main>
      </div>
      <TradeCreateModal open={isTradeModalOpen} onClose={() => setIsTradeModalOpen(false)} />
    </>
  );
}
