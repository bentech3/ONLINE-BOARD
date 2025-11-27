// src/lib/contentModeration.ts

const BANNED_WORDS = [
  'inappropriate',
  'offensive',
  'spam',
  // Add more words as needed
];

const SUSPICIOUS_PATTERNS = [
  /https?:\/\/[^\s]+/gi, // URLs
  /\b\d{10,}\b/g, // Long numbers (potentially phone numbers)
  /[A-Z]{5,}/g, // Excessive caps
];

export const moderateContent = (title: string, content: string) => {
  const issues: string[] = [];
  const combinedText = `${title} ${content}`.toLowerCase();

  // Check for banned words
  const foundBannedWords = BANNED_WORDS.filter(word =>
    combinedText.includes(word.toLowerCase())
  );
  if (foundBannedWords.length > 0) {
    issues.push(`Contains banned words: ${foundBannedWords.join(', ')}`);
  }

  // Check for suspicious patterns
  SUSPICIOUS_PATTERNS.forEach((pattern, index) => {
    if (pattern.test(combinedText)) {
      const descriptions = [
        'Contains URLs',
        'Contains long numbers',
        'Contains excessive capitalization'
      ];
      issues.push(descriptions[index]);
    }
  });

  // Check content length
  if (content.length < 10) {
    issues.push('Content is too short');
  }

  if (content.length > 10000) {
    issues.push('Content is too long');
  }

  // Check for empty or meaningless content
  const meaningfulWords = content.split(/\s+/).filter(word => word.length > 2);
  if (meaningfulWords.length < 3) {
    issues.push('Content appears to lack sufficient meaningful text');
  }

  return {
    approved: issues.length === 0,
    issues,
    severity: issues.length > 2 ? 'high' : issues.length > 0 ? 'medium' : 'low'
  };
};

export const sanitizeContent = (content: string): string => {
  // Basic sanitization - remove excessive whitespace, normalize line breaks
  return content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};