/**
 * Radar Chart Scoring Module
 * 
 * This module implements the radar chart scoring behavior for supplier comparison.
 * 
 * Radar Chart Axes (1-9 scale):
 * 1. Ecobalyse impact - Normalized relative to suppliers (lower is better)
 * 2. Transparency - Based on traceable production steps (1-9, not relative)
 * 3. Price - Normalized relative to suppliers (lower is better)
 * 4. Lead Time - Normalized relative to suppliers (lower is better)
 * 5. Minimum Order Quantity - Normalized relative to suppliers (lower is better)
 * 
 * Normalization Rules:
 * - For Ecobalyse, Price, Lead Time, MOQ: Values are normalized using min/max among current suppliers
 * - Lower values are considered better
 * - Scores range from 1 (worst) to 9 (best)
 * - If all suppliers have the same value (or only one supplier), score defaults to 5
 * 
 * Transparency Calculation:
 * - Counts traceable production steps: fibre, spinning, weaving/knitting, dyeing/finishing, making
 * - Score = (known steps / 5 total steps) × 10, then scaled to 1-9 range
 * - Not scaled relative to other suppliers
 * 
 * Single Supplier Behavior:
 * - If only one supplier, all axes score 5 to avoid misleading "ideal" shape
 * 
 * Usage:
 *   const chartData = await loadRadarChartData();
 *   // Use chartData with Chart.js or other radar chart library
 */

/**
 * Calculate transparency score based on traceable production steps
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
 * Normalize a value to 1-9 scale where lower values are better
 * Formula: score = 1 + 8 * (1 - (value - min) / (max - min))
 * - When value = min (lowest): score = 9 (best)
 * - When value = max (highest): score = 1 (worst)
 * - When all values are the same or only one supplier, return 5 (neutral)
 */
function normalizeLowerIsBetter(value, min, max) {
  // Handle edge cases
  if (min === undefined || max === undefined || min === max) {
    return 5; // Neutral score when no variation
  }
  
  // Normalize value to 0-1 range (0 = min, 1 = max)
  const normalized = (value - min) / (max - min);
  
  // Invert so that lower values get higher scores
  // normalized = 0 (min) -> score = 9 (best)
  // normalized = 1 (max) -> score = 1 (worst)
  // Scale to 1-9 range instead of 0-10
  const score = 1 + 8 * (1 - normalized);
  
  // Clamp to 1-9 range (shouldn't be needed, but safety check)
  return Math.max(1, Math.min(9, score));
}

/**
 * Calculate radar chart scores for a set of suppliers
 * Returns an array of score objects, one per supplier
 */
function calculateRadarScores(suppliers) {
  if (!suppliers || suppliers.length === 0) {
    return [];
  }
  
  // Single supplier case: all axes score 5 (neutral, within 1-9 range)
  if (suppliers.length === 1) {
    // For transparency, still calculate normally but scale to 1-9
    const transparencyRaw = calculateTransparencyScore(suppliers[0]);
    const transparencyScaled = 1 + (transparencyRaw / 10) * 8; // Scale 0-10 to 1-9
    
    return [{
      supplier: suppliers[0].supplier || 'Unknown',
      ecobalyse: 5,
      transparency: transparencyScaled,
      price: 5,
      leadTime: 5,
      moq: 5
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
  
  // Calculate min/max for normalization
  const ecobalyseMin = ecobalyseValues.length > 0 ? Math.min(...ecobalyseValues) : undefined;
  const ecobalyseMax = ecobalyseValues.length > 0 ? Math.max(...ecobalyseValues) : undefined;
  const priceMin = priceValues.length > 0 ? Math.min(...priceValues) : undefined;
  const priceMax = priceValues.length > 0 ? Math.max(...priceValues) : undefined;
  const leadTimeMin = leadTimeValues.length > 0 ? Math.min(...leadTimeValues) : undefined;
  const leadTimeMax = leadTimeValues.length > 0 ? Math.max(...leadTimeValues) : undefined;
  const moqMin = moqValues.length > 0 ? Math.min(...moqValues) : undefined;
  const moqMax = moqValues.length > 0 ? Math.max(...moqValues) : undefined;
  
  // Calculate scores for each supplier
  return suppliers.map(supplier => {
    // Ecobalyse: Higher raw score = worse environmental impact = lower normalized score (closer to 0)
    // Lower raw score = better environmental impact = higher normalized score (closer to 10)
    const ecobalyse = supplier.ecobalyse_score != null && !isNaN(supplier.ecobalyse_score)
      ? normalizeLowerIsBetter(supplier.ecobalyse_score, ecobalyseMin, ecobalyseMax)
      : 5;
    
    const price = supplier.price_eur_per_m != null && !isNaN(supplier.price_eur_per_m)
      ? normalizeLowerIsBetter(supplier.price_eur_per_m, priceMin, priceMax)
      : 5;
    
    const leadTime = supplier.lead_time_weeks != null && !isNaN(supplier.lead_time_weeks)
      ? normalizeLowerIsBetter(supplier.lead_time_weeks, leadTimeMin, leadTimeMax)
      : 5;
    
    const moq = supplier.moq_m != null && !isNaN(supplier.moq_m)
      ? normalizeLowerIsBetter(supplier.moq_m, moqMin, moqMax)
      : 5;
    
    // Transparency is calculated independently (not normalized relative to other suppliers)
    // Scale from 0-10 to 1-9 range
    const transparencyRaw = calculateTransparencyScore(supplier);
    const transparency = 1 + (transparencyRaw / 10) * 8; // Scale 0-10 to 1-9
    
    return {
      supplier: supplier.supplier || 'Unknown',
      ecobalyse: Math.round(ecobalyse * 100) / 100, // Round to 2 decimals
      transparency: Math.round(transparency * 100) / 100,
      price: Math.round(price * 100) / 100,
      leadTime: Math.round(leadTime * 100) / 100,
      moq: Math.round(moq * 100) / 100,
      // Include certifications for display (not in scoring)
      certifications: supplier.certifications || []
    };
  });
}

/**
 * Get radar chart data structure ready for charting library
 * Returns data in format expected by common radar chart libraries
 */
function getRadarChartData(suppliers) {
  const scores = calculateRadarScores(suppliers);
  
  return {
    labels: ['Ecobalyse', 'Transparency', 'Price', 'Lead Time', 'MOQ'],
    datasets: scores.map((score, index) => ({
      label: score.supplier,
      data: [
        score.ecobalyse,
        score.transparency,
        score.price,
        score.leadTime,
        score.moq
      ],
      // Color can be assigned based on index or supplier
      backgroundColor: `rgba(${100 + index * 50}, ${150 + index * 30}, ${200 + index * 20}, 0.2)`,
      borderColor: `rgba(${100 + index * 50}, ${150 + index * 30}, ${200 + index * 20}, 1)`,
      pointBackgroundColor: `rgba(${100 + index * 50}, ${150 + index * 30}, ${200 + index * 20}, 1)`,
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: `rgba(${100 + index * 50}, ${150 + index * 30}, ${200 + index * 20}, 1)`
    }))
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

