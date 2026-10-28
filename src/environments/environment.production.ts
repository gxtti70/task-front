import { stripeBuildConfig } from './stripe-build-config.generated';
import { apiBuildConfig } from './api-build-config.generated';
import { billingBuildConfig } from './billing-build-config.generated';

export const environment = {
  production: true,
  apiUrl: apiBuildConfig.apiUrl,
  billingSimulate: billingBuildConfig.simulate,
  stripePublishableKey: stripeBuildConfig.publishableKey
};
