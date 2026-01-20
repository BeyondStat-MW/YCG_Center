
/**
 * Football Scientist Analytics Utility
 * Ported from Streamlit backend for Next.js
 */

// --- 1. Eccentric Utilization Ratio (EUR) ---
// Formula: CMJ / SJ
export function calculateEUR(cmj: number, sj: number): { value: number; status: string; color: string } {
    if (!sj || sj === 0) return { value: 0, status: "N/A", color: "#888888" };

    const eur = cmj / sj;
    let status = "Elastic (< 1.1)";
    let color = "#3b82f6"; // Blue (Elastic dominant, needs strength?) or just a category.

    // Python logic:
    // > 1.15 : Strength (> 1.15)  [Actually means Good Recoil, maybe "High Reactive"]
    // 1.1 - 1.15 : Optimal
    // < 1.1 : Elastic (< 1.1)    [Actually means Poor Recoil, "Low Reactive"]

    // In strict sci terms: 
    // High EUR (>1.1-1.2) = Good SSC usage.
    // Low EUR (<1.0-1.1) = Poor SSC, relies on concentric.

    if (eur > 1.15) {
        status = "High Reactive (>1.15)";
        color = "#10b981"; // Green (Good) - *Adjusting from python's Red/Strength label to match 'Good' usually*
        // Wait, python said: >1.15 is Strength (>1.15) with Red color.
        // Maybe for Footballers, too high EUR means they lack concentric grunt?
        // Let's stick to Python colors to maintain client consistency for now, but rename for clarity if needed.
        // Python: >1.15 Red. 1.1-1.15 Green. <1.1 Blue.
        status = "High Reactive";
        color = "#ef4444"; // Red 
    } else if (eur >= 1.1) {
        status = "Optimal";
        color = "#10b981"; // Green
    } else {
        status = "Low Reactive";
        color = "#3b82f6"; // Blue
    }

    return { value: parseFloat(eur.toFixed(2)), status, color };
}

// --- 2. Limb Asymmetry ---
// Formula: (R - L) / Max(R, L) * 100
export function calculateAsymmetry(left: number, right: number): { value: number; status: string; color: string } {
    const maxVal = Math.max(left, right);
    if (maxVal === 0) return { value: 0, status: "N/A", color: "#888888" };

    const asym = ((right - left) / maxVal) * 100;
    const absAsym = Math.abs(asym);

    let status = "Balanced";
    let color = "#10b981"; // Green

    if (absAsym > 15) {
        status = "High Risk";
        color = "#ef4444"; // Red
    } else if (absAsym > 10) {
        status = "Imbalance";
        color = "#f59e0b"; // Orange
    }

    return { value: parseFloat(asym.toFixed(1)), status, color };
}

// --- 3. Groin Risk (Add/Abd Ratio) ---
// Formula: Adductor / Abductor
export function calculateGroinRisk(adductor: number, abductor: number): { value: number; status: string; color: string } {
    if (!abductor || abductor === 0) return { value: 0, status: "N/A", color: "#888888" };

    const ratio = adductor / abductor;

    // Risk if < 0.8 (Adductors too weak compared to glutes/abductors usually?)
    // Or > X?
    // Python code: if < 0.8: High Risk (Red).

    let status = "Optimal";
    let color = "#10b981";

    if (ratio < 0.80) {
        status = "High Risk (<0.8)";
        color = "#ef4444";
    }

    return { value: parseFloat(ratio.toFixed(2)), status, color };
}

// --- 4. Workload Management (ACWR) ---
// Formula: Acute Load (7-day avg) / Chronic Load (28-day avg)
export function calculateACWR(dailyLoads: number[]): { acute: number; chronic: number; ratio: number; status: string; color: string } {
    if (dailyLoads.length < 28) {
        // Not enough data, return partial
        return { acute: 0, chronic: 0, ratio: 0, status: "Insufficient Data", color: "#9ca3af" };
    }

    const acuteWindow = dailyLoads.slice(-7);
    const chronicWindow = dailyLoads.slice(-28);

    const acuteLoad = acuteWindow.reduce((a, b) => a + b, 0) / 7;
    const chronicLoad = chronicWindow.reduce((a, b) => a + b, 0) / 28;

    if (chronicLoad === 0) return { acute: acuteLoad, chronic: 0, ratio: 0, status: "N/A", color: "#9ca3af" };

    const ratio = acuteLoad / chronicLoad;

    // Gabbett's "Sweet Spot": 0.8 - 1.3
    // Danger Zone: > 1.5
    let status = "Optimal";
    let color = "#10b981"; // Green

    if (ratio > 1.5) {
        status = "Danger Zone (>1.5)";
        color = "#ef4444"; // Red
    } else if (ratio < 0.8) {
        status = "Undertraining (<0.8)";
        color = "#3b82f6"; // Blue
    } else if (ratio > 1.3) {
        status = "High Load (1.3-1.5)";
        color = "#f59e0b"; // Orange
    }

    return {
        acute: Math.round(acuteLoad),
        chronic: Math.round(chronicLoad),
        ratio: parseFloat(ratio.toFixed(2)),
        status,
        color
    };
}
