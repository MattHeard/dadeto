export const DEFAULT_ADMIN_ENDPOINTS = {
  triggerRenderContentsUrl:
    'https://europe-west1-irien-465710.cloudfunctions.net/prod-trigger-render-contents',
  markVariantDirtyUrl:
    'https://europe-west1-irien-465710.cloudfunctions.net/prod-mark-variant-dirty',
  generateStatsUrl:
    'https://europe-west1-irien-465710.cloudfunctions.net/prod-generate-stats',
};

/**
 * Normalize static config into admin endpoints with production fallbacks.
 * @param {Record<string, string>} config
 * @returns {{triggerRenderContentsUrl: string, markVariantDirtyUrl: string, generateStatsUrl: string}}
 */
export function mapConfigToAdminEndpoints(config) {
  return {
    triggerRenderContentsUrl:
      config?.triggerRenderContentsUrl ??
      DEFAULT_ADMIN_ENDPOINTS.triggerRenderContentsUrl,
    markVariantDirtyUrl:
      config?.markVariantDirtyUrl ?? DEFAULT_ADMIN_ENDPOINTS.markVariantDirtyUrl,
    generateStatsUrl:
      config?.generateStatsUrl ?? DEFAULT_ADMIN_ENDPOINTS.generateStatsUrl,
  };
}
