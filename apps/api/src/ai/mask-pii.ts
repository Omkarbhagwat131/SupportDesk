const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const SSN_PATTERN = /\b\d{3}[- ]\d{2}[- ]\d{4}\b/g;
const CARD_NUMBER_PATTERN = /\b(?:\d[ -]?){12,18}\d\b/g;
const PHONE_PATTERN = /(?:\+?\d{1,3}[ .-]?)?\b(?:\(\d{2,4}\)|\d{2,4})[ .-]?\d{3,4}[ .-]?\d{3,4}\b/g;

function hasValidLuhnChecksum(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let doubleDigit = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }
  return sum % 10 === 0;
}

export function maskPii(text: string): string {
  return text
    .replace(CARD_NUMBER_PATTERN, (value) => (
      hasValidLuhnChecksum(value) ? "[PAYMENT_CARD]" : value
    ))
    .replace(SSN_PATTERN, "[SSN]")
    .replace(PHONE_PATTERN, "[PHONE]")
    .replace(EMAIL_PATTERN, "[EMAIL]");
}
