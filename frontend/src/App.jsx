import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import useSiteSettingsStore from './stores/siteSettingsStore'

// Layouts
import DashboardLayout from './layouts/DashboardLayout'
import AuthLayout from './layouts/AuthLayout'
import PublicLayout from './layouts/PublicLayout'

// Auth pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'

// Dashboard pages
import Dashboard from './pages/dashboard/Dashboard'
import Weddings from './pages/dashboard/Weddings'
import WeddingDetail from './pages/dashboard/WeddingDetail'
import WeddingCreate from './pages/dashboard/WeddingCreate'
import WeddingEdit from './pages/dashboard/WeddingEdit'
import Guests from './pages/dashboard/Guests'
import Invitations from './pages/dashboard/Invitations'
import CheckIn from './pages/dashboard/CheckIn'
import WeddingStats from './pages/dashboard/WeddingStats'
import Templates from './pages/dashboard/Templates'
import CreatorTemplates from './pages/dashboard/CreatorTemplates'
import Payments from './pages/dashboard/Payments'
import PrintOrders from './pages/dashboard/PrintOrders'
import Profile from './pages/dashboard/Profile'
import CreatorDashboard from './pages/dashboard/CreatorDashboard'
import CreatorEarnings from './pages/dashboard/CreatorEarnings'
import CreatorBankAccounts from './pages/dashboard/CreatorBankAccounts'
import CreatorPayoutRequest from './pages/dashboard/CreatorPayoutRequest'
import Marketplace from './pages/marketplace/Marketplace'
import MarketplaceTemplateDetail from './pages/marketplace/MarketplaceTemplateDetail'
import TemplatePublish from './pages/dashboard/TemplatePublish'

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminWeddings from './pages/admin/AdminWeddings'
import AdminInvitationOrders from './pages/admin/AdminInvitationOrders'
import AdminPrintOrders from './pages/admin/AdminPrintOrders'
import AdminTemplates from './pages/admin/AdminTemplates'
import AdminCoupons from './pages/admin/AdminCoupons'
import AdminSettings from './pages/admin/AdminSettings'
import AdminSupervision from './pages/admin/AdminSupervision'
import AdminPayoutDashboard from './pages/admin/AdminPayoutDashboard'
import AdminMarketplaceApprovals from './pages/admin/AdminMarketplaceApprovals'
import TemplateDesigner from './pages/admin/TemplateDesigner'

// Public pages
import Home from './pages/public/Home'
import InvitationView from './pages/public/InvitationView'

// Components
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminRoute from './components/auth/AdminRoute'

function App() {
  const { isAuthenticated, user } = useAuthStore()
  const { fetchSettings } = useSiteSettingsStore()

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/marketplace/templates/:templateId" element={<MarketplaceTemplateDetail />} />
      </Route>

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
        } />
        <Route path="/register" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />
        } />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
      </Route>

      {/* Public Invitation View */}
      <Route path="/i/:weddingSlug/:invitationCode" element={<InvitationView />} />
      <Route path="/i/:weddingSlug" element={<InvitationView />} />

      {/* Client Dashboard Routes */}
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={
          (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') 
            ? <Navigate to="/admin" replace /> 
            : <Dashboard />
        } />
        <Route path="/weddings" element={<Weddings />} />
        <Route path="/weddings/new" element={<WeddingCreate />} />
        <Route path="/weddings/:id" element={<WeddingDetail />} />
        <Route path="/weddings/:id/edit" element={<WeddingEdit />} />
        <Route path="/weddings/:id/guests" element={<Guests />} />
        <Route path="/weddings/:id/invitations" element={<Invitations />} />
        <Route path="/weddings/:id/checkin" element={<CheckIn />} />
        <Route path="/weddings/:id/stats" element={<WeddingStats />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/creator-templates" element={<CreatorTemplates />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/print-orders" element={<PrintOrders />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/creator-dashboard" element={<CreatorDashboard />} />
        <Route path="/creator-earnings" element={<CreatorEarnings />} />
        <Route path="/creator-bank-accounts" element={<CreatorBankAccounts />} />
        <Route path="/creator-request-payout" element={<CreatorPayoutRequest />} />
        <Route path="/templates/:templateId/publish" element={<TemplatePublish />} />
      </Route>

      {/* Client Template Designer (full-screen, outside DashboardLayout) */}
      <Route path="/templates/:templateId/design" element={
        <ProtectedRoute><TemplateDesigner clientMode={true} /></ProtectedRoute>
      } />

      {/* Admin Template Designer (full-screen, outside DashboardLayout) */}
      <Route path="/admin/templates/new/design" element={
        <AdminRoute><TemplateDesigner /></AdminRoute>
      } />
      <Route path="/admin/templates/:id/design" element={
        <AdminRoute><TemplateDesigner /></AdminRoute>
      } />

      {/* Admin Routes */}
      <Route element={<AdminRoute><DashboardLayout isAdmin /></AdminRoute>}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/supervision" element={<AdminSupervision />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/weddings" element={<AdminWeddings />} />
        <Route path="/admin/invitation-orders" element={<AdminInvitationOrders />} />
        <Route path="/admin/print-orders" element={<AdminPrintOrders />} />
        <Route path="/admin/templates" element={<AdminTemplates />} />
        <Route path="/admin/coupons" element={<AdminCoupons />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin/marketplace" element={<AdminMarketplaceApprovals />} />
        <Route path="/admin/payouts" element={<AdminPayoutDashboard />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-primary-600">404</h1>
            <p className="text-xl text-gray-600 mt-4">Page non trouvée</p>
            <a href="/" className="btn-primary mt-6 inline-block">
              Retour à l'accueil
            </a>
          </div>
        </div>
      } />
    </Routes>
  )
}

export default App
