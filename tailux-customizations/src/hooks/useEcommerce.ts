/**
 * Phase 3 eCommerce React hooks — thin wrappers around the eCommerce resource
 * groups exposed by `lmsApi` (cart, checkout, invoices, taxes, subscriptions,
 * payments, refunds, wishlist, revenue, withdrawals, earnings, gateways).
 *
 * Design choices (mirrors `src/hooks/useLms.ts`):
 *   - Plain `useState` + `useEffect` (no React Query).
 *   - Each query hook returns `{ data, loading, error, refetch }`.
 *   - Each mutation hook returns `{ data, loading, error, mutate, reset }`.
 *   - Query hooks that take an `id` skip the fetch while `id` is empty so
 *     they're safe to mount before the route param is populated.
 *   - Query hooks that take `params` refetch when the stringified `params`
 *     change (via the local `argsKey` helper).
 *   - `useIsMounted` + a per-fetch token ref guard against setState-after-
 *     unmount and stale-response-overwrite races.
 *   - List endpoints normalize `T[] | PaginatedResponse<T>` to `T[]` so
 *     callers always get an array (matches the convention in `useLms.ts`).
 *
 * Mutations that operate on a server-side resource pass the resource id at
 * `mutate(...)` time (via the vars object) instead of capturing it at hook
 * construction. This keeps the hooks reusable across rows in a list/table —
 * e.g. `useRemoveFromCart()` can be mounted once and called for any item id.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { useIsMounted } from "@/hooks/useIsMounted";
import type {
  UseLmsMutationResult,
  UseLmsQueryResult,
} from "@/hooks/useLms";
import { lmsApi, type LmsApiError } from "@/services/lms-api";
import type {
  AddToCartInput,
  Cart,
  CheckoutInput,
  CheckoutResult,
  Coupon,
  CouponCreateInput,
  EarningsSummary,
  Invoice,
  ListParams,
  Order,
  OrderActivity,
  PaymentGatewayConfig,
  PaymentTransaction,
  Refund,
  RefundInput,
  RevenueLedgerEntry,
  RevenueReport,
  Subscription,
  SubscriptionPlan,
  SubscriptionPlanCreateInput,
  TaxRate,
  TaxRateCreateInput,
  UpdateCartItemInput,
  WithdrawalRequest,
  WithdrawalRequestInput,
  Wishlist,
} from "@/types/lms";

// ---------------------------------------------------------------------------
// Internal helper: stable fetch key from the args array (mirrors useLms.ts).
// ---------------------------------------------------------------------------

function argsKey(args: unknown[]): string {
  return args
    .map((a) =>
      a === undefined
        ? ""
        : typeof a === "object"
          ? JSON.stringify(a)
          : String(a),
    )
    .join("|");
}

/**
 * Normalize the response of a list endpoint that may return either a bare
 * array or a `PaginatedResponse<T>` envelope into a bare array.
 */
function toList<T>(
  result: T[] | { data?: T[] } | undefined | null,
): T[] {
  if (Array.isArray(result)) return result;
  if (result && typeof result === "object" && "data" in result) {
    return (result as { data?: T[] }).data ?? [];
  }
  return [];
}

// ===========================================================================
// Cart
// ===========================================================================

/**
 * `GET /api/lms/cart` — fetch the current user's active cart.
 */
export function useCart(): UseLmsQueryResult<Cart> {
  const [data, setData] = useState<Cart | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.cart.get();
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => {
    void run();
  }, [run]);

  return { data, loading, error, refetch: run };
}

/**
 * `POST /api/lms/cart/items` — add an item to the cart. Returns the updated cart.
 */
export function useAddToCart(): UseLmsMutationResult<Cart, AddToCartInput> {
  const [data, setData] = useState<Cart | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: AddToCartInput) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.cart.addItem(vars);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `PATCH /api/lms/cart/items/{itemId}` — update an item's quantity.
 * Pass `{ itemId, input }` at `mutate(...)` time so the same hook instance can
 * update any row in the cart list.
 */
export function useUpdateCartItem(): UseLmsMutationResult<
  Cart,
  { itemId: string; input: UpdateCartItemInput }
> {
  const [data, setData] = useState<Cart | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: { itemId: string; input: UpdateCartItemInput }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.cart.updateItem(vars.itemId, vars.input);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `DELETE /api/lms/cart/items/{itemId}` — remove an item from the cart.
 * Pass the `itemId` at `mutate(...)` time.
 */
export function useRemoveFromCart(): UseLmsMutationResult<Cart, string> {
  const [data, setData] = useState<Cart | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (itemId: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.cart.removeItem(itemId);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `DELETE /api/lms/cart` — empty the cart entirely.
 */
export function useClearCart(): UseLmsMutationResult<
  { success: boolean },
  void
> {
  const [data, setData] = useState<{ success: boolean } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.cart.clear();
      if (isMounted()) setData(result);
      return result;
    } catch (err) {
      if (isMounted()) setError(err as LmsApiError);
      return null;
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted]);

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `POST /api/lms/cart/apply-coupon` — apply a coupon code to the cart.
 * Pass the `code` at `mutate(...)` time.
 */
export function useApplyCoupon(): UseLmsMutationResult<Cart, string> {
  const [data, setData] = useState<Cart | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (code: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.cart.applyCoupon(code);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `DELETE /api/lms/cart/coupon` — remove the applied coupon from the cart.
 */
export function useRemoveCoupon(): UseLmsMutationResult<Cart, void> {
  const [data, setData] = useState<Cart | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.cart.removeCoupon();
      if (isMounted()) setData(result);
      return result;
    } catch (err) {
      if (isMounted()) setError(err as LmsApiError);
      return null;
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted]);

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

// ===========================================================================
// Checkout
// ===========================================================================

/**
 * `POST /api/lms/checkout` — initiate a checkout session. Returns a
 * `CheckoutResult` containing either a `paymentUrl` (for hosted gateways) or
 * a `clientSecret` (for Stripe Elements).
 */
export function useCheckout(): UseLmsMutationResult<
  CheckoutResult,
  CheckoutInput
> {
  const [data, setData] = useState<CheckoutResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: CheckoutInput) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.checkout.create(vars);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

// ===========================================================================
// Orders (extends the orderApi surface added in Phase 3)
// ===========================================================================

/**
 * `GET /api/lms/orders/{id}` — fetch a single order with its items.
 *
 * Skips the fetch while `id` is empty so it's safe to mount before the route
 * param is populated.
 */
export function useOrder(id: string | undefined): UseLmsQueryResult<Order> {
  const [data, setData] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(id));
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    if (!id) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.order.get(id);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [id, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([id])]);

  return { data, loading, error, refetch: run };
}

/**
 * `POST /api/lms/orders/{id}/refund` — issue a full or partial refund.
 * Pass `{ orderId, input }` at `mutate(...)` time.
 */
export function useRefundOrder(): UseLmsMutationResult<
  Order,
  { orderId: string; input: RefundInput }
> {
  const [data, setData] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: { orderId: string; input: RefundInput }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.order.refund(vars.orderId, vars.input);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `GET /api/lms/orders/{id}/activity` — audit trail for an order.
 */
export function useOrderActivity(
  orderId: string | undefined,
): UseLmsQueryResult<OrderActivity[]> {
  const [data, setData] = useState<OrderActivity[] | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(orderId));
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    if (!orderId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.order.getActivity(orderId);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [orderId, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([orderId])]);

  return { data, loading, error, refetch: run };
}

/**
 * `GET /api/lms/orders` — list the current user's order history.
 */
export function useOrders(
  params?: ListParams,
): UseLmsQueryResult<Order[]> {
  const [data, setData] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.order.list(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [params, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([params])]);

  return { data, loading, error, refetch: run };
}

// ===========================================================================
// Coupons (admin/instructor)
// ===========================================================================

/**
 * `GET /api/lms/coupons` — list all coupons for the tenant.
 */
export function useCoupons(
  params?: ListParams,
): UseLmsQueryResult<Coupon[]> {
  const [data, setData] = useState<Coupon[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.coupon.list(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [params, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([params])]);

  return { data, loading, error, refetch: run };
}

/**
 * `POST /api/lms/coupons` — create a new coupon.
 */
export function useCreateCoupon(): UseLmsMutationResult<
  Coupon,
  CouponCreateInput
> {
  const [data, setData] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: CouponCreateInput) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.coupon.create(vars);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `DELETE /api/lms/coupons/{id}` — delete a coupon. Pass the `id` at
 * `mutate(...)` time.
 */
export function useDeleteCoupon(): UseLmsMutationResult<
  { success: boolean },
  string
> {
  const [data, setData] = useState<{ success: boolean } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.coupon.delete(id);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

// ===========================================================================
// Invoices
// ===========================================================================

/**
 * `GET /api/lms/invoices` — list invoices for the current user/tenant.
 */
export function useInvoices(
  params?: ListParams,
): UseLmsQueryResult<Invoice[]> {
  const [data, setData] = useState<Invoice[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.invoice.list(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [params, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([params])]);

  return { data, loading, error, refetch: run };
}

/**
 * `GET /api/lms/invoices/{id}` — fetch a single invoice.
 */
export function useInvoice(
  id: string | undefined,
): UseLmsQueryResult<Invoice> {
  const [data, setData] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(id));
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    if (!id) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.invoice.get(id);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [id, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([id])]);

  return { data, loading, error, refetch: run };
}

// ===========================================================================
// Tax Rates
// ===========================================================================

/**
 * `GET /api/lms/taxes` — list configured tax rates.
 */
export function useTaxRates(
  params?: ListParams,
): UseLmsQueryResult<TaxRate[]> {
  const [data, setData] = useState<TaxRate[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.taxRate.list(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [params, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([params])]);

  return { data, loading, error, refetch: run };
}

/**
 * `POST /api/lms/taxes` — create a tax rate.
 */
export function useCreateTaxRate(): UseLmsMutationResult<
  TaxRate,
  TaxRateCreateInput
> {
  const [data, setData] = useState<TaxRate | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: TaxRateCreateInput) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.taxRate.create(vars);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `PATCH /api/lms/taxes/{id}` — update a tax rate.
 * Pass `{ id, input }` at `mutate(...)` time.
 */
export function useUpdateTaxRate(): UseLmsMutationResult<
  TaxRate,
  { id: string; input: Partial<TaxRateCreateInput> }
> {
  const [data, setData] = useState<TaxRate | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: { id: string; input: Partial<TaxRateCreateInput> }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.taxRate.update(vars.id, vars.input);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `DELETE /api/lms/taxes/{id}` — delete a tax rate. Pass the `id` at
 * `mutate(...)` time.
 */
export function useDeleteTaxRate(): UseLmsMutationResult<
  { success: boolean },
  string
> {
  const [data, setData] = useState<{ success: boolean } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.taxRate.delete(id);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

// ===========================================================================
// Subscription Plans (catalog)
// ===========================================================================

/**
 * `GET /api/lms/subscription-plans` — list subscription plans.
 */
export function useSubscriptionPlans(
  params?: ListParams,
): UseLmsQueryResult<SubscriptionPlan[]> {
  const [data, setData] = useState<SubscriptionPlan[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.subscriptionPlan.list(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [params, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([params])]);

  return { data, loading, error, refetch: run };
}

/**
 * `GET /api/lms/subscription-plans/{id}` — fetch a single plan.
 */
export function useSubscriptionPlan(
  id: string | undefined,
): UseLmsQueryResult<SubscriptionPlan> {
  const [data, setData] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(id));
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    if (!id) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.subscriptionPlan.get(id);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [id, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([id])]);

  return { data, loading, error, refetch: run };
}

/**
 * `POST /api/lms/subscription-plans` — create a subscription plan.
 */
export function useCreateSubscriptionPlan(): UseLmsMutationResult<
  SubscriptionPlan,
  SubscriptionPlanCreateInput
> {
  const [data, setData] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: SubscriptionPlanCreateInput) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.subscriptionPlan.create(vars);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `PATCH /api/lms/subscription-plans/{id}` — update a plan.
 * Pass `{ id, input }` at `mutate(...)` time.
 */
export function useUpdateSubscriptionPlan(): UseLmsMutationResult<
  SubscriptionPlan,
  { id: string; input: Partial<SubscriptionPlanCreateInput> }
> {
  const [data, setData] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: {
      id: string;
      input: Partial<SubscriptionPlanCreateInput>;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.subscriptionPlan.update(
          vars.id,
          vars.input,
        );
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `DELETE /api/lms/subscription-plans/{id}` — delete a plan. Pass the `id` at
 * `mutate(...)` time.
 */
export function useDeleteSubscriptionPlan(): UseLmsMutationResult<
  { success: boolean },
  string
> {
  const [data, setData] = useState<{ success: boolean } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.subscriptionPlan.delete(id);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

// ===========================================================================
// Subscriptions (user's active subscriptions)
// ===========================================================================

/**
 * `GET /api/lms/subscriptions` — list the current user's subscriptions.
 */
export function useSubscriptions(
  params?: ListParams,
): UseLmsQueryResult<Subscription[]> {
  const [data, setData] = useState<Subscription[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.subscription.list(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [params, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([params])]);

  return { data, loading, error, refetch: run };
}

/**
 * `POST /api/lms/subscriptions/{id}/cancel` — cancel a subscription.
 * Pass the subscription `id` at `mutate(...)` time.
 */
export function useCancelSubscription(): UseLmsMutationResult<
  Subscription,
  string
> {
  const [data, setData] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.subscription.cancel(id);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `POST /api/lms/subscriptions/{id}/resume` — resume a canceled subscription.
 * Pass the subscription `id` at `mutate(...)` time.
 */
export function useResumeSubscription(): UseLmsMutationResult<
  Subscription,
  string
> {
  const [data, setData] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.subscription.resume(id);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

// ===========================================================================
// Payments
// ===========================================================================

/**
 * `GET /api/lms/payments` — list payment transactions.
 */
export function usePayments(
  params?: ListParams,
): UseLmsQueryResult<PaymentTransaction[]> {
  const [data, setData] = useState<PaymentTransaction[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.payment.list(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [params, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([params])]);

  return { data, loading, error, refetch: run };
}

/**
 * `GET /api/lms/payments/{id}` — fetch a single payment transaction.
 */
export function usePayment(
  id: string | undefined,
): UseLmsQueryResult<PaymentTransaction> {
  const [data, setData] = useState<PaymentTransaction | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(id));
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    if (!id) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.payment.get(id);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [id, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([id])]);

  return { data, loading, error, refetch: run };
}

// ===========================================================================
// Refunds
// ===========================================================================

/**
 * `GET /api/lms/refunds` — list refunds.
 */
export function useRefunds(
  params?: ListParams,
): UseLmsQueryResult<Refund[]> {
  const [data, setData] = useState<Refund[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.refund.list(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [params, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([params])]);

  return { data, loading, error, refetch: run };
}

// ===========================================================================
// Wishlist
// ===========================================================================

/**
 * `GET /api/lms/wishlist` — list the current user's wishlisted courses.
 */
export function useWishlist(): UseLmsQueryResult<Wishlist[]> {
  const [data, setData] = useState<Wishlist[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.wishlist.list();
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => {
    void run();
  }, [run]);

  return { data, loading, error, refetch: run };
}

/**
 * `POST /api/lms/wishlist` — add a course to the wishlist. Pass the `courseId`
 * at `mutate(...)` time.
 */
export function useAddToWishlist(): UseLmsMutationResult<Wishlist, string> {
  const [data, setData] = useState<Wishlist | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (courseId: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.wishlist.add(courseId);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `DELETE /api/lms/wishlist/{id}` — remove a wishlist entry. Pass the wishlist
 * entry `id` at `mutate(...)` time.
 */
export function useRemoveFromWishlist(): UseLmsMutationResult<
  { success: boolean },
  string
> {
  const [data, setData] = useState<{ success: boolean } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.wishlist.remove(id);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

// ===========================================================================
// Revenue (admin)
// ===========================================================================

/**
 * `GET /api/lms/admin/revenue-ledger` — paginated revenue ledger entries.
 */
export function useRevenueLedger(
  params?: ListParams,
): UseLmsQueryResult<RevenueLedgerEntry[]> {
  const [data, setData] = useState<RevenueLedgerEntry[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.revenue.ledger(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [params, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([params])]);

  return { data, loading, error, refetch: run };
}

/**
 * `GET /api/lms/admin/reports/revenue` — aggregated revenue report.
 */
export function useRevenueReport(
  params?: { from?: string; to?: string },
): UseLmsQueryResult<RevenueReport> {
  const [data, setData] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.revenue.report(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [params, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([params])]);

  return { data, loading, error, refetch: run };
}

// ===========================================================================
// Withdrawals
// ===========================================================================

/**
 * `GET /api/lms/instructor/withdrawals` — list the instructor's own withdrawal
 * requests.
 */
export function useWithdrawals(
  params?: ListParams,
): UseLmsQueryResult<WithdrawalRequest[]> {
  const [data, setData] = useState<WithdrawalRequest[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.withdrawal.listMine(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [params, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([params])]);

  return { data, loading, error, refetch: run };
}

/**
 * `POST /api/lms/instructor/withdrawals` — request a new withdrawal.
 */
export function useRequestWithdrawal(): UseLmsMutationResult<
  WithdrawalRequest,
  WithdrawalRequestInput
> {
  const [data, setData] = useState<WithdrawalRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: WithdrawalRequestInput) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.withdrawal.request(vars);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `GET /api/lms/admin/withdrawals` — admin: list all withdrawal requests.
 */
export function useAllWithdrawals(
  params?: ListParams,
): UseLmsQueryResult<WithdrawalRequest[]> {
  const [data, setData] = useState<WithdrawalRequest[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.withdrawal.listAll(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [params, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([params])]);

  return { data, loading, error, refetch: run };
}

/**
 * `POST /api/lms/admin/withdrawals/{id}/approve` — admin: approve a withdrawal.
 * Pass the withdrawal `id` at `mutate(...)` time.
 */
export function useApproveWithdrawal(): UseLmsMutationResult<
  WithdrawalRequest,
  string
> {
  const [data, setData] = useState<WithdrawalRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.withdrawal.approve(id);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `POST /api/lms/admin/withdrawals/{id}/reject` — admin: reject a withdrawal.
 * Pass `{ id, notes? }` at `mutate(...)` time.
 */
export function useRejectWithdrawal(): UseLmsMutationResult<
  WithdrawalRequest,
  { id: string; notes?: string }
> {
  const [data, setData] = useState<WithdrawalRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: { id: string; notes?: string }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.withdrawal.reject(vars.id, vars.notes);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

// ===========================================================================
// Earnings (instructor)
// ===========================================================================

/**
 * `GET /api/lms/instructor/earnings` — aggregated earnings summary with a
 * 12-month series suitable for a dashboard chart.
 */
export function useEarningsSummary(
  params?: { from?: string; to?: string },
): UseLmsQueryResult<EarningsSummary> {
  const [data, setData] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.earnings.summary(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [params, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([params])]);

  return { data, loading, error, refetch: run };
}

/**
 * `GET /api/lms/instructor/statements` — paginated ledger entries for the
 * instructor's earnings statements.
 */
export function useEarningsStatements(
  params?: ListParams,
): UseLmsQueryResult<RevenueLedgerEntry[]> {
  const [data, setData] = useState<RevenueLedgerEntry[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.earnings.statements(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [params, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([params])]);

  return { data, loading, error, refetch: run };
}

// ===========================================================================
// Payment Gateways (tenant admin config)
// ===========================================================================

/**
 * `GET /api/lms/gateways` — list configured payment gateways for the tenant.
 */
export function useGateways(): UseLmsQueryResult<PaymentGatewayConfig[]> {
  const [data, setData] = useState<PaymentGatewayConfig[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.gateway.list();
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => {
    void run();
  }, [run]);

  return { data, loading, error, refetch: run };
}

/**
 * `POST /api/lms/gateways` — register a new payment gateway.
 */
export function useCreateGateway(): UseLmsMutationResult<
  PaymentGatewayConfig,
  Partial<PaymentGatewayConfig>
> {
  const [data, setData] = useState<PaymentGatewayConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: Partial<PaymentGatewayConfig>) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.gateway.create(vars);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `PATCH /api/lms/gateways/{id}` — update gateway config.
 * Pass `{ id, input }` at `mutate(...)` time.
 */
export function useUpdateGateway(): UseLmsMutationResult<
  PaymentGatewayConfig,
  { id: string; input: Partial<PaymentGatewayConfig> }
> {
  const [data, setData] = useState<PaymentGatewayConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: { id: string; input: Partial<PaymentGatewayConfig> }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.gateway.update(vars.id, vars.input);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `DELETE /api/lms/gateways/{id}` — delete a payment gateway. Pass the `id` at
 * `mutate(...)` time.
 */
export function useDeleteGateway(): UseLmsMutationResult<
  { success: boolean },
  string
> {
  const [data, setData] = useState<{ success: boolean } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.gateway.delete(id);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}
