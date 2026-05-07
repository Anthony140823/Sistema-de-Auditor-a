import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AuditList from './pages/Audits/AuditList';
import AuditCreate from './pages/Audits/AuditCreate';
import AuditDetail from './pages/Audits/AuditDetail';
import SoDRulesPage from './pages/SoD/SoDRulesPage';
import FindingsPage from './pages/Findings/FindingsPage';
import ReportsPage from './pages/Reports/ReportsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Layout>{children}</Layout>;
}

function App() {
    return (
        <AuthProvider>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/audits"
                    element={
                        <ProtectedRoute>
                            <AuditList />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/audits/create"
                    element={
                        <ProtectedRoute>
                            <AuditCreate />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/audits/:id"
                    element={
                        <ProtectedRoute>
                            <AuditDetail />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/sod-rules"
                    element={
                        <ProtectedRoute>
                            <SoDRulesPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/findings"
                    element={
                        <ProtectedRoute>
                            <FindingsPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/reports"
                    element={
                        <ProtectedRoute>
                            <ReportsPage />
                        </ProtectedRoute>
                    }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AuthProvider>
    );
}

export default App;
