'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    Settings, Save, Eye, EyeOff, Search,
    ChevronDown, ChevronRight, Edit2, Check, X, Loader2,
    Zap, Activity, Timer, Scale, Target, Layers, Filter
} from 'lucide-react';

// ============================================
// Types
// ============================================
interface MetricConfig {
    id?: string;
    device: string;
    test_category: string;
    test_position?: string;
    company: string;
    metric_key: string;
    display_name: string;
    unit: string;
    visible: boolean;
    order: number;
}

interface CategoryConfig {
    original_name: string;
    display_name: string;
    visible: boolean;
}

interface PositionConfig {
    original_name: string;
    display_name: string;
    visible: boolean;
}

interface DeviceConfig {
    original_name: string;
    display_name: string;
    visible: boolean;
    categories: Record<string, CategoryConfig>;
    positions: Record<string, PositionConfig>;
}

interface DiscoveredMetric {
    key: string;
    sampleValue: number | string;
    count: number;
}

interface DiscoveredCategory {
    name: string;
    count: number;
    positions: Set<string>;
    metrics: Map<string, DiscoveredMetric>;
}

interface DiscoveredDevice {
    name: string;
    count: number;
    categories: Map<string, DiscoveredCategory>;
}

// ============================================
// Constants
// ============================================
const TEST_TYPE_ICONS: Record<string, any> = {
    ForceDecks: Activity,
    NordBord: Zap,
    ForceFrame: Scale,
    SmartSpeed: Timer,
    DynaMo: Target,
};

const EXCLUDED_TEST_TYPES = ['rehab', 'Unknown'];

// Field mapping per device
const DEVICE_CATEGORY_FIELD: Record<string, string> = {
    ForceDecks: 'testType',
    NordBord: 'testTypeName',
    ForceFrame: 'testTypeName',
    SmartSpeed: 'testName',
    DynaMo: 'movement',
};

const DEVICE_POSITION_FIELD: Record<string, string> = {
    DynaMo: 'position',
};

// ============================================
// Helpers
// ============================================
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
        .filter(w => w.length > 0)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
};

// Default Company Map
const COMPANY_MAP: Record<string, string> = {
    ForceDecks: 'VALD',
    NordBord: 'VALD',
    ForceFrame: 'VALD',
    SmartSpeed: 'VALD',
    DynaMo: 'VALD',
    DynaMoLite: 'VALD',
    Airbands: 'VALD',
    Keiser: 'Keiser',
    Hawkin: 'Hawkin',
};

// ============================================
// Component
// ============================================
export default function HierarchicalMetricSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [measurements, setMeasurements] = useState<any[]>([]);
    const [savedConfigs, setSavedConfigs] = useState<MetricConfig[]>([]);

    // Hierarchical configs
    const [deviceConfigs, setDeviceConfigs] = useState<Record<string, DeviceConfig>>({});
    const [metricConfigs, setMetricConfigs] = useState<Record<string, MetricConfig>>({});

    // UI State
    const [expandedDevices, setExpandedDevices] = useState<Set<string>>(new Set());
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [hasChanges, setHasChanges] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'hierarchy' | 'metrics'>('hierarchy');
    const [activeCompany, setActiveCompany] = useState<string>('VALD'); // Top-level Company Context
    const [selectedDeviceFilter, setSelectedDeviceFilter] = useState<string>('ALL');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
    const [groupDuplicates, setGroupDuplicates] = useState(true);

    // ============================================
    // Data Fetching
    // ============================================
    useEffect(() => {
        const fetchData = async () => {
            try {
                const measurementsRes = await fetch('/api/measurements?period=all');
                const measurementsJson = await measurementsRes.json();
                setMeasurements(measurementsJson.measurements || []);

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

    // ============================================
    // Discover hierarchy from measurements
    // ============================================
    const discoveredHierarchy = useMemo(() => {
        const devices: Map<string, DiscoveredDevice> = new Map();

        measurements.forEach(m => {
            const deviceName = m.test_type || 'Unknown';
            if (EXCLUDED_TEST_TYPES.includes(deviceName)) return;

            const metrics = m.metrics || {};
            const categoryField = DEVICE_CATEGORY_FIELD[deviceName] || 'testTypeName';
            const positionField = DEVICE_POSITION_FIELD[deviceName];

            let categoryName = metrics[categoryField] || 'Unknown';
            let positionName = positionField ? metrics[positionField] || null : null;

            // DynaMo Special Hierarchy: Movement / Type / Body Region / Position
            if (deviceName === 'DynaMo') {
                const mv = metrics.movement || 'Unknown';
                const tc = metrics.testCategory || 'Unknown';
                const br = metrics.bodyRegion || 'Unknown';
                const pos = metrics.position || 'Unknown';

                categoryName = `${mv} (${tc})`;
                positionName = `${br} - ${pos}`;
            }

            // Get or create device
            if (!devices.has(deviceName)) {
                devices.set(deviceName, {
                    name: deviceName,
                    count: 0,
                    categories: new Map()
                });
            }
            const device = devices.get(deviceName)!;
            device.count++;

            // Get or create category
            if (!device.categories.has(categoryName)) {
                device.categories.set(categoryName, {
                    name: categoryName,
                    count: 0,
                    positions: new Set(),
                    metrics: new Map()
                });
            }
            const category = device.categories.get(categoryName)!;
            category.count++;

            // Add position if exists
            if (positionName) {
                category.positions.add(positionName);
            }

            // Discover metrics
            const flattenedMetrics: Record<string, number> = {};

            // 1. Standard flat metrics
            Object.entries(metrics).forEach(([key, value]) => {
                if (typeof value === 'number' && !isNaN(value)) {
                    flattenedMetrics[key] = value;
                }
            });

            // 2. DynaMo special handling
            if (deviceName === 'DynaMo') {
                if (Array.isArray(metrics.asymmetries)) {
                    metrics.asymmetries.forEach((item: any) => {
                        if (item && item.movement && typeof item.valuePercentage === 'number') {
                            flattenedMetrics[`Asymmetry:${item.movement}`] = item.valuePercentage;
                        }
                    });
                }
                if (Array.isArray(metrics.ratios)) {
                    metrics.ratios.forEach((item: any) => {
                        if (item && typeof item.value === 'number') {
                            const k = `Ratio:${item.numeratorMovement}/${item.denominatorMovement}`;
                            flattenedMetrics[k] = item.value;
                        }
                    });
                }

                // Repetition Summaries (Max Force, ROM, etc.)
                if (Array.isArray(metrics.repetitionTypeSummaries)) {
                    metrics.repetitionTypeSummaries.forEach((summary: any) => {
                        if (!summary) return;
                        Object.entries(summary).forEach(([k, v]) => {
                            // Skip non-numeric or ID fields
                            if (typeof v !== 'number' || k.endsWith('Id') || k === 'repCount') return;

                            const lat = summary.laterality?.replace('Side', '') || '';
                            const mov = summary.movement || '';
                            const compositeKey = `${mov} ${lat} ${k}`.trim();

                            flattenedMetrics[compositeKey] = v;
                        });
                    });
                }
            }

            // 3. SmartSpeed special handling
            if (deviceName === 'SmartSpeed') {
                const rs = metrics.runningSummaryFields;
                // Handle both Array (multiple runs?) and Object (single run summary) cases
                const runs = Array.isArray(rs) ? rs : (rs ? [rs] : []);

                runs.forEach((run: any) => {
                    if (!run) return;

                    // Velocity Fields
                    if (run.velocityFields) {
                        Object.entries(run.velocityFields).forEach(([k, v]) => {
                            if (typeof v === 'number') flattenedMetrics[`Velocity:${k}`] = v;
                        });
                    }
                    // Gate Summary Fields
                    if (run.gateSummaryFields) {
                        Object.entries(run.gateSummaryFields).forEach(([k, v]) => {
                            if (typeof v === 'number') flattenedMetrics[`Gate:${k}`] = v;
                        });
                    }
                    // Top level run fields
                    ['bestSplitSeconds', 'totalTimeSeconds', 'splitAverageSeconds'].forEach(k => {
                        if (typeof run[k] === 'number') flattenedMetrics[k] = run[k];
                    });
                });
            }

            // Apply discovered metrics
            Object.entries(flattenedMetrics).forEach(([key, value]) => {
                const existing = category.metrics.get(key);
                if (existing) {
                    existing.count++;
                } else {
                    category.metrics.set(key, {
                        key,
                        sampleValue: value,
                        count: 1
                    });
                }
            });
        });

        return devices;
    }, [measurements]);

    // ============================================
    // Initialize configs from discovered data
    // ============================================
    useEffect(() => {
        if (discoveredHierarchy.size === 0) return;

        const newDeviceConfigs: Record<string, DeviceConfig> = {};
        const newMetricConfigs: Record<string, MetricConfig> = {};

        discoveredHierarchy.forEach((device, deviceName) => {
            const categoryConfigs: Record<string, CategoryConfig> = {};
            const positionConfigs: Record<string, PositionConfig> = {};

            device.categories.forEach((category, categoryName) => {
                categoryConfigs[categoryName] = {
                    original_name: categoryName,
                    display_name: categoryName,
                    visible: true
                };

                category.positions.forEach(posName => {
                    positionConfigs[posName] = {
                        original_name: posName,
                        display_name: cleanKeyName(posName),
                        visible: true
                    };
                });

                // Build metric configs
                category.metrics.forEach((metric, metricKey) => {
                    const configKey = `${deviceName}:${categoryName}:${metricKey}`;
                    const saved = savedConfigs.find(
                        c => c.device === deviceName &&
                            c.test_category === categoryName &&
                            c.metric_key === metricKey
                    );

                    const companyName = saved?.company || COMPANY_MAP[deviceName] || 'Unknown';

                    newMetricConfigs[configKey] = {
                        device: deviceName,
                        test_category: categoryName,
                        metric_key: metricKey,
                        company: companyName,
                        display_name: saved?.display_name || cleanKeyName(metricKey),
                        unit: saved?.unit || guessUnit(metricKey),
                        visible: saved?.visible ?? true,
                        order: saved?.order ?? 0,
                        id: saved?.id
                    };
                });
            });

            newDeviceConfigs[deviceName] = {
                original_name: deviceName,
                display_name: deviceName,
                visible: true,
                categories: categoryConfigs,
                positions: positionConfigs
            };
        });

        setDeviceConfigs(newDeviceConfigs);
        setMetricConfigs(newMetricConfigs);
    }, [discoveredHierarchy, savedConfigs]);

    // ============================================
    // UI Actions
    // ============================================
    const toggleDevice = (deviceName: string) => {
        const newSet = new Set(expandedDevices);
        if (newSet.has(deviceName)) {
            newSet.delete(deviceName);
        } else {
            newSet.add(deviceName);
        }
        setExpandedDevices(newSet);
    };

    const toggleCategory = (key: string) => {
        const newSet = new Set(expandedCategories);
        if (newSet.has(key)) {
            newSet.delete(key);
        } else {
            newSet.add(key);
        }
        setExpandedCategories(newSet);
    };

    const updateDeviceConfig = (deviceName: string, field: keyof DeviceConfig, value: any) => {
        setDeviceConfigs(prev => ({
            ...prev,
            [deviceName]: {
                ...prev[deviceName],
                [field]: value
            }
        }));
        setHasChanges(true);
    };

    const updateCategoryConfig = (deviceName: string, categoryName: string, field: string, value: any) => {
        setDeviceConfigs(prev => ({
            ...prev,
            [deviceName]: {
                ...prev[deviceName],
                categories: {
                    ...prev[deviceName].categories,
                    [categoryName]: {
                        ...prev[deviceName].categories[categoryName],
                        [field]: value
                    }
                }
            }
        }));
        setHasChanges(true);
    };

    const updatePositionConfig = (deviceName: string, positionName: string, field: string, value: any) => {
        setDeviceConfigs(prev => ({
            ...prev,
            [deviceName]: {
                ...prev[deviceName],
                positions: {
                    ...prev[deviceName].positions,
                    [positionName]: {
                        ...prev[deviceName].positions[positionName],
                        [field]: value
                    }
                }
            }
        }));
        setHasChanges(true);
    };

    const updateMetricConfig = (configKey: string, field: keyof MetricConfig, value: any) => {
        setMetricConfigs(prev => ({
            ...prev,
            [configKey]: {
                ...prev[configKey],
                [field]: value
            }
        }));
        setHasChanges(true);
    };

    const toggleAllCategoryVisibility = (deviceName: string, visible: boolean) => {
        setDeviceConfigs(prev => {
            const updated = { ...prev };
            Object.keys(updated[deviceName].categories).forEach(cat => {
                updated[deviceName].categories[cat].visible = visible;
            });
            return updated;
        });
        setHasChanges(true);
    };

    const toggleAllMetricsInCategory = (deviceName: string, categoryName: string, visible: boolean) => {
        setMetricConfigs(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(key => {
                if (key.startsWith(`${deviceName}:${categoryName}:`)) {
                    updated[key].visible = visible;
                }
            });
            return updated;
        });
        setHasChanges(true);
    };

    // Edit handlers
    const startEdit = (key: string, currentValue: string) => {
        setEditingKey(key);
        setEditValue(currentValue);
    };

    const saveEdit = (key: string, type: 'device' | 'category' | 'position' | 'metric', ...args: string[]) => {
        if (type === 'device') {
            updateDeviceConfig(args[0], 'display_name', editValue);
        } else if (type === 'category') {
            updateCategoryConfig(args[0], args[1], 'display_name', editValue);
        } else if (type === 'position') {
            updatePositionConfig(args[0], args[1], 'display_name', editValue);
        } else if (type === 'metric') {
            updateMetricConfig(key, 'display_name', editValue);
        }
        setEditingKey(null);
        setEditValue('');
    };

    const cancelEdit = () => {
        setEditingKey(null);
        setEditValue('');
    };

    // ============================================
    // Save
    // ============================================
    const saveConfigs = async () => {
        setSaving(true);
        setMessage(null);

        try {
            const metricsToSave = Object.values(metricConfigs);

            if (metricsToSave.length === 0) {
                setMessage({ type: 'success', text: '저장할 변경사항이 없습니다.' });
                setHasChanges(false);
                setSaving(false);
                return;
            }

            const res = await fetch('/api/metric-configs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceConfigs,
                    metricConfigs: metricsToSave
                })
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || 'Failed to save');
            }

            setMessage({
                type: 'success',
                text: result.message || `${result.count || metricsToSave.length}개의 설정이 저장되었습니다.`
            });
            setHasChanges(false);
        } catch (e: any) {
            console.error('Save error:', e);
            setMessage({
                type: 'error',
                text: `저장 중 오류: ${e.message || '알 수 없는 오류'}`
            });
        } finally {
            setSaving(false);
        }
    };

    // ============================================
    // Filter
    // ============================================
    const filterMetrics = (deviceName: string, categoryName: string) => {
        const prefix = `${deviceName}:${categoryName}:`;
        const filtered = Object.entries(metricConfigs)
            .filter(([key]) => key.startsWith(prefix))
            .map(([key, config]) => ({ key, ...config }));

        if (!searchQuery) return filtered;

        const q = searchQuery.toLowerCase();
        return filtered.filter(m =>
            m.metric_key.toLowerCase().includes(q) ||
            m.display_name.toLowerCase().includes(q)
        );
    };

    // ============================================
    // Render
    // ============================================
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <span className="ml-3 text-slate-500">계층 구조 분석 중...</span>
            </div>
        );
    }

    if (Object.keys(deviceConfigs).length === 0) {
        return (
            <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                    <h3 className="font-bold text-amber-800">데이터 동기화 필요</h3>
                    <p className="text-sm text-amber-700 mt-2">
                        메트릭 계층 구조를 분석하려면 먼저 데이터 동기화가 필요합니다.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <Layers className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">계층적 메트릭 설정</h2>
                            <p className="text-sm text-slate-500">Device → Test Category → Position → Metric 구조로 관리합니다</p>
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

                {/* Top Level: Company Tabs */}
                <div className="flex p-1 bg-slate-100 rounded-lg w-fit">
                    {['VALD'].map(company => (
                        <button
                            key={company}
                            onClick={() => {
                                setActiveCompany(company);
                                setSelectedDeviceFilter('ALL');
                            }}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeCompany === company
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {company === 'VALD' ? 'VALD Performance' : company}
                        </button>
                    ))}
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Sub Tabs: Hierarchy vs Metrics */}
            <div className="flex gap-2 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('hierarchy')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'hierarchy'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    계층 구조 설정
                </button>
                <button
                    onClick={() => setActiveTab('metrics')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'metrics'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    메트릭 설정
                </button>
            </div>

            {activeTab === 'hierarchy' ? (
                /* Hierarchy Tab */
                <div className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Device, Category, Position 검색..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Device List (Filtered by Active Company) */}
                    <div className="space-y-3">
                        {Object.entries(deviceConfigs)
                            .filter(([name]) => !EXCLUDED_TEST_TYPES.includes(name))
                            .filter(([name]) => {
                                const company = COMPANY_MAP[name] || 'Unknown';
                                return company === activeCompany;
                            })
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([deviceName, deviceConfig]) => {
                                const Icon = TEST_TYPE_ICONS[deviceName] || Activity;
                                const isExpanded = expandedDevices.has(deviceName);
                                const categoryCount = Object.keys(deviceConfig.categories).length;
                                const visibleCategories = Object.values(deviceConfig.categories).filter(c => c.visible).length;
                                const isEditingDevice = editingKey === `device:${deviceName}`;

                                return (
                                    <div key={deviceName} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                                        {/* Device Header */}
                                        <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                            <div
                                                onClick={() => toggleDevice(deviceName)}
                                                className="flex items-center gap-3 flex-1 cursor-pointer"
                                            >
                                                <div className="p-2 bg-slate-100 rounded-lg">
                                                    <Icon className="w-5 h-5 text-slate-600" />
                                                </div>
                                                <div className="text-left">
                                                    {isEditingDevice ? (
                                                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                            <input
                                                                value={editValue}
                                                                onChange={e => setEditValue(e.target.value)}
                                                                className="px-2 py-1 border border-indigo-300 rounded text-sm"
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={() => saveEdit(`device:${deviceName}`, 'device', deviceName)}
                                                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={cancelEdit} className="p-1 text-red-600 hover:bg-red-50 rounded">
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-bold text-slate-800">{deviceConfig.display_name}</h3>
                                                            {deviceConfig.display_name !== deviceName && (
                                                                <code className="text-xs bg-slate-100 px-1 py-0.5 rounded text-slate-500">
                                                                    {deviceName}
                                                                </code>
                                                            )}
                                                            <button
                                                                onClick={e => {
                                                                    e.stopPropagation();
                                                                    startEdit(`device:${deviceName}`, deviceConfig.display_name);
                                                                }}
                                                                className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                                                            >
                                                                <Edit2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    )}
                                                    <p className="text-xs text-slate-500">
                                                        {visibleCategories} / {categoryCount} Test Category 표시 중
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Device Actions */}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => toggleAllCategoryVisibility(deviceName, true)}
                                                    className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                                                >
                                                    전체 선택
                                                </button>
                                                <button
                                                    onClick={() => toggleAllCategoryVisibility(deviceName, false)}
                                                    className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                                                >
                                                    전체 해제
                                                </button>
                                                <button
                                                    onClick={() => updateDeviceConfig(deviceName, 'visible', !deviceConfig.visible)}
                                                    className={`p-2 rounded-lg ${deviceConfig.visible
                                                        ? 'bg-indigo-100 text-indigo-600'
                                                        : 'bg-slate-100 text-slate-400'
                                                        }`}
                                                >
                                                    {deviceConfig.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                </button>
                                                <button onClick={() => toggleDevice(deviceName)}>
                                                    {isExpanded ? (
                                                        <ChevronDown className="w-5 h-5 text-slate-400" />
                                                    ) : (
                                                        <ChevronRight className="w-5 h-5 text-slate-400" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Categories List */}
                                        {isExpanded && (
                                            <div className="border-t border-slate-100 bg-slate-50/50">
                                                {Object.entries(deviceConfig.categories)
                                                    .sort(([a], [b]) => a.localeCompare(b))
                                                    .map(([categoryName, categoryConfig]) => {
                                                        const catKey = `${deviceName}:${categoryName}`;
                                                        const isCatExpanded = expandedCategories.has(catKey);
                                                        const isEditingCat = editingKey === `category:${catKey}`;
                                                        const metrics = filterMetrics(deviceName, categoryName);
                                                        const visibleMetrics = metrics.filter(m => m.visible).length;
                                                        const positions = Object.keys(deviceConfig.positions);

                                                        return (
                                                            <div key={categoryName} className="border-b border-slate-100 last:border-b-0">
                                                                {/* Category Header */}
                                                                <div className={`flex items-center justify-between px-6 py-3 hover:bg-slate-100 ${!categoryConfig.visible ? 'opacity-50' : ''
                                                                    }`}>
                                                                    <div
                                                                        onClick={() => toggleCategory(catKey)}
                                                                        className="flex items-center gap-3 flex-1 cursor-pointer"
                                                                    >
                                                                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                                                                            <Filter className="w-4 h-4 text-slate-500" />
                                                                        </div>
                                                                        <div className="text-left">
                                                                            {isEditingCat ? (
                                                                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                                                    <input
                                                                                        value={editValue}
                                                                                        onChange={e => setEditValue(e.target.value)}
                                                                                        className="px-2 py-1 border border-indigo-300 rounded text-sm"
                                                                                        autoFocus
                                                                                    />
                                                                                    <button
                                                                                        onClick={() => saveEdit(`category:${catKey}`, 'category', deviceName, categoryName)}
                                                                                        className="p-1 text-green-600"
                                                                                    >
                                                                                        <Check className="w-4 h-4" />
                                                                                    </button>
                                                                                    <button onClick={cancelEdit} className="p-1 text-red-600">
                                                                                        <X className="w-4 h-4" />
                                                                                    </button>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="font-medium text-slate-700">
                                                                                        {categoryConfig.display_name}
                                                                                    </span>
                                                                                    {categoryConfig.display_name !== categoryName && (
                                                                                        <code className="text-xs bg-white px-1 rounded text-slate-500">
                                                                                            {categoryName}
                                                                                        </code>
                                                                                    )}
                                                                                    <button
                                                                                        onClick={e => {
                                                                                            e.stopPropagation();
                                                                                            startEdit(`category:${catKey}`, categoryConfig.display_name);
                                                                                        }}
                                                                                        className="p-1 text-slate-400 hover:text-indigo-600"
                                                                                    >
                                                                                        <Edit2 className="w-3 h-3" />
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                            <p className="text-xs text-slate-500">
                                                                                {visibleMetrics} / {metrics.length} 메트릭
                                                                                {positions.length > 0 && ` · ${positions.length} 포지션`}
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={() => toggleAllMetricsInCategory(deviceName, categoryName, true)}
                                                                            className="px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded"
                                                                        >
                                                                            전체 선택
                                                                        </button>
                                                                        <button
                                                                            onClick={() => toggleAllMetricsInCategory(deviceName, categoryName, false)}
                                                                            className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded"
                                                                        >
                                                                            전체 해제
                                                                        </button>
                                                                        <button
                                                                            onClick={() => updateCategoryConfig(deviceName, categoryName, 'visible', !categoryConfig.visible)}
                                                                            className={`p-1.5 rounded ${categoryConfig.visible
                                                                                ? 'bg-indigo-100 text-indigo-600'
                                                                                : 'bg-slate-100 text-slate-400'
                                                                                }`}
                                                                        >
                                                                            {categoryConfig.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                                        </button>
                                                                        <button onClick={() => toggleCategory(catKey)}>
                                                                            {isCatExpanded ? (
                                                                                <ChevronDown className="w-4 h-4 text-slate-400" />
                                                                            ) : (
                                                                                <ChevronRight className="w-4 h-4 text-slate-400" />
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* Positions (if DynaMo) */}
                                                                {isCatExpanded && positions.length > 0 && (
                                                                    <div className="px-8 py-2 bg-slate-100/50">
                                                                        <div className="text-xs font-medium text-slate-500 mb-2">Positions:</div>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {positions.map(posName => {
                                                                                const posConfig = deviceConfig.positions[posName];
                                                                                return (
                                                                                    <button
                                                                                        key={posName}
                                                                                        onClick={() => updatePositionConfig(deviceName, posName, 'visible', !posConfig?.visible)}
                                                                                        className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${posConfig?.visible
                                                                                            ? 'bg-white border-indigo-200 text-indigo-700'
                                                                                            : 'bg-slate-200 border-slate-300 text-slate-500'
                                                                                            }`}
                                                                                    >
                                                                                        {posConfig?.display_name || posName}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Metrics Preview */}
                                                                {isCatExpanded && (
                                                                    <div className="px-8 py-3 bg-white border-t border-slate-100">
                                                                        <div className="text-xs font-medium text-slate-500 mb-2">메트릭 ({metrics.length}개):</div>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {metrics.slice(0, 10).map(metric => (
                                                                                <button
                                                                                    key={metric.key}
                                                                                    onClick={() => updateMetricConfig(metric.key, 'visible', !metric.visible)}
                                                                                    className={`px-2 py-1 text-xs rounded border ${metric.visible
                                                                                        ? 'bg-green-50 border-green-200 text-green-700'
                                                                                        : 'bg-slate-100 border-slate-200 text-slate-400'
                                                                                        }`}
                                                                                >
                                                                                    {metric.display_name}
                                                                                </button>
                                                                            ))}
                                                                            {metrics.length > 10 && (
                                                                                <span className="px-2 py-1 text-xs text-slate-400">
                                                                                    +{metrics.length - 10} more
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                </div>
            ) : (
                /* Metrics Tab - Full list */
                <div className="space-y-4">
                    <div className="flex gap-2">
                        {/* Device Filter */}
                        <div className="relative min-w-[140px]">
                            <select
                                value={selectedDeviceFilter}
                                onChange={(e) => setSelectedDeviceFilter(e.target.value)}
                                className="w-full pl-3 pr-8 py-2.5 border border-slate-200 rounded-lg text-sm bg-white appearance-none cursor-pointer hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-colors"
                            >
                                <option value="ALL">All Devices</option>
                                {Array.from(new Set(Object.values(metricConfigs)
                                    .filter(c => c.company === activeCompany)
                                    .map(c => c.device)
                                )).sort().map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>


                        {/* Category Filter */}
                        <div className="relative min-w-[140px]">
                            <select
                                value={selectedCategoryFilter}
                                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                                disabled={selectedDeviceFilter === 'ALL'}
                                className={`w-full pl-3 pr-8 py-2.5 border border-slate-200 rounded-lg text-sm appearance-none transition-colors ${selectedDeviceFilter === 'ALL'
                                    ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                                    : 'bg-white cursor-pointer hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100'
                                    }`}
                            >
                                <option value="ALL">All Categories</option>
                                {selectedDeviceFilter !== 'ALL' && deviceConfigs[selectedDeviceFilter] &&
                                    Object.keys(deviceConfigs[selectedDeviceFilter].categories).sort().map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))
                                }
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>

                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="메트릭 검색..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm"
                            />
                        </div>
                    </div>

                    {/* Select All / Deselect All buttons for metrics */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    const newConfigs = { ...metricConfigs };
                                    Object.keys(newConfigs).forEach(key => {
                                        newConfigs[key] = { ...newConfigs[key], visible: true };
                                    });
                                    setMetricConfigs(newConfigs);
                                }}
                                className="px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors flex items-center gap-1.5"
                            >
                                <Eye className="w-4 h-4" />
                                전체 선택
                            </button>
                            <button
                                onClick={() => {
                                    const newConfigs = { ...metricConfigs };
                                    Object.keys(newConfigs).forEach(key => {
                                        newConfigs[key] = { ...newConfigs[key], visible: false };
                                    });
                                    setMetricConfigs(newConfigs);
                                }}
                                className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                            >
                                <EyeOff className="w-4 h-4" />
                                전체 해제
                            </button>
                        </div>
                        <div className="text-sm text-slate-500">
                            <span className="font-medium text-indigo-600">
                                {Object.values(metricConfigs).filter(c => c.visible).length}
                            </span>
                            <span className="mx-1">/</span>
                            <span>{Object.keys(metricConfigs).length}</span>
                            <span className="ml-1">메트릭 표시 중</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={groupDuplicates}
                                onChange={e => setGroupDuplicates(e.target.checked)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>유사한 메트릭 묶어보기 (중복 제거)</span>
                        </label>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                        <div className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-4 p-3 bg-slate-50 border-b text-xs font-medium text-slate-500">
                            <div>표시</div>
                            <div>Device / Category</div>
                            <div>표시 이름</div>
                            <div>원본 키</div>
                            <div>단위</div>
                            <div>수정</div>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                        {(() => {
                            // 1. Filter
                            let filtered = Object.entries(metricConfigs).filter(([key, config]) => {
                                if (selectedDeviceFilter !== 'ALL' && config.device !== selectedDeviceFilter) return false;
                                if (selectedCategoryFilter !== 'ALL' && config.test_category !== selectedCategoryFilter) return false;
                                if (!searchQuery) return true;
                                const q = searchQuery.toLowerCase();
                                return key.toLowerCase().includes(q) ||
                                    config.display_name.toLowerCase().includes(q);
                            });

                            // 2. Group Duplicates Logic
                            let displayList: { key: string; config: MetricConfig; isGrouped?: boolean; subItems?: string[] }[] = [];

                            if (groupDuplicates) {
                                const groups: Record<string, typeof filtered> = {};
                                const processed = new Set<string>();

                                // Helper to normalize key for grouping
                                const normalize = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');

                                filtered.forEach(([key, config]) => {
                                    if (processed.has(key)) return;

                                    const norm = normalize(config.metric_key);
                                    // Find all matching items in the filtered list
                                    const matches = filtered.filter(([k, c]) =>
                                        c.device === config.device &&
                                        c.test_category === config.test_category &&
                                        normalize(c.metric_key) === norm
                                    );

                                    if (matches.length > 1) {
                                        // Pick the "best" one as primary (shortest, or preferred casing)
                                        // Prefer CamelCase without brackets/spaces if possible
                                        const best = matches.sort((a, b) => {
                                            const aClean = a[1].metric_key.length;
                                            const bClean = b[1].metric_key.length;
                                            return aClean - bClean; // Shortest first usually cleaner?
                                        })[0];

                                        displayList.push({
                                            key: best[0],
                                            config: best[1],
                                            isGrouped: true,
                                            subItems: matches.map(m => m[0]).filter(k => k !== best[0])
                                        });
                                        matches.forEach(m => processed.add(m[0]));
                                    } else {
                                        displayList.push({ key, config });
                                        processed.add(key);
                                    }
                                });
                            } else {
                                displayList = filtered.map(([key, config]) => ({ key, config }));
                            }

                            return displayList
                                .slice(0, 500)
                                .map(({ key, config, isGrouped, subItems }) => {
                                    const isEditingMetric = editingKey === `metric:${key}`;

                                    return (
                                        <div key={key} className={`flex flex-col border-b border-slate-50 last:border-0 ${!config.visible ? 'bg-slate-50/50' : ''}`}>
                                            <div className={`grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-4 p-3 items-center ${!config.visible ? 'opacity-50' : ''}`}>
                                                <button
                                                    onClick={() => updateMetricConfig(key, 'visible', !config.visible)}
                                                    className={`p-1.5 rounded ${config.visible
                                                        ? 'bg-indigo-100 text-indigo-600'
                                                        : 'bg-slate-100 text-slate-400'
                                                        }`}
                                                >
                                                    {config.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                </button>
                                                <div className="text-xs">
                                                    <span className="font-medium text-slate-800">{config.device}</span>
                                                    <span className="text-slate-400 mx-1">›</span>
                                                    <span className="text-slate-600">{config.test_category}</span>
                                                </div>
                                                {isEditingMetric ? (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            value={editValue}
                                                            onChange={e => setEditValue(e.target.value)}
                                                            className="flex-1 px-2 py-1 text-sm border border-indigo-300 rounded"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => saveEdit(key, 'metric')}
                                                            className="p-1 text-green-600"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={cancelEdit} className="p-1 text-red-600">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-slate-800">{config.display_name}</span>
                                                        {isGrouped && (
                                                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                                                                +{subItems!.length} variants
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                <code className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 max-w-[200px] truncate">
                                                    {config.metric_key}
                                                </code>
                                                <span className="text-xs text-slate-400">{config.unit || '-'}</span>
                                                {!isEditingMetric && (
                                                    <button
                                                        onClick={() => startEdit(`metric:${key}`, config.display_name)}
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                            {/* Variants */}
                                            {isGrouped && subItems && (
                                                <div className="pl-12 pr-4 pb-2 text-xs text-slate-400 space-y-1">
                                                    {subItems.map(subKey => (
                                                        <div key={subKey} className="flex items-center gap-2">
                                                            <span className="w-4 h-px bg-slate-200"></span>
                                                            <span>{metricConfigs[subKey].metric_key}</span>
                                                            {/* Only show "Include" toggle if we want fine-grained control, but simpler to just list them for now */}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                });
                        })()}
                    </div>
                    {/* Info */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <h4 className="font-bold text-blue-800 mb-2">💡 사용 방법</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                            <li>• <strong>Device</strong>: ForceDecks, NordBord, ForceFrame, SmartSpeed, DynaMo</li>
                            <li>• <strong>Test Category</strong>: CMJ, Nordic, Hip AD/AB, 30m Sprint 등</li>
                            <li>• <strong>Position</strong>: Prone, Seated, Standing (DynaMo 전용)</li>
                            <li>• <strong>Metric</strong>: LeftMaxForce, JumpHeight, PeakPower 등</li>
                            <li>• 예: "Hamstring ISO Prone 값의 좌우 맥스 평균" → NordBord › ISO Prone › LeftMaxForce, RightMaxForce</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
