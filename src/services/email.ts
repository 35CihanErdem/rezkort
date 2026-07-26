import Constants from 'expo-constants';

/**
 * E-posta doğrulama kodu (EmailJS).
 * Anahtarlar app.config.js → extra.emailjs üzerinden gelir.
 */

type EmailjsConfig = {
  serviceId: string;
  templateId: string;
  publicKey: string;
  privateKey: string;
};

export type OtpEmailResult = {
  ok: true;
  code: string;
  demo: boolean;
};

function getEmailjsConfig(): EmailjsConfig {
  const fromExtra = Constants.expoConfig?.extra?.emailjs as
    | Partial<EmailjsConfig>
    | undefined;

  return {
    serviceId:
      fromExtra?.serviceId ||
      process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID?.trim() ||
      '',
    templateId:
      fromExtra?.templateId ||
      process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID?.trim() ||
      '',
    publicKey:
      fromExtra?.publicKey ||
      process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY?.trim() ||
      '',
    privateKey:
      fromExtra?.privateKey ||
      process.env.EXPO_PUBLIC_EMAILJS_PRIVATE_KEY?.trim() ||
      '',
  };
}

export function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sendOtpEmail(input: {
  email: string;
  name: string;
}): Promise<OtpEmailResult> {
  const code = generateOtpCode();
  const { serviceId, templateId, publicKey, privateKey } = getEmailjsConfig();

  if (!serviceId || !templateId || !publicKey) {
    await new Promise((r) => setTimeout(r, 350));
    return { ok: true, code, demo: true };
  }

  if (!privateKey) {
    throw new Error(
      'EmailJS private key yüklenmedi. Expo’yu npx expo start -c ile yeniden başlat.',
    );
  }

  const response = await fetch(
    'https://api.emailjs.com/api/v1.0/email/send',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        accessToken: privateKey,
        template_params: {
          email: input.email,
          to_email: input.email,
          to_name: input.name,
          otp_code: code,
        },
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || 'E-posta gönderilemedi.');
  }

  return { ok: true, code, demo: false };
}
