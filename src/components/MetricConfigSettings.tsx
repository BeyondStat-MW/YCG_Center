'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    Settings, Save, RefreshCw, Eye, EyeOff, Search,
    ChevronDown, ChevronRight, Edit2, Check, X, Loader2,
    Zap, Activity, Timer, Scale, Target, ToggleLeft, ToggleRight
} from 'lucide-react';

interface MetricConfig {
    id?: string;
    test_type: string;
    metric_key: string;
    display_name: string;
    unit: string;
    visible: boolean;
    order: number;
}

interface TestTypeConfig {
    original_name: string;
    display_name: string;
    visible: boolean;
}

interface DiscoveredMetric {
    key: string;
    sampleValue: number | string;
    count: number;
}

const TEST_TYPE_ICONS: Record<string, any> = {
    ForceDecks: Activity,
    NordBord: Zap,
    ForceFrame: Scale,
    SmartSpeed: Timer,
    DynaMo: Target,
};

// Test types to exclude from UI
const EXCLUDED_TEST_TYPES = ['rehab', 'Unknown'];

const guessUnit = (key: string): string => {
    const k = key.toLowerCase();
    if (k.includes('force') || k.includes('newton')) return 'N';
    if (k.includes('power') && k.includes('bm')) return 'W/kg';
    if (k.includes('power') || k.includes('watt')) return 'W';
    if (k.includes('time') || k.includes('seconds') || k.includes('duration')) return 's';
    if (k.includes('height') || k.includes('distance')) return 'cm';
    if (k.includes('velocity') || k.includes('speed')) return 'm/s';
    if (k.includes('angle') || k.includes('rom') || k.includes('degree')) return '°';
    if (k.includes('percent') || k.includes('asym') || k.includes('imbalance')) return '%';
    if (k.includes('mass') || k.includes('weight')) return 'kg';
    if (k.includes('rsi') || k.includes('ratio')) return '';
    return '';
};

const cleanKeyName = (key: string): string => {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_\.]/g, ' ')
        .replace(/\(.*\)/g, '')
        .trim()
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
};

export default function MetricConfigSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [measurements, setMeasurements] = useState<any[]>([]);
    const [savedConfigs, setSavedConfigs] = useState<MetricConfig[]>([]);
    const [localConfigs, setLocalConfigs] = useState<Record<string, Record<string, MetricConfig>>>({});
    const [testTypeConfigs, setTestTypeConfigs] = useState<Record<string, TestTypeConfig>>({});
    const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [editingTestType, setEditingTestType] = useState<string | null>(null);
    const [editTestTypeValue, setEditTestTypeValue] = useState('');
    const [hasChanges, setHasChanges] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'metrics' | 'test_types'>('metrics');

    // Fetch measurements and existing configs
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch sample measurements to discover metrics (using more data)
                const measurementsRes = await fetch('/api/measurements?period=90d');
                const measurementsJson = await measurementsRes.json();
                setMeasurements(measurementsJson.measurements || []);

                // Fetch saved configs
                const configsRes = await fetch('/api/metric-configs');
                const configsJson = await configsRes.json();
                setSavedConfigs(configsJson.configs || []);
            } catch (e) {
                console.error('Error fetching data:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Discover metrics from measurements and merge with saved configs
    const discoveredByType = useMemo(() => {
        const byType: Record<string, Map<string, DiscoveredMetric>> = {};

        measurements.forEach(m => {
            const testType = m.test_type || 'Unknown';
            // Exclude certain test types
            if (EXCLUDED_TEST_TYPES.includes(testType)) return;

            if (!byType[testType]) byType[testType] = new Map();

            const metrics = m.metrics || {};
            Object.entries(metrics).forEach(([key, value]) => {
                // Only include numeric metrics
                if (typeof value === 'number' && !isNaN(value)) {
                    const existing = byType[testType].get(key);
                    if (existing) {
                        existing.count++;
                    } else {
                        byType[testType].set(key, {
                            key,
                            sampleValue: value,
                            count: 1
                        });
                    }
                }
            });
        });

        return byType;
    }, [measurements]);

    // Initialize local configs from discovered + saved
    useEffect(() => {
        if (Object.keys(discoveredByType).length === 0) return;

        const newConfigs: Record<string, Record<string, MetricConfig>> = {};
        const newTestTypeConfigs: Record<string, TestTypeConfig> = {};

        // Build from discovered metrics
        Object.entries(discoveredByType).forEach(([testType, metricsMap]) => {
            newConfigs[testType] = {};

            // Initialize test type config
            newTestTypeConfigs[testType] = {
                original_name: testType,
                display_name: testType,
                visible: true
            };

            Array.from(metricsMap.values()).forEach((metric, idx) => {
                // Check if we have a saved config for this
                const saved = savedConfigs.find(
                    c => c.test_type === testType && c.metric_key === metric.key
                );

                newConfigs[testType][metric.key] = {
                    test_type: testType,
                    metric_key: metric.key,
                    display_name: saved?.display_name || cleanKeyName(metric.key),
                    unit: saved?.unit || guessUnit(metric.key),
                    visible: saved?.visible ?? true,
                    order: saved?.order ?? idx,
                    id: saved?.id
                };
            });
        });

        setLocalConfigs(newConfigs);
        setTestTypeConfigs(newTestTypeConfigs);
    }, [discoveredByType, savedConfigs]);

    // Toggle test type expansion
    const toggleType = (testType: string) => {
        const newSet = new Set(expandedTypes);
        if (newSet.has(testType)) {
            newSet.delete(testType);
        } else {
            newSet.add(testType);
        }
        setExpandedTypes(newSet);
    };

    // Update a config field
    const updateConfig = (testType: string, metricKey: string, field: keyof MetricConfig, value: any) => {
        setLocalConfigs(prev => ({
            ...prev,
            [testType]: {
                ...prev[testType],
                [metricKey]: {
                    ...prev[testType][metricKey],
                    [field]: value
                }
            }
        }));
        setHasChanges(true);
    };

    // Toggle all visibility for a test type
    const toggleAllVisibility = (testType: string, visible: boolean) => {
        setLocalConfigs(prev => {
            const updated = { ...prev };
            Object.keys(updated[testType] || {}).forEach(key => {
                updated[testType][key] = {
                    ...updated[testType][key],
                    visible
                };
            });
            return updated;
        });
        setHasChanges(true);
    };

    // Update test type config
    const updateTestTypeConfig = (testType: string, field: keyof TestTypeConfig, value: any) => {
        setTestTypeConfigs(prev => ({
            ...prev,
            [testType]: {
                ...prev[testType],
                [field]: value
            }
        }));
        setHasChanges(true);
    };

    // Start editing display name
    const startEdit = (testType: string, metricKey: string) => {
        const config = localConfigs[testType]?.[metricKey];
        if (config) {
            setEditingKey(`${testType}:${metricKey}`);
            setEditValue(config.display_name);
        }
    };

    // Save edit
    const saveEdit = (testType: string, metricKey: string) => {
        updateConfig(testType, metricKey, 'display_name', editValue);
        setEditingKey(null);
        setEditValue('');
    };

    // Cancel edit
    const cancelEdit = () => {
        setEditingKey(null);
        setEditValue('');
    };

    // Start editing test type name
    const startEditTestType = (testType: string) => {
        setEditingTestType(testType);
        setEditTestTypeValue(testTypeConfigs[testType]?.display_name || testType);
    };

    // Save test type edit
    const saveEditTestType = (testType: string) => {
        updateTestTypeConfig(testType, 'display_name', editTestTypeValue);
        setEditingTestType(null);
        setEditTestTypeValue('');
    };

    // Cancel test type edit
    const cancelEditTestType = () => {
        setEditingTestType(null);
        setEditTestTypeValue('');
    };

    // Toggle visibility
    const toggleVisibility = (testType: string, metricKey: string) => {
        const current = localConfigs[testType]?.[metricKey]?.visible ?? true;
        updateConfig(testType, metricKey, 'visible', !current);
    };

    // Save all configs
    const saveConfigs = async () => {
        setSaving(true);
        setMessage(null);

        try {
            const allConfigs: MetricConfig[] = [];
            Object.values(localConfigs).forEach(byKey => {
                Object.values(byKey).forEach(config => {
                    allConfigs.push(config);
                });
            });

            const res = await fetch('/api/metric-configs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ configs: allConfigs, testTypeConfigs })
            });

            if (!res.ok) throw new Error('Failed to save');

            setMessage({ type: 'success', text: '설정이 저장되었습니다.' });
            setHasChanges(false);
        } catch (e) {
            setMessage({ type: 'error', text: '저장 중 오류가 발생했습니다.' });
        } finally {
            setSaving(false);
        }
    };

    // Filter metrics by search
    const getFilteredMetrics = (testType: string) => {
        const metrics = localConfigs[testType] || {};
        if (!searchQuery) return Object.values(metrics);

        const q = searchQuery.toLowerCase();
        return Object.values(metrics).filter(m =>
            m.metric_key.toLowerCase().includes(q) ||
            m.display_name.toLowerCase().includes(q)
        );
    };

    // Count visible metrics
    const countVisible = (testType: string) => {
        const metrics = localConfigs[testType] || {};
        return Object.values(metrics).filter(m => m.visible).length;
    };

    // Get filtered test types (excluding hidden ones like rehab)
    const filteredTestTypes = Object.keys(localConfigs)
        .filter(t => !EXCLUDED_TEST_TYPES.includes(t))
        .sort();

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <span className="ml-3 text-slate-500">메트릭 설정 로딩 중...</span>
            </div>
        );
    }

    // Empty state when no metrics discovered
    if (Object.keys(localConfigs).length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <Settings className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">메트릭 매핑 설정</h2>
                        <p className="text-sm text-slate-500">장비별 메트릭 표시명과 가시성을 관리합니다</p>
                    </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <Settings className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-amber-800">데이터 동기화가 필요합니다</h3>
                            <p className="text-sm text-amber-700 mt-1">
                                메트릭을 발견하려면 먼저 VALD 또는 기타 장비의 측정 데이터가 필요합니다.
                            </p>
                        </div>
                    </div>
                    <div className="pl-11 space-y-2 text-sm text-amber-700">
                        <p>• 데이터 동기화 탭에서 VALD 데이터를 동기화해주세요</p>
                        <p>• 동기화 후 이 페이지를 새로고침하면 메트릭이 표시됩니다</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <Settings className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">메트릭 매핑 설정</h2>
                        <p className="text-sm text-slate-500">장비별 메트릭 표시명과 가시성을 관리합니다</p>
                    </div>
                </div>

                <button
                    onClick={saveConfigs}
                    disabled={!hasChanges || saving}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${hasChanges
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? '저장 중...' : '저장'}
                </button>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('metrics')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'metrics'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    메트릭 설정
                </button>
                <button
                    onClick={() => setActiveTab('test_types')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'test_types'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Test Type 설정
                </button>
            </div>

            {activeTab === 'test_types' ? (
                /* Test Type Configuration */
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">
                        Test Type의 표시 이름을 변경하거나 대시보드에서 숨길 수 있습니다.
                    </p>
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                        <div className="divide-y divide-slate-100">
                            {filteredTestTypes.map(testType => {
                                const Icon = TEST_TYPE_ICONS[testType] || Activity;
                                const config = testTypeConfigs[testType];
                                const isEditing = editingTestType === testType;
                                const metricsCount = Object.keys(localConfigs[testType] || {}).length;
                                const visibleCount = countVisible(testType);

                                return (
                                    <div
                                        key={testType}
                                        className={`flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors ${!config?.visible ? 'opacity-50' : ''
                                            }`}
                                    >
                                        {/* Visibility Toggle */}
                                        <button
                                            onClick={() => updateTestTypeConfig(testType, 'visible', !config?.visible)}
                                            className={`p-2 rounded-lg transition-colors ${config?.visible
                                                    ? 'bg-indigo-100 text-indigo-600'
                                                    : 'bg-slate-100 text-slate-400'
                                                }`}
                                        >
                                            {config?.visible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                        </button>

                                        {/* Icon */}
                                        <div className="p-2 bg-slate-100 rounded-lg">
                                            <Icon className="w-5 h-5 text-slate-600" />
                                        </div>

                                        {/* Original Name */}
                                        <div className="w-32">
                                            <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono">
                                                {testType}
                                            </code>
                                        </div>

                                        {/* Arrow */}
                                        <span className="text-slate-300">→</span>

                                        {/* Display Name (Editable) */}
                                        <div className="flex-1">
                                            {isEditing ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={editTestTypeValue}
                                                        onChange={e => setEditTestTypeValue(e.target.value)}
                                                        className="flex-1 px-3 py-2 text-sm border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={() => saveEditTestType(testType)}
                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                                    >
                                                        <Check className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={cancelEditTestType}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    <span className="font-medium text-slate-800">
                                                        {config?.display_name || testType}
                                                    </span>
                                                    <button
                                                        onClick={() => startEditTestType(testType)}
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Stats */}
                                        <div className="text-right text-sm text-slate-500">
                                            {visibleCount} / {metricsCount} 메트릭
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Info about excluded types */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <h4 className="font-medium text-slate-700 mb-2">ℹ️ 참고</h4>
                        <p className="text-sm text-slate-500">
                            'rehab', 'Unknown' 같은 일부 테스트 타입은 자동으로 제외됩니다.
                        </p>
                    </div>
                </div>
            ) : (
                /* Metrics Configuration */
                <>
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="메트릭 검색..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>

                    {/* Test Type Sections */}
                    <div className="space-y-3">
                        {filteredTestTypes.map(testType => {
                            const Icon = TEST_TYPE_ICONS[testType] || Activity;
                            const isExpanded = expandedTypes.has(testType);
                            const filteredMetrics = getFilteredMetrics(testType);
                            const visibleCount = countVisible(testType);
                            const totalCount = Object.keys(localConfigs[testType] || {}).length;
                            const allVisible = visibleCount === totalCount;
                            const noneVisible = visibleCount === 0;

                            return (
                                <div key={testType} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                                    {/* Header */}
                                    <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                        <button
                                            onClick={() => toggleType(testType)}
                                            className="flex items-center gap-3 flex-1"
                                        >
                                            <div className="p-2 bg-slate-100 rounded-lg">
                                                <Icon className="w-5 h-5 text-slate-600" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="font-bold text-slate-800">
                                                    {testTypeConfigs[testType]?.display_name || testType}
                                                </h3>
                                                <p className="text-xs text-slate-500">
                                                    {visibleCount} / {totalCount} 메트릭 표시 중
                                                </p>
                                            </div>
                                        </button>

                                        {/* Select All / Deselect All Buttons */}
                                        <div className="flex items-center gap-2 mr-4">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleAllVisibility(testType, true);
                                                }}
                                                disabled={allVisible}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${allVisible
                                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                        : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                                    }`}
                                                title="모두 표시"
                                            >
                                                <Eye className="w-3.5 h-3.5 inline mr-1" />
                                                전체 선택
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleAllVisibility(testType, false);
                                                }}
                                                disabled={noneVisible}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${noneVisible
                                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                                    }`}
                                                title="모두 숨김"
                                            >
                                                <EyeOff className="w-3.5 h-3.5 inline mr-1" />
                                                전체 해제
                                            </button>
                                        </div>

                                        <button onClick={() => toggleType(testType)}>
                                            {isExpanded ? (
                                                <ChevronDown className="w-5 h-5 text-slate-400" />
                                            ) : (
                                                <ChevronRight className="w-5 h-5 text-slate-400" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Metrics List */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-100">
                                            {filteredMetrics.length === 0 ? (
                                                <div className="p-4 text-center text-sm text-slate-400">
                                                    {totalCount === 0 ? '메트릭이 발견되지 않았습니다' : '검색 결과가 없습니다'}
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-slate-100">
                                                    {filteredMetrics.map(config => {
                                                        const isEditing = editingKey === `${testType}:${config.metric_key}`;

                                                        return (
                                                            <div
                                                                key={config.metric_key}
                                                                className={`flex items-center gap-4 p-3 px-4 hover:bg-slate-50 transition-colors ${!config.visible ? 'opacity-50' : ''
                                                                    }`}
                                                            >
                                                                {/* Visibility Toggle */}
                                                                <button
                                                                    onClick={() => toggleVisibility(testType, config.metric_key)}
                                                                    className={`p-1.5 rounded-md transition-colors ${config.visible
                                                                        ? 'bg-indigo-100 text-indigo-600'
                                                                        : 'bg-slate-100 text-slate-400'
                                                                        }`}
                                                                >
                                                                    {config.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                                </button>

                                                                {/* Original Key */}
                                                                <div className="flex-1 min-w-0">
                                                                    <code className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-mono truncate block">
                                                                        {config.metric_key}
                                                                    </code>
                                                                </div>

                                                                {/* Arrow */}
                                                                <span className="text-slate-300">→</span>

                                                                {/* Display Name (Editable) */}
                                                                <div className="flex-1 min-w-0">
                                                                    {isEditing ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <input
                                                                                type="text"
                                                                                value={editValue}
                                                                                onChange={e => setEditValue(e.target.value)}
                                                                                className="flex-1 px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                                autoFocus
                                                                            />
                                                                            <button
                                                                                onClick={() => saveEdit(testType, config.metric_key)}
                                                                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                                            >
                                                                                <Check className="w-4 h-4" />
                                                                            </button>
                                                                            <button
                                                                                onClick={cancelEdit}
                                                                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                                            >
                                                                                <X className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-sm font-medium text-slate-800 truncate">
                                                                                {config.display_name}
                                                                            </span>
                                                                            <button
                                                                                onClick={() => startEdit(testType, config.metric_key)}
                                                                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                                            >
                                                                                <Edit2 className="w-3 h-3" />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Unit */}
                                                                <div className="w-16 text-right">
                                                                    <span className="text-xs text-slate-400 font-medium">
                                                                        {config.unit || '-'}
                                                                    </span>
                                                                </div>

                                                                {/* Edit Button */}
                                                                {!isEditing && (
                                                                    <button
                                                                        onClick={() => startEdit(testType, config.metric_key)}
                                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                                                    >
                                                                        <Edit2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Info */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <h4 className="font-bold text-blue-800 mb-2">💡 사용 방법</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                    <li>• <strong>👁 눈 아이콘</strong>: 대시보드에 표시할 메트릭/Test Type 선택</li>
                    <li>• <strong>✏️ 편집 아이콘</strong>: 표시 이름 변경</li>
                    <li>• <strong>전체 선택/해제</strong>: 해당 장비의 모든 메트릭을 한번에 표시/숨김</li>
                    <li>• 설정 저장 시 모든 대시보드에 즉시 반영됩니다</li>
                </ul>
            </div>
        </div>
    );
}
