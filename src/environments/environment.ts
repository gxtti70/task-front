import { stripeBuildConfig } from './stripe-build-config.generated';

export const environment = {
  production: false,
  apiUrl: '/api',
  billingSimulate: true,
  stripePublishableKey: stripeBuildConfig.publishableKey
};
