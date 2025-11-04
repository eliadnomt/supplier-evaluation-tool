// Weighted scoring functionality for supplier recommendations

/**
 * Calculate weighted score for a supplier based on axis weights
 * Higher weighted score = better recommendation (since 9 is best on normalized radar chart)
 */
function calculateWeightedScore(supplierScores, weights) {
  // Normalize weights so they sum to 100
  const totalWeight = weights.ecobalyse + weights.transparency + weights.price + 
                       weights.leadTime + weights.moq;
  const normalizedWeights = totalWeight > 0 ? {
    ecobalyse: weights.ecobalyse / totalWeight * 100,
    transparency: weights.transparency / totalWeight * 100,
    price: weights.price / totalWeight * 100,
    leadTime: weights.leadTime / totalWeight * 100,
    moq: weights.moq / totalWeight * 100
  } : { ecobalyse: 20, transparency: 20, price: 20, leadTime: 20, moq: 20 };
  
  // Calculate weighted score
  // Note: On normalized radar chart, 9 = best, 1 = worst for all axes
  // Higher weighted score = better overall performance
  const weightedScore = 
    (supplierScores.ecobalyse * normalizedWeights.ecobalyse / 100) +
    (supplierScores.transparency * normalizedWeights.transparency / 100) +
    (supplierScores.price * normalizedWeights.price / 100) +
    (supplierScores.leadTime * normalizedWeights.leadTime / 100) +
    (supplierScores.moq * normalizedWeights.moq / 100);
  
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
  const weightEntries = [
    { name: 'Ecobalyse', weight: weights.ecobalyse, score: scores.ecobalyse },
    { name: 'Transparency', weight: weights.transparency, score: scores.transparency },
    { name: 'Price', weight: weights.price, score: scores.price },
    { name: 'Lead Time', weight: weights.leadTime, score: scores.leadTime },
    { name: 'MOQ', weight: weights.moq, score: scores.moq }
  ];
  
  // Sort by weight to find priorities
  const sortedByWeight = [...weightEntries].sort((a, b) => b.weight - a.weight);
  const topPriorities = sortedByWeight
    .filter(w => w.weight > 0)
    .slice(0, 2)
    .map(w => w.name);
  
  // Build summary sentence
  const priorityText = topPriorities.length === 2 
    ? `${topPriorities[0]} and ${topPriorities[1]}`
    : topPriorities[0] || 'the selected criteria';
  
  const summary = `Based on ${priorityText.toLowerCase()} as priority metrics, ${topSupplier.supplier} is the best option.`;
  
  // Identify caveats - metrics that are being sacrificed (low weight + low score)
  const caveats = [];
  
  // Find metrics with low weight (being de-prioritized) that also have low scores
  // These are metrics being sacrificed for the chosen priorities
  const sacrificedMetrics = weightEntries.filter(metric => {
    // Low weight means it's not prioritized (< 20%)
    // Low score means the recommended supplier performs poorly on it (< 5)
    return metric.weight < 20 && metric.score < 5;
  });
  
  if (sacrificedMetrics.length > 0) {
    const sacrificedNames = sacrificedMetrics.map(m => m.name).join(', ');
    caveats.push(`The following metrics are being sacrificed: ${sacrificedNames.toLowerCase()}.`);
  }
  
  // Check for sustainability sacrifice specifically
  if (scores.ecobalyse < 5 && weights.ecobalyse < 20) {
    if (!sacrificedMetrics.find(m => m.name === 'Ecobalyse')) {
      caveats.push('Sustainability (Ecobalyse) is being sacrificed for other priorities.');
    }
  }
  
  // Check for transparency sacrifice specifically
  if (scores.transparency < 5 && weights.transparency < 20) {
    if (!sacrificedMetrics.find(m => m.name === 'Transparency')) {
      caveats.push('Transparency is being sacrificed for other priorities.');
    }
  }
  
  return {
    summary,
    caveats,
    priorities: topPriorities
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

