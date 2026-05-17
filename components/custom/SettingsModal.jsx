'use client';

import React, { useState, useEffect } from 'react';
import { Settings, X, Cpu, Key, Save, AlertCircle, Loader2 } from 'lucide-react';
import { notificationSystem, EVENTS } from '@/lib/NotificationSystem';

export default function SettingsModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);

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
       notificationSystem.publish(EVENTS.STATUS_UPDATE, { message: 'Preferences updated locally', severity: 'info' });
    };

    const handleSaveApiKey = async () => {
        if (!apiKey.trim()) return;

        setIsSaving(true);
        try {
            if (typeof window !== 'undefined' && window.webMessageBridge?.request) {
                const result = await window.webMessageBridge.request('saveGeminiApiKey', { apiKey });
                if (result.status === 'success') {
                    notificationSystem.publish(EVENTS.STATUS_UPDATE, {
                        message: 'API Key persisted to .env.local via .NET Bridge',
                        severity: 'success'
                    });
                    setApiKey('');
                } else {
                    throw new Error(result.message);
                }
            } else {
                notificationSystem.publish(EVENTS.STATUS_UPDATE, {
                    message: 'Manual Action Required: Update .env.local with your key',
                    severity: 'warning'
                });
            }
        } catch (error) {
            notificationSystem.publish(EVENTS.STATUS_UPDATE, {
                message: `Failed to save API key: ${error.message}`,
                severity: 'error'
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-stone-900/20 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-xl p-1 animate-in zoom-in-95 duration-300">
                <div className="bg-white rounded-[32px] border border-stone-200 overflow-hidden flex flex-col shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between px-8 py-6 border-b border-stone-100 bg-stone-50/50">
                        <div className="flex items-center gap-3">
                            <Settings className="h-5 w-5 text-blue-600" />
                            <h2 className="text-xs font-black text-stone-800 tracking-[0.2em] uppercase">Engine Settings</h2>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-stone-200/50 rounded-xl transition-colors">
                            <X className="h-5 w-5 text-stone-400" />
                        </button>
                    </div>

                    <div className="p-8 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        {/* AI API KEY */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Key className="h-4 w-4 text-stone-400" />
                                <h3 className="text-[10px] font-black text-stone-800 uppercase tracking-[0.2em]">API Key</h3>
                            </div>
                            <p className="text-[11px] text-stone-500 font-medium leading-relaxed">
                                Enter your Gemini API Key to enable neural processing.
                            </p>
                            <div className="flex gap-3">
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Enter Gemini API Key..."
                                    className="flex-1 glass-input text-xs font-mono border-stone-200 bg-stone-50"
                                />
                                <button
                                    onClick={handleSaveApiKey}
                                    disabled={!apiKey || isSaving}
                                    className="glass-button bg-blue-600 text-white border-blue-600 px-6 hover:bg-blue-700 disabled:opacity-30"
                                >
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                </button>
                            </div>
                        </section>

                        {/* AI MODEL */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Cpu className="h-4 w-4 text-blue-600" />
                                <h3 className="text-[10px] font-black text-stone-800 uppercase tracking-[0.2em]">Model Intelligence</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Active Brain</label>
                                    <select
                                        value={settings.aiModel}
                                        onChange={(e) => updateSettings({ aiModel: e.target.value })}
                                        className="w-full glass-input text-xs border-stone-200 bg-stone-50"
                                    >
                                        <option value="gemini-2.0-flash-lite-preview-02-05">Gemini 2.0 Flash Lite</option>
                                        <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                        <option value="lmstudio">LM Studio (Local)</option>
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Creativity</label>
                                        <span className="text-[10px] font-black text-blue-600">{settings.temperature}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0" max="1" step="0.1"
                                        value={settings.temperature}
                                        onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
                                        className="w-full h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>
                            </div>
                        </section>

                    </div>

                    {/* Footer */}
                    <div className="px-8 py-6 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-3.5 w-3.5 text-stone-400" />
                            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest italic">Sync active</span>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="px-8 py-3 rounded-2xl bg-stone-900 text-[10px] font-black uppercase tracking-widest text-white hover:bg-stone-800 transition-all shadow-lg shadow-stone-200"
                        >
                            Apply & Exit
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
