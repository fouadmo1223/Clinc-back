export default () => ({
  port: parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/clinic_dev',
  jwt: {
    secret: process.env.JWT_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
    // A separate secret keeps patient-portal tokens cryptographically distinct from staff
    // tokens; falls back to the staff secret so the portal works with zero extra env setup
    // in dev, but production should set PATIENT_JWT_SECRET to a different value.
    patientSecret: process.env.PATIENT_JWT_SECRET ?? process.env.JWT_SECRET,
    patientExpiresIn: process.env.PATIENT_JWT_EXPIRES_IN ?? '30m',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM ?? 'Clinic System <no-reply@example.com>',
  },
  sms: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_FROM_NUMBER,
    // Prefixed onto any local-format number (e.g. "01xxxxxxxxx") that isn't already E.164.
    defaultCountryCode: process.env.SMS_DEFAULT_COUNTRY_CODE ?? '+20',
  },
  appUrl: process.env.APP_URL ?? 'http://localhost:3000',
  apiUrl: process.env.API_URL ?? 'http://localhost:4000',
});
