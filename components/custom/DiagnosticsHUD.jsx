'use client';
import { useEffect, useState, useRef } from 'react';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { notificationSystem, EVENTS } from '/lib/NotificationSystem';

const RING_BUFFER_SIZE = 20;

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
};

const STATUS_COLORS = {
  idle:      'text-slate-500',
  streaming: 'text-cyan-400',
  active:    'text-cyan-400',
  flushed:   'text-emerald-400',
  completed: 'text-emerald-400',
  error:     'text-red-400',
  pending:   'text-amber-400',
};

export function DiagnosticsHUD() {
  const [expanded, setExpanded] = useState(false);
  const [log, setLog] = useState([]);

  // Primary metrics from the current/last batch
  const [current, setCurrent] = useState({
    batchId: 0,
    batchSize: 0,
    bytesInBatch: 0,
    totalBatches: 0,
    totalBytes: 0,
    status: 'idle'
  });

  useEffect(() => {
    const addLogEntry = (entry) => {
        setLog((prev) => {
            const newLog = [{ ...entry, ts: new Date().toLocaleTimeString() }, ...prev];
            return newLog.slice(0, RING_BUFFER_SIZE);
        });
    };

    // Listen for BATCH_START from CodeView's micro-batch interval
    const unsubStart = notificationSystem.subscribe(EVENTS.BATCH_START, (event) => {
        const data = event?.data ?? event;
        setCurrent(prev => ({
            ...prev,
            batchId: data.batchId,
            batchSize: data.batchSize,
            status: 'active'
        }));
        addLogEntry({ id: `start-${data.batchId}`, label: `Batch ${data.batchId} parsing`, status: 'active' });
    });

    // Listen for BATCH_FLUSH from CodeView after React state applies
    const unsubFlush = notificationSystem.subscribe(EVENTS.BATCH_FLUSH, (event) => {
        const data = event?.data ?? event;
        setCurrent(prev => ({
            ...prev,
            bytesInBatch: data.bytesInBatch,
            totalBatches: data.batchId,
            totalBytes: prev.totalBytes + data.bytesInBatch,
            status: 'flushed'
        }));
        addLogEntry({ id: `flush-${data.batchId}`, label: `Batch ${data.batchId} flushed`, status: 'flushed' });
    });

    const unsubComplete = notificationSystem.subscribe(EVENTS.AI_STREAM_COMPLETE, () => {
        setCurrent(prev => ({ ...prev, status: 'completed' }));
        addLogEntry({ id: `complete-${Date.now()}`, label: 'Stream generation completed', status: 'completed' });
    });

    return () => {
        unsubStart();
        unsubFlush();
        unsubComplete();
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl w-64 overflow-hidden font-mono select-none">
      <div 
        className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Activity className={`h-4 w-4 ${STATUS_COLORS[current.status]}`} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
            Engine HUD
          </span>
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronUp className="h-4 w-4 text-slate-500" />}
      </div>

      <div className="px-3.5 pb-3 space-y-1">
        <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-500">Status</span>
            <span className={`text-[10px] font-bold uppercase ${STATUS_COLORS[current.status]}`}>{current.status}</span>
        </div>
        <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-500">Batch ID</span>
            <span className="text-[10px] text-white">{current.batchId}</span>
        </div>
        <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-500">Batch size</span>
            <span className="text-[10px] text-white">{formatBytes(current.batchSize)}</span>
        </div>
        <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-500">Session total</span>
            <span className="text-[10px] text-amber-400 font-bold">{formatBytes(current.totalBytes)}</span>
        </div>
      </div>

      {/* Expandable batch log */}
      {expanded && (
        <div className="border-t border-white/5 px-3.5 py-2.5 bg-black/20">
          <p className="text-[9px] uppercase tracking-[0.2em] text-slate-600 mb-2">Batch log</p>
          {log.length === 0 ? (
            <p className="text-[10px] text-slate-700">No batches recorded yet.</p>
          ) : (
            <ul className="space-y-1 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
              {log.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-2">
                  <span className={`text-[9px] truncate ${STATUS_COLORS[entry.status] ?? 'text-slate-500'}`}>
                    {entry.label}
                  </span>
                  <span className="text-[9px] text-slate-600 shrink-0">{entry.ts}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}