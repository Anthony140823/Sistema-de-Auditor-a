import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Shield, AlertCircle } from 'lucide-react';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login({ username, password });
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-glow mb-4">
                        <Shield className="text-primary-600" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Sistema de Auditoría SoD
                    </h1>
                    <p className="text-primary-100">
                        Consorcio Besalco Stracon
                    </p>
                </div>

                {/* Login Card */}
                <div className="card">
                    <div className="card-body p-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">
                            Iniciar Sesión
                        </h2>

                        {error && (
                            <div className="mb-4 p-4 bg-danger-50 border border-danger-200 rounded-lg flex items-start gap-3">
                                <AlertCircle className="text-danger-600 flex-shrink-0" size={20} />
                                <p className="text-sm text-danger-800">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                                    Usuario
                                </label>
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="input"
                                    placeholder="Ingrese su usuario"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                    Contraseña
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input"
                                    placeholder="Ingrese su contraseña"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary w-full py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                            </button>
                        </form>

                    </div>
                </div>

                <p className="text-center text-primary-100 text-sm mt-6">
                    © 2026 Sistema de Auditoría Informática SAP
                </p>
            </div>
        </div>
    );
}
