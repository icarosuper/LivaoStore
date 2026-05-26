/**
 * Validates a Brazilian phone number (mobile or landline).
 * Accepts with or without DDI 55.
 * Strips non-digits before checking.
 */
export function isValidBrazilianPhone(raw: string): boolean {
	const digits = raw.replace(/\D/g, "");

	// strip optional DDI 55 only when total length suggests it's present
	const local =
		digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;

	// must be 10 (landline) or 11 (mobile) digits
	if (local.length !== 10 && local.length !== 11) return false;

	// DDD: valid range is 11–99
	const ddd = parseInt(local.slice(0, 2), 10);
	if (ddd < 11) return false;

	const number = local.slice(2);

	// mobile: 9 digits, must start with 9
	if (number.length === 9 && number[0] !== "9") return false;

	// landline: 8 digits, must start with 2–5
	if (number.length === 8 && !/^[2-5]/.test(number)) return false;

	// reject all-same-digit numbers (e.g. 11999999999)
	if (/^(\d)\1+$/.test(local)) return false;

	return true;
}

export function buildWhatsAppUrl(raw: string, message?: string): string {
	const digits = raw.replace(/\D/g, "");
	const withCountry =
		digits.startsWith("55") && digits.length > 11 ? digits : `55${digits}`;
	const base = `https://wa.me/${withCountry}`;
	return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
