"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getPublicFeedProductions,
  FEED_DEFAULT_PAGE_SIZE,
  type FeedResult,
} from "@/lib/queries/feed";

export interface FeedPageRequest {
  search?: string;
  category?: string;
  status?: string;
  provinceId?: string;
  page?: number;
}

/**
 * FUN-06 — Chargement paginé et filtré du flux revendeur (côté serveur).
 *
 * Le contexte territorial du revendeur (éligibilité aux campagnes) est toujours
 * relu côté serveur depuis la session : il n'est jamais transmis par le client.
 * La visibilité des productions reste garantie par la RLS.
 */
export async function loadResellerFeedPageAction(
  request: FeedPageRequest
): Promise<FeedResult> {
  const page = Math.max(1, Math.floor(Number(request?.page) || 1));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      items: [],
      totalCount: 0,
      page,
      pageSize: FEED_DEFAULT_PAGE_SIZE,
      totalPages: 0,
      error: true,
    };
  }

  const { data: reseller } = await supabase
    .from("resellers")
    .select(
      "id, business_name, country_id, province_id, reseller_type, city, delivery_address, provinces(id, name, code), countries(id, name, code)"
    )
    .eq("id", user.id)
    .maybeSingle();

  const asString = (value: unknown) => (typeof value === "string" ? value : undefined);

  return getPublicFeedProductions({
    search: asString(request?.search),
    category: asString(request?.category),
    status: asString(request?.status),
    provinceId: asString(request?.provinceId),
    page,
    pageSize: FEED_DEFAULT_PAGE_SIZE,
    reseller,
    resellerProvinceId: reseller?.province_id,
    resellerCountryId: reseller?.country_id,
  });
}
