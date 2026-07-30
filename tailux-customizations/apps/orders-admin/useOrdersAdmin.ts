// Local hook for the Orders Admin screen — fetches the full order list
// via `lmsApi.order.list()` and normalizes the response into `Order[]`.
//
// `useEcommerce` (P3-A5) exposes `useOrder(id)` (single order) but does not
// expose a list hook for orders, so this thin wrapper fills that gap. The
// shape mirrors the rest of the `useEcommerce` query hooks:
// `{ data, loading, error, refetch }`.

// Import Dependencies
import { useCallback, useEffect, useRef, useState } from "react";

// Local Imports
import { useIsMounted } from "@/hooks/useIsMounted";
import { lmsApi, type LmsApiError } from "@/services/lms-api";
import type { Order } from "@/types/lms";

// ----------------------------------------------------------------------

export interface UseOrdersListResult {
  data: Order[] | null;
  loading: boolean;
  error: LmsApiError | null;
  refetch: () => void;
}

export function useEcommerceOrdersList(): UseOrdersListResult {
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
      const result = await lmsApi.order.list();
      const list = Array.isArray(result)
        ? result
        : ((result as { data?: Order[] }).data ?? []);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(list);
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
