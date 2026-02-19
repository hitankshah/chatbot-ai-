// frontend/src/App.jsx
// Main application with routing

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { I18nProvider } from './i18n/I18nProvider';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import CreateChatbot from './pages/CreateChatbot';
import ChatbotDetail from './pages/ChatbotDetail';
import IntegrationsHub from './pages/IntegrationsHub';
import AgentInbox from './pages/AgentInbox';
import Leads from './pages/Leads';
import Analytics from './pages/Analytics';
import ApiKeys from './pages/ApiKeys';
import AuditLogs from './pages/AuditLogs';
import AutoSyncOps from './pages/AutoSyncOps';
import Docs from './pages/Docs';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Dpa from './pages/Dpa';
import Status from './pages/Status';
import InviteAccept from './pages/InviteAccept';
import Onboarding from './pages/Onboarding';
import Pricing from './pages/Pricing';
import Billing from './pages/Billing';
import WorkspaceSettings from './pages/WorkspaceSettings';
import SecurityTrust from './pages/SecurityTrust';
import Distribution from './pages/Distribution';
import Layout from './components/Layout';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <I18nProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/dpa" element={<Dpa />} />
          <Route path="/status" element={<Status />} />
          <Route path="/invite/:token" element={<InviteAccept />} />

          {/* Protected routes */}
          <Route
            path="/app"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/app/dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="create" element={<CreateChatbot />} />
            <Route path="chatbots/:id" element={<ChatbotDetail />} />
            <Route path="integrations" element={<IntegrationsHub />} />
            <Route path="inbox" element={<AgentInbox />} />
            <Route path="leads" element={<Leads />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="api-keys" element={<ApiKeys />} />
            <Route path="audit" element={<AuditLogs />} />
            <Route path="auto-sync" element={<AutoSyncOps />} />
            <Route path="onboarding" element={<Onboarding />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="billing" element={<Billing />} />
            <Route path="workspace" element={<WorkspaceSettings />} />
            <Route path="security" element={<SecurityTrust />} />
            <Route path="distribution" element={<Distribution />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </I18nProvider>
  );
}
