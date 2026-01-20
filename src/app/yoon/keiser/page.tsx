'use client';

import { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

export default function KeiserPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // Simple timeout to show error help if it takes too long (optional)
    // For iframe, accurate error detection is hard due to CORS, but we can handle safe timeout.

    return (
        <div className="w-full h-[calc(100vh-100px)] rounded-3xl overflow-hidden shadow-2xl border border-slate-200 bg-white relative">

            {/* Loading Indicator */}
            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10 transition-opacity duration-500">
                    <Loader2 size={48} className="text-blue-500 animate-spin mb-4" />
                    <p className="text-slate-400 font-bold text-lg animate-pulse">Keiser A400 대시보드 연결 중...</p>
                </div>
            )}

            {/* Error Fallback (Manual trigger or if needed) */}
            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-20">
                    <AlertCircle size={48} className="text-red-400 mb-4" />
                    <p className="text-slate-500 font-bold mb-2">대시보드를 불러올 수 없습니다.</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-sm hover:text-blue-600 font-bold"
                    >
                        새로고침
                    </button>
                    <p className="text-xs text-slate-400 mt-4">외부 서비스(Render) 상태를 확인해주세요.</p>
                </div>
            )}

            <iframe
                src="https://a400.onrender.com/"
                className={`w-full h-full border-none transition-opacity duration-700 ${loading ? 'opacity-0' : 'opacity-100'}`}
                title="Keiser A400 Dashboard"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onLoad={() => setLoading(false)}
                onError={() => { setLoading(false); setError(true); }}
            />
        </div>
    );
}
