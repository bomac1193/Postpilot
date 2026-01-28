/**
 * Intelligence Service
 * Bridges Slayt with Folio's AI capabilities for content scoring,
 * generation, and taste profile management.
 */

const Anthropic = require('@anthropic-ai/sdk');

// Initialize Anthropic client
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

/**
 * DNA Structures for content analysis
 */
const DEFAULT_PERFORMANCE_DNA = {
  hooks: [],
  structure: 'statement',
  keywords: [],
  sentiment: 'entertaining',
  predictedScore: 50,
  format: 'post',
  niche: 'general',
  targetAudience: 'general'
};

const DEFAULT_AESTHETIC_DNA = {
  tone: ['neutral'],
  voice: 'conversational',
  complexity: 'moderate',
  style: [],
  tasteScore: 50,
  emotionalTriggers: [],
  pacing: 'medium'
};

/**
 * Analyze content and extract Performance + Aesthetic DNA
 */
async function analyzeContent(content) {
  const { caption, title, hashtags, mediaType } = content;
  const text = caption || title || '';

  if (!anthropic) {
    // Fallback to pattern-based analysis
    return patternBasedAnalysis(text, mediaType);
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Analyze this social media content and extract its DNA patterns.

Content: "${text}"
Type: ${mediaType || 'post'}
Hashtags: ${hashtags?.join(', ') || 'none'}

Return ONLY valid JSON with this structure:
{
  "performanceDNA": {
    "hooks": ["array of hook types used: question, bold-claim, how-to, story, statistic, controversy, curiosity-gap, social-proof, urgency, personal"],
    "structure": "question|statement|how-to|listicle|comparison|story|challenge",
    "keywords": ["key terms that drive engagement"],
    "sentiment": "controversial|inspiring|educational|entertaining|provocative|nostalgic|urgent|mysterious|aspirational|raw",
    "predictedScore": 0-100,
    "format": "post|carousel|reel|story|video",
    "niche": "identified content niche",
    "targetAudience": "who this appeals to"
  },
  "aestheticDNA": {
    "tone": ["array: edgy, chill, energetic, sincere, playful, confident, sarcastic, intense, nostalgic, provocative"],
    "voice": "conversational|authoritative|conspiratorial|vulnerable|mentor|friend|expert|provocateur",
    "complexity": "simple|moderate|sophisticated",
    "style": ["stylistic markers: minimalist, bold, aesthetic, raw, polished, chaotic, clean"],
    "tasteScore": 0-100,
    "emotionalTriggers": ["what emotions this evokes"],
    "pacing": "fast|medium|slow"
  }
}`
      }]
    });

    const jsonMatch = response.content[0].text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return patternBasedAnalysis(text, mediaType);
  } catch (error) {
    console.error('[Intelligence] Analysis error:', error.message);
    return patternBasedAnalysis(text, mediaType);
  }
}

/**
 * Pattern-based analysis fallback (no API required)
 */
function patternBasedAnalysis(text, mediaType) {
  const lowerText = text.toLowerCase();

  // Detect hooks
  const hooks = [];
  if (text.includes('?')) hooks.push('question');
  if (/\d+/.test(text)) hooks.push('statistic');
  if (/how to|how i/i.test(text)) hooks.push('how-to');
  if (/secret|nobody|most people don't/i.test(text)) hooks.push('curiosity-gap');
  if (/stop|don't|never/i.test(text)) hooks.push('controversy');
  if (/i |my |me /i.test(text)) hooks.push('personal');
  if (/you need|you should|you must/i.test(text)) hooks.push('urgency');

  // Detect sentiment
  let sentiment = 'entertaining';
  if (/learn|teach|explain|understand/i.test(lowerText)) sentiment = 'educational';
  if (/inspire|dream|achieve|success/i.test(lowerText)) sentiment = 'inspiring';
  if (/controversial|debate|unpopular|hot take/i.test(lowerText)) sentiment = 'controversial';
  if (/remember|nostalgia|throwback|old school/i.test(lowerText)) sentiment = 'nostalgic';

  // Detect tone
  const tone = [];
  if (/lol|haha|funny|joke/i.test(lowerText)) tone.push('playful');
  if (/serious|important|critical/i.test(lowerText)) tone.push('intense');
  if (/chill|relax|vibe|easy/i.test(lowerText)) tone.push('chill');
  if (/energy|excited|amazing|incredible/i.test(lowerText)) tone.push('energetic');
  if (tone.length === 0) tone.push('neutral');

  // Detect structure
  let structure = 'statement';
  if (text.includes('?')) structure = 'question';
  if (/\d+\.|step \d|first|second|third/i.test(text)) structure = 'listicle';
  if (/vs|versus|compared to|better than/i.test(text)) structure = 'comparison';
  if (/how to|guide|tutorial/i.test(text)) structure = 'how-to';

  // Extract keywords (simple extraction)
  const words = text.split(/\s+/).filter(w => w.length > 4);
  const keywords = [...new Set(words.slice(0, 10))];

  // Calculate scores based on patterns
  let predictedScore = 50;
  predictedScore += hooks.length * 5; // More hooks = higher engagement
  predictedScore += text.includes('?') ? 10 : 0; // Questions engage
  predictedScore += /\d+/.test(text) ? 5 : 0; // Numbers attract attention
  predictedScore = Math.min(100, Math.max(0, predictedScore));

  return {
    performanceDNA: {
      hooks: hooks.length > 0 ? hooks : ['statement'],
      structure,
      keywords,
      sentiment,
      predictedScore,
      format: mediaType || 'post',
      niche: 'general',
      targetAudience: 'general'
    },
    aestheticDNA: {
      tone,
      voice: 'conversational',
      complexity: text.length > 200 ? 'sophisticated' : text.length > 50 ? 'moderate' : 'simple',
      style: ['authentic'],
      tasteScore: 50 + (hooks.length * 3),
      emotionalTriggers: tone,
      pacing: 'medium'
    }
  };
}

/**
 * Score content against a Taste Profile
 * Returns how well content matches creator's winning patterns
 */
async function scoreAgainstProfile(content, tasteProfile) {
  if (!tasteProfile) {
    return {
      overallScore: 50,
      performanceScore: 50,
      tasteScore: 50,
      feedback: ['No taste profile available for comparison']
    };
  }

  // Analyze the content
  const analysis = await analyzeContent(content);
  const { performanceDNA, aestheticDNA } = analysis;

  // Compare against taste profile patterns
  const profilePerformance = tasteProfile.performancePatterns || {};
  const profileAesthetic = tasteProfile.aestheticPatterns || {};

  // Calculate performance alignment
  let performanceScore = 50;
  const feedback = [];

  // Hook alignment
  const preferredHooks = profilePerformance.hooks || [];
  const hookMatches = performanceDNA.hooks.filter(h => preferredHooks.includes(h));
  performanceScore += hookMatches.length * 10;
  if (hookMatches.length > 0) {
    feedback.push(`Uses ${hookMatches.length} of your winning hook types`);
  }

  // Sentiment alignment
  const preferredSentiments = profilePerformance.sentiment || [];
  if (preferredSentiments.includes(performanceDNA.sentiment)) {
    performanceScore += 15;
    feedback.push(`Matches your preferred "${performanceDNA.sentiment}" sentiment`);
  }

  // Structure alignment
  const preferredStructures = profilePerformance.structure || [];
  if (preferredStructures.includes(performanceDNA.structure)) {
    performanceScore += 10;
  }

  // Calculate taste/aesthetic alignment
  let tasteScore = 50;

  // Tone alignment
  const preferredTones = profileAesthetic.dominantTones || [];
  const avoidTones = profileAesthetic.avoidTones || [];
  const toneMatches = aestheticDNA.tone.filter(t => preferredTones.includes(t));
  const toneClashes = aestheticDNA.tone.filter(t => avoidTones.includes(t));

  tasteScore += toneMatches.length * 10;
  tasteScore -= toneClashes.length * 15;

  if (toneMatches.length > 0) {
    feedback.push(`Tone matches your style: ${toneMatches.join(', ')}`);
  }
  if (toneClashes.length > 0) {
    feedback.push(`Warning: Uses tones you typically avoid: ${toneClashes.join(', ')}`);
  }

  // Voice alignment
  const preferredVoice = profileAesthetic.voice || 'conversational';
  if (aestheticDNA.voice === preferredVoice) {
    tasteScore += 10;
  }

  // Normalize scores
  performanceScore = Math.min(100, Math.max(0, performanceScore));
  tasteScore = Math.min(100, Math.max(0, tasteScore));
  const overallScore = Math.round((performanceScore + tasteScore) / 2);

  return {
    overallScore,
    performanceScore,
    tasteScore,
    feedback,
    analysis
  };
}

/**
 * Generate content variants in creator's voice
 */
async function generateVariants(topic, tasteProfile, options = {}) {
  const { platform = 'instagram', count = 5, language = 'en' } = options;

  if (!anthropic) {
    return {
      variants: generateFallbackVariants(topic, count),
      message: 'Using template-based generation (API not configured)'
    };
  }

  // Build taste context from profile
  const tasteContext = buildTasteContext(tasteProfile);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `You are a creative director helping a content creator write hooks and captions.

CREATOR'S TASTE PROFILE:
${tasteContext}

TASK: Generate ${count} unique hooks/captions for this topic: "${topic}"

PLATFORM: ${platform}
LANGUAGE: ${language}

RULES:
1. Match the creator's voice and tone preferences
2. Use their preferred hook types
3. Vary the approaches (different hooks, angles, emotions)
4. Each should be immediately attention-grabbing
5. Keep platform norms in mind (${platform === 'tiktok' ? 'punchy, trend-aware' : platform === 'instagram' ? 'aesthetic, engaging' : 'professional, value-driven'})

Return ONLY valid JSON array:
[
  {
    "variant": "The hook/caption text",
    "hookType": "question|bold-claim|how-to|story|statistic|controversy|curiosity-gap",
    "tone": "the primary tone used",
    "performanceScore": 0-100,
    "tasteScore": 0-100,
    "reasoning": "Brief explanation of why this works for this creator"
  }
]`
      }]
    });

    const jsonMatch = response.content[0].text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return {
        variants: JSON.parse(jsonMatch[0]),
        message: 'Generated using AI in your voice'
      };
    }

    return {
      variants: generateFallbackVariants(topic, count),
      message: 'Using template-based generation'
    };
  } catch (error) {
    console.error('[Intelligence] Generation error:', error.message);
    return {
      variants: generateFallbackVariants(topic, count),
      message: 'Using template-based generation (API error)'
    };
  }
}

/**
 * Build taste context string from profile
 */
function buildTasteContext(tasteProfile) {
  if (!tasteProfile) {
    return 'No taste profile available - use general best practices.';
  }

  const perf = tasteProfile.performancePatterns || {};
  const aes = tasteProfile.aestheticPatterns || {};
  const voice = tasteProfile.voiceSignature || {};

  let context = `
Preferred Hooks: ${(perf.hooks || ['question', 'how-to']).join(', ')}
Winning Sentiments: ${(perf.sentiment || ['educational', 'entertaining']).join(', ')}
Dominant Tones: ${(aes.dominantTones || ['authentic']).join(', ')}
Tones to Avoid: ${(aes.avoidTones || []).join(', ') || 'none specified'}
Voice Style: ${aes.voice || 'conversational'}
Complexity Level: ${aes.complexity || 'moderate'}
Sentence Patterns: ${(voice.sentencePatterns || ['varied']).join(', ')}
Rhetorical Devices: ${(voice.rhetoricalDevices || ['questions']).join(', ')}
  `.trim();

  // Append character context if provided (from Boveda character system)
  if (tasteProfile.characterContext) {
    context += `\n\nCHARACTER IDENTITY:\n${tasteProfile.characterContext}`;
  }

  return context;
}

/**
 * Fallback variant generation without API
 */
function generateFallbackVariants(topic, count) {
  const templates = [
    { prefix: "The truth about ", hookType: "curiosity-gap" },
    { prefix: "How to ", suffix: " (that actually works)", hookType: "how-to" },
    { prefix: "Stop doing this with your ", hookType: "controversy" },
    { prefix: "3 things I wish I knew about ", hookType: "listicle" },
    { prefix: "Why ", suffix: " is changing everything", hookType: "bold-claim" },
    { prefix: "Nobody talks about this ", suffix: " secret", hookType: "curiosity-gap" },
    { prefix: "I tried ", suffix: " for 30 days. Here's what happened", hookType: "story" },
    { prefix: "The #1 mistake people make with ", hookType: "controversy" },
  ];

  const variants = [];
  for (let i = 0; i < Math.min(count, templates.length); i++) {
    const t = templates[i];
    variants.push({
      variant: `${t.prefix}${topic}${t.suffix || ''}`,
      hookType: t.hookType,
      tone: 'confident',
      performanceScore: 60 + Math.floor(Math.random() * 20),
      tasteScore: 50 + Math.floor(Math.random() * 20),
      reasoning: 'Template-based generation'
    });
  }
  return variants;
}

/**
 * Analyze why content performed well or poorly
 */
async function analyzePerformance(content, actualMetrics, predictedScore) {
  const analysis = await analyzeContent(content);

  const performanceGap = (actualMetrics.engagementRate || 0) * 100 - predictedScore;

  let insights = [];

  if (performanceGap > 20) {
    insights.push({
      type: 'outperformed',
      message: 'This content significantly outperformed predictions',
      learnings: [
        `The ${analysis.performanceDNA.hooks[0] || 'hook'} approach resonated well`,
        `${analysis.performanceDNA.sentiment} content is working for your audience`,
        'Consider using similar patterns in future content'
      ]
    });
  } else if (performanceGap < -20) {
    insights.push({
      type: 'underperformed',
      message: 'This content underperformed predictions',
      learnings: [
        'The hook may not have been strong enough',
        'Consider testing different approaches',
        'Review what top performers in this niche are doing'
      ]
    });
  } else {
    insights.push({
      type: 'expected',
      message: 'Performance matched predictions',
      learnings: ['Consistent with your typical content patterns']
    });
  }

  return {
    predicted: predictedScore,
    actual: actualMetrics,
    gap: performanceGap,
    analysis,
    insights
  };
}

/**
 * Update taste profile based on content performance
 */
function updateTasteProfile(currentProfile, content, actualMetrics) {
  const analysis = content.analysis || {};
  const performanceDNA = analysis.performanceDNA || {};
  const aestheticDNA = analysis.aestheticDNA || {};

  // Clone current profile
  const updatedProfile = JSON.parse(JSON.stringify(currentProfile || {
    performancePatterns: { hooks: [], sentiment: [], structure: [], keywords: [] },
    aestheticPatterns: { dominantTones: [], avoidTones: [], voice: 'conversational' },
    voiceSignature: { sentencePatterns: [], rhetoricalDevices: [] },
    confidence: 0,
    itemCount: 0
  }));

  // Determine if this was a win or loss
  const engagementRate = actualMetrics.engagementRate || 0;
  const isWin = engagementRate > 0.05; // 5%+ engagement is a win

  if (isWin) {
    // Reinforce winning patterns
    if (performanceDNA.hooks) {
      performanceDNA.hooks.forEach(hook => {
        if (!updatedProfile.performancePatterns.hooks.includes(hook)) {
          updatedProfile.performancePatterns.hooks.push(hook);
        }
      });
    }
    if (performanceDNA.sentiment) {
      if (!updatedProfile.performancePatterns.sentiment.includes(performanceDNA.sentiment)) {
        updatedProfile.performancePatterns.sentiment.push(performanceDNA.sentiment);
      }
    }
    if (aestheticDNA.tone) {
      aestheticDNA.tone.forEach(tone => {
        if (!updatedProfile.aestheticPatterns.dominantTones.includes(tone)) {
          updatedProfile.aestheticPatterns.dominantTones.push(tone);
        }
        // Remove from avoid list if present
        const avoidIndex = updatedProfile.aestheticPatterns.avoidTones.indexOf(tone);
        if (avoidIndex > -1) {
          updatedProfile.aestheticPatterns.avoidTones.splice(avoidIndex, 1);
        }
      });
    }
  } else {
    // Learn from losses - add to avoid patterns
    if (aestheticDNA.tone) {
      aestheticDNA.tone.forEach(tone => {
        if (!updatedProfile.aestheticPatterns.avoidTones.includes(tone) &&
            !updatedProfile.aestheticPatterns.dominantTones.includes(tone)) {
          updatedProfile.aestheticPatterns.avoidTones.push(tone);
        }
      });
    }
  }

  // Update confidence
  updatedProfile.itemCount = (updatedProfile.itemCount || 0) + 1;
  updatedProfile.confidence = Math.min(0.95, Math.log10(updatedProfile.itemCount + 1) / 2);
  updatedProfile.lastUpdated = new Date();

  return updatedProfile;
}

/**
 * Get trending topics/formats in a niche
 */
async function getTrendingInNiche(niche, platform) {
  // This would ideally connect to platform APIs or trend databases
  // For now, return curated suggestions
  const trends = {
    'creator': ['day in my life', 'get ready with me', 'studio tour', 'workflow breakdown'],
    'tech': ['AI tools', 'productivity hacks', 'app reviews', 'setup tours'],
    'fitness': ['workout splits', 'what I eat in a day', 'form checks', 'transformation'],
    'music': ['production tips', 'sample breakdowns', 'studio sessions', 'gear reviews'],
    'business': ['revenue breakdowns', 'tool stacks', 'morning routines', 'lessons learned'],
    'general': ['hot takes', 'unpopular opinions', 'things I learned', 'mistakes to avoid']
  };

  return {
    niche,
    platform,
    trending: trends[niche] || trends['general'],
    updated: new Date()
  };
}

/**
 * Update taste profile based on user rating of generated content
 * This is the Refyn-style learning system
 */
function updateTasteFromRating(currentProfile, content, rating, feedback = {}) {
  // Clone current profile
  const updatedProfile = JSON.parse(JSON.stringify(currentProfile || {
    performancePatterns: { hooks: [], sentiment: [], structure: [], keywords: [] },
    aestheticPatterns: { dominantTones: [], avoidTones: [], voice: 'conversational' },
    voiceSignature: { sentencePatterns: [], rhetoricalDevices: [] },
    ratingLearning: { likedHooks: {}, likedTones: {}, dislikedHooks: {}, dislikedTones: {} },
    confidence: 0,
    itemCount: 0,
    ratingCount: 0,
  }));

  // Initialize rating learning if not present
  if (!updatedProfile.ratingLearning) {
    updatedProfile.ratingLearning = {
      likedHooks: {},
      likedTones: {},
      dislikedHooks: {},
      dislikedTones: {},
    };
  }

  const hookType = content.hookType;
  const tone = content.tone;

  // High rating (4-5 stars) = reinforce patterns
  if (rating >= 4) {
    // Track liked hooks
    if (hookType) {
      updatedProfile.ratingLearning.likedHooks[hookType] =
        (updatedProfile.ratingLearning.likedHooks[hookType] || 0) + rating;

      // Add to preferred hooks if strongly liked
      if (!updatedProfile.performancePatterns.hooks.includes(hookType)) {
        updatedProfile.performancePatterns.hooks.push(hookType);
      }
    }

    // Track liked tones
    if (tone) {
      updatedProfile.ratingLearning.likedTones[tone] =
        (updatedProfile.ratingLearning.likedTones[tone] || 0) + rating;

      // Add to dominant tones if strongly liked
      if (!updatedProfile.aestheticPatterns.dominantTones.includes(tone)) {
        updatedProfile.aestheticPatterns.dominantTones.push(tone);
      }

      // Remove from avoid list if present
      const avoidIndex = updatedProfile.aestheticPatterns.avoidTones.indexOf(tone);
      if (avoidIndex > -1) {
        updatedProfile.aestheticPatterns.avoidTones.splice(avoidIndex, 1);
      }
    }
  }

  // Low rating (1-2 stars) = learn to avoid
  if (rating <= 2) {
    // Track disliked hooks
    if (hookType) {
      updatedProfile.ratingLearning.dislikedHooks[hookType] =
        (updatedProfile.ratingLearning.dislikedHooks[hookType] || 0) + (3 - rating);

      // Remove from preferred if consistently disliked
      const dislikeCount = updatedProfile.ratingLearning.dislikedHooks[hookType];
      if (dislikeCount >= 3) {
        const idx = updatedProfile.performancePatterns.hooks.indexOf(hookType);
        if (idx > -1) {
          updatedProfile.performancePatterns.hooks.splice(idx, 1);
        }
      }
    }

    // Track disliked tones
    if (tone) {
      updatedProfile.ratingLearning.dislikedTones[tone] =
        (updatedProfile.ratingLearning.dislikedTones[tone] || 0) + (3 - rating);

      // Add to avoid list if not in dominant tones
      if (!updatedProfile.aestheticPatterns.dominantTones.includes(tone) &&
          !updatedProfile.aestheticPatterns.avoidTones.includes(tone)) {
        updatedProfile.aestheticPatterns.avoidTones.push(tone);
      }
    }
  }

  // Process explicit feedback
  if (feedback.liked) {
    feedback.liked.forEach(item => {
      if (item === 'hook' && hookType) {
        updatedProfile.ratingLearning.likedHooks[hookType] =
          (updatedProfile.ratingLearning.likedHooks[hookType] || 0) + 2;
      }
      if (item === 'tone' && tone) {
        updatedProfile.ratingLearning.likedTones[tone] =
          (updatedProfile.ratingLearning.likedTones[tone] || 0) + 2;
      }
    });
  }

  if (feedback.disliked) {
    feedback.disliked.forEach(item => {
      if (item === 'hook' && hookType) {
        updatedProfile.ratingLearning.dislikedHooks[hookType] =
          (updatedProfile.ratingLearning.dislikedHooks[hookType] || 0) + 2;
      }
      if (item === 'tone' && tone) {
        updatedProfile.ratingLearning.dislikedTones[tone] =
          (updatedProfile.ratingLearning.dislikedTones[tone] || 0) + 2;
      }
    });
  }

  // Update confidence based on ratings
  updatedProfile.ratingCount = (updatedProfile.ratingCount || 0) + 1;
  updatedProfile.confidence = Math.min(0.95, Math.log10(updatedProfile.ratingCount + 1) / 2);
  updatedProfile.lastRatedAt = new Date();

  return updatedProfile;
}

/**
 * Generate YouTube-specific content (titles, descriptions, tags)
 */
async function generateYouTubeContent(topic, tasteProfile, options = {}) {
  const { videoType = 'standard', count = 5, language = 'en' } = options;

  if (!anthropic) {
    return {
      variants: generateFallbackYouTubeContent(topic, count),
      message: 'Using template-based generation (API not configured)'
    };
  }

  // Build taste context from profile
  const tasteContext = buildTasteContext(tasteProfile);

  // Video type specific guidance
  const typeGuidance = {
    'short': 'YouTube Shorts (vertical, under 60 seconds, punchy hooks)',
    'standard': 'Standard YouTube video (8-15 minutes, value-packed)',
    'long': 'Long-form content (20+ minutes, deep dive)',
    'tutorial': 'Tutorial/How-to video (step-by-step, educational)',
    'vlog': 'Vlog style (personal, day-in-life, authentic)',
  };

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `You are a YouTube content strategist helping a creator optimize their video metadata.

CREATOR'S TASTE PROFILE:
${tasteContext}

TASK: Generate ${count} complete YouTube video packages for this topic: "${topic}"

VIDEO TYPE: ${typeGuidance[videoType] || typeGuidance['standard']}
LANGUAGE: ${language}

RULES:
1. Titles should be 50-70 characters, click-worthy but not clickbait
2. Descriptions should be 2-3 sentences for the preview, SEO-optimized
3. Include relevant tags (8-12 tags)
4. Match the creator's voice and style
5. Consider searchability and trending patterns

Return ONLY valid JSON array:
[
  {
    "title": "The video title",
    "description": "2-3 sentence description that appears in search results and below the video",
    "tags": ["tag1", "tag2", "tag3"],
    "hookType": "question|bold-claim|how-to|story|statistic|controversy|curiosity-gap",
    "tone": "the primary tone",
    "thumbnailIdea": "Brief description of an effective thumbnail concept",
    "performanceScore": 0-100,
    "tasteScore": 0-100,
    "reasoning": "Why this would perform well"
  }
]`
      }]
    });

    const jsonMatch = response.content[0].text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return {
        variants: JSON.parse(jsonMatch[0]),
        message: 'Generated using AI in your voice'
      };
    }

    return {
      variants: generateFallbackYouTubeContent(topic, count),
      message: 'Using template-based generation'
    };
  } catch (error) {
    console.error('[Intelligence] YouTube generation error:', error.message);
    return {
      variants: generateFallbackYouTubeContent(topic, count),
      message: 'Using template-based generation (API error)'
    };
  }
}

/**
 * Fallback YouTube content generation without API
 */
function generateFallbackYouTubeContent(topic, count) {
  const templates = [
    {
      prefix: "I Tried ",
      suffix: " For 30 Days - Here's What Happened",
      hookType: "story",
      thumbnailIdea: "Before/after split with shocked expression"
    },
    {
      prefix: "The Truth About ",
      suffix: " (Nobody Talks About This)",
      hookType: "curiosity-gap",
      thumbnailIdea: "Serious face with redacted text overlay"
    },
    {
      prefix: "How To ",
      suffix: " (Complete Guide)",
      hookType: "how-to",
      thumbnailIdea: "Step-by-step visual with checkmarks"
    },
    {
      prefix: "Why ",
      suffix: " Is Changing Everything in 2024",
      hookType: "bold-claim",
      thumbnailIdea: "Mind-blown expression with topic graphic"
    },
    {
      prefix: "5 ",
      suffix: " Mistakes You're Making Right Now",
      hookType: "controversy",
      thumbnailIdea: "X marks with numbered list preview"
    },
  ];

  const variants = [];
  for (let i = 0; i < Math.min(count, templates.length); i++) {
    const t = templates[i];
    variants.push({
      title: `${t.prefix}${topic}${t.suffix}`,
      description: `In this video, I share everything about ${topic}. Whether you're a beginner or advanced, you'll learn valuable insights that can help you succeed.`,
      tags: [topic.toLowerCase(), 'tips', 'guide', 'how to', '2024', 'tutorial', 'advice', 'learn'],
      hookType: t.hookType,
      tone: 'confident',
      thumbnailIdea: t.thumbnailIdea,
      performanceScore: 60 + Math.floor(Math.random() * 20),
      tasteScore: 50 + Math.floor(Math.random() * 20),
      reasoning: 'Template-based generation'
    });
  }
  return variants;
}

module.exports = {
  analyzeContent,
  scoreAgainstProfile,
  generateVariants,
  analyzePerformance,
  updateTasteProfile,
  updateTasteFromRating,
  generateYouTubeContent,
  getTrendingInNiche,
  DEFAULT_PERFORMANCE_DNA,
  DEFAULT_AESTHETIC_DNA
};
