/**
 * Course and lecture names are often English ("Java", "Big Data") inside Arabic UI. Marking
 * them lang="en" gets them the Latin display face and correct screen-reader pronunciation.
 */
export const langOf = (text: string): 'en' | undefined => (text && !/[؀-ۿ]/.test(text) ? 'en' : undefined);
