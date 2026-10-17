import { stripeBuildConfig } from './stripe-build-config.generated';

export const environment = {
  production: true,
  apiUrl: '/api',
  billingSimulate: false,
  stripePublishableKey: stripeBuildConfig.publishableKey
};
