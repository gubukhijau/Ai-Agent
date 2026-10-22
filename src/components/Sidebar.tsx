import React from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  ShieldCheck,
  LogOut,
  ExternalLink,
  Truck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AdminConfig } from '../types';

interface SidebarProps {
  currentTab: 'dashboard' | 'whatsapp' | 'elevenlabs' | 'aichat' | 'security';
  setCurrentTab: (tab: 'dashboard' | 'whatsapp' | 'elevenlabs' | 'aichat' | 'security') => void;
  config: AdminConfig | null;
  onLogout: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  config,
  onLogout,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const navItems = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Status & Uji Notifikasi',
    },
    {
      id: 'aichat' as const,
      label: 'Chat AI Agent WhatsApp',
      icon: Bot,
      description: 'ElevenLabs Two-Way Chatbot',
    },
    {
      id: 'whatsapp' as const,
      label: 'Pengaturan WhatsApp',
      icon: MessageSquare,
      description: 'Meta Cloud API & Nomor Admin',
    },
    {
      id: 'elevenlabs' as const,
      label: 'Integrasi Webhook Order',
      icon: ShieldCheck,
      description: 'Tool Call Schema ElevenLabs',
    },
    {
      id: 'security' as const,
      label: 'Pengaturan Keamanan',
      icon: ShieldCheck,
      description: 'Bearer Token & Anti-Duplikasi',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <img
                src="/src/assets/images/indoplangsir_logo_1792601904567.jpg"
                alt="IndoPlangsir Logo"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  // Fallback icon if image fails
                  e.currentTarget.style.display = 'none';
                }}
              />
              <Truck className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>INDOPLANGSIR</span>
              </div>
              <p className="text-xs text-slate-400">Order Notification Hub</p>
            </div>
          </div>
        </div>

        {/* Live Service Readiness Overview */}
        <div className="px-5 py-3.5 bg-slate-950/60 border-b border-slate-800/80">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400 font-medium">Status WhatsApp</span>
            {config?.isConfigured ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Siap Kirim
              </span>
            ) : (
              <span className="text-amber-400 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Belum Lengkap
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 truncate">
            {config?.whatsappAdminNumberMasked
              ? `Admin: ${config.whatsappAdminNumberMasked}`
              : 'Nomor WhatsApp admin belum diatur'}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setIsMobileOpen(false);
                }}
                className={`w-full flex items-start gap-3 px-3.5 py-2.5 rounded-lg text-left transition-colors ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium leading-tight">{item.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5 truncate">{item.description}</div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer info & Logout */}
        <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-950/40">
          <div className="bg-slate-900/90 rounded-md p-2.5 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            <span className="text-slate-300 font-medium block mb-0.5">Tanpa Database CRM</span>
            Pesanan dari ElevenLabs diteruskan instan ke WhatsApp admin tanpa menyimpan data order.
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="text-xs text-slate-400">
              <span className="text-slate-200 font-medium block">Admin Mode</span>
              <span className="text-[11px] text-emerald-400">Terautentikasi</span>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-700/60 hover:border-rose-500/30 transition-colors"
              title="Keluar dari sesi admin"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
