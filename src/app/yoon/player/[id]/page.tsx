'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, User, Calendar, Activity, Target, TrendingUp, Info, Scale, Save, Zap, Dumbbell, AlertCircle } from 'lucide-react';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    RadialLinearScale,
    Filler
} from 'chart.js';
import { Bar, Line, Radar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    RadialLinearScale,
    Filler
);

type PlayerProfile = {
    id: string;
    name: string;
    position: string;
    birthdate: string;
    team: string;
    event: string;
    level: string;
};

type Measurement = {
    id: string;
    recorded_at: string;
    test_type: string;
    metrics: any;
};

const calculateTScore = (val: number, pool: number[]) => {
    if (!pool || !pool.length) return 50;
    const mean = pool.reduce((a, b) => a + b, 0) / pool.length;
    const std = Math.sqrt(pool.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / pool.length) || 1;
    return 50 + 10 * ((val - mean) / std);
};

const mapTTo10 = (t: number) => {
    return Math.min(10, Math.max(0, parseFloat(((t - 20) / 6).toFixed(1))));
};

const getMetricFeedback = (type: string, value: number) => {
    switch (type) {
        case 'eur':
            const eurRef = 1.1;
            if (value >= eurRef) return { status: 'Optimal', color: '#10B981', msg: '탄성 활용 능력 우수', ref: eurRef };
            if (value >= 1.0) return { status: 'Good', color: '#3B82F6', msg: '평균 범위', ref: eurRef };
            return { status: 'Low', color: '#EF4444', msg: '탄성 에너지 저장 능력 개선 필요', ref: eurRef };
        case 'ff_ratio':
            const hipRef = 1.0;
            if (value >= 0.90 && value <= 1.25) return { status: 'Optimal', color: '#10B981', msg: '내전/외전 근력 균형 양호', ref: hipRef };
            if (value < 0.90) return { status: 'Imbalance', color: '#EF4444', msg: '내전근 강화 필요 (비율 낮음)', ref: hipRef };
            return { status: 'High', color: '#F59E0B', msg: '비율 높음 (외전근 확인 필요)', ref: hipRef };
        default:
            return null;
    }
};

export default function PlayerReport() {
    const router = useRouter();
    const params = useParams();
    const playerId = params.id as string;

    const [profile, setProfile] = useState<PlayerProfile | null>(null);
    const [measurements, setMeasurements] = useState<Measurement[]>([]);
    const [globalAverages, setGlobalAverages] = useState<Record<string, Record<string, Record<string, number>>>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [metricConfigs, setMetricConfigs] = useState<any[]>([]);

    useEffect(() => {
        // Fetch metric configs
        fetch('/api/metric-configs')
            .then(res => res.json())
            .then(data => setMetricConfigs(data.configs || []))
            .catch(err => console.error('Failed to load metric configs', err));
    }, []);

    // Fetch player profile, measurements, and global averages
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Fetch Profile
                const pRes = await fetch(`/api/players/${playerId}`);
                if (!pRes.ok) throw new Error('Failed to fetch player profile');
                const pData = await pRes.json();
                setProfile({
                    id: pData.id,
                    name: pData.name,
                    position: pData.position || '-',
                    birthdate: pData.birthdate ? new Date(pData.birthdate).toLocaleDateString('ko-KR') : '-',
                    team: pData.team || 'YU-PC',
                    event: pData.event || '축구',
                    level: pData.level || '대학'
                });

                // Fetch Measurements
                const mRes = await fetch(`/api/measurements?player_id=${playerId}&period=all`);
                if (!mRes.ok) throw new Error('Failed to fetch measurements');
                const mData = await mRes.json();
                setMeasurements(Array.isArray(mData.measurements) ? mData.measurements : []);

                // Fetch Global Averages for comparison (pre-aggregated by level)
                const gRes = await fetch('/api/statistics/global-averages');
                if (gRes.ok) {
                    const gData = await gRes.json();
                    if (!gData.error) {
                        setGlobalAverages(gData);
                    }
                }
            } catch (e: any) {
                console.error(e);
                setError(e.message || '데이터를 불러오는데 실패했습니다.');
            } finally {
                setLoading(false);
            }
        };
        if (playerId) {
            fetchData();
        }
    }, [playerId]);

    const getConfiguredName = (defaultName: string, device: string, category: string, possibleKeys: string[]) => {
        if (!metricConfigs || !metricConfigs.length) return defaultName;
        // Search for a matching config
        const match = metricConfigs.find(c =>
            (c.device === device || (device === 'ForceDecks' && c.device === 'ForceDecks')) &&
            (c.test_category === category || (c.test_category && c.test_category.includes(category))) &&
            possibleKeys.includes(c.metric_key)
        );
        return match ? match.display_name : defaultName;
    };

    // Shared Metric Keys
    const keys_JumpHeight = ['Jump Height (Imp-Mom)', 'Jump Height (Imp-Mom) [cm]', 'JumpHeight(Imp-Mom)', 'JumpHeight(Imp-Mom) [cm]', 'Jump Height'];
    const keys_RSI = ['RSI-modified', 'RSI-modified [m/s]', 'RSI'];
    const keys_Nordic = ['Max Force (N)', 'Max Force', 'Left Max Force (N)', 'Right Max Force (N)'];
    const keys_Hip = ['Max Force (N)', 'Max Force', 'Outer Max Force', 'Inner Max Force', 'Abduction Left Max Force (N)', 'Adduction Left Max Force (N)'];

    const extractMetricValue = (m: Measurement, type: string): number => {
        if (!m || !m.metrics) return 0;
        let met = m.metrics;
        if (typeof met === 'string') {
            try { met = JSON.parse(met); } catch { return 0; }
        }

        // Debugging ForceFrame Keys
        if (m.test_type === 'ForceFrame' || (met.test_name && met.test_name.includes('Hip'))) {
            // console.log(`[Debug PDF keys] ${type} | Test: ${met.test_name || m.test_type}`, Object.keys(met), Object.keys(met.results || {}));
        }

        const res = met.results || {};

        // Helper to check both metrics and results
        const getVal = (keys: string[]) => {
            for (const k of keys) {
                if (typeof met[k] === 'number' && met[k] > 0) return met[k];
                if (typeof res[k] === 'number' && res[k] > 0) return res[k];
            }
            return 0;
        };

        try {
            switch (type) {
                case 'sj_height':
                case 'cmj_height':
                    return getVal([
                        'Jump Height (Imp-Mom)', 'JumpHeight(Imp-Mom)', 'Jump Height (Imp-Mom) [cm]',
                        'Jump Height (Flight Time)', 'JumpHeight(FlightTime)',
                        'Jump Height', 'jumpHeight'
                    ]);

                case 'cmj_rsi':
                    return getVal([
                        'RSI-modified', 'rsiModified', 'RSI-modified [m/s]', 'RSI-modified(Imp-Mom)', 'RSI'
                    ]);

                case 'eur':
                    return getVal(['EUR', 'Eccentric Utilization Ratio', 'eccentricUtilizationRatio']);

                case 'nord_avg':
                    if (typeof met.leftMaxForce === 'number' && typeof met.rightMaxForce === 'number') return (met.leftMaxForce + met.rightMaxForce) / 2;
                    if (typeof res.leftMaxForce === 'number' && typeof res.rightMaxForce === 'number') return (res.leftMaxForce + res.rightMaxForce) / 2;
                    return 0;

                case 'ff_add':
                    const iL = met['Inner Left Max Force (N)'] || met['Inner Left Max Force(N)'] || met['Inner L Max Force (N)'] || met['Inner Left Max Force'] || met.innerLeftMaxForce || met.addLeftMaxForce || met['Left Max Force (N)'] || met['Left Max Force(N)'] || met.leftMaxForce || 0;
                    const iR = met['Inner Right Max Force (N)'] || met['Inner Right Max Force(N)'] || met['Inner R Max Force (N)'] || met['Inner Right Max Force'] || met.innerRightMaxForce || met.addRightMaxForce || met['Right Max Force (N)'] || met['Right Max Force(N)'] || met.rightMaxForce || 0;
                    if (iL > 0 && iR > 0) return (iL + iR) / 2;
                    return 0;

                case 'ff_abd':
                    // Extensive variations including 'Abduction', 'Abd' prefixes
                    const oL = met['Outer Left Max Force (N)'] || met['Outer Left Max Force(N)'] || met['Outer L Max Force (N)'] || met['Outer L Max Force'] || met['outer left max force (n)'] || met.outerLeftMaxForce || met.abdLeftMaxForce || met['Abduction Left Max Force (N)'] || met['Abduction L Max Force (N)'] || met['Abd Left Max Force (N)'] || met['Abd L Max Force (N)'] || met['Left Max Force (N)'] || met['Left Max Force(N)'] || met.leftMaxForce || 0;
                    const oR = met['Outer Right Max Force (N)'] || met['Outer Right Max Force(N)'] || met['Outer R Max Force (N)'] || met['Outer R Max Force'] || met['outer right max force (n)'] || met.outerRightMaxForce || met.abdRightMaxForce || met['Abduction Right Max Force (N)'] || met['Abduction R Max Force (N)'] || met['Abd Right Max Force (N)'] || met['Abd R Max Force (N)'] || met['Right Max Force (N)'] || met['Right Max Force(N)'] || met.rightMaxForce || 0;
                    if (oL > 0 && oR > 0) return (oL + oR) / 2;
                    return 0;

                case 'ff_ratio':
                    const add = extractMetricValue(m, 'ff_add');
                    const abd = extractMetricValue(m, 'ff_abd');
                    if (abd > 0) return add / abd;
                    return 0;

                case 'hop_rsi':
                    return getVal([
                        'Mean RSI (Jump Height/Contact Time)', 'MeanRSI(JumpHeight/ContactTime)',
                        'Mean RSI (Flight/Contact Time)', 'MeanRSI(Flight/ContactTime)',
                        'Mean RSI', 'mean_RSI', 'meanRsi', 'RSI-modified'
                    ]);

                default: return 0;
            }
        } catch (e) { return 0; }
    };

    const strengthenStats = useMemo(() => {
        if (!measurements || measurements.length === 0) return [];

        const checkTestNameStr = (m: any, targets: string[]) => {
            const typeLower = m.test_type?.toLowerCase() || '';
            if (targets.some(t => typeLower === t.toLowerCase() || typeLower.includes(t.toLowerCase()))) return true;

            let met = m.metrics;
            if (typeof met === 'string') { try { met = JSON.parse(met); } catch { return false; } }
            if (!met) return false;

            const subName = met.testTypeName || met.test_name || met.testType;
            if (!subName) return false;
            const subLower = subName.toLowerCase();
            return targets.some(t => subLower === t.toLowerCase() || subLower.includes(t.toLowerCase()));
        };

        const sjMap = new Map<string, number>();
        measurements.forEach(m => {
            const isSJ = (m.test_type === 'ForceDecks' || checkTestNameStr(m, ['SJ', 'Squat Jump'])) && checkTestNameStr(m, ['SJ', 'Squat Jump']);
            if (isSJ) {
                const recordedDate = new Date(m.recorded_at);
                if (!isNaN(recordedDate.getTime())) {
                    const kstDate = new Date(recordedDate.getTime() + 9 * 60 * 60 * 1000);
                    const dateKey = kstDate.toISOString().split('T')[0];
                    const val = extractMetricValue(m, 'sj_height');
                    if (val > 0) sjMap.set(dateKey, val);
                }
            }
        });


        const categories = [
            { id: 'sj', label: getConfiguredName('스쿼트 점프 높이', 'ForceDecks', 'SJ', keys_JumpHeight), dev: 'ForceDecks', avgDev: 'ForceDecks_SJ', filter: (m: any) => checkTestNameStr(m, ['SJ', 'Squat Jump']), type: 'sj_height', chart: 'bar', unit: 'cm', avgMetricKey: 'Jump Height (Imp-Mom)', avgType: 'direct' },
            { id: 'cmj', label: getConfiguredName('CMJ 높이', 'ForceDecks', 'CMJ', keys_JumpHeight), dev: 'ForceDecks', avgDev: 'ForceDecks_CMJ', filter: (m: any) => checkTestNameStr(m, ['CMJ', 'Countermovement Jump']), type: 'cmj_height', chart: 'bar', unit: 'cm', avgMetricKey: 'Jump Height (Imp-Mom)', avgType: 'direct' },
            { id: 'eur', label: 'EUR 지표', dev: 'ForceDecks', avgDev: 'ForceDecks', filter: (m: any) => checkTestNameStr(m, ['CMJ', 'Countermovement Jump']), type: 'eur', chart: 'line', unit: '', avgMetricKey: null, avgType: 'calculated' },
            { id: 'rsi', label: getConfiguredName('CMJ RSI 지표', 'ForceDecks', 'CMJ', keys_RSI), dev: 'ForceDecks', avgDev: 'ForceDecks_CMJ', filter: (m: any) => checkTestNameStr(m, ['CMJ', 'Countermovement Jump']), type: 'cmj_rsi', chart: 'bar', unit: 'm/s', avgMetricKey: 'RSI-modified', avgType: 'direct' },
            { id: 'nord', label: getConfiguredName('Hamstring Eccentric', 'NordBord', 'Nordic', keys_Nordic), dev: 'NordBord', avgDev: 'NordBord', filter: (m: any) => checkTestNameStr(m, ['Nordic', 'NordBord']), type: 'nord_avg', chart: 'bar', unit: 'N', avgMetricKey: null, avgType: 'nordbord' },
            { id: 'ff_ratio', label: getConfiguredName('Hip Adduction:Abduction', 'ForceFrame', 'Hip', keys_Hip), dev: 'ForceFrame', avgDev: 'ForceFrame', filter: (m: any) => checkTestNameStr(m, ['Hip AD', 'Hip Abduction', 'Hip AD/AB']), type: 'ff_ratio', chart: 'line', unit: '', avgMetricKey: null, avgType: 'forceframe' },
            { id: 'hop', label: getConfiguredName('Hop Test Mean RSI', 'ForceDecks', 'Hop', keys_RSI), dev: 'ForceDecks', avgDev: 'ForceDecks_HJ', filter: (m: any) => checkTestNameStr(m, ['HJ', 'Hop Test']), type: 'hop_rsi', chart: 'bar', unit: 'm/s', avgMetricKey: 'Mean RSI (Jump Height/Contact Time)', avgType: 'direct' }
        ];

        return categories.map(cat => {
            const dailyMaxMap = new Map<string, { rawDate: string, val: number, displayDate: string }>();
            measurements.filter(m => (m.test_type === cat.dev || cat.dev === 'ForceDecks') && cat.filter(m)).forEach(m => {
                const d = new Date(m.recorded_at);
                if (isNaN(d.getTime())) return;

                const kstDate = new Date(d.getTime() + 9 * 60 * 60 * 1000);
                const dateKey = kstDate.toISOString().split('T')[0];

                let val = extractMetricValue(m, cat.type);
                if (cat.id === 'eur' && val === 0) {
                    const cmjVal = extractMetricValue(m, 'cmj_height');
                    const sjVal = sjMap.get(dateKey);
                    if (cmjVal > 0 && sjVal && sjVal > 0) val = cmjVal / sjVal;
                }
                if (val > 0) {
                    const existing = dailyMaxMap.get(dateKey);
                    if (!existing || val > existing.val) {
                        dailyMaxMap.set(dateKey, { rawDate: m.recorded_at, val: val, displayDate: d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', timeZone: 'Asia/Seoul' }) });
                    }
                }
            });
            const history = Array.from(dailyMaxMap.values()).sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime()).map(item => ({ date: item.displayDate, value: cat.unit === '' ? parseFloat(item.val.toFixed(2)) : parseFloat(item.val.toFixed(1)) }));

            // Calculate Group Average from pre-aggregated globalAverages
            let avgValue = 0;
            const playerBest = Math.max(...history.map(h => h.value), 0);
            const level = profile?.level || '';

            // Get average based on avgType
            if (cat.avgType === 'direct' && cat.avgMetricKey) {
                const deviceAvgs = globalAverages[cat.avgDev] || {};
                const metricAvgs = deviceAvgs[cat.avgMetricKey] || {};
                const levelStats = (metricAvgs[level] || metricAvgs['ALL'] || {}) as any;
                avgValue = levelStats.mean || 0;
            } else if (cat.avgType === 'nordbord') {
                // NordBord: (leftMaxForce + rightMaxForce) / 2
                const nbAvgs = globalAverages['NordBord'] || {};
                const leftStats = ((nbAvgs['leftMaxForce'] || {})[level] || (nbAvgs['leftMaxForce'] || {})['ALL'] || {}) as any;
                const rightStats = ((nbAvgs['rightMaxForce'] || {})[level] || (nbAvgs['rightMaxForce'] || {})['ALL'] || {}) as any;
                const leftAvg = leftStats.mean || 0;
                const rightAvg = rightStats.mean || 0;
                if (leftAvg > 0 && rightAvg > 0) {
                    avgValue = (leftAvg + rightAvg) / 2;
                }
            } else if (cat.avgType === 'forceframe') {
                // ForceFrame: (innerL + innerR) / (outerL + outerR) ratio average
                const ffAvgs = globalAverages['ForceFrame'] || {};
                const innerLStats = ((ffAvgs['innerLeftMaxForce'] || {})[level] || (ffAvgs['innerLeftMaxForce'] || {})['ALL'] || {}) as any;
                const innerRStats = ((ffAvgs['innerRightMaxForce'] || {})[level] || (ffAvgs['innerRightMaxForce'] || {})['ALL'] || {}) as any;
                const outerLStats = ((ffAvgs['outerLeftMaxForce'] || {})[level] || (ffAvgs['outerLeftMaxForce'] || {})['ALL'] || {}) as any;
                const outerRStats = ((ffAvgs['outerRightMaxForce'] || {})[level] || (ffAvgs['outerRightMaxForce'] || {})['ALL'] || {}) as any;
                const innerAvg = ((innerLStats.mean || 0) + (innerRStats.mean || 0)) / 2;
                const outerAvg = ((outerLStats.mean || 0) + (outerRStats.mean || 0)) / 2;
                if (outerAvg > 0) {
                    avgValue = innerAvg / outerAvg;
                }
            }

            // Fallback: if no average found but player has data
            if (avgValue === 0 && playerBest > 0) {
                avgValue = playerBest;
            }

            const std = getMetricFeedback(cat.type, 0);
            return { ...cat, history, refValue: std?.ref, avgValue };
        });
    }, [measurements, globalAverages, metricConfigs, profile]);

    const powerStatsHistory = useMemo(() => {
        if (!measurements) return [];
        const manualMeasurements = measurements.filter((m: any) => m.test_type === 'Manual');

        const categories = [
            { id: 'squat', label: '스쿼트 1RM', unit: 'kg', metricName: '1RM 스쿼트' },
            { id: 'deadlift', label: '데드리프트 1RM', unit: 'kg', metricName: '1RM 데드리프트' },
            { id: 'pulldown', label: '렛풀 다운', unit: 'kg', metricName: '1RM 렛풀다운' },
            { id: 'bench', label: '벤치 프레스 1RM', unit: 'kg', metricName: '1RM 벤치프레스' },
            { id: 'epoc', label: 'EPOC', unit: 'min', metricName: 'EPOC' }
        ];

        return categories.map(cat => {
            const historyMap = new Map<string, { rawDate: string, val: number, displayDate: string }>();
            manualMeasurements.forEach((m: any) => {
                const met = typeof m.metrics === 'string' ? JSON.parse(m.metrics) : m.metrics;
                if (!met || !met.metric_name || met.metric_name !== cat.metricName) return;

                const val = Number(met.value);
                if (val > 0) {
                    const d = new Date(m.recorded_at);
                    const kstDate = new Date(d.getTime() + 9 * 60 * 60 * 1000);
                    const dateKey = kstDate.toISOString().split('T')[0];

                    const existing = historyMap.get(dateKey);
                    // Use latest entry for the day if duplicates exist
                    if (!existing || d.getTime() > new Date(existing.rawDate).getTime()) {
                        historyMap.set(dateKey, { rawDate: m.recorded_at, val: val, displayDate: d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', timeZone: 'Asia/Seoul' }) });
                    }
                }
            });

            const history = Array.from(historyMap.values())
                .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime())
                .map(item => ({ date: item.displayDate, value: item.val }));

            // Calculate Group Average (Same Level) for Power Stats
            let avgValue = 0;
            const powerPoolKeyMap: Record<string, string> = {
                'squat': 'max_squat_1rm',
                'deadlift': 'max_deadlift_1rm',
                'pulldown': 'max_pulldown_1rm',
                'bench': 'max_bench_1rm',
                'epoc': 'max_epoc'
            };

            // Get average from globalAverages for Manual data
            const manualAvgs = globalAverages['Manual'] || {};
            const metricAvgs = manualAvgs[cat.metricName] || {};
            const levelStats = (metricAvgs[profile?.level || ''] || metricAvgs['ALL'] || {}) as any;
            avgValue = levelStats.mean || 0;

            // Fallback: If pool average is 0 but player has data, usage player's data as average
            // Logic: "0 is impossible" because the player themselves is in this group.
            const playerBest = Math.max(...history.map(h => h.value), 0);
            if (avgValue === 0 && playerBest > 0) {
                avgValue = playerBest;
            }

            // Calculate first and last values for display
            const firstEntry = history.length > 0 ? history[0] : null;
            const lastEntry = history.length > 0 ? history[history.length - 1] : null;

            return {
                ...cat,
                history,
                avgValue,
                firstVal: firstEntry?.value || 0,
                firstDate: firstEntry?.date || '-',
                lastVal: lastEntry?.value || 0,
                lastDate: lastEntry?.date || '-'
            };
        });
    }, [measurements, globalAverages, profile]);

    const bodyCompStats = useMemo(() => {
        if (!measurements) return { height: [], weight: [], muscle: [], fat: [], bodyComp: { labels: [], weight: [], muscle: [], fat: [] } };
        const manualMeasurements = measurements.filter((m: any) => m.test_type === 'Manual');

        const getValue = (m: any, keys: string[]) => {
            const met = typeof m.metrics === 'string' ? JSON.parse(m.metrics) : m.metrics;
            if (!met || !met.metric_name) return null;
            if (keys.some(k => k.toLowerCase() === met.metric_name.toLowerCase())) return Number(met.value);
            return null;
        };

        const processHistoryRaw = (keys: string[]) => {
            const map = new Map<string, { rawDate: string, displayDate: string, val: number }>();
            manualMeasurements.forEach((m: any) => {
                const val = getValue(m, keys);
                if (val !== null && val > 0) {
                    const d = new Date(m.recorded_at);
                    const kstDate = new Date(d.getTime() + 9 * 60 * 60 * 1000);
                    const dateKey = kstDate.toISOString().split('T')[0];
                    if (!map.has(dateKey) || new Date(m.recorded_at).getTime() > new Date(map.get(dateKey)!.rawDate).getTime()) {
                        map.set(dateKey, { rawDate: m.recorded_at, displayDate: d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }), val });
                    }
                }
            });
            return Array.from(map.values()).sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());
        };

        const heightRaw = processHistoryRaw(['신장', 'Height', '키']);
        const weightRaw = processHistoryRaw(['체중', 'Weight', '몸무게']);
        const muscleRaw = processHistoryRaw(['골격근량', 'SMM', 'Muscle Mass', '골격근', '근육량', '근육']);
        const fatRaw = processHistoryRaw(['체지방량', 'Body Fat Mass', 'Fat Mass', 'PBF', '체지방률', '체지방', 'Fat']);

        // Individual arrays for independent display (e.g. latest value)
        const height = heightRaw.map(x => ({ date: x.displayDate, value: x.val }));
        const weight = weightRaw.map(x => ({ date: x.displayDate, value: x.val }));
        const muscle = muscleRaw.map(x => ({ date: x.displayDate, value: x.val }));
        const fat = fatRaw.map(x => ({ date: x.displayDate, value: x.val }));

        // Combined for Weight/Muscle/Fat chart - Align by date
        const compMap = new Map<string, { rawDate: string, displayDate: string, w: number | null, m: number | null, f: number | null }>();

        const addToMap = (arr: typeof weightRaw, type: 'w' | 'm' | 'f') => {
            arr.forEach(item => {
                const d = new Date(item.rawDate);
                const kstDate = new Date(d.getTime() + 9 * 60 * 60 * 1000);
                const dateKey = kstDate.toISOString().split('T')[0];

                if (!compMap.has(dateKey)) {
                    compMap.set(dateKey, { rawDate: item.rawDate, displayDate: item.displayDate, w: null, m: null, f: null });
                }
                const entry = compMap.get(dateKey)!;
                entry[type] = item.val;
            });
        };

        addToMap(weightRaw, 'w');
        addToMap(muscleRaw, 'm');
        addToMap(fatRaw, 'f');

        const sortedComp = Array.from(compMap.values()).sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());

        const bodyComp = {
            labels: sortedComp.map(x => x.displayDate),
            weight: sortedComp.map(x => x.w),
            muscle: sortedComp.map(x => x.m),
            fat: sortedComp.map(x => x.f)
        };

        return { height, weight, muscle, fat, bodyComp };
    }, [measurements]);

    const { octagonData, lastUpdateDate } = useMemo(() => {
        if (!measurements) return { octagonData: [], lastUpdateDate: '-' };

        const checkTestName = (m: any, targets: string[]) => {
            const typeLower = m.test_type?.toLowerCase() || '';
            if (targets.some(t => typeLower === t.toLowerCase() || typeLower.includes(t.toLowerCase()))) return true;

            let met = m.metrics;
            if (typeof met === 'string') { try { met = JSON.parse(met); } catch { return false; } }
            if (!met) return false;

            const subName = met.testTypeName || met.test_name || met.testType;
            if (!subName) return false;
            const subLower = subName.toLowerCase();
            return targets.some(t => subLower === t.toLowerCase() || subLower.includes(t.toLowerCase()));
        };

        const items = [
            { name: getConfiguredName('SJ 높이', 'ForceDecks', 'SJ', keys_JumpHeight), dev: 'ForceDecks', avgDev: 'ForceDecks_SJ', rawFilter: (m: any) => checkTestName(m, ['SJ', 'Squat Jump']), type: 'sj_height', avgMetricKey: 'Jump Height (Imp-Mom)' },
            { name: getConfiguredName('CMJ 높이', 'ForceDecks', 'CMJ', keys_JumpHeight), dev: 'ForceDecks', avgDev: 'ForceDecks_CMJ', rawFilter: (m: any) => checkTestName(m, ['CMJ', 'Countermovement Jump']), type: 'cmj_height', avgMetricKey: 'Jump Height (Imp-Mom)' },
            { name: getConfiguredName('CMJ RSI', 'ForceDecks', 'CMJ', keys_RSI), dev: 'ForceDecks', avgDev: 'ForceDecks_CMJ', rawFilter: (m: any) => checkTestName(m, ['CMJ', 'Countermovement Jump']), type: 'cmj_rsi', avgMetricKey: 'RSI-modified' },
            { name: getConfiguredName('Ham Ecc', 'NordBord', 'Nordic', keys_Nordic), dev: 'NordBord', avgDev: 'NordBord', rawFilter: (m: any) => checkTestName(m, ['Nordic', 'NordBord']), type: 'nord_avg', avgMetricKey: 'leftMaxForce', avgType: 'nordbord' },
            { name: getConfiguredName('Hip Add', 'ForceFrame', 'Hip', keys_Hip), dev: 'ForceFrame', avgDev: 'ForceFrame', rawFilter: (m: any) => checkTestName(m, ['Hip AD', 'Hip Adduction', 'Hip AD/AB', 'Adductor', 'Hip Adductor', 'Adduction', 'Add']), type: 'ff_add', avgMetricKey: 'innerLeftMaxForce', avgType: 'forceframe_add' },
            { name: getConfiguredName('Hip Abd', 'ForceFrame', 'Hip', keys_Hip), dev: 'ForceFrame', avgDev: 'ForceFrame', rawFilter: (m: any) => checkTestName(m, ['Hip AB', 'Hip Abduction', 'Hip AD/AB', 'Abductor', 'Hip Abductor', 'Abduction', 'Abd']), type: 'ff_abd', avgMetricKey: 'outerLeftMaxForce', avgType: 'forceframe_abd' },
            { name: getConfiguredName('Hop RSI', 'ForceDecks', 'Hop', keys_RSI), dev: 'ForceDecks', avgDev: 'ForceDecks_HJ', rawFilter: (m: any) => checkTestName(m, ['HJ', 'Hop Test']), type: 'hop_rsi', avgMetricKey: 'Mean RSI (Jump Height/Contact Time)' }
        ];

        let maxDate = 0;
        const data = items.map(item => {
            // Get average from globalAverages - with special handling for NordBord and ForceFrame
            let avgVal = 0;
            const level = profile?.level || '';

            if (item.avgType === 'nordbord') {
                // NordBord: (leftMaxForce + rightMaxForce) / 2
                const nbAvgs = globalAverages['NordBord'] || {};
                const leftAvg = (nbAvgs['leftMaxForce'] || {})[level] || (nbAvgs['leftMaxForce'] || {})['ALL'] || 0;
                const rightAvg = (nbAvgs['rightMaxForce'] || {})[level] || (nbAvgs['rightMaxForce'] || {})['ALL'] || 0;
                if (leftAvg > 0 && rightAvg > 0) {
                    avgVal = (leftAvg + rightAvg) / 2;
                }
            } else if (item.avgType === 'forceframe_add') {
                // ForceFrame Hip Adduction: (innerLeftMaxForce + innerRightMaxForce) / 2
                const ffAvgs = globalAverages['ForceFrame'] || {};
                const innerL = (ffAvgs['innerLeftMaxForce'] || {})[level] || (ffAvgs['innerLeftMaxForce'] || {})['ALL'] || 0;
                const innerR = (ffAvgs['innerRightMaxForce'] || {})[level] || (ffAvgs['innerRightMaxForce'] || {})['ALL'] || 0;
                if (innerL > 0 && innerR > 0) {
                    avgVal = (innerL + innerR) / 2;
                }
            } else if (item.avgType === 'forceframe_abd') {
                // ForceFrame Hip Abduction: (outerLeftMaxForce + outerRightMaxForce) / 2
                const ffAvgs = globalAverages['ForceFrame'] || {};
                const outerL = (ffAvgs['outerLeftMaxForce'] || {})[level] || (ffAvgs['outerLeftMaxForce'] || {})['ALL'] || 0;
                const outerR = (ffAvgs['outerRightMaxForce'] || {})[level] || (ffAvgs['outerRightMaxForce'] || {})['ALL'] || 0;
                if (outerL > 0 && outerR > 0) {
                    avgVal = (outerL + outerR) / 2;
                }
            } else {
                // Direct lookup from globalAverages
                const deviceAvgs = globalAverages[item.avgDev] || {};
                const metricAvgs = deviceAvgs[item.avgMetricKey] || {};
                avgVal = metricAvgs[level] || metricAvgs['ALL'] || 0;
            }

            // Get player value
            const playerMs = (measurements || []).filter((m: any) => item.rawFilter(m)).sort((a: any, b: any) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
            let pVal = 0;
            for (const m of playerMs) {
                const val = extractMetricValue(m, item.type);
                if (val > 0) {
                    pVal = val;
                    const d = new Date(m.recorded_at).getTime();
                    if (!isNaN(d) && d > maxDate) maxDate = d;
                    break;
                }
            }

            // Get statistics for T-Score calculation
            let mean = 0, std = 0;
            if (item.avgType === 'nordbord') {
                const nbAvgs = globalAverages['NordBord'] || {};
                const leftStats = ((nbAvgs['leftMaxForce'] || {})[level] || {}) as any;
                const rightStats = ((nbAvgs['rightMaxForce'] || {})[level] || {}) as any;
                const leftMean = leftStats.mean || 0;
                const rightMean = rightStats.mean || 0;
                const leftStd = leftStats.std || 0;
                const rightStd = rightStats.std || 0;
                mean = (leftMean + rightMean) / 2;
                std = Math.sqrt((leftStd * leftStd + rightStd * rightStd) / 2); // Combined std
            } else if (item.avgType === 'forceframe_add') {
                const ffAvgs = globalAverages['ForceFrame'] || {};
                const innerL = ((ffAvgs['innerLeftMaxForce'] || {})[level] || {}) as any;
                const innerR = ((ffAvgs['innerRightMaxForce'] || {})[level] || {}) as any;
                mean = ((innerL.mean || 0) + (innerR.mean || 0)) / 2;
                std = Math.sqrt(((innerL.std || 0) ** 2 + (innerR.std || 0) ** 2) / 2);
            } else if (item.avgType === 'forceframe_abd') {
                const ffAvgs = globalAverages['ForceFrame'] || {};
                const outerL = ((ffAvgs['outerLeftMaxForce'] || {})[level] || {}) as any;
                const outerR = ((ffAvgs['outerRightMaxForce'] || {})[level] || {}) as any;
                mean = ((outerL.mean || 0) + (outerR.mean || 0)) / 2;
                std = Math.sqrt(((outerL.std || 0) ** 2 + (outerR.std || 0) ** 2) / 2);
            } else {
                // Direct lookup
                const deviceStats = globalAverages[item.avgDev] || {};
                const metricStats = ((deviceStats[item.avgMetricKey] || {})[level] || {}) as any;
                mean = metricStats.mean || 0;
                std = metricStats.std || 0;
            }

            // Calculate T-Score: T = 50 + 10 * (X - mean) / std
            // T-Score ranges typically from 20 to 80, we'll scale to 0-100 for the chart
            const calcTScore = (val: number) => {
                if (!val || val === 0) return 0;
                if (!mean || mean === 0) return 50;
                if (!std || std === 0) return 50; // If no variance, return average score

                const tScore = 50 + 10 * (val - mean) / std;
                // T-Score typically ranges 20-80, map to 0-100 for chart display
                // 20 -> 0, 50 -> 50, 80 -> 100
                const normalized = ((tScore - 20) / 60) * 100;
                return Math.max(0, Math.min(100, normalized));
            };

            const playerScore = calcTScore(pVal);
            const avgScore = 50; // Mean is always T-Score 50, which maps to 50% on our scale

            return { subject: item.name, A: parseFloat(playerScore.toFixed(1)), B: avgScore, fullMark: 100 };
        });

        const comparisonLabel = `동일 수준(${profile?.level || '그룹'}) 평균`;

        return { octagonData: data, lastUpdateDate: maxDate > 0 ? new Date(maxDate).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-', comparisonLabel };
    }, [globalAverages, measurements, profile, metricConfigs]);

    if (loading) return <div className="flex items-center justify-center min-h-[500px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
    if (error || !profile) return (
        <div className="flex flex-col items-center justify-center min-h-[500px] text-slate-500 gap-4">
            <AlertCircle size={48} className="text-slate-300" />
            <p className="font-medium">{error || '선수 정보를 찾을 수 없습니다.'}</p>
            <button onClick={() => router.back()} className="px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors text-sm font-bold text-slate-600">뒤로가기</button>
        </div>
    );

    const renderChart = (item: any) => (
        <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 group hover:border-slate-200 transition-all print:border-slate-200 print:shadow-none mb-4 break-inside-avoid">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-700 tracking-tight">{item.label}</h3>
                <div className="px-2 py-0.5 bg-slate-50 rounded text-[9px] text-slate-400 font-black uppercase tracking-widest">{item.dev}</div>
            </div>
            <div className="h-[280px] w-full">
                {item.history.length > 0 ? (
                    item.chart === 'line' ? (
                        <Line
                            data={{
                                labels: item.history.map((h: any) => h.date),
                                datasets: [
                                    {
                                        label: item.label,
                                        data: item.history.map((h: any) => h.value),
                                        borderColor: '#0F172A',
                                        backgroundColor: '#0F172A',
                                        tension: 0.1,
                                        pointRadius: 4,
                                        pointBackgroundColor: '#0F172A',
                                        order: 1
                                    },
                                    {
                                        label: '평균',
                                        data: Array(item.history.length).fill(item.avgValue || null),
                                        borderColor: '#94A3B8',
                                        borderWidth: 2,
                                        borderDash: [5, 5],
                                        pointRadius: 0,
                                        fill: false,
                                        order: 2
                                    }
                                ]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                    x: { offset: true, grid: { display: false }, ticks: { font: { size: 10 } } },
                                    y: { display: false, min: Math.min(...item.history.map((h: any) => h.value), item.refValue || 0, item.avgValue || Infinity) * 0.9, max: Math.max(...item.history.map((h: any) => h.value), item.refValue || 0, item.avgValue || 0) * 1.3 }
                                },
                                plugins: {
                                    legend: { display: false },
                                    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label || ''}: ${ctx.parsed.y} ${item.unit}` } }
                                }
                            }}
                            plugins={[{
                                id: 'customLabelsLine_' + item.id,
                                afterDatasetsDraw(chart) {
                                    const { ctx, data } = chart;
                                    ctx.save();
                                    if (!chart.getDatasetMeta(0).hidden) {
                                        chart.getDatasetMeta(0).data.forEach((point, index) => {
                                            const value = data.datasets[0].data[index] as number;
                                            if (value != null) {
                                                const x = (point as any).x;
                                                const y = (point as any).y;
                                                if (x != null && y != null) {
                                                    ctx.font = 'bold 10px sans-serif';
                                                    ctx.fillStyle = '#0F172A';
                                                    ctx.textAlign = 'center';
                                                    ctx.textBaseline = 'bottom';
                                                    ctx.fillText(value.toString(), x, y - 6);
                                                }
                                            }
                                        });
                                    }
                                    if (data.datasets.length > 1 && !chart.getDatasetMeta(1).hidden) {
                                        const avgIdx = data.datasets[1].data.length - 1;
                                        if (avgIdx >= 0) {
                                            const point = chart.getDatasetMeta(1).data[avgIdx];
                                            const value = data.datasets[1].data[avgIdx] as number;
                                            if (point && value != null) {
                                                const x = (point as any).x;
                                                const y = (point as any).y;
                                                ctx.font = 'bold 10px sans-serif';
                                                ctx.fillStyle = '#EF4444';
                                                ctx.textAlign = 'left';
                                                ctx.textBaseline = 'middle';
                                                ctx.fillText(`${value.toFixed(1)} (Avg)`, x + 5, y);
                                            }
                                        }
                                    }
                                    ctx.restore();
                                }
                            }]}
                        />
                    ) : (
                        <Bar
                            data={{
                                labels: item.history.map((h: any) => h.date),
                                datasets: [
                                    {
                                        type: 'bar' as const,
                                        label: item.label,
                                        data: item.history.map((h: any) => h.value),
                                        backgroundColor: '#0F172A',
                                        borderRadius: 4,
                                        barPercentage: 0.5,
                                        order: 1
                                    },
                                    {
                                        type: 'line' as const,
                                        label: '평균',
                                        data: Array(item.history.length).fill(item.avgValue || null),
                                        borderColor: '#94A3B8',
                                        borderWidth: 2,
                                        borderDash: [5, 5],
                                        pointRadius: 0,
                                        fill: false,
                                        order: 0
                                    }
                                ] as any
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                    x: { offset: true, grid: { display: false }, ticks: { font: { size: 10 } } },
                                    y: { display: false, min: Math.min(...item.history.map((h: any) => h.value), item.refValue || 0, item.avgValue || Infinity) * 0.9, max: Math.max(...item.history.map((h: any) => h.value), item.refValue || 0, item.avgValue || 0) * 1.3 }
                                },
                                plugins: {
                                    legend: { display: false },
                                    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label || ''}: ${ctx.parsed.y} ${item.unit}` } }
                                }
                            }}
                            plugins={[{
                                id: 'customLabelsBar_' + item.id,
                                afterDatasetsDraw(chart) {
                                    const { ctx, data } = chart;
                                    ctx.save();
                                    if (!chart.getDatasetMeta(0).hidden) {
                                        chart.getDatasetMeta(0).data.forEach((point, index) => {
                                            const value = data.datasets[0].data[index] as number;
                                            if (value != null) {
                                                const x = (point as any).x;
                                                const y = (point as any).y;
                                                if (x != null && y != null) {
                                                    ctx.font = 'bold 10px sans-serif';
                                                    ctx.fillStyle = '#0F172A';
                                                    ctx.textAlign = 'center';
                                                    ctx.textBaseline = 'bottom';
                                                    ctx.fillText(value.toString(), x, y - 6);
                                                }
                                            }
                                        });
                                    }
                                    if (data.datasets.length > 1 && !chart.getDatasetMeta(1).hidden) {
                                        const avgIdx = data.datasets[1].data.length - 1;
                                        if (avgIdx >= 0) {
                                            const point = chart.getDatasetMeta(1).data[avgIdx];
                                            const value = data.datasets[1].data[avgIdx] as number;
                                            if (point && value != null) {
                                                const x = (point as any).x;
                                                const y = (point as any).y;
                                                ctx.font = 'bold 10px sans-serif';
                                                ctx.fillStyle = '#EF4444';
                                                ctx.textAlign = 'left';
                                                ctx.textBaseline = 'middle';
                                                ctx.fillText(`${value.toFixed(1)} (Avg)`, x + 5, y);
                                            }
                                        }
                                    }
                                    ctx.restore();
                                }
                            }]}
                        />
                    )
                ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-300 font-bold">데이터 없음</div>
                )}
            </div>
        </div>
    );

    const renderCombinedJumpChart = () => {
        const sjItem = strengthenStats.find(i => i.id === 'sj');
        const cmjItem = strengthenStats.find(i => i.id === 'cmj');

        if (!sjItem && !cmjItem) return null;

        // Merge histories by date
        const sjHistory = sjItem?.history || [];
        const cmjHistory = cmjItem?.history || [];

        // Create a map of all dates
        const dateMap = new Map<string, { sj: number | null, cmj: number | null }>();
        const allDates = new Set<string>();

        sjHistory.forEach((h: any) => { dateMap.set(h.date, { sj: h.value, cmj: null }); allDates.add(h.date); });
        cmjHistory.forEach((h: any) => {
            if (dateMap.has(h.date)) {
                const entry = dateMap.get(h.date)!;
                entry.cmj = h.value;
            } else {
                dateMap.set(h.date, { sj: null, cmj: h.value });
                allDates.add(h.date);
            }
        });

        // Sort dates
        const sortedDates = Array.from(allDates).sort((a, b) => {
            const [m1, d1] = a.split('.').map(Number);
            const [m2, d2] = b.split('.').map(Number);
            if (m1 !== m2) return m1 - m2;
            return d1 - d2;
        });

        const sjData = sortedDates.map(d => dateMap.get(d)?.sj ?? null);
        const cmjData = sortedDates.map(d => dateMap.get(d)?.cmj ?? null);

        // Averages
        const sjAvg = sjItem?.avgValue || 0;
        const cmjAvg = cmjItem?.avgValue || 0;

        return (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 group hover:border-slate-200 transition-all print:border-slate-200 print:shadow-none mb-4 break-inside-avoid">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-700 tracking-tight">Squat Jump vs CMJ Comparison</h3>
                    <div className="px-2 py-0.5 bg-slate-50 rounded text-[9px] text-slate-400 font-black uppercase tracking-widest">ForceDecks</div>
                </div>
                <div className="h-[280px] w-full">
                    <Line
                        data={{
                            labels: sortedDates,
                            datasets: [
                                {
                                    label: 'Squat Jump',
                                    data: sjData,
                                    borderColor: '#3B82F6', // Blue
                                    backgroundColor: '#3B82F6',
                                    tension: 0.1,
                                    pointRadius: 4,
                                    pointHoverRadius: 6,
                                    spanGaps: true,
                                    order: 2
                                },
                                {
                                    label: 'SJ Avg',
                                    data: Array(sortedDates.length).fill(sjAvg || null),
                                    borderColor: '#93C5FD', // Light Blue
                                    borderWidth: 2,
                                    borderDash: [5, 5],
                                    pointRadius: 0,
                                    fill: false,
                                    spanGaps: true,
                                    order: 3
                                },
                                {
                                    label: 'CMJ',
                                    data: cmjData,
                                    borderColor: '#EF4444', // Red
                                    backgroundColor: '#EF4444',
                                    tension: 0.1,
                                    pointRadius: 4,
                                    pointHoverRadius: 6,
                                    spanGaps: true,
                                    order: 0
                                },
                                {
                                    label: 'CMJ Avg',
                                    data: Array(sortedDates.length).fill(cmjAvg || null),
                                    borderColor: '#FCA5A5', // Light Red
                                    borderWidth: 2,
                                    borderDash: [5, 5],
                                    pointRadius: 0,
                                    fill: false,
                                    spanGaps: true,
                                    order: 1
                                }
                            ]
                        }}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                x: { offset: true, grid: { display: false }, ticks: { font: { size: 10 } } },
                                y: { display: false, min: 0 }
                            },
                            plugins: {
                                legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 8, font: { size: 9, weight: 'bold' } } },
                                tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y} cm` } }
                            }
                        }}
                        plugins={[{
                            id: 'customLabelsJumpComp',
                            afterDatasetsDraw(chart) {
                                const { ctx, data } = chart;
                                ctx.save();
                                // Draw labels for SJ and CMJ points only
                                [0, 2].forEach(datasetIndex => {
                                    if (chart.getDatasetMeta(datasetIndex).hidden) return;
                                    chart.getDatasetMeta(datasetIndex).data.forEach((point, index) => {
                                        const value = data.datasets[datasetIndex].data[index] as number;
                                        if (value != null) {
                                            const x = (point as any).x;
                                            const y = (point as any).y;
                                            if (x != null && y != null) {
                                                ctx.font = 'bold 9px sans-serif';
                                                ctx.fillStyle = data.datasets[datasetIndex].borderColor as string;
                                                ctx.textAlign = 'center';
                                                ctx.textBaseline = 'bottom';
                                                ctx.fillText(value.toString(), x, y - 6);
                                            }
                                        }
                                    });
                                });
                                ctx.restore();
                            }
                        }]}
                    />
                </div>
            </div>
        );
    };

    return (
        <div id="printable-area" className="w-full max-w-full space-y-6 pb-20 fade-in print:p-0 print:max-w-none">
            <style type="text/css" media="print">{`
                @page { size: A4 portrait; margin: 5mm; }
                body { visibility: hidden; }
                #printable-area {
                    visibility: visible;
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                }
                @media print {
                    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    #printable-area { zoom: 0.6; width: 100%; }
                    @page { size: A4 portrait; margin: auto; }
                }
            `}</style>

            {/* Header */}
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 print:hidden">
                <div className="flex items-center gap-5">
                    <button onClick={() => router.back()} className="p-2.5 hover:bg-slate-50 rounded-xl transition-all border border-slate-100 shadow-sm print:hidden"><ArrowLeft size={20} className="text-slate-600" /></button>
                    <div><h1 className="text-2xl font-black text-slate-900 tracking-tight">{profile.name} 리포트</h1><p className="text-sm text-slate-400 font-medium tracking-tight">Yoon Performance Center Analysis Report</p></div>
                </div>
                <div className="print:hidden">
                    <button onClick={() => window.print()} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors shadow-sm">PDF 인쇄 / 저장</button>
                </div>
            </div>

            {/* DEBUG: No measurements warning */}
            {measurements.length === 0 && <div className="p-4 bg-red-50 text-red-500 rounded-xl text-sm font-bold">⚠️ 측정 데이터가 없습니다.</div>}

            {/* Top Section */}
            <div className="grid grid-cols-12 gap-6 print:gap-4 print:grid-cols-12">

                {/* 1. Profile Section */}
                <div className="col-span-12 lg:col-span-3 print:col-span-3 grid grid-cols-2 lg:grid-cols-2 gap-3 content-start">
                    <ProfileCard label="선수명" value={profile.name} icon={User} />
                    <ProfileCard label="포지션" value={profile.position} icon={Target} />
                    <ProfileCard label="생년월일" value={profile.birthdate} icon={Calendar} />
                    <ProfileCard label="소속팀" value={profile.team || 'YU-PC'} icon={Activity} />
                    <ProfileCard label="종목" value={profile.event || '축구'} icon={TrendingUp} />
                    <ProfileCard label="수준(학년)" value={profile.level || '대학'} icon={Info} />
                </div>

                {/* 2. Body Composition Charts */}
                <div className="col-span-12 lg:col-span-4 print:col-span-4 flex flex-col gap-4">
                    {/* Height Chart */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex-1 min-h-[160px]">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-slate-700 tracking-tight">신장</h3>
                            {bodyCompStats.height.length > 0 &&
                                <div className="flex gap-2 text-xs">
                                    <span className="text-slate-400">{bodyCompStats.height[0].date}: <b className="text-slate-600">{bodyCompStats.height[0].value}</b></span>
                                    <span className="text-slate-400">→</span>
                                    <span className="text-emerald-500 font-bold">{bodyCompStats.height[bodyCompStats.height.length - 1].value} cm</span>
                                </div>
                            }
                        </div>
                        <div className="h-[280px] w-full">
                            <Line
                                data={{
                                    labels: bodyCompStats.height.map((h: any) => h.date),
                                    datasets: [{ label: 'Height', data: bodyCompStats.height.map((h: any) => h.value), borderColor: '#0F172A', backgroundColor: '#0F172A', tension: 0.1, pointRadius: 3 }]
                                }}
                                options={{
                                    responsive: true, maintainAspectRatio: false,
                                    scales: { x: { display: true, grid: { display: false }, ticks: { font: { size: 9 } } }, y: { display: false } },
                                    plugins: { legend: { display: false } }
                                }}
                            />
                        </div>
                    </div>

                    {/* Weight/Muscle/Fat Chart */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex-1 min-h-[160px]">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-slate-700 tracking-tight">체중 / 근육량 / 체지방량</h3>
                            {bodyCompStats.weight.length > 0 &&
                                <span className="text-xs font-bold text-slate-800">{bodyCompStats.weight[bodyCompStats.weight.length - 1].value} kg</span>
                            }
                        </div>
                        <div className="h-[280px] w-full">
                            <Line
                                data={{
                                    labels: bodyCompStats.bodyComp.labels,
                                    datasets: [
                                        { label: '체중', data: bodyCompStats.bodyComp.weight, borderColor: '#0F172A', backgroundColor: '#0F172A', tension: 0.1, pointRadius: 3, spanGaps: true },
                                        { label: '근육량', data: bodyCompStats.bodyComp.muscle, borderColor: '#64748B', borderDash: [5, 5], tension: 0.1, pointRadius: 0, spanGaps: true },
                                        { label: '체지방량', data: bodyCompStats.bodyComp.fat, borderColor: '#CBD5E1', borderDash: [2, 2], tension: 0.1, pointRadius: 0, spanGaps: true }
                                    ]
                                }}
                                options={{
                                    responsive: true, maintainAspectRatio: false,
                                    scales: { x: { display: true, grid: { display: false }, ticks: { font: { size: 9 } } }, y: { display: false } },
                                    plugins: { legend: { display: false } }
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* 3. Octagon Chart */}
                <div className="col-span-12 lg:col-span-5 print:col-span-5 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col relative overflow-hidden">
                    <div className="flex items-center gap-3 self-start mb-2 z-10">
                        <div className="p-1.5 bg-blue-600 rounded-lg text-white shadow"><Scale size={16} /></div>
                        <div>
                            <h2 className="text-sm font-black text-slate-800 tracking-tight">Performance Octagon</h2>
                            <span className="text-[10px] font-bold text-slate-400">Latest Test: {lastUpdateDate}</span>
                        </div>
                    </div>
                    <div className="absolute top-4 right-4 flex gap-3 text-[10px] items-center z-10">
                        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-slate-900 rounded-full"></div><span className="font-bold text-slate-700">본인</span></div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 border border-slate-400 border-dashed rounded-full"></div><span className="font-medium text-slate-400">동일 수준 평균</span></div>
                    </div>
                    <div className="w-full h-[500px] mt-4 relative z-0">
                        <Radar
                            data={{
                                labels: octagonData.map(d => d.subject),
                                datasets: [
                                    { label: profile?.name || "본인", data: octagonData.map(d => d.A), backgroundColor: 'rgba(15, 23, 42, 0.4)', borderColor: '#0F172A', borderWidth: 2, pointBackgroundColor: '#0F172A', pointRadius: 3 },
                                    { label: `동일 수준 평균`, data: octagonData.map(d => d.B), backgroundColor: 'transparent', borderColor: '#94A3B8', borderWidth: 1, borderDash: [4, 4], pointRadius: 0 }
                                ]
                            }}
                            options={{
                                scales: { r: { min: 0, max: 100, ticks: { display: false, stepSize: 20 }, pointLabels: { font: { size: 9, weight: 'bold' }, color: '#64748B' }, grid: { color: '#F1F5F9' }, angleLines: { color: '#F1F5F9' } } },
                                plugins: { legend: { display: false } }
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4 items-start">

                {/* Left: Measurement Trends */}
                <div className="bg-[#FFFCEB] p-6 rounded-3xl border border-amber-100 shadow-sm space-y-4 print:bg-transparent print:border-none print:p-0">
                    <div className="flex items-center gap-3 border-b border-amber-200/50 pb-4 mb-2">
                        <div className="p-2 bg-amber-500 rounded-lg text-white shadow-lg shadow-amber-200"><TrendingUp size={20} /></div>
                        <h2 className="text-xl font-black text-amber-900 tracking-tight">측정 결과 추이</h2>
                    </div>

                    {/* 1. Combined Jump Chart (SJ vs CMJ) */}
                    {renderCombinedJumpChart()}

                    {/* 2. CMJ RSI */}
                    {strengthenStats.filter(i => i.id === 'rsi').map(renderChart)}

                    {/* 3. Hop Test RSI */}
                    {strengthenStats.filter(i => i.id === 'hop').map(renderChart)}

                    {/* 4. Hamstring Ecc */}
                    {strengthenStats.filter(i => i.id === 'nord').map(renderChart)}
                </div>

                {/* Right: Insight */}
                <div className="bg-[#OFFCEB] p-6 rounded-3xl border border-amber-100 shadow-sm space-y-4 print:bg-transparent print:border-none print:p-0 bg-yellow-50/50">
                    <div className="flex items-center gap-3 border-b border-amber-200/50 pb-4 mb-2">
                        <div className="p-2 bg-amber-500 rounded-lg text-white shadow-lg shadow-amber-200"><Zap size={20} /></div>
                        <h2 className="text-xl font-black text-amber-900 tracking-tight">Insight</h2>
                    </div>
                    {/* 1. EUR */}
                    {strengthenStats.filter(item => item.id === 'eur').map(renderChart)}

                    {/* 2. Hip Ratio */}
                    {strengthenStats.filter(item => item.id === 'ff_ratio').map(renderChart)}
                </div>
            </div>
        </div>
    );
}

const ProfileCard = ({ label, value, icon: Icon }: any) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center group hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-300 print:shadow-none print:border-slate-200">
        <div className="p-2 bg-slate-50 rounded-xl mb-3 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 text-slate-400 print:hidden"><Icon size={18} /></div>
        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1.5">{label}</span>
        <span className="text-sm font-black text-slate-800 tracking-tight">{value}</span>
    </div>
);

const ManualInput = ({ label, value, unit }: { label: string, value: number, unit: string }) => (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col justify-center shadow-sm hover:border-blue-300 transition-all group print:border-slate-300 print:shadow-none">
        <span className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">{label}</span>
        <div className="flex items-baseline gap-2 justify-center">
            <span className="text-xl font-black text-slate-700">
                {value || '-'}
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase">{unit}</span>
        </div>
    </div>
);
