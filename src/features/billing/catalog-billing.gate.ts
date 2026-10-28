/**
 * The gateway's two catalog-billing checks, run before a request is forwarded.
 *
 * 1. The catalog service's /internal/* routes are for the gateway's own calls
 *    (billing usage). A third party must never reach them through the proxy,
 *    which attaches the internal service key: refused here as not found. (The
 *    service also refuses any request carrying x-gateway-client-id.)
 *
 * 2. The monthly limit. A catalog generation is refused BEFORE it is forwarded
 *    once the client's month has reached their limit, so a refusal costs no AI
 *    work. Only the women's catalog paths are checked - those are the runs that
 *    are charged (catalogs and colour variants); the men's catalog, Design
 *    Studio and discovery are not charged yet.
 */
import { MicroserviceEnvironment } from '@prisma/client';
import { GatewayError } from '@/lib/gateway/errors';
import { CATALOG_SERVICE_SLUG, LIMIT_REACHED_MESSAGE, checkMonthlyLimit } from './catalog-billing.service';

const BILLED_PATHS = new Set(['api/v1/draping/generate-catalog', 'api/v1/draping/generate-catalog/women']);

const normalise = (segments: string[] | undefined) => (segments || []).filter(Boolean).join('/').toLowerCase();

export async function enforceCatalogBilling(input: {
  slug: string;
  method: string;
  pathSegments: string[] | undefined;
  clientId: string;
  environment: MicroserviceEnvironment;
}): Promise<void> {
  if (input.slug !== CATALOG_SERVICE_SLUG) return;
  const path = normalise(input.pathSegments);

  if (path === 'internal' || path.startsWith('internal/')) {
    throw new GatewayError('NOT_FOUND', 'Not found', 404);
  }

  if (input.method.toUpperCase() !== 'POST' || !BILLED_PATHS.has(path)) return;

  const verdict = await checkMonthlyLimit(input.clientId, {
    targetUrl: input.environment.targetUrl,
    internalSecret: input.environment.internalSecret,
  });
  if (!verdict.allowed) {
    console.warn(`[Billing] monthly limit reached for ${input.clientId}: ${verdict.usedPaise}/${verdict.monthlyLimitPaise} paise; generation refused before forwarding`);
    throw new GatewayError('MONTHLY_LIMIT_REACHED', LIMIT_REACHED_MESSAGE, 402);
  }
}
