const measurements = [
    {
        "id": 999120,
        "player_id": "795e81da-df7e-41f9-a907-41bcf6f77768",
        "test_type": "ForceDecks",
        "recorded_at": "2024-08-26T09:30:08.361Z",
        "metrics": {
            "device": "ForceDecks-FD Lite(V.2)-8014",
            "testType": "CMJ (Counter Movement Jump)",
            "Jump Height (Flight Time)": 9.33789213,
            "RSI-modified": 0.44
        }
    },
    {
        "id": 228846,
        "test_type": "NordBord",
        "metrics": {
            "testTypeName": "Nordic",
            "leftMaxForce": 249.25,
            "rightMaxForce": 314
        }
    }
];

const checkTestNameStr = (m, targets) => {
    const typeLower = m.test_type?.toLowerCase() || '';
    if (targets.some(t => typeLower === t.toLowerCase() || typeLower.includes(t.toLowerCase()))) return true;
    const subName = m.metrics?.testTypeName || m.metrics?.test_name || m.metrics?.testType;
    if (!subName) return false;
    const subLower = subName.toLowerCase();
    return targets.some(t => subLower === t.toLowerCase() || subLower.includes(t.toLowerCase()));
};

const extractMetricValue = (m, type) => {
    if (!m || !m.metrics) return 0;
    const res = m.metrics.results || {};
    const met = m.metrics;

    try {
        switch (type) {
            case 'cmj_height':
                const heightFields = [
                    met['Jump Height (Imp-Mom)'], met['JumpHeight(Imp-Mom)'],
                    res['Jump Height (Imp-Mom)'], res['JumpHeight(Imp-Mom)'],
                    met['Jump Height (Flight Time)'], met['JumpHeight(FlightTime)'],
                    res['Jump Height (Flight Time)'], res['JumpHeight(FlightTime)'],
                    met.jumpHeight, met['Jump Height'], res.jumpHeight, res['Jump Height']
                ];
                for (const val of heightFields) if (typeof val === 'number' && val > 0) return val;
                return 0;
            case 'nord_avg':
                if (typeof met.leftMaxForce === 'number' && typeof met.rightMaxForce === 'number') return (met.leftMaxForce + met.rightMaxForce) / 2;
                return 0;
            default: return 0;
        }
    } catch (e) { return 0; }
};

const categories = [
    { id: 'cmj', label: 'CMJ 높이', dev: 'ForceDecks', filter: (m) => checkTestNameStr(m, ['CMJ', 'Countermovement Jump']), type: 'cmj_height' },
    { id: 'nord', label: 'Hamstring Eccentric', dev: 'NordBord', filter: (m) => checkTestNameStr(m, ['Nordic', 'NordBord']), type: 'nord_avg' }
];

categories.forEach(cat => {
    const filtered = measurements.filter(m => (m.test_type === cat.dev || cat.dev === 'ForceDecks') && cat.filter(m));
    console.log(`Category: ${cat.id}, Count: ${filtered.length}`);
    filtered.forEach(m => {
        const val = extractMetricValue(m, cat.type);
        console.log(`  Value: ${val}`);
    });
});
