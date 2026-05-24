import QRCode from "qrcode";

function lv(id: string, value: string): string {
	const len = value.length.toString().padStart(2, "0");
	return `${id}${len}${value}`;
}

function buildPixPayload(amount: number): string {
	const chave = process.env.NEXT_PUBLIC_PIX_CHAVE ?? "";
	const nome = (process.env.NEXT_PUBLIC_PIX_NOME ?? "").substring(0, 25);
	const cidade = (process.env.NEXT_PUBLIC_PIX_CIDADE ?? "").substring(0, 15);
	const amountStr = amount.toFixed(2);

	const merchantAccountInfo = lv(
		"26",
		lv("00", "BR.GOV.BCB.PIX") + lv("01", chave),
	);

	const payload =
		lv("00", "01") +
		merchantAccountInfo +
		lv("52", "0000") +
		lv("53", "986") +
		lv("54", amountStr) +
		lv("58", "BR") +
		lv("59", nome) +
		lv("60", cidade) +
		lv("62", lv("05", "***")) +
		"6304";

	const crc = crc16(payload);
	return payload + crc;
}

function crc16(str: string): string {
	let crc = 0xffff;
	for (let i = 0; i < str.length; i++) {
		crc ^= str.charCodeAt(i) << 8;
		for (let j = 0; j < 8; j++) {
			crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
		}
	}
	return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

export async function generatePixQRCode(amount: number): Promise<string> {
	const payload = buildPixPayload(amount);
	return QRCode.toDataURL(payload);
}
