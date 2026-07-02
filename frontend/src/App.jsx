import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import useSiteSettingsStore from './stores/siteSettingsStore'

// Layouts + route guards stay eager — they are the routing shell and are small.
import DashboardLayout from './layouts/DashboardLayout'
import AuthLayout from './layouts/AuthLayout'
import PublicLayout from './layouts/PublicLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminRoute from './components/auth/AdminRoute'
import { ConfirmRoot } from './components/common/confirm'

// Every page is code-split so heavy deps (recharts, html5-qrcode, framer-motion,
// @dnd-kit…) only load on the routes that actually use them.
const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))

const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'))
const Weddings = lazy(() => import('./pages/dashboard/Weddings'))
const WeddingDetail = lazy(() => import('./pages/dashboard/WeddingDetail'))
const WeddingCreate = lazy(() => import('./pages/dashboard/WeddingCreate'))
const WeddingEdit = lazy(() => import('./pages/dashboard/WeddingEdit'))
const Guests = lazy(() => import('./pages/dashboard/Guests'))
const SeatingPlan = lazy(() => import('./pages/dashboard/SeatingPlan'))
const Invitations = lazy(() => import('./pages/dashboard/Invitations'))
const CheckIn = lazy(() => import('./pages/dashboard/CheckIn'))
const WeddingStats = lazy(() => import('./pages/dashboard/WeddingStats'))
const Templates = lazy(() => import('./pages/dashboard/Templates'))
const CreatorTemplates = lazy(() => import('./pages/dashboard/CreatorTemplates'))
const Payments = lazy(() => import('./pages/dashboard/Payments'))
const PrintOrders = lazy(() => import('./pages/dashboard/PrintOrders'))
const Profile = lazy(() => import('./pages/dashboard/Profile'))
const CreatorDashboard = lazy(() => import('./pages/dashboard/CreatorDashboard'))
const CreatorSettings = lazy(() => import('./pages/dashboard/CreatorSettings'))
const CreatorEarnings = lazy(() => import('./pages/dashboard/CreatorEarnings'))
const CreatorBankAccounts = lazy(() => import('./pages/dashboard/CreatorBankAccounts'))
const CreatorPayoutRequest = lazy(() => import('./pages/dashboard/CreatorPayoutRequest'))
const Marketplace = lazy(() => import('./pages/marketplace/Marketplace'))
const MarketplaceTemplateDetail = lazy(() => import('./pages/marketplace/MarketplaceTemplateDetail'))
const TemplatePublish = lazy(() => import('./pages/dashboard/TemplatePublish'))

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminWeddings = lazy(() => import('./pages/admin/AdminWeddings'))
const AdminInvitationOrders = lazy(() => import('./pages/admin/AdminInvitationOrders'))
const AdminPrintOrders = lazy(() => import('./pages/admin/AdminPrintOrders'))
const AdminTemplates = lazy(() => import('./pages/admin/AdminTemplates'))
const AdminCoupons = lazy(() => import('./pages/admin/AdminCoupons'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))
const AdminSupervision = lazy(() => import('./pages/admin/AdminSupervision'))
const AdminPayoutDashboard = lazy(() => import('./pages/admin/AdminPayoutDashboard'))
const AdminMarketplaceApprovals = lazy(() => import('./pages/admin/AdminMarketplaceApprovals'))
const TemplateDesigner = lazy(() => import('./pages/admin/TemplateDesigner'))

const Home = lazy(() => import('./pages/public/Home'))
const InvitationView = lazy(() => import('./pages/public/InvitationView'))

// Lightweight full-screen fallback shown while a route chunk loads.
function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function App() {
  const { isAuthenticated, user } = useAuthStore()
  const { fetchSettings } = useSiteSettingsStore()

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return (
    <>
    <ConfirmRoot />
    <Suspense fallback={<RouteFallback />}>
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
        <Route path="/weddings/:id/seating" element={<SeatingPlan />} />
        <Route path="/weddings/:id/invitations" element={<Invitations />} />
        <Route path="/weddings/:id/checkin" element={<CheckIn />} />
        <Route path="/weddings/:id/stats" element={<WeddingStats />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/creator-templates" element={<CreatorTemplates />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/print-orders" element={<PrintOrders />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/creator-dashboard" element={<CreatorDashboard />} />
        <Route path="/creator-settings" element={<CreatorSettings />} />
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
    </Suspense>
    </>
  )
}

export default App
