import React, { useState, useEffect } from 'react';
import {
  Menu,
  X,
  Truck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { AdminConfig } from './types';
import { checkAdminAuth, fetchAdminConfig, logoutAdmin } from './services/api';
import { Sidebar } from './components/Sidebar';
import { LoginModal } from './components/LoginModal';
import { DashboardView } from './components/DashboardView';
import { WhatsAppSettingsView } from './components/WhatsAppSettingsView';
import { ElevenLabsIntegrationView } from './components/ElevenLabsIntegrationView';
import { AIChatAgentView } from './components/AIChatAgentView';
import { SecuritySettingsView } from './components/SecuritySettingsView';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'whatsapp' | 'elevenlabs' | 'aichat' | 'security'>('dashboard');
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Check authentication on initial load & handle expiration
  useEffect(() => {
    const handleAuthExpired = () => {
      setIsAuthenticated(false);
      setConfig(null);
    };
    window.addEventListener('ipl_auth_expired', handleAuthExpired);

    const verifyAuth = async () => {
      const isAuthed = await checkAdminAuth();
      setIsAuthenticated(isAuthed);
      if (isAuthed) {
        loadConfig();
      }
    };
    verifyAuth();

    return () => window.removeEventListener('ipl_auth_expired', handleAuthExpired);
  }, []);

  const loadConfig = async () => {
    setLoadingConfig(true);
    try {
      const cfg = await fetchAdminConfig();
      setConfig(cfg);
    } catch (err) {
      console.error('Failed to load admin config', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    loadConfig();
  };

  const handleLogout = async () => {
    await logoutAdmin();
    setIsAuthenticated(false);
    setConfig(null);
  };

  // Still checking initial auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-2 text-sm font-medium">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
          <span>Memuat sistem IndoPlangsir...</span>
        </div>
      </div>
    );
  }

  // If not logged in, render the login gate
  if (!isAuthenticated) {
    return <LoginModal onLoginSuccess={handleLoginSuccess} />;
  }

  const tabTitles: Record<typeof currentTab, string> = {
    dashboard: 'Dashboard Utama',
    aichat: 'Chat AI Agent WhatsApp',
    whatsapp: 'Pengaturan WhatsApp Cloud API',
    elevenlabs: 'Integrasi Webhook Order',
    security: 'Keamanan & Autentikasi',
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        config={config}
        onLogout={handleLogout}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-72 min-w-0">
        {/* Top Navigation Bar adhering to Top Bar Contract */}
        <header className="sticky top-0 z-30 h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 sm:px-6">
          {/* Zone 1: Mobile Toggle & Breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
              aria-label="Toggle navigation"
            >
              {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
              <span className="font-bold text-white tracking-tight whitespace-nowrap">
                IndoPlangsir
              </span>
              <span className="text-slate-600">/</span>
              <span className="text-amber-400 font-medium truncate">
                {tabTitles[currentTab]}
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation link pills or status */}
          <div className="hidden md:flex items-center gap-4 text-xs">
            <span className="text-slate-400">
              WhatsApp Cloud API:{' '}
              {config?.isConfigured ? (
                <span className="text-emerald-400 font-medium">Terkoneksi</span>
              ) : (
                <span className="text-amber-400 font-medium">Perlu Setup</span>
              )}
            </span>
            <span className="text-slate-700">&bull;</span>
            <span className="text-slate-400">
              AI Chat Agent:{' '}
              <span className="text-emerald-400 font-medium">Aktif</span>
            </span>
          </div>

          {/* Zone 3: Quick Action */}
          <div className="flex items-center gap-2.5 shrink-0">
            {currentTab !== 'dashboard' && (
              <button
                onClick={() => setCurrentTab('dashboard')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer"
              >
                <span>Uji Notifikasi</span>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-700/60 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Keluar dari sesi admin"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </header>

        {/* View Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              config={config}
              onNavigateToWhatsApp={() => setCurrentTab('whatsapp')}
              onNavigateToElevenLabs={() => setCurrentTab('elevenlabs')}
            />
          )}

          {currentTab === 'aichat' && (
            <AIChatAgentView config={config} onRefreshConfig={loadConfig} />
          )}

          {currentTab === 'whatsapp' && (
            <WhatsAppSettingsView config={config} onRefreshConfig={loadConfig} />
          )}

          {currentTab === 'elevenlabs' && (
            <ElevenLabsIntegrationView config={config} />
          )}

          {currentTab === 'security' && (
            <SecuritySettingsView config={config} onRefreshConfig={loadConfig} />
          )}
        </main>
      </div>
    </div>
  );
}
