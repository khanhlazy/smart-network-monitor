import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { Activity, RefreshCw, Sparkles, Loader2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function AnomalyPage() {
  const { t } = useTranslation();
  const [events, setEvents] = useState([]);
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [showAiModal, setShowAiModal] = useState(false);

  const fetchEvents = async () => {
    const res = await api.get('/api/v1/anomaly');
    setEvents(res.data.data);
  };

  const generateAiInsights = async () => {
    try {
      setShowAiModal(true);
      setAiLoading(true);
      setAiError(null);
      const res = await api.get('/api/v1/anomaly/ai-insights');
      setAiInsights(res.data.data.insights);
    } catch (error) {
      setAiError(error.response?.data?.error?.message || 'Có lỗi xảy ra khi phân tích AI.');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  return (
    <div className="space-y-5 animate-fade-in relative">
      <div className="flex items-center justify-between">
        <h1 className="text-page-title text-nms-text">{t('anomaly.title', 'Phân tích bất thường')}</h1>
        <div className="flex gap-3">
          <button onClick={generateAiInsights} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-sm text-white font-medium shadow-lg shadow-indigo-500/30 transition-all">
            <Sparkles size={14} />
            Hỏi AI Copilot
          </button>
          <button onClick={fetchEvents} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-nms-surface border border-nms-border text-sm text-nms-text-secondary hover:text-nms-text transition-all">
            <RefreshCw size={14} />
            {t('common.refresh', 'Làm mới')}
          </button>
        </div>
      </div>

      <div className="bg-nms-surface border border-nms-border rounded-lg overflow-hidden">
        <table className="w-full nms-table">
          <thead>
            <tr className="border-b border-nms-border">
              <th className="text-left text-xs text-nms-text-muted uppercase px-4 py-3">{t('alerts.device', 'Thiết bị')}</th>
              <th className="text-left text-xs text-nms-text-muted uppercase px-4 py-3">Metric</th>
              <th className="text-left text-xs text-nms-text-muted uppercase px-4 py-3">{t('anomaly.score', 'Điểm bất thường')}</th>
              <th className="text-left text-xs text-nms-text-muted uppercase px-4 py-3">{t('anomaly.explanation', 'Giải thích')}</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-nms-text-muted"><Activity className="mx-auto mb-2" />{t('common.noData', 'Không có dữ liệu')}</td></tr>
            ) : events.map(event => (
              <tr key={event._id} className="border-b border-nms-border/30">
                <td className="px-4 py-3 text-sm text-nms-text font-medium">{event.deviceId?.name || '--'}</td>
                <td className="px-4 py-3 text-sm text-nms-text-secondary">{event.metric}</td>
                <td className="px-4 py-3 text-sm text-nms-brand">{Math.round(event.anomalyScore * 100) / 100}</td>
                <td className="px-4 py-3 text-sm text-nms-text-secondary">{event.explanation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'transparent' }}>
          {/* Nền trong suốt để click ra ngoài có thể đóng (tùy chọn) */}
          <div className="absolute inset-0" onClick={() => setShowAiModal(false)}></div>
          
          <div className="bg-nms-surface border border-nms-border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] relative z-10">
            <div className="px-5 py-4 border-b border-nms-border flex items-center justify-between bg-gradient-to-r from-nms-surface to-indigo-900/10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                  <Sparkles size={18} className="text-indigo-400" />
                </div>
                <h3 className="font-bold text-nms-text">Phân tích mạng AI (Gemini 2.5 Flash)</h3>
              </div>
              <button onClick={() => setShowAiModal(false)} className="text-nms-text-muted hover:text-nms-text">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 text-nms-text">
              {aiLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
                  <p className="text-nms-text-secondary animate-pulse">AI đang đọc cấu trúc mạng và tìm nguyên nhân sự cố...</p>
                </div>
              ) : aiError ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
                  {aiError}
                </div>
              ) : aiInsights ? (
                <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-headings:text-indigo-300 prose-a:text-indigo-400">
                  <ReactMarkdown>{aiInsights}</ReactMarkdown>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
