import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AccountsPage } from "./pages/AccountsPage";
import { BrokersPage } from "./pages/BrokersPage";
import { CalendarPage } from "./pages/CalendarPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { NotesPage } from "./pages/NotesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TradeDetailPage } from "./pages/TradeDetailPage";
import { TradeEditPage } from "./pages/TradeEditPage";
import { TradeImagesPage } from "./pages/TradeImagesPage";
import { TradesPage } from "./pages/TradesPage";

function Protected({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <Protected>
            <Layout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/accounts" element={<AccountsPage />} />
                <Route path="/trades" element={<TradesPage />} />
                <Route path="/trades/:tradeId" element={<TradeDetailPage />} />
                <Route path="/trades/:tradeId/edit" element={<TradeEditPage />} />
                <Route path="/trades/:tradeId/images" element={<TradeImagesPage />} />
                <Route path="/stats" element={<DashboardPage />} />
                <Route path="/notes" element={<NotesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/settings/brokers" element={<BrokersPage />} />
              </Routes>
            </Layout>
          </Protected>
        }
      />
    </Routes>
  );
}
