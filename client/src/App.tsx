import { Switch, Route, Router } from "wouter";
import { useLocation } from "wouter";
import { useHashLocation as useWouterHashLocation } from "wouter/use-hash-location";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { CartProvider } from "@/lib/cart";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import Home from "@/pages/home";
import Shop from "@/pages/shop";
import ProductDetail from "@/pages/product-detail";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import CheckoutSuccess from "@/pages/checkout-success";
import OrderConfirmation from "@/pages/order-confirmation";
import About from "@/pages/about";
import Contact from "@/pages/contact";
import NotFound from "@/pages/not-found";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminOrders from "@/pages/admin/orders";
import AdminProducts from "@/pages/admin/products";
import { AdminGuard } from "@/components/admin/shell";

/** Resets the scroll position whenever the route changes, so every
 *  page opens at the top instead of inheriting the previous page's offset. */
function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [location]);

  return null;
}

function AppShell() {
  const [location] = useLocation();
  const isAdmin = location.startsWith("/admin");

  // Admin routes render inside their own shell, without storefront chrome.
  if (isAdmin) {
    return (
      <>
        <ScrollToTop />
        <Switch>
          <Route path="/admin/login" component={AdminLogin} />
          <Route path="/admin" component={() => (
            <AdminGuard><AdminDashboard /></AdminGuard>
          )} />
          <Route path="/admin/orders" component={() => (
            <AdminGuard><AdminOrders /></AdminGuard>
          )} />
          <Route path="/admin/products" component={() => (
            <AdminGuard><AdminProducts /></AdminGuard>
          )} />
          <Route component={AdminLogin} />
        </Switch>
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <Header />
      <div id="main-content" className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/shop" component={Shop} />
          <Route path="/shop/:slug" component={ProductDetail} />
          <Route path="/cart" component={Cart} />
          <Route path="/checkout" component={Checkout} />
          <Route path="/checkout/success" component={CheckoutSuccess} />
          <Route path="/order/:orderNumber" component={OrderConfirmation} />
          <Route path="/about" component={About} />
          <Route path="/contact" component={Contact} />
          <Route component={NotFound} />
        </Switch>
      </div>
      <Footer />
    </div>
  );
}

// Stripe's redirect lands on /#/checkout/success?session_id=… — wouter's
// hash hook keeps the query inside the path, which breaks route matching.
// Strip it for routing; pages read query params from window.location.hash.
const useHashLocation = (): [string, (to: string, opts?: { replace?: boolean }) => void] => {
  const [location, navigate] = useWouterHashLocation();
  return [location.split("?")[0], navigate];
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <CartProvider>
            <Toaster />
            <Router hook={useHashLocation}>
              <AppShell />
            </Router>
          </CartProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
