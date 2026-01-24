/**
 * Reading time calculation utility
 *
 * Calculates estimated reading time based on word count.
 * Uses 220 words/minute as baseline (academic reading pace).
 */

const WORDS_PER_MINUTE = 220;

/**
 * Calculate reading time from content string
 * @param content - The text content to analyze
 * @returns Estimated reading time in minutes (rounded up)
 */
export function calculateReadingTime(content: string): number {
  if (!content || typeof content !== 'string') {
    return 1;
  }

  // Split on whitespace and filter empty strings
  const words = content.split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;

  // Calculate minutes, minimum 1 minute
  const minutes = Math.ceil(wordCount / WORDS_PER_MINUTE);

  return Math.max(1, minutes);
}

/**
 * Format reading time for display
 * @param minutes - Reading time in minutes
 * @returns Formatted string (e.g., "8 min read")
 */
export function formatReadingTime(minutes: number): string {
  return `${minutes} min read`;
}

/**
 * Get reading time with word count
 * @param content - The text content to analyze
 * @returns Object with wordCount, minutes, and formatted display string
 */
export function getReadingTimeDetails(content: string): {
  wordCount: number;
  minutes: number;
  display: string;
  displayWithWords: string;
} {
  const words = content?.split(/\s+/).filter(word => word.length > 0) || [];
  const wordCount = words.length;
  const minutes = Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));

  return {
    wordCount,
    minutes,
    display: `${minutes} min read`,
    displayWithWords: `${wordCount.toLocaleString()} words - ${minutes} min read`
  };
}
