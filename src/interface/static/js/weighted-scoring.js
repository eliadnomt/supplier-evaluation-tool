// Weighted scoring functionality for supplier recommendations

/**
 * Calculate weighted score for a supplier based on axis weights
 * Higher weighted score = better recommendation (since 9 is best on normalized radar chart)
 */
function calculateWeightedScore(supplierScores, weights) {
  // Ensure all scores are valid numbers
  const ecobalyseScore = (supplierScores.ecobalyse != null && !isNaN(supplierScores.ecobalyse)) ? supplierScores.ecobalyse : 5;
  const transparencyScore = (supplierScores.traceability != null && !isNaN(supplierScores.traceability)) ? supplierScores.traceability : 5;
  const priceScore = (supplierScores.price != null && !isNaN(supplierScores.price)) ? supplierScores.price : 5;
  const leadTimeScore = (supplierScores.leadTime != null && !isNaN(supplierScores.leadTime)) ? supplierScores.leadTime : 5;
  const moqScore = (supplierScores.moq != null && !isNaN(supplierScores.moq)) ? supplierScores.moq : 5;
  
  // Normalize weights so they sum to 100
  const totalWeight = weights.ecobalyse + weights.transparency + weights.price + 
                       weights.leadTime + weights.moq;
  
  if (totalWeight === 0) {
    return {
      weightedScore: 0,
      normalizedWeights: { ecobalyse: 0, transparency: 0, price: 0, leadTime: 0, moq: 0 }
    };
  }
  
  const normalizedWeights = {
    ecobalyse: weights.ecobalyse / totalWeight * 100,
    transparency: weights.transparency / totalWeight * 100,
    price: weights.price / totalWeight * 100,
    leadTime: weights.leadTime / totalWeight * 100,
    moq: weights.moq / totalWeight * 100
  };
  
  // Calculate weighted score
  // Note: On normalized radar chart, 9 = best, 1 = worst for all axes
  // Higher weighted score = better overall performance
  const weightedScore = 
    (ecobalyseScore * normalizedWeights.ecobalyse / 100) +
    (transparencyScore * normalizedWeights.transparency / 100) +
    (priceScore * normalizedWeights.price / 100) +
    (leadTimeScore * normalizedWeights.leadTime / 100) +
    (moqScore * normalizedWeights.moq / 100);
  
  return {
    weightedScore: Math.round(weightedScore * 100) / 100,
    normalizedWeights
  };
}

/**
 * Get recommended suppliers based on weighted scores
 * Returns suppliers sorted by weighted score (best first)
 */
function getRecommendedSuppliers(suppliers, weights) {
  // Get radar scores for all suppliers
  const radarScores = calculateRadarScores(suppliers);
  
  // Calculate weighted scores
  const suppliersWithScores = radarScores.map(score => {
    const { weightedScore } = calculateWeightedScore(score, weights);
    return {
      supplier: score.supplier,
      fabricName: score.fabricName || '',
      weightedScore: weightedScore,
      scores: score
    };
  });
  
  // Sort by weighted score (higher is better)
  return suppliersWithScores.sort((a, b) => b.weightedScore - a.weightedScore);
}

/**
 * Generate recommendation summary with caveats
 */
function generateRecommendationSummary(recommendedSuppliers, weights) {
  if (!recommendedSuppliers || recommendedSuppliers.length === 0) {
    return {
      summary: 'No suppliers available for comparison.',
      caveats: []
    };
  }
  
  const topSupplier = recommendedSuppliers[0];
  const scores = topSupplier.scores;
  
  // Identify priority metrics (highest weights)
  // Note: scores object uses 'traceability' but weights use 'transparency'
  const weightEntries = [
    { name: 'Ecobalyse', weight: weights.ecobalyse, score: scores.ecobalyse },
    { name: 'Transparency', weight: weights.transparency, score: scores.traceability },
    { name: 'Price', weight: weights.price, score: scores.price },
    { name: 'Lead Time', weight: weights.leadTime, score: scores.leadTime },
    { name: 'MOQ', weight: weights.moq, score: scores.moq }
  ];
  
  // Sort by weight to find priorities - include ALL non-zero metrics
  const sortedByWeight = [...weightEntries].sort((a, b) => b.weight - a.weight);
  const allPriorities = sortedByWeight
    .filter(w => w.weight > 0)
    .map(w => w.name);
  
  // Build summary sentence with all non-zero priorities
  let priorityText = '';
  if (allPriorities.length === 0) {
    priorityText = 'the selected criteria';
  } else if (allPriorities.length === 1) {
    priorityText = allPriorities[0].toLowerCase();
  } else if (allPriorities.length === 2) {
    priorityText = `${allPriorities[0]} and ${allPriorities[1]}`.toLowerCase();
  } else {
    // For 3+ priorities, use "X, Y, and Z" format
    const last = allPriorities[allPriorities.length - 1];
    const rest = allPriorities.slice(0, -1);
    priorityText = `${rest.join(', ')}, and ${last}`.toLowerCase();
  }
  
  // Format supplier name with fabric name if available
  const supplierDisplayName = topSupplier.fabricName 
    ? `${topSupplier.supplier} (${topSupplier.fabricName})`
    : topSupplier.supplier;
  
  const summary = `Based on ${priorityText} as priority metrics, ${supplierDisplayName} is the best option.`;
  
  // Identify caveats - metrics that are being sacrificed (all zero-weight metrics)
  const caveats = [];
  
  // Find all metrics with zero weight (being sacrificed)
  const sacrificedMetrics = weightEntries.filter(metric => metric.weight === 0);
  
  if (sacrificedMetrics.length > 0) {
    const sacrificedNames = sacrificedMetrics.map(m => m.name).join(', ');
    caveats.push(`The following metrics are being sacrificed: ${sacrificedNames}.`);
  }
  
  return {
    summary,
    caveats,
    priorities: allPriorities
  };
}

/**
 * Get axis names for display
 */
function getAxisDisplayName(axis) {
  const names = {
    ecobalyse: 'Ecobalyse',
    transparency: 'Transparency',
    price: 'Price',
    leadTime: 'Lead Time',
    moq: 'MOQ'
  };
  return names[axis] || axis;
}

