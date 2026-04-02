export type AspectRatio = '1:1' | '4:5' | '9:16' | '16:9' | '1.91:1' | 'any'

export interface FormatRule {
  format: string
  platforms: string[]
  aspectRatios: AspectRatio[]
  minWidth: number
  minHeight: number
  isVideo: boolean
}

export interface ValidationResult {
  belowMinResolution: boolean
  incompatiblePlatforms: string[]
  compatiblePlatforms: string[]
  suggestedFormats: string[]
}

export const POST_FORMATS: FormatRule[] = [
  // Instagram
  { format: 'Post',      platforms: ['Instagram'], aspectRatios: ['1:1', '4:5'], minWidth: 1080, minHeight: 1080, isVideo: false },
  { format: 'Carousel',  platforms: ['Instagram'], aspectRatios: ['1:1', '4:5'], minWidth: 1080, minHeight: 1080, isVideo: false },
  { format: 'Story',     platforms: ['Instagram'], aspectRatios: ['9:16'],        minWidth: 1080, minHeight: 1920, isVideo: false },
  { format: 'Reel',      platforms: ['Instagram'], aspectRatios: ['9:16'],        minWidth: 1080, minHeight: 1920, isVideo: true  },
  // Facebook
  { format: 'Post',      platforms: ['Facebook'],  aspectRatios: ['1:1', '4:5'], minWidth: 1080, minHeight: 1080, isVideo: false },
  { format: 'Carousel',  platforms: ['Facebook'],  aspectRatios: ['1:1', '4:5'], minWidth: 1080, minHeight: 1080, isVideo: false },
  { format: 'Story',     platforms: ['Facebook'],  aspectRatios: ['9:16'],        minWidth: 1080, minHeight: 1920, isVideo: false },
  { format: 'Reel',      platforms: ['Facebook'],  aspectRatios: ['9:16'],        minWidth: 1080, minHeight: 1920, isVideo: true  },
  // TikTok
  { format: 'Post',      platforms: ['TikTok'],    aspectRatios: ['9:16'],        minWidth: 1080, minHeight: 1920, isVideo: false },
  { format: 'Video',     platforms: ['TikTok'],    aspectRatios: ['9:16'],        minWidth: 1080, minHeight: 1920, isVideo: true  },
  // LinkedIn — no aspect ratio restriction, minimum 1080px wide
  { format: 'Post',      platforms: ['LinkedIn'],  aspectRatios: ['any'],         minWidth: 1080, minHeight: 0,    isVideo: false },
  { format: 'Carousel',  platforms: ['LinkedIn'],  aspectRatios: ['any'],         minWidth: 1080, minHeight: 0,    isVideo: false },
  { format: 'Story',     platforms: ['LinkedIn'],  aspectRatios: ['9:16'],        minWidth: 1080, minHeight: 1920, isVideo: false },
  { format: 'Video',     platforms: ['LinkedIn'],  aspectRatios: ['16:9'],        minWidth: 1920, minHeight: 1080, isVideo: true  },
  // Twitter/X
  { format: 'Post',      platforms: ['Twitter'],   aspectRatios: ['16:9', '1:1'], minWidth: 1600, minHeight: 900,  isVideo: false },
  { format: 'Video',     platforms: ['Twitter'],   aspectRatios: ['16:9'],        minWidth: 1920, minHeight: 1080, isVideo: true  },
  // YouTube
  { format: 'Thumbnail', platforms: ['YouTube'],   aspectRatios: ['16:9'],        minWidth: 1280, minHeight: 720,  isVideo: false },
  { format: 'Video',     platforms: ['YouTube'],   aspectRatios: ['16:9'],        minWidth: 1920, minHeight: 1080, isVideo: true  },
  { format: 'Short',     platforms: ['YouTube'],   aspectRatios: ['9:16'],        minWidth: 1080, minHeight: 1920, isVideo: true  },
]

export const CUSTOM_FORMATS: FormatRule[] = []

export function getAllFormats(): FormatRule[] {
  return [...POST_FORMATS, ...CUSTOM_FORMATS]
}

export function getAspectRatioForPost(format: string, platforms: string[]): AspectRatio {
  if (format === 'Story' || format === 'Reel') return '9:16'
  if (format === 'Video' || format === 'Thumbnail') return '16:9'
  if (platforms.length > 0 && platforms.every(p => p === 'LinkedIn')) return 'any'
  return '1:1'
}

export function aspectRatioToCSS(ratio: AspectRatio): string {
  switch (ratio) {
    case '1:1':    return '1 / 1'
    case '4:5':    return '4 / 5'
    case '9:16':   return '9 / 16'
    case '16:9':   return '16 / 9'
    case '1.91:1': return '1.91 / 1'
    case 'any':    return 'auto'
  }
}

function getRatioValue(ratio: AspectRatio): number | null {
  switch (ratio) {
    case '1:1':    return 1
    case '4:5':    return 4 / 5
    case '9:16':   return 9 / 16
    case '16:9':   return 16 / 9
    case '1.91:1': return 1.91
    case 'any':    return null
  }
}

function ratioMatches(actualRatio: number, ruleRatios: AspectRatio[]): boolean {
  return ruleRatios.some(r => {
    if (r === 'any') return true
    const expected = getRatioValue(r)
    if (expected === null) return true
    return Math.abs(actualRatio / expected - 1) <= 0.05
  })
}

export function validateUpload(
  width: number,
  height: number,
  isVideo: boolean,
  format: string,
  selectedPlatforms: string[]
): ValidationResult {
  const actualRatio = width / height
  const allFormats = getAllFormats()

  // belowMinResolution: true if width < minWidth for ANY selected platform's rule
  let belowMinResolution = false
  for (const platform of selectedPlatforms) {
    const rule = allFormats.find(r => r.format === format && r.platforms.includes(platform))
    if (rule && width < rule.minWidth) {
      belowMinResolution = true
      break
    }
  }

  // Check aspect ratio compatibility per platform
  const incompatiblePlatforms: string[] = []
  const compatiblePlatforms: string[] = []
  for (const platform of selectedPlatforms) {
    const rule = allFormats.find(r => r.format === format && r.platforms.includes(platform))
    if (!rule) {
      compatiblePlatforms.push(platform)
      continue
    }
    // Skip check if platform rule has 'any'
    if (rule.aspectRatios.includes('any')) {
      compatiblePlatforms.push(platform)
      continue
    }
    if (ratioMatches(actualRatio, rule.aspectRatios)) {
      compatiblePlatforms.push(platform)
    } else {
      incompatiblePlatforms.push(platform)
    }
  }

  // suggestedFormats: other formats whose ratios match the uploaded file
  const suggestedFormats: string[] = []
  const seen = new Set<string>()
  for (const rule of allFormats) {
    if (rule.format === format) continue
    if (seen.has(rule.format)) continue
    if (rule.aspectRatios.includes('any')) continue
    if (ratioMatches(actualRatio, rule.aspectRatios)) {
      suggestedFormats.push(rule.format)
      seen.add(rule.format)
    }
  }

  return { belowMinResolution, incompatiblePlatforms, compatiblePlatforms, suggestedFormats }
}
