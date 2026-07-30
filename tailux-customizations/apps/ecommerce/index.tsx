// Ecommerce app — top-level layout.
//
// Self-contained 2-column layout (sidebar + content) modeled on the existing
// `instructor-dashboard` pattern. The sidebar switches between five screens:
//
//   - Cart        — shopping cart + coupon input
//   - Checkout    — billing/payment flow for the current cart
//   - My Orders   — order history + invoice download
//   - Coupons     — admin/instructor coupon management
//   - Earnings    — instructor earnings + payouts
//
// The cart now flows through the real `useCart()` hook (P3-A5) — no more
// mock data. The other screens own their data fetching internally via the
// Phase 3 hooks (`useOrders`, `useCoupons`, `useEarningsSummary`,
// `useWithdrawals`, …). All screens render loading / error / empty states.

// Import Dependencies
import { ComponentType, useState } from "react";
import { useNavigate } from "react-router";
import clsx from "clsx";
import {
  ShoppingBagIcon,
  CreditCardIcon,
  DocumentTextIcon,
  TicketIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon as ShoppingCartOutlineIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Button, Card, ScrollShadow, Badge } from "@/components/ui";
import { useCart, useCoupons } from "@/hooks/useEcommerce";

import CartPage from "./CartPage";
import CheckoutPage from "./CheckoutPage";
import MyOrdersPage from "./MyOrdersPage";
import CouponsAdminPage from "./CouponsAdminPage";
import EarningsPage from "./EarningsPage";

// ----------------------------------------------------------------------

type ScreenId = "cart" | "checkout" | "orders" | "coupons" | "earnings";

interface NavItem {
  id: ScreenId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Optional badge content. */
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: "cart", label: "Cart", icon: ShoppingBagIcon },
  { id: "checkout", label: "Checkout", icon: CreditCardIcon },
  { id: "orders", label: "My Orders", icon: DocumentTextIcon },
  { id: "coupons", label: "Coupons", icon: TicketIcon },
  { id: "earnings", label: "Earnings", icon: CurrencyDollarIcon },
];

// ----------------------------------------------------------------------

export default function Ecommerce() {
  const navigate = useNavigate();

  // Active screen
  const [active, setActive] = useState<ScreenId>("cart");

  // Cart now comes from the real `useCart()` hook (P3-A5). Mutations
  // performed in CartPage / CheckoutPage update the underlying cart record on
  // the server; we refetch via the hook's `refetch` callback.
  const cart = useCart();
  const coupons = useCoupons();

  const goToCatalog = () => navigate("/apps/catalog");
  const goToLearningArea = () => navigate("/apps/learning-area");

  const activeItem = NAV_ITEMS.find((n) => n.id === active) ?? NAV_ITEMS[0];
  const cartCount = cart.data?.items.length ?? 0;

  // Build the nav items with a live cart badge.
  const navItemsWithBadge: NavItem[] = NAV_ITEMS.map((item) =>
    item.id === "cart"
      ? { ...item, badge: cartCount > 0 ? cartCount : undefined }
      : item,
  );

  // Quick sidebar stats: count active (non-expired) coupons.
  const activeCouponsCount = (coupons.data ?? []).filter((c) => {
    if (!c.isActive) return false;
    if (c.expiresAt && new Date(c.expiresAt) < new Date()) return false;
    return true;
  }).length;

  return (
    <Page title="Ecommerce">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-500 text-white">
              <ShoppingCartOutlineIcon className="size-5 stroke-2" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                Ecommerce
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Sell courses, manage coupons, and track your payouts.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge color="success" variant="soft" className="gap-1">
              <span className="size-1.5 rounded-full bg-success-500" />
              Store open
            </Badge>
            <Button
              variant="outlined"
              color="primary"
              className="gap-1.5"
              onClick={goToCatalog}
            >
              <ShoppingBagIcon className="size-4 stroke-2" />
              <span className="hidden sm:inline">Browse catalog</span>
            </Button>
          </div>
        </header>

        {/* 2-column body */}
        <div className="flex min-h-0 flex-1">
          {/* Sidebar */}
          <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-750">
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <nav
                className="space-y-1 p-3"
                aria-label="Ecommerce navigation"
              >
                {navItemsWithBadge.map((item) => {
                  const isActive = item.id === active;
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.id}
                      variant="flat"
                      color={isActive ? "primary" : "neutral"}
                      onClick={() => setActive(item.id)}
                      className={clsx(
                        "group w-full justify-start gap-2.5 px-3 py-2 text-sm font-medium",
                        isActive
                          ? "bg-primary-500/10 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-dark-200 dark:hover:bg-dark-600 dark:hover:text-dark-50",
                      )}
                    >
                      <Icon
                        className={clsx(
                          "size-5 shrink-0 stroke-2 transition-colors",
                          isActive
                            ? "text-primary-600 dark:text-primary-400"
                            : "text-gray-400 group-hover:text-gray-600 dark:text-dark-400 dark:group-hover:text-dark-200",
                        )}
                      />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge != null && (
                        <Badge
                          color={isActive ? "primary" : "neutral"}
                          variant="filled"
                          className="h-5 min-w-5 px-1 text-[10px]"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </nav>
            </ScrollShadow>

            {/* Sidebar footer — quick stats */}
            <div className="shrink-0 border-t border-gray-200 p-3 dark:border-dark-600">
              <Card
                className="bg-gradient-to-br from-primary-500 to-primary-600 p-3 text-white dark:from-primary-600 dark:to-primary-700"
                skin="none"
              >
                <div className="flex items-center gap-2">
                  <TicketIcon className="size-5" />
                  <p className="text-xs font-semibold">Active coupons</p>
                </div>
                <p className="mt-1.5 text-lg font-bold">{activeCouponsCount}</p>
                <p className="text-[11px] leading-relaxed text-white/80">
                  Drive sales with targeted discounts.
                </p>
                <Button
                  color="neutral"
                  variant="filled"
                  className="mt-2.5 w-full bg-white/95 text-primary-700 hover:bg-white text-xs"
                  onClick={() => setActive("coupons")}
                >
                  Manage coupons
                </Button>
              </Card>
            </div>
          </aside>

          {/* Content area */}
          <main className="flex min-w-0 flex-1 flex-col">
            {/* Breadcrumb / title strip */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3 dark:border-dark-600 dark:bg-dark-750">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-300">
                <span>Ecommerce</span>
                <span className="text-gray-300 dark:text-dark-500">/</span>
                <span className="font-medium text-gray-800 dark:text-dark-50">
                  {activeItem.label}
                </span>
              </div>
            </div>

            {/* Active screen */}
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <div className="mx-auto max-w-6xl px-6 py-6">
                {active === "cart" && (
                  <CartPage
                    cart={cart.data}
                    loading={cart.loading}
                    error={cart.error}
                    onRetry={cart.refetch}
                    onProceedToCheckout={() => setActive("checkout")}
                    onBrowseCatalog={goToCatalog}
                  />
                )}
                {active === "checkout" && (
                  <CheckoutPage
                    cart={cart.data}
                    cartLoading={cart.loading}
                    cartError={cart.error}
                    onRetryCart={cart.refetch}
                    onBackToCart={() => setActive("cart")}
                    onPurchaseComplete={() => {
                      // The cart is server-side owned — refetch to refresh
                      // the now-empty cart for the next purchase.
                      void cart.refetch();
                    }}
                    onViewOrders={() => setActive("orders")}
                    onStartLearning={goToLearningArea}
                  />
                )}
                {active === "orders" && <MyOrdersPage />}
                {active === "coupons" && <CouponsAdminPage />}
                {active === "earnings" && <EarningsPage />}
              </div>
            </ScrollShadow>
          </main>
        </div>
      </div>
    </Page>
  );
}
