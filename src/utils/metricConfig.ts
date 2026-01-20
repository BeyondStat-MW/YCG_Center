
// Metric Configuration
// Maps raw API keys to clean display names
// Only metrics listed here will appear in dropdowns

export const METRIC_CONFIG: Record<string, string> = {
    // ==========================================
    // ForceDecks - CMJ (Counter Movement Jump)
    // ==========================================
    'Jump Height (Imp-Mom)': 'CMJ Height (cm)',
    'JumpHeight(Imp-Mom)': 'CMJ Height (cm)',
    'jumpHeightImpulseMomentum_cm_': 'CMJ Height (cm)',
    'RSI-modified': 'RSI-modified',
    'RSI-modified(Imp-Mom)': 'RSI-mod (Imp-Mom)',
    'Peak Power / BM': 'Rel. Peak Power (W/kg)',
    'Peak Power': 'Peak Power (W)',
    'PeakPower': 'Peak Power (W)',
    'PeakPower/BM': 'Rel. Peak Power (W/kg)',
    'Concentric Peak Force': 'Conc. Peak Force (N)',
    'ConcentricPeakForce': 'Conc. Peak Force (N)',
    'Concentric Impulse': 'Conc. Impulse (Ns)',
    'ConcentricImpulse': 'Conc. Impulse (Ns)',
    'Eccentric Peak Force': 'Ecc. Peak Force (N)',
    'EccentricPeakForce': 'Ecc. Peak Force (N)',
    'Eccentric Duration': 'Ecc. Duration (s)',
    'EccentricDuration': 'Ecc. Duration (s)',
    'Contraction Time': 'Contraction Time (s)',
    'ContractionTime': 'Contraction Time (s)',
    'Flight Time': 'Flight Time (s)',
    'FlightTime': 'Flight Time (s)',
    'Countermovement Depth': 'Countermovement Depth (cm)',
    'CountermovementDepth': 'Countermovement Depth (cm)',
    'Lower-Limb Stiffness': 'Leg Stiffness (N/m)',
    'Lower-LimbStiffness': 'Leg Stiffness (N/m)',

    // ==========================================
    // ForceDecks - SJ (Squat Jump)
    // ==========================================
    // SJ shares many keys with CMJ, but testType filters them

    // ==========================================
    // ForceDecks - Drop Jump / Hop Test
    // ==========================================
    'RSI': 'RSI',
    'Contact Time': 'Contact Time (s)',
    'ContactTime': 'Contact Time (s)',

    // ==========================================
    // SmartSpeed (Sprint Timing)
    // ==========================================
    'runningSummaryFields_totalTimeSeconds': 'Sprint Time (s)',
    'runningSummaryFields_velocityFields_peakVelocityMetersPerSecond': 'Peak Velocity (m/s)',
    'runningSummaryFields_velocityFields_meanVelocityMetersPerSecond': 'Mean Velocity (m/s)',
    'runningSummaryFields_gateSummaryFields_cumulativeOne': 'Split 10m (s)',
    'runningSummaryFields_gateSummaryFields_cumulativeTwo': 'Split 20m (s)',
    'runningSummaryFields_gateSummaryFields_cumulativeThree': 'Split 30m (s)',
    'runningSummaryFields_gateSummaryFields_cumulativeFour': 'Split 40m (s)',

    // ==========================================
    // NordBord (Hamstring Strength)
    // ==========================================
    'leftMaxForce': 'Left Max Force (N)',
    'rightMaxForce': 'Right Max Force (N)',
    'leftTorque': 'Left Torque (Nm)',
    'rightTorque': 'Right Torque (Nm)',
    'leftAvgForce': 'Left Avg Force (N)',
    'rightAvgForce': 'Right Avg Force (N)',

    // ==========================================
    // ForceFrame (Hip Strength)
    // ==========================================
    'innerLeftMaxForce': 'Add Left Max (N)',
    'innerRightMaxForce': 'Add Right Max (N)',
    'outerLeftMaxForce': 'Abd Left Max (N)',
    'outerRightMaxForce': 'Abd Right Max (N)',
    'innerLeftImpulse': 'Add Left Impulse (Ns)',
    'innerRightImpulse': 'Add Right Impulse (Ns)',

    // ==========================================
    // DynaMo (Isometric Strength)
    // ==========================================
    'peakForce': 'Peak Force (N)',
    'averageForce': 'Avg Force (N)',
};

// Metrics where LOWER is better (e.g., sprint times)
export const REVERSE_METRICS = [
    'runningSummaryFields_totalTimeSeconds',
    'runningSummaryFields_gateSummaryFields_cumulativeOne',
    'runningSummaryFields_gateSummaryFields_cumulativeTwo',
    'runningSummaryFields_gateSummaryFields_cumulativeThree',
    'runningSummaryFields_gateSummaryFields_cumulativeFour',
    'Contraction Time',
    'ContractionTime',
    'Eccentric Duration',
    'EccentricDuration',
    'Contact Time',
    'ContactTime'
];

// Key metrics for Physical Report Tiering
export const TIER_METRICS = {
    POWER: [
        'Jump Height (Imp-Mom)', 'JumpHeight(Imp-Mom)', 'jumpHeightImpulseMomentum_cm_',
        'Peak Power / BM', 'PeakPower/BM', 'RSI-modified', 'RSI-modified(Imp-Mom)'
    ],
    STRENGTH: [
        'leftMaxForce', 'rightMaxForce',
        'innerLeftMaxForce', 'innerRightMaxForce',
        'outerLeftMaxForce', 'outerRightMaxForce'
    ],
    SPEED: [
        'runningSummaryFields_gateSummaryFields_cumulativeOne', // 10m
        'runningSummaryFields_gateSummaryFields_cumulativeTwo', // 20m
        'runningSummaryFields_velocityFields_peakVelocityMetersPerSecond'
    ]
};
