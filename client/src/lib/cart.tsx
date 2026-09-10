import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getProductById,
  FREE_SHIPPING_THRESHOLD,
  FLAT_SHIPPING,
  type Product,
} from "@shared/products";

export type CartItem = { productId: string; size: string; quantity: number };

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

type CartLine = CartItem & { product: Product };

type CartContextValue = {
  items: CartLine[];
  count: number;
  subtotal: number;
  shipping: number;
  total: number;
  freeShippingRemaining: number;
  addItem: (productId: string, size: string, quantity?: number) => void;
  updateQuantity: (productId: string, size: string, quantity: number) => void;
  removeItem: (productId: string, size: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [rawItems, setRawItems] = useState<CartItem[]>([]);

  const items = useMemo<CartLine[]>(
    () =>
      rawItems
        .map((item) => {
          const product = getProductById(item.productId);
          return product ? { ...item, product } : null;
        })
        .filter((line): line is CartLine => line !== null),
    [rawItems],
  );

  const value = useMemo<CartContextValue>(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    );
    const shipping =
      items.length === 0 || subtotal >= FREE_SHIPPING_THRESHOLD
        ? 0
        : FLAT_SHIPPING;

    return {
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      shipping,
      total: subtotal + shipping,
      freeShippingRemaining: Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal),
      addItem: (productId, size, quantity = 1) => {
        setRawItems((prev) => {
          const existing = prev.find(
            (item) => item.productId === productId && item.size === size,
          );
          if (existing) {
            return prev.map((item) =>
              item === existing
                ? { ...item, quantity: Math.min(20, item.quantity + quantity) }
                : item,
            );
          }
          return [...prev, { productId, size, quantity }];
        });
      },
      updateQuantity: (productId, size, quantity) => {
        setRawItems((prev) =>
          quantity <= 0
            ? prev.filter(
                (item) => !(item.productId === productId && item.size === size),
              )
            : prev.map((item) =>
                item.productId === productId && item.size === size
                  ? { ...item, quantity: Math.min(20, quantity) }
                  : item,
              ),
        );
      },
      removeItem: (productId, size) => {
        setRawItems((prev) =>
          prev.filter(
            (item) => !(item.productId === productId && item.size === size),
          ),
        );
      },
      clear: () => setRawItems([]),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
