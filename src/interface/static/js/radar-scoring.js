/**
 * Radar Chart Scoring Module
 * 
 * This module implements the radar chart scoring behavior for supplier comparison.
 * 
 * Radar Chart Axes (0-10 scale):
 * 1. Ecobalyse impact - Percentage difference from best (lower is better, 5 = best/0%)
 * 2. Traceability - Based on traceable production steps (1-9, absolute, not relative)
 * 3. Price - Percentage difference from best (lower is better, 5 = best/0%)
 * 4. Lead Time - Percentage difference from best (lower is better, 5 = best/0%)
 * 5. Minimum Order Quantity - Percentage difference from best (lower is better, 5 = best/0%)
 * 
 * Percentage Difference Calculation (for Ecobalyse, Price, Lead Time, MOQ):
 * - Best value (minimum) = 0% difference = score 5 (center)
 * - Other values = positive % difference = lower score (toward 0)
 * - Uses square root scale to show spread for high percentages (e.g., 300% MOQ)
 * - Maps 0-300% range to 5-0 score range: score = 5 * (1 - sqrt(diffPercent / 300))
 * - This compresses high percentages while maintaining visual differences
 * - Tooltip shows context-specific wording:
 *   - Ecobalyse: "X% worse" or "best"
 *   - Price: "X% more expensive" or "best"
 *   - Lead Time: "X% longer" or "best"
 *   - MOQ: "X% higher" or "best"
 * 
 * Traceability Calculation (absolute, not relative):
 * - Counts traceable production steps: fibre, spinning, weaving/knitting, dyeing/finishing, making
 * - Score = (known steps / 5 total steps) × 10, then scaled to 1-9 range
 * - Tooltip shows: "X/5 steps traceable"
 * 
 * Single Supplier Behavior:
 * - If only one supplier, all axes score 5 to avoid misleading "ideal" shape
 * 
 * Usage:
 *   const chartData = await loadRadarChartData();
 *   // Use chartData with Chart.js or other radar chart library
 */

/**
 * Calculate traceability score based on traceable production steps
 * Steps: fibre (material_origin), spinning, weaving/knitting, dyeing/finishing, making
 * Score = (known steps / total steps) × 10
 */
function calculateTransparencyScore(supplier) {
  const totalSteps = 5;
  let knownSteps = 0;
  const unknownValues = ['pays inconnu', '---'];
  
  // Helper function to check if a value is unknown (case-insensitive)
  // Handles "Pays inconnu", "Pays inconnu (par défaut)", "---", etc.
  const isUnknown = (value) => {
    if (!value) return true;
    const normalized = String(value).trim().toLowerCase();
    if (normalized === '') return true;
    // Check if it contains "pays inconnu" (handles "Pays inconnu (par défaut)")
    if (normalized.includes('pays inconnu')) return true;
    // Check for exact matches
    return unknownValues.includes(normalized);
  };
  
  // Step 1: Fibre/Material origin
  if (supplier.material_origin && supplier.material_origin.length > 0) {
    knownSteps++;
  }
  
  // Step 2: Spinning (only count if not unknown)
  if (supplier.countrySpinning && !isUnknown(supplier.countrySpinning)) {
    knownSteps++;
  }
  
  // Step 3: Weaving/Knitting (fabric) - only count if countryFabric is not unknown
  // If countryFabric is "Pays Inconnu", don't count this step regardless of fabricProcess
  if (supplier.countryFabric && !isUnknown(supplier.countryFabric)) {
    knownSteps++;
  }
  
  // Step 4: Dyeing/Finishing - only count if countryDyeing is not unknown
  // If countryDyeing is "Pays Inconnu", don't count this step regardless of dyeingProcess
  if (supplier.countryDyeing && !isUnknown(supplier.countryDyeing)) {
    knownSteps++;
  }
  
  // Step 5: Making (only count if not unknown)
  if (supplier.countryMaking && !isUnknown(supplier.countryMaking)) {
    knownSteps++;
  }
  
  return (knownSteps / totalSteps) * 10;
}

/**
 * Calculate percentage difference from best value (for axes where lower is better)
 * Returns an object with:
 * - score: value on 0-10 scale where 5 = best (0% difference)
 * - diffPercent: actual percentage difference for tooltip display
 * 
 * Uses square root scale to show spread for high percentages (e.g., 300% MOQ)
 * Maps 0-300% range to 5-0 score range using square root compression
 * Formula: score = 5 * (1 - sqrt(diffPercent / 300)), clamped to 0-10
 * 
 * This compresses high percentages while still showing relative differences:
 * - 0% = 5.0 (best, at center)
 * - 25% ≈ 2.7
 * - 50% ≈ 1.9
 * - 100% ≈ 0.9
 * - 200% ≈ 0.3
 * - 300% = 0.0 (worst, at edge)
 */
function calculatePercentageDiffFromBest(value, bestValue) {
  if (bestValue === undefined || bestValue === null || bestValue === 0) {
    return { score: 5, diffPercent: 0 };
  }
  
  // Calculate percentage difference from best (lower is better, so best = minimum)
  const diffPercent = ((value - bestValue) / bestValue) * 100;
  
  // Use square root scale to compress high percentages while showing spread
  // Map 0-300% range to 5-0 score range
  // This allows values up to 300% to still show visual differences
  const maxPercent = 300; // Maximum percentage to map (300% = score 0)
  let score = 5 * (1 - Math.sqrt(Math.max(0, diffPercent) / maxPercent));
  score = Math.max(0, Math.min(10, score));
  
  return {
    score: Math.round(score * 100) / 100,
    diffPercent: Math.round(diffPercent * 100) / 100
  };
}

/**
 * Calculate price score as percentage deviation from median
 * Returns an object with:
 * - score: value on 0-10 scale where 5 = median (0% deviation)
 * - deviationPercent: actual percentage deviation for tooltip display
 * 
 * Mapping: -50% deviation = 0, 0% = 5, +50% = 10
 * Formula: score = 5 + (deviationPercent / 50) * 5
 */
function calculatePriceDeviationScore(price, median) {
  if (median === undefined || median === null || median === 0) {
    return { score: 5, deviationPercent: 0 };
  }
  
  // Calculate percentage deviation
  const deviationPercent = ((price - median) / median) * 100;
  
  // Map to 0-10 scale where 5 = 0% deviation
  // Range: -50% to +50% maps to 0-10
  // score = 5 + (deviationPercent / 50) * 5
  let score = 5 + (deviationPercent / 50) * 5;
  
  // Clamp to 0-10 range
  score = Math.max(0, Math.min(10, score));
  
  return {
    score: Math.round(score * 100) / 100,
    deviationPercent: Math.round(deviationPercent * 100) / 100
  };
}

/**
 * Calculate median of an array of numbers
 */
function calculateMedian(values) {
  if (!values || values.length === 0) return undefined;
  
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    return sorted[mid];
  }
}

function normalizeCertificationsList(certifications) {
  if (!Array.isArray(certifications)) return [];
  return certifications
    .map(cert => typeof cert === 'string' ? cert.trim() : cert)
    .filter(cert => cert);
}

function calculateCertificationsScore(certifications) {
  const normalized = normalizeCertificationsList(certifications);
  return {
    list: normalized,
    count: normalized.length,
    score: normalized.length
  };
}

/**
 * Calculate radar chart scores for a set of suppliers
 * Returns an array of score objects, one per supplier
 */
function calculateRadarScores(suppliers) {
  if (!suppliers || suppliers.length === 0) {
    return [];
  }
  
  // Single supplier case: all axes score 5 (neutral, best value)
  if (suppliers.length === 1) {
    // For traceability, still calculate normally but scale to 1-9
    const traceabilityRaw = calculateTransparencyScore(suppliers[0]);
    const traceabilityScaled = 1 + (traceabilityRaw / 10) * 8; // Scale 0-10 to 1-9
    const traceabilitySteps = Math.round((traceabilityRaw / 10) * 5);
    const certificationData = calculateCertificationsScore(suppliers[0].certifications);
    
    // For all relative axes, single supplier is the best = 0% difference = score 5
    return [{
      supplier: suppliers[0].supplier || 'Unknown',
      fabricName: suppliers[0].fabricName || '',
      ecobalyse: 5,
      ecobalyseDiffPercent: 0,
      traceability: traceabilityScaled,
      traceabilitySteps: traceabilitySteps,
      price: 5,
      priceDiffPercent: 0,
      leadTime: 5,
      leadTimeDiffPercent: 0,
      moq: 5,
      moqDiffPercent: 0,
      certifications: certificationData.list,
      certificationsScore: certificationData.score,
      certificationsCount: certificationData.count
    }];
  }
  
  // Extract values for normalization (filter out null/undefined/NaN)
  const ecobalyseValues = suppliers
    .map(s => s.ecobalyse_score)
    .filter(v => v != null && !isNaN(v) && v !== undefined);
  const priceValues = suppliers
    .map(s => s.price_eur_per_m)
    .filter(v => v != null && !isNaN(v) && v !== undefined);
  const leadTimeValues = suppliers
    .map(s => s.lead_time_weeks)
    .filter(v => v != null && !isNaN(v) && v !== undefined);
  const moqValues = suppliers
    .map(s => s.moq_m)
    .filter(v => v != null && !isNaN(v) && v !== undefined);
  
  // Calculate best values (minimum for all relative axes - lower is better)
  const ecobalyseBest = ecobalyseValues.length > 0 ? Math.min(...ecobalyseValues) : undefined;
  const priceBest = priceValues.length > 0 ? Math.min(...priceValues) : undefined;
  const leadTimeBest = leadTimeValues.length > 0 ? Math.min(...leadTimeValues) : undefined;
  const moqBest = moqValues.length > 0 ? Math.min(...moqValues) : undefined;
  
  // Calculate scores for each supplier
  return suppliers.map(supplier => {
    // Ecobalyse: Percentage difference from best (lower is better)
    const ecobalyseData = supplier.ecobalyse_score != null && !isNaN(supplier.ecobalyse_score) && ecobalyseBest
      ? calculatePercentageDiffFromBest(supplier.ecobalyse_score, ecobalyseBest)
      : { score: 5, diffPercent: 0 };
    
    // Price: Percentage difference from best (lower is better)
    const priceData = supplier.price_eur_per_m != null && !isNaN(supplier.price_eur_per_m) && priceBest
      ? calculatePercentageDiffFromBest(supplier.price_eur_per_m, priceBest)
      : { score: 5, diffPercent: 0 };
    
    // Lead Time: Percentage difference from best (lower is better)
    const leadTimeData = supplier.lead_time_weeks != null && !isNaN(supplier.lead_time_weeks) && leadTimeBest
      ? calculatePercentageDiffFromBest(supplier.lead_time_weeks, leadTimeBest)
      : { score: 5, diffPercent: 0 };
    
    // MOQ: Percentage difference from best (lower is better)
    const moqData = supplier.moq_m != null && !isNaN(supplier.moq_m) && moqBest
      ? calculatePercentageDiffFromBest(supplier.moq_m, moqBest)
      : { score: 5, diffPercent: 0 };
    
    // Traceability is calculated independently (absolute score, not relative)
    // Scale from 0-10 to 1-9 range
    const traceabilityRaw = calculateTransparencyScore(supplier);
    const traceability = 1 + (traceabilityRaw / 10) * 8; // Scale 0-10 to 1-9
    // Calculate actual steps (0-5) from raw score (0-10)
    // traceabilityRaw = (knownSteps / 5) * 10, so knownSteps = (traceabilityRaw / 10) * 5
    const traceabilitySteps = Math.round((traceabilityRaw / 10) * 5);
    const certificationData = calculateCertificationsScore(supplier.certifications);
    
    return {
      supplier: supplier.supplier || 'Unknown',
      fabricName: supplier.fabricName || '',
      ecobalyse: ecobalyseData.score,
      ecobalyseDiffPercent: ecobalyseData.diffPercent,
      traceability: Math.round(traceability * 100) / 100,
      traceabilitySteps: traceabilitySteps, // Store raw steps (0-5) for tooltip
      price: priceData.score,
      priceDiffPercent: priceData.diffPercent,
      leadTime: leadTimeData.score,
      leadTimeDiffPercent: leadTimeData.diffPercent,
      moq: moqData.score,
      moqDiffPercent: moqData.diffPercent,
      certifications: certificationData.list,
      certificationsScore: certificationData.score,
      certificationsCount: certificationData.count
    };
  });
}

// Global supplier color mapping - ensures each supplier has a unique color across all charts
const supplierColors = new Map();

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Get a unique color for a supplier
 * Uses the provided hex color palette
 */
function getSupplierColor(supplierName) {
  if (supplierColors.has(supplierName)) {
    return supplierColors.get(supplierName);
  }
  
  // User-provided color palette (22 colors)
  const hexColorPalette = [
    '#e6194B', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', 
    '#42d4f4', '#f032e6', '#bfef45', '#fabed4', '#469990', '#dcbeff', 
    '#9A6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', 
    '#000075', '#a9a9a9', '#ffffff', '#000000'
  ];
  
  const colorIndex = supplierColors.size % hexColorPalette.length;
  const hexColor = hexColorPalette[colorIndex];
  let rgb = hexToRgb(hexColor);
  
  if (!rgb) {
    // Fallback to black if parsing fails
    rgb = { r: 0, g: 0, b: 0 };
  }
  
  const colorObj = {
    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`,
    borderColor: hexColor,
    pointBackgroundColor: hexColor,
    pointBorderColor: '#fff',
    pointHoverBackgroundColor: '#fff',
    pointHoverBorderColor: hexColor
  };
  
  supplierColors.set(supplierName, colorObj);
  return colorObj;
}

/**
 * Get radar chart data structure ready for charting library
 * Returns data in format expected by common radar chart libraries
 */
function getRadarChartData(suppliers) {
  const scores = calculateRadarScores(suppliers);
  
  // Track suppliers that appear multiple times to differentiate them
  const supplierCounts = {};
  scores.forEach(score => {
    supplierCounts[score.supplier] = (supplierCounts[score.supplier] || 0) + 1;
  });
  
  // Track which instance of each supplier we're on
  const supplierInstances = {};
  
  return {
    labels: ['Ecobalyse', 'Traceability', 'Price', 'Lead Time', 'MOQ'],
    datasets: scores.map((score, index) => {
      // Use supplier name for color mapping (ensures consistent colors across charts)
      const baseColors = getSupplierColor(score.supplier);
      
      // If this supplier appears multiple times, differentiate with line style or shade
      const isMultiple = supplierCounts[score.supplier] > 1;
      const instanceIndex = supplierInstances[score.supplier] || 0;
      supplierInstances[score.supplier] = instanceIndex + 1;
      
      // Remove fill/shading - only show outline
      const colors = {
        backgroundColor: 'transparent', // No fill
        borderColor: baseColors.borderColor,
        pointBackgroundColor: baseColors.pointBackgroundColor,
        pointBorderColor: baseColors.pointBorderColor,
        pointHoverBackgroundColor: baseColors.pointHoverBackgroundColor,
        pointHoverBorderColor: baseColors.pointHoverBorderColor,
        borderWidth: 2
      };
      
      // Differentiate multiple fabrics from same supplier
      if (isMultiple) {
        if (instanceIndex === 0) {
          // First instance: solid line
          colors.borderDash = [];
        } else if (instanceIndex === 1) {
          // Second instance: dashed line
          colors.borderDash = [5, 5];
        } else {
          // Third+ instance: dotted line
          colors.borderDash = [2, 2];
        }
      }
      
      // Format legend label as "Supplier Name (Fabric Name)"
      const legendLabel = score.fabricName 
        ? `${score.supplier} (${score.fabricName})`
        : score.supplier;
      
      return {
        label: legendLabel,
        supplierName: score.supplier, // Keep original for color mapping
        fabricName: score.fabricName,
        data: [
          score.ecobalyse,
          score.traceability,
          score.price,
          score.leadTime,
          score.moq
        ],
        // Store percentage differences and traceability steps for tooltips
        ecobalyseDiffPercent: score.ecobalyseDiffPercent,
        traceabilitySteps: score.traceabilitySteps,
        priceDiffPercent: score.priceDiffPercent,
        leadTimeDiffPercent: score.leadTimeDiffPercent,
        moqDiffPercent: score.moqDiffPercent,
        ...colors
      };
    })
  };
}

/**
 * Load suppliers from API and calculate radar chart scores
 * Returns a promise that resolves to radar chart data
 */
async function loadRadarChartData() {
  try {
    const response = await fetch('/api/suppliers/for-radar');
    const suppliers = await response.json();
    
    // Filter out suppliers with errors
    const validSuppliers = suppliers.filter(s => !s.error);
    
    if (validSuppliers.length === 0) {
      return null;
    }
    
    return getRadarChartData(validSuppliers);
  } catch (error) {
    console.error('Error loading radar chart data:', error);
    return null;
  }
}

// Export for use in other modules (if using modules)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateRadarScores,
    getRadarChartData,
    calculateTransparencyScore,
    normalizeLowerIsBetter,
    loadRadarChartData
  };
}

