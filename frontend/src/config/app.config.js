import { env } from './env';

export const appConfig = Object.freeze({
  name: env.appName,
  version: env.appVersion,
  defaultLocale: 'en-IN',
  defaultCurrency: 'USD',
  defaultPageSize: 10,
  supportEmail: 'support@trexlaunchpad.dev',
  companyName: 'T-REX Capital Market',
});
