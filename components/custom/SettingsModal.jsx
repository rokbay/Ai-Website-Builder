'use client';

import React, { useState, useEffect } from 'react';
import { Settings, X, Cpu, Key, Save, AlertCircle, CheckCircle, Loader2, Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { notificationSystem, EVENTS } from '@/lib/NotificationSystem';

export default function SettingsModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { theme, setTheme } = useTheme();

    const [settings, setSettingsState] = useState({
        aiModel: 'gemini-2.0-flash',
        temperature: 0.7,
        maxOutputTokens: 8192
    });

    useEffect(() => {
        const savedSettings = localStorage.getItem('app_settings');
        if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            setSettingsState(parsed);
        }

        const handleOpen = () => setIsOpen(true);
        window.addEventListener('open-settings', handleOpen);
        return () => window.removeEventListener('open-settings', handleOpen);
    }, []);

    const updateSettings = (newSettings) => {
        const updated = { ...settings, ...newSettings };
        setSettingsState(updated);
        localStorage.setItem('app_settings', JSON.stringify(updated));
        notificationSystem.notify(EVENTS.STATUS_UPDATE, { message: 'Preferences updated locally', severity: 'info' });
    };

    const handleSaveApiKey = async () => {
        if (!apiKey.trim()) return;

        setIsSaving(true);
        try {
            if (typeof window !== 'undefined' && window.webMessageBridge?.request) {
                const result = await window.webMessageBridge.request('saveGeminiApiKey', { apiKey });
                if (result.status === 'success') {
                    notificationSystem.notify(EVENTS.STATUS_UPDATE, {
                        message: 'API Key persisted to .env.local via .NET Bridge',
                        severity: 'success'
                    });
                    setApiKey('');
                } else {
                    throw new Error(result.message);
                }
            } else {
                notificationSystem.notify(EVENTS.STATUS_UPDATE, {
                    message: 'Manual Action Required: Update .env.local with your key',
                    severity: 'warning'
                });
            }
        } catch (error) {
            notificationSystem.notify(EVENTS.STATUS_UPDATE, {
                message: `Failed to save API key: ${error.message}`,
                severity: 'error'
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-xl holographic-card p-1 animate-in zoom-in-95 duration-300">
                <div className="bg-slate-900 rounded-[14px] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-slate-900/40">
                        <div className="flex items-center gap-3">
                            <Settings className="h-5 w-5 text-blue-400" />
                            <h2 className="text-sm font-black text-white tracking-[0.2em] uppercase">Engine Calibration</h2>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                            <X className="h-5 w-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="p-8 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        {/* AI API KEY */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Key className="h-4 w-4 text-amber-400" />
                                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Authentication Gateway</h3>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                Enter your Gemini API Key to enable neural processing. This will be persisted to your local <span className="text-amber-500/80 font-mono">.env.local</span> file via the .NET transport layer.
                            </p>
                            <div className="flex gap-3">
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Enter Gemini API Key..."
                                    className="flex-1 glass-input text-xs font-mono"
                                />
                                <button
                                    onClick={handleSaveApiKey}
                                    disabled={!apiKey || isSaving}
                                    className="glass-button bg-amber-500/10 text-amber-400 border-amber-500/30 px-4 hover:bg-amber-500/20 disabled:opacity-30"
                                >
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                </button>
                            </div>
                        </section>

                        {/* AI MODEL */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Cpu className="h-4 w-4 text-blue-400" />
                                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Model Architecture</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Selected Brain</label>
                                    <select
                                        value={settings.aiModel}
                                        onChange={(e) => updateSettings({ aiModel: e.target.value })}
                                        className="w-full glass-input text-xs"
                                    >
                                        <option value="gemini-2.0-flash-lite-preview-02-05">Gemini 2.0 Flash Lite (Optimized)</option>
                                        <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fastest)</option>
                                        <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Logic)</option>
                                        <option value="lmstudio">LM Studio (Local Host)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Creativity Bias</label>
                                        <span className="text-[9px] font-mono text-blue-400">{settings.temperature}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0" max="1" step="0.1"
                                        value={settings.temperature}
                                        onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* APPEARANCE */}
                        <section className="space-y-4 pb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Monitor className="h-4 w-4 text-indigo-400" />
                                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Visual Interface</h3>
                            </div>
                            <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
                                {[
                                    { id: 'dark', icon: Moon, label: 'Standard' },
                                    { id: 'light', icon: Sun, label: 'High-Contrast' },
                                    { id: 'system', icon: Monitor, label: 'System' }
                                ].map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTheme(t.id)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                            theme === t.id
                                                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                                : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                    >
                                        <t.icon className="h-3.5 w-3.5" />
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-5 border-t border-white/5 bg-slate-900/40 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-3.5 w-3.5 text-slate-600" />
                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Some changes may require a page reload</span>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="px-6 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-white transition-all border border-white/10"
                        >
                            Sync & Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
