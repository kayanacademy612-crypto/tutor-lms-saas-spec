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
// Cart contents and the applied coupon are owned here (so they persist across
// the cart → checkout transition). The other screens fetch their own data.

// Import Dependencies
import { ComponentType, useEffect, useState } from "react";
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
import type { Coupon } from "@/types/lms";

import CartPage from "./CartPage";
import CheckoutPage from "./CheckoutPage";
import MyOrdersPage from "./MyOrdersPage";
import CouponsAdminPage from "./CouponsAdminPage";
import EarningsPage from "./EarningsPage";

import {
  fetchCart,
  fetchCoupons,
  findCouponByCode,
  type Cart,
} from "./mock-data";

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

  // Cart state (owned here so checkout can read the same cart)
  const [cart, setCart] = useState<Cart | null>(null);
  const [cartLoading, setCartLoading] = useState(true);
  const [cartError, setCartError] = useState<unknown>(null);

  // Coupons list (used for cart/checkout coupon validation)
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  // Applied coupon (null when none)
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  const loadCart = async () => {
    setCartLoading(true);
    setCartError(null);
    try {
      const [c, list] = await Promise.all([fetchCart(), fetchCoupons()]);
      setCart(c);
      setCoupons(list);
      // If the cart came back with a coupon code already applied, look it up.
      if (c.couponCode) {
        const found = findCouponByCode(list, c.couponCode);
        setAppliedCoupon(found ?? null);
      }
    } catch (err) {
      setCartError(err);
    } finally {
      setCartLoading(false);
    }
  };

  useEffect(() => {
    void loadCart();
  }, []);

  // ───────────────── Cart mutators ─────────────────
  const handleRemoveItem = (itemId: string) => {
    setCart((prev) => {
      if (!prev) return prev;
      return { ...prev, items: prev.items.filter((it) => it.id !== itemId) };
    });
  };

  const handleApplyCoupon = (code: string): string | null => {
    const found = findCouponByCode(coupons, code);
    if (!found) {
      return `"${code.toUpperCase()}" is not a valid coupon.`;
    }
    if (!found.isActive) {
      return `"${found.code}" is no longer active.`;
    }
    if (found.expiresAt && new Date(found.expiresAt) < new Date()) {
      return `"${found.code}" has expired.`;
    }
    setAppliedCoupon(found);
    return null;
  };

  const handleRemoveCoupon = () => setAppliedCoupon(null);

  // ───────────────── Checkout completion ─────────────────
  const handlePurchaseComplete = () => {
    // Clear the cart + coupon after a successful purchase.
    setCart((prev) => (prev ? { ...prev, items: [] } : prev));
    setAppliedCoupon(null);
  };

  // ───────────────── External nav ─────────────────
  const goToCatalog = () => navigate("/apps/catalog");
  const goToLearningArea = () => navigate("/apps/learning-area");

  const activeItem =
    NAV_ITEMS.find((n) => n.id === active) ?? NAV_ITEMS[0];
  const cartCount = cart?.items.length ?? 0;

  // Build the nav items with a live cart badge.
  const navItemsWithBadge: NavItem[] = NAV_ITEMS.map((item) =>
    item.id === "cart"
      ? { ...item, badge: cartCount > 0 ? cartCount : undefined }
      : item,
  );

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
                <p className="mt-1.5 text-lg font-bold">
                  {coupons.filter((c) => {
                    const expired =
                      c.expiresAt && new Date(c.expiresAt) < new Date();
                    return c.isActive && !expired;
                  }).length}
                </p>
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
                    cart={cart}
                    loading={cartLoading}
                    error={cartError}
                    onRemoveItem={handleRemoveItem}
                    appliedCoupon={appliedCoupon}
                    onApplyCoupon={handleApplyCoupon}
                    onRemoveCoupon={handleRemoveCoupon}
                    onProceedToCheckout={() => setActive("checkout")}
                    onBrowseCatalog={goToCatalog}
                    onRetry={loadCart}
                  />
                )}
                {active === "checkout" && (
                  <CheckoutPage
                    cart={cart}
                    appliedCoupon={appliedCoupon}
                    onBackToCart={() => setActive("cart")}
                    onPurchaseComplete={handlePurchaseComplete}
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
