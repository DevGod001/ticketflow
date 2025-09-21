import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Profile from "./Profile";

import Organization from "./Organization";

import Team from "./Team";

import Messages from "./Messages";
import EnterpriseMessages from "./EnterpriseMessages";
import CreateCollaborationRoom from "../components/collaboration/CreateCollaborationRoom";
import EmailToTicketManager from "../components/email/EmailToTicketManager";

import Channels from "./Channels";

import Notifications from "./Notifications";

import Settings from "./Settings";

import AllTickets from "./AllTickets";

import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

const PAGES = {
  Dashboard: Dashboard,

  Profile: Profile,

  Organization: Organization,

  Team: Team,

  Messages: Messages,

  Channels: Channels,

  Notifications: Notifications,

  Settings: Settings,

  AllTickets: AllTickets,
};

function _getCurrentPage(url) {
  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }
  let urlLastPart = url.split("/").pop();
  if (urlLastPart.includes("?")) {
    urlLastPart = urlLastPart.split("?")[0];
  }

  const pageName = Object.keys(PAGES).find(
    (page) => page.toLowerCase() === urlLastPart.toLowerCase()
  );
  return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
  const location = useLocation();
  const currentPage = _getCurrentPage(location.pathname);

  return (
    <Layout currentPageName={currentPage}>
      <Routes>
        <Route path="/" element={<Dashboard />} />

        <Route path="/Dashboard" element={<Dashboard />} />

        <Route path="/Profile" element={<Profile />} />

        <Route path="/Organization" element={<Organization />} />

        <Route path="/Team" element={<Team />} />

        <Route path="/Messages" element={<Messages />} />

        <Route
          path="/create-collaboration-room"
          element={<CreateCollaborationRoom />}
        />

        <Route path="/Channels" element={<Channels />} />

        <Route path="/Notifications" element={<Notifications />} />

        <Route path="/Settings" element={<Settings />} />

        <Route path="/AllTickets" element={<AllTickets />} />

        <Route path="/email-to-ticket" element={<EmailToTicketManager />} />
      </Routes>
    </Layout>
  );
}

export default function Pages() {
  return (
    <Router>
      <PagesContent />
    </Router>
  );
}
