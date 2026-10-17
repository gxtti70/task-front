import { stripeBuildConfig } from './stripe-build-config.generated';
import { apiBuildConfig } from './api-build-config.generated';

export const environment = {
  production: true,
  apiUrl: apiBuildConfig.apiUrl,
  billingSimulate: false,
  stripePublishableKey: stripeBuildConfig.publishableKey
};
