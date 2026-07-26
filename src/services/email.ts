/**
 * E-posta doğrulama kodu gönderimi (EmailJS).
 *
 * Gerekli env (.env dosyası):
 *   EXPO_PUBLIC_EMAILJS_SERVICE_ID
 *   EXPO_PUBLIC_EMAILJS_TEMPLATE_ID
 *   EXPO_PUBLIC_EMAILJS_PUBLIC_KEY
 *   EXPO_PUBLIC_EMAILJS_PRIVATE_KEY  (mobil için önerilir)
 *
 * Template değişkenleri: to_email, to_name, otp_code
 * Anahtar yoksa demo: kod Alert ile gösterilir.
 */

export type OtpEmailResult = {
  ok: true;
  code: string;
  demo: boolean;
};

export function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sendOtpEmail(input: {
  email: string;
  name: string;
}): Promise<OtpEmailResult> {
  const code = generateOtpCode();
  const serviceId = process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID?.trim();
  const templateId = process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID?.trim();
  const publicKey = process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY?.trim();
  const privateKey = process.env.EXPO_PUBLIC_EMAILJS_PRIVATE_KEY?.trim();

  if (!serviceId || !templateId || !publicKey) {
    await new Promise((r) => setTimeout(r, 350));
    return { ok: true, code, demo: true };
  }

  const body: Record<string, unknown> = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: {
      to_email: input.email,
      to_name: input.name,
      otp_code: code,
    },
  };

  // Mobil / Expo için private key (accessToken) gerekir
  if (privateKey) {
    body.accessToken = privateKey;
  }

  const response = await fetch(
    'https://api.emailjs.com/api/v1.0/email/send',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || 'E-posta gönderilemedi.');
  }

  return { ok: true, code, demo: false };
}
