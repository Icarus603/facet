/**
 * FACET Crisis Detection Utilities
 * High-performance algorithms for crisis identification and risk assessment
 */

export interface CrisisPattern {
  pattern: string;
  weight: number;
  category: 'suicide' | 'violence' | 'self_harm' | 'psychosis' | 'substance' | 'domestic_violence';
  urgency: 'immediate' | 'high' | 'moderate' | 'low';
  culturalConsiderations?: string[];
}

export interface RiskScore {
  overallRisk: number; // 0-10
  suicideRisk: number;
  violenceRisk: number;
  selfHarmRisk: number;
  psychosisRisk: number;
  immediacy: number; // 0-10 (10 = immediate action needed)
  confidence: number; // 0-1
  detectedPatterns: CrisisPattern[];
  protectiveFactors: string[];
  riskFactors: string[];
}

export interface CrisisContext {
  text: string;
  culturalBackground?: string;
  historicalRisk?: boolean;
  ageGroup?: 'child' | 'adolescent' | 'adult' | 'elder';
  sessionHistory?: string[];
}

// High-priority crisis patterns for immediate detection
export const CRISIS_PATTERNS: CrisisPattern[] = [
  // Immediate suicide risk patterns
  { pattern: 'kill myself', weight: 10, category: 'suicide', urgency: 'immediate' },
  { pattern: 'end my life', weight: 10, category: 'suicide', urgency: 'immediate' },
  { pattern: 'commit suicide', weight: 10, category: 'suicide', urgency: 'immediate' },
  { pattern: 'suicide plan', weight: 10, category: 'suicide', urgency: 'immediate' },
  { pattern: 'going to die tonight', weight: 10, category: 'suicide', urgency: 'immediate' },
  { pattern: 'better off dead', weight: 9, category: 'suicide', urgency: 'immediate' },
  { pattern: 'want to die', weight: 8, category: 'suicide', urgency: 'high' },
  { pattern: 'wish I was dead', weight: 8, category: 'suicide', urgency: 'high' },
  { pattern: 'not worth living', weight: 8, category: 'suicide', urgency: 'high' },
  { pattern: 'end it all', weight: 8, category: 'suicide', urgency: 'high' },

  // Specific method indicators
  { pattern: 'overdose', weight: 9, category: 'suicide', urgency: 'immediate' },
  { pattern: 'hanging myself', weight: 9, category: 'suicide', urgency: 'immediate' },
  { pattern: 'jumping off', weight: 9, category: 'suicide', urgency: 'immediate' },
  { pattern: 'shooting myself', weight: 9, category: 'suicide', urgency: 'immediate' },
  { pattern: 'cutting my wrists', weight: 9, category: 'suicide', urgency: 'immediate' },
  { pattern: 'carbon monoxide', weight: 9, category: 'suicide', urgency: 'immediate' },

  // Planning and preparation indicators
  { pattern: 'wrote goodbye letter', weight: 9, category: 'suicide', urgency: 'immediate' },
  { pattern: 'said goodbye', weight: 8, category: 'suicide', urgency: 'immediate' },
  { pattern: 'giving away', weight: 7, category: 'suicide', urgency: 'high' },
  { pattern: 'final arrangements', weight: 8, category: 'suicide', urgency: 'immediate' },
  { pattern: 'will and testament', weight: 7, category: 'suicide', urgency: 'high' },

  // Violence risk patterns
  { pattern: 'kill them', weight: 10, category: 'violence', urgency: 'immediate' },
  { pattern: 'murder', weight: 9, category: 'violence', urgency: 'immediate' },
  { pattern: 'going to hurt', weight: 8, category: 'violence', urgency: 'high' },
  { pattern: 'violent thoughts', weight: 7, category: 'violence', urgency: 'high' },
  { pattern: 'hurt someone', weight: 7, category: 'violence', urgency: 'high' },
  { pattern: 'kill my family', weight: 10, category: 'violence', urgency: 'immediate' },
  { pattern: 'shoot up', weight: 10, category: 'violence', urgency: 'immediate' },

  // Weapon access indicators
  { pattern: 'have a gun', weight: 8, category: 'violence', urgency: 'high' },
  { pattern: 'bought a weapon', weight: 9, category: 'violence', urgency: 'immediate' },
  { pattern: 'knife ready', weight: 8, category: 'violence', urgency: 'high' },
  { pattern: 'access to weapons', weight: 7, category: 'violence', urgency: 'high' },

  // Self-harm patterns
  { pattern: 'cut myself', weight: 7, category: 'self_harm', urgency: 'high' },
  { pattern: 'hurt myself', weight: 6, category: 'self_harm', urgency: 'moderate' },
  { pattern: 'self-harm', weight: 6, category: 'self_harm', urgency: 'moderate' },
  { pattern: 'cutting', weight: 5, category: 'self_harm', urgency: 'moderate' },
  { pattern: 'burning myself', weight: 7, category: 'self_harm', urgency: 'high' },
  { pattern: 'punish myself', weight: 6, category: 'self_harm', urgency: 'moderate' },
  { pattern: 'deserve pain', weight: 6, category: 'self_harm', urgency: 'moderate' },

  // Psychosis indicators
  { pattern: 'hearing voices', weight: 8, category: 'psychosis', urgency: 'high' },
  { pattern: 'voices telling me', weight: 9, category: 'psychosis', urgency: 'immediate' },
  { pattern: 'seeing things', weight: 7, category: 'psychosis', urgency: 'high' },
  { pattern: 'not real', weight: 6, category: 'psychosis', urgency: 'moderate' },
  { pattern: 'paranoid', weight: 6, category: 'psychosis', urgency: 'moderate' },
  { pattern: 'conspiracy', weight: 6, category: 'psychosis', urgency: 'moderate' },
  { pattern: 'controlling my thoughts', weight: 8, category: 'psychosis', urgency: 'high' },
  { pattern: 'people following me', weight: 7, category: 'psychosis', urgency: 'high' },

  // Command hallucinations (highest priority)
  { pattern: 'voices command', weight: 10, category: 'psychosis', urgency: 'immediate' },
  { pattern: 'telling me to kill', weight: 10, category: 'psychosis', urgency: 'immediate' },
  { pattern: 'must obey', weight: 9, category: 'psychosis', urgency: 'immediate' },

  // Substance abuse emergency
  { pattern: 'overdosed', weight: 10, category: 'substance', urgency: 'immediate' },
  { pattern: 'too many pills', weight: 9, category: 'substance', urgency: 'immediate' },
  { pattern: 'alcohol poisoning', weight: 10, category: 'substance', urgency: 'immediate' },
  { pattern: 'cant stop using', weight: 7, category: 'substance', urgency: 'high' },
  { pattern: 'withdrawal symptoms', weight: 6, category: 'substance', urgency: 'moderate' },

  // Domestic violence indicators
  { pattern: 'hitting me', weight: 8, category: 'domestic_violence', urgency: 'high' },
  { pattern: 'being abused', weight: 8, category: 'domestic_violence', urgency: 'high' },
  { pattern: 'threatened to kill me', weight: 10, category: 'domestic_violence', urgency: 'immediate' },
  { pattern: 'afraid for my life', weight: 9, category: 'domestic_violence', urgency: 'immediate' },
  { pattern: 'domestic violence', weight: 7, category: 'domestic_violence', urgency: 'high' },
  { pattern: 'hiding from', weight: 7, category: 'domestic_violence', urgency: 'high' },
];

// Protective factors that reduce risk
export const PROTECTIVE_FACTORS = [
  { pattern: 'family support', weight: 3 },
  { pattern: 'religious beliefs', weight: 2 },
  { pattern: 'therapy helping', weight: 2 },
  { pattern: 'reasons to live', weight: 3 },
  { pattern: 'getting better', weight: 2 },
  { pattern: 'hope for future', weight: 3 },
  { pattern: 'children need me', weight: 4 },
  { pattern: 'pets depend on me', weight: 2 },
  { pattern: 'strong community', weight: 2 },
  { pattern: 'cultural support', weight: 2 },
  { pattern: 'spiritual beliefs', weight: 2 },
  { pattern: 'suicide is wrong', weight: 3 },
];

// Cultural considerations for crisis assessment
export const CULTURAL_CRISIS_FACTORS = {
  latino: {
    protectiveFactors: ['family honor', 'Catholic faith', 'community support', 'respeto'],
    riskFactors: ['family shame', 'machismo pressure', 'immigration stress'],
    considerations: ['family involvement', 'religious beliefs', 'language barriers'],
  },
  asian: {
    protectiveFactors: ['family obligation', 'academic achievement', 'community harmony'],
    riskFactors: ['family shame', 'academic pressure', 'cultural conflict'],
    considerations: ['face saving', 'family hierarchy', 'emotional expression norms'],
  },
  african: {
    protectiveFactors: ['community strength', 'faith traditions', 'resilience history'],
    riskFactors: ['historical trauma', 'discrimination', 'systemic barriers'],
    considerations: ['church support', 'extended family', 'cultural resilience'],
  },
  native: {
    protectiveFactors: ['tribal connection', 'traditional practices', 'land connection'],
    riskFactors: ['historical trauma', 'cultural disconnection', 'substance issues'],
    considerations: ['traditional healing', 'tribal sovereignty', 'intergenerational trauma'],
  },
  middle_eastern: {
    protectiveFactors: ['family loyalty', 'religious devotion', 'community support'],
    riskFactors: ['honor concerns', 'discrimination', 'cultural isolation'],
    considerations: ['religious beliefs', 'family honor', 'gender considerations'],
  },
};

/**
 * High-performance crisis detection algorithm
 * Optimized for <500ms response time
 */
export class CrisisDetector {
  private readonly patternMap: Map<string, CrisisPattern[]>;
  private readonly protectiveMap: Map<string, number>;

  constructor() {
    // Pre-compile patterns for fast lookup
    this.patternMap = new Map();
    this.protectiveMap = new Map();
    
    this.initializePatternMaps();
  }

  /**
   * Rapid crisis detection - must complete in <500ms
   */
  detectCrisis(context: CrisisContext): RiskScore {
    const text = context.text.toLowerCase();
    const detectedPatterns: CrisisPattern[] = [];
    const protectiveFactors: string[] = [];
    const riskFactors: string[] = [];

    // Fast pattern matching
    for (const [keyword, patterns] of this.patternMap) {
      if (text.includes(keyword)) {
        detectedPatterns.push(...patterns);
      }
    }

    // Detect protective factors
    for (const [factor, weight] of this.protectiveMap) {
      if (text.includes(factor)) {
        protectiveFactors.push(factor);
      }
    }

    // Calculate risk scores
    const suicideRisk = this.calculateCategoryRisk(detectedPatterns, 'suicide');
    const violenceRisk = this.calculateCategoryRisk(detectedPatterns, 'violence');
    const selfHarmRisk = this.calculateCategoryRisk(detectedPatterns, 'self_harm');
    const psychosisRisk = this.calculateCategoryRisk(detectedPatterns, 'psychosis');

    // Calculate overall risk
    const rawRisk = Math.max(suicideRisk, violenceRisk, selfHarmRisk, psychosisRisk);
    const protectiveReduction = protectiveFactors.length * 0.5;
    const overallRisk = Math.max(0, Math.min(10, rawRisk - protectiveReduction));

    // Calculate immediacy based on urgency and specific patterns
    const immediacy = this.calculateImmediacy(detectedPatterns, text);

    // Calculate confidence based on pattern specificity
    const confidence = this.calculateConfidence(detectedPatterns, text);

    // Apply cultural adjustments
    const culturallyAdjustedRisk = this.applyCulturalAdjustments(
      overallRisk,
      context.culturalBackground,
      detectedPatterns
    );

    return {
      overallRisk: culturallyAdjustedRisk,
      suicideRisk,
      violenceRisk,
      selfHarmRisk,
      psychosisRisk,
      immediacy,
      confidence,
      detectedPatterns: detectedPatterns.slice(0, 10), // Top 10 patterns
      protectiveFactors,
      riskFactors,
    };
  }

  /**
   * Detailed risk assessment with cultural context
   */
  assessDetailedRisk(context: CrisisContext): {
    riskScore: RiskScore;
    culturalFactors: any;
    recommendations: string[];
    interventionLevel: 'immediate' | 'urgent' | 'scheduled' | 'routine';
  } {
    const riskScore = this.detectCrisis(context);
    const culturalFactors = this.assessCulturalRiskFactors(
      context.culturalBackground,
      riskScore
    );

    const interventionLevel = this.determineInterventionLevel(riskScore);
    const recommendations = this.generateRecommendations(riskScore, culturalFactors);

    return {
      riskScore,
      culturalFactors,
      recommendations,
      interventionLevel,
    };
  }

  /**
   * Real-time monitoring for session-to-session risk changes
   */
  monitorRiskProgression(sessionRisks: RiskScore[]): {
    trend: 'improving' | 'stable' | 'worsening' | 'fluctuating';
    concernLevel: number; // 0-10
    recommendations: string[];
  } {
    if (sessionRisks.length < 2) {
      return {
        trend: 'stable',
        concernLevel: sessionRisks[0]?.overallRisk || 0,
        recommendations: ['Insufficient data for trend analysis'],
      };
    }

    const recentRisks = sessionRisks.slice(-5); // Last 5 sessions
    const trendSlope = this.calculateTrendSlope(recentRisks.map(r => r.overallRisk));
    const volatility = this.calculateVolatility(recentRisks.map(r => r.overallRisk));

    let trend: 'improving' | 'stable' | 'worsening' | 'fluctuating';
    if (volatility > 2) {
      trend = 'fluctuating';
    } else if (trendSlope < -0.5) {
      trend = 'improving';
    } else if (trendSlope > 0.5) {
      trend = 'worsening';
    } else {
      trend = 'stable';
    }

    const latestRisk = recentRisks[recentRisks.length - 1].overallRisk;
    const concernLevel = Math.min(10, latestRisk + (volatility * 0.5));

    const recommendations = this.generateProgressionRecommendations(trend, concernLevel);

    return { trend, concernLevel, recommendations };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private initializePatternMaps(): void {
    // Create fast lookup maps
    for (const pattern of CRISIS_PATTERNS) {
      const keywords = pattern.pattern.split(' ');
      for (const keyword of keywords) {
        if (!this.patternMap.has(keyword)) {
          this.patternMap.set(keyword, []);
        }
        this.patternMap.get(keyword)!.push(pattern);
      }
    }

    // Create protective factor map
    for (const factor of PROTECTIVE_FACTORS) {
      const keywords = factor.pattern.split(' ');
      for (const keyword of keywords) {
        this.protectiveMap.set(keyword, factor.weight);
      }
    }
  }

  private calculateCategoryRisk(patterns: CrisisPattern[], category: string): number {
    const categoryPatterns = patterns.filter(p => p.category === category);
    if (categoryPatterns.length === 0) return 0;

    const totalWeight = categoryPatterns.reduce((sum, p) => sum + p.weight, 0);
    const maxWeight = Math.max(...categoryPatterns.map(p => p.weight));
    
    // Combine frequency and severity
    const frequencyScore = Math.min(10, categoryPatterns.length * 2);
    const severityScore = Math.min(10, maxWeight);
    
    return (frequencyScore + severityScore) / 2;
  }

  private calculateImmediacy(patterns: CrisisPattern[], text: string): number {
    const immediatePatterns = patterns.filter(p => p.urgency === 'immediate');
    if (immediatePatterns.length > 0) return 10;

    const highPatterns = patterns.filter(p => p.urgency === 'high');
    if (highPatterns.length > 0) return 7;

    // Check for time-related urgency indicators
    const timeIndicators = ['tonight', 'today', 'now', 'soon', 'this week'];
    const hasTimeIndicator = timeIndicators.some(indicator => text.includes(indicator));
    
    if (hasTimeIndicator && patterns.length > 0) return 8;

    return Math.min(6, patterns.length);
  }

  private calculateConfidence(patterns: CrisisPattern[], text: string): number {
    if (patterns.length === 0) return 0.1;

    // Higher confidence for more specific patterns
    const avgWeight = patterns.reduce((sum, p) => sum + p.weight, 0) / patterns.length;
    const specificityBonus = patterns.filter(p => p.weight >= 8).length * 0.1;
    const lengthPenalty = text.length < 50 ? 0.1 : 0; // Lower confidence for very short text

    return Math.min(1.0, (avgWeight / 10) + specificityBonus - lengthPenalty);
  }

  private applyCulturalAdjustments(
    baseRisk: number,
    culturalBackground?: string,
    patterns?: CrisisPattern[]
  ): number {
    if (!culturalBackground) return baseRisk;

    const culturalKey = culturalBackground.toLowerCase();
    const culturalFactors = CULTURAL_CRISIS_FACTORS[culturalKey as keyof typeof CULTURAL_CRISIS_FACTORS];
    
    if (!culturalFactors) return baseRisk;

    // Apply cultural protective factors
    let adjustment = 0;
    
    // Cultural protective factors can slightly reduce perceived risk
    if (culturalFactors.protectiveFactors.length > 0) {
      adjustment -= 0.5;
    }

    // Cultural risk factors can increase perceived risk
    if (culturalFactors.riskFactors.length > 0) {
      adjustment += 0.5;
    }

    return Math.max(0, Math.min(10, baseRisk + adjustment));
  }

  private assessCulturalRiskFactors(culturalBackground?: string, riskScore?: RiskScore) {
    if (!culturalBackground) return {};

    const culturalKey = culturalBackground.toLowerCase();
    const factors = CULTURAL_CRISIS_FACTORS[culturalKey as keyof typeof CULTURAL_CRISIS_FACTORS];
    
    return factors || {};
  }

  private determineInterventionLevel(riskScore: RiskScore): 'immediate' | 'urgent' | 'scheduled' | 'routine' {
    if (riskScore.immediacy >= 9 || riskScore.overallRisk >= 9) {
      return 'immediate';
    }
    if (riskScore.immediacy >= 7 || riskScore.overallRisk >= 7) {
      return 'urgent';
    }
    if (riskScore.overallRisk >= 4) {
      return 'scheduled';
    }
    return 'routine';
  }

  private generateRecommendations(riskScore: RiskScore, culturalFactors: any): string[] {
    const recommendations: string[] = [];

    // Risk-based recommendations
    if (riskScore.overallRisk >= 8) {
      recommendations.push('Immediate crisis intervention required');
      recommendations.push('Remove means of self-harm');
      recommendations.push('Continuous supervision needed');
    } else if (riskScore.overallRisk >= 5) {
      recommendations.push('Enhanced safety planning required');
      recommendations.push('Frequent check-ins needed');
      recommendations.push('Professional assessment within 24 hours');
    }

    // Category-specific recommendations
    if (riskScore.suicideRisk >= 6) {
      recommendations.push('Suicide prevention safety plan');
      recommendations.push('Means restriction counseling');
    }
    if (riskScore.violenceRisk >= 6) {
      recommendations.push('Violence risk assessment');
      recommendations.push('Potential victim safety planning');
    }
    if (riskScore.psychosisRisk >= 6) {
      recommendations.push('Psychiatric evaluation for psychosis');
      recommendations.push('Reality testing assessment');
    }

    // Cultural recommendations
    if (culturalFactors.protectiveFactors) {
      recommendations.push('Leverage cultural protective factors');
    }
    if (culturalFactors.considerations) {
      recommendations.push('Address cultural considerations in treatment');
    }

    return recommendations.slice(0, 8); // Limit to most important
  }

  private generateProgressionRecommendations(
    trend: string,
    concernLevel: number
  ): string[] {
    const recommendations: string[] = [];

    switch (trend) {
      case 'worsening':
        recommendations.push('Increase intervention intensity');
        recommendations.push('Consider hospitalization if risk continues to rise');
        recommendations.push('Daily safety check-ins required');
        break;
      case 'fluctuating':
        recommendations.push('Identify triggers for risk fluctuations');
        recommendations.push('Stabilize environmental factors');
        recommendations.push('Increase monitoring during high-risk periods');
        break;
      case 'improving':
        recommendations.push('Continue current interventions');
        recommendations.push('Gradually build independence');
        recommendations.push('Maintain regular progress monitoring');
        break;
      case 'stable':
        if (concernLevel > 5) {
          recommendations.push('Consider intervention modifications');
          recommendations.push('Assess for treatment resistance');
        } else {
          recommendations.push('Maintain current treatment approach');
          recommendations.push('Monitor for early warning signs');
        }
        break;
    }

    return recommendations;
  }

  private calculateTrendSlope(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }
}

// Export singleton instance for performance
export const crisisDetector = new CrisisDetector();