import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Pencil, Plus, Star, Trash2 } from "lucide-react";
import type { Product } from "@shared/products";
import { TEE_SIZES } from "@shared/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice } from "@/lib/cart";
import { resolveImage, cn } from "@/lib/utils";

type StockMode = "untracked" | "total" | "perSize";

type ProductForm = {
  name: string;
  description: string;
  priceDollars: string;
  category: string;
  image: string;
  featured: boolean;
  inStock: boolean;
  stock: string; // "" = untracked
  stockMode: StockMode;
  /** Per-size units, as strings for controlled inputs ("" = 0) */
  stockBySize: Record<string, string>;
};

const EMPTY_FORM: ProductForm = {
  name: "",
  description: "",
  priceDollars: "",
  category: "Black Tees",
  image: "",
  featured: false,
  inStock: true,
  stock: "",
  stockMode: "untracked",
  stockBySize: {},
};

export default function AdminProducts() {
  useEffect(() => {
    document.title = "Products | CeeCee Prints Admin";
  }, []);

  const queryClient = useQueryClient();
  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const categories = Array.from(
    new Set((products ?? []).map((p) => p.category)),
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    const sizeStock: Record<string, string> = {};
    for (const s of product.sizes.length ? product.sizes : TEE_SIZES) {
      sizeStock[s] =
        product.stockBySize != null
          ? String(product.stockBySize[s] ?? 0)
          : "";
    }
    setForm({
      name: product.name,
      description: product.description,
      priceDollars: (product.price / 100).toFixed(2),
      category: product.category,
      image: product.image,
      featured: product.featured,
      inStock: product.inStock,
      stock: product.stock == null ? "" : String(product.stock),
      stockMode:
        product.stockBySize != null
          ? "perSize"
          : product.stock == null
            ? "untracked"
            : "total",
      stockBySize: sizeStock,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
  };

  const save = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = editing
        ? await apiRequest("PATCH", `/api/admin/products/${editing.id}`, body)
        : await apiRequest("POST", "/api/admin/products", body);
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
    },
    onError: (err: Error) => {
      setFormError(err.message.replace(/^\d+:\s*/, "") || "Save failed");
    },
  });

  const toggle = useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: Record<string, unknown>;
    }) => {
      await apiRequest("PATCH", `/api/admin/products/${id}`, body);
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/products/${id}`);
    },
    onSuccess: () => {
      invalidate();
      setDeleting(null);
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const cents = Math.round(parseFloat(form.priceDollars || "") * 100);
    if (!Number.isFinite(cents) || cents < 100) {
      setFormError("Enter a price of at least $1.00.");
      return;
    }
    let stock: number | null = null;
    let stockBySize: Record<string, number> | null = null;
    if (form.stockMode === "total") {
      if (form.stock.trim() !== "") {
        const parsedStock = Math.floor(Number(form.stock));
        if (!Number.isFinite(parsedStock) || parsedStock < 0) {
          setFormError("Stock must be a whole number of 0 or more.");
          return;
        }
        stock = parsedStock;
      }
    } else if (form.stockMode === "perSize") {
      const sizes = editing?.sizes.length ? editing.sizes : TEE_SIZES;
      stockBySize = {};
      for (const s of sizes) {
        const raw = (form.stockBySize[s] ?? "").trim();
        if (raw === "") {
          stockBySize[s] = 0;
          continue;
        }
        const parsed = Math.floor(Number(raw));
        if (!Number.isFinite(parsed) || parsed < 0) {
          setFormError(`Stock for size ${s} must be a whole number of 0 or more.`);
          return;
        }
        stockBySize[s] = parsed;
      }
    }
    save.mutate({
      name: form.name,
      description: form.description,
      price: cents,
      category: form.category,
      image: form.image,
      featured: form.featured,
      inStock: form.inStock,
      stock,
      stockBySize,
    });
  };

  if (isLoading || !products) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground">
            {products.length} product{products.length === 1 ? "" : "s"} · changes
            appear on the storefront immediately.
          </p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-product">
          <Plus className="h-4 w-4" aria-hidden /> Add product
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-center">Featured</th>
              <th className="px-4 py-3 text-center">In stock</th>
              <th className="px-4 py-3 text-right">Units left</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr
                key={product.id}
                className="border-b border-border/60 transition-colors hover:bg-muted/40"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={resolveImage(product.image)}
                      alt=""
                      width={40}
                      height={40}
                      loading="lazy"
                      className="h-10 w-10 rounded-md border border-border object-cover"
                    />
                    <div className="min-w-0">
                      <p className="font-medium">{product.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        /{product.slug}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{product.category}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {formatPrice(product.price)}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center">
                    <Switch
                      checked={product.featured}
                      onCheckedChange={(checked) =>
                        toggle.mutate({ id: product.id, body: { featured: checked } })
                      }
                      aria-label={`Toggle featured for ${product.name}`}
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center">
                    <Switch
                      checked={product.inStock}
                      onCheckedChange={(checked) =>
                        toggle.mutate({ id: product.id, body: { inStock: checked } })
                      }
                      aria-label={`Toggle stock for ${product.name}`}
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {product.stockBySize != null ? (
                    <span className="inline-flex flex-wrap justify-end gap-x-2 gap-y-0.5 text-xs">
                      {Object.entries(product.stockBySize).map(([s, n]) => (
                        <span
                          key={s}
                          className={
                            n === 0
                              ? "font-semibold text-red-600 dark:text-red-400"
                              : n <= 2
                                ? "font-semibold text-amber-600 dark:text-amber-400"
                                : ""
                          }
                          title={n === 0 ? `Size ${s} sold out` : `Size ${s}: ${n} left`}
                        >
                          {s}:{n}
                        </span>
                      ))}
                    </span>
                  ) : product.stock == null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : product.stock === 0 ? (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                      Sold out
                    </span>
                  ) : (
                    <span className={product.stock <= 5 ? "font-semibold text-amber-600 dark:text-amber-400" : ""}>
                      {product.stock}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(product)}
                      aria-label={`Edit ${product.name}`}
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 dark:text-red-400"
                      onClick={() => setDeleting(product)}
                      aria-label={`Delete ${product.name}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "Add product"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the product details below."
                : "New products appear on the storefront once saved."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4" data-testid="form-product">
            <div className="space-y-2">
              <Label htmlFor="product-name">Name</Label>
              <Input
                id="product-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Kenyan Lion Tee"
                required
                minLength={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-description">Description</Label>
              <Textarea
                id="product-description"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Tell the story behind the design…"
                required
                minLength={10}
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product-price">Price (USD)</Label>
                <Input
                  id="product-price"
                  type="number"
                  step="0.01"
                  min="1"
                  value={form.priceDollars}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, priceDollars: e.target.value }))
                  }
                  placeholder="32.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-category">Category</Label>
                <Input
                  id="product-category"
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                  placeholder="Black Tees"
                  required
                  list="product-categories"
                />
                <datalist id="product-categories">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-image">Image path or URL</Label>
              <Input
                id="product-image"
                value={form.image}
                onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                placeholder="https://… or products/my-tee.webp"
                required
              />
              <p className="text-xs text-muted-foreground">
                Use a full URL for new designs (e.g. an image hosted online).
              </p>
            </div>

            <div className="space-y-2">
              <Label>Inventory tracking</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ["untracked", "Don't track"],
                    ["total", "Total units"],
                    ["perSize", "Units per size"],
                  ] as [StockMode, string][]
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, stockMode: mode }))
                    }
                    aria-pressed={form.stockMode === mode}
                    className={cn(
                      "h-9 rounded-md border px-2 text-sm font-medium transition-colors",
                      form.stockMode === mode
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:border-foreground/40",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {form.stockMode === "total" && (
                <div className="space-y-2 pt-1">
                  <Label htmlFor="product-stock">Units in stock</Label>
                  <Input
                    id="product-stock"
                    type="number"
                    min="0"
                    step="1"
                    value={form.stock}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, stock: e.target.value }))
                    }
                    placeholder="e.g. 25"
                  />
                  <p className="text-xs text-muted-foreground">
                    Orders reduce this automatically. Leave blank to skip stock
                    tracking; set 0 to mark sold out.
                  </p>
                </div>
              )}

              {form.stockMode === "perSize" && (
                <div className="space-y-2 pt-1" data-testid="stock-per-size">
                  {(editing?.sizes.length ? editing.sizes : TEE_SIZES).map(
                    (s) => (
                      <div
                        key={s}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="w-8 text-sm font-semibold">{s}</span>
                        <div className="flex h-9 items-center rounded-md border border-border">
                          <button
                            type="button"
                            aria-label={`Remove one unit of size ${s}`}
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                stockBySize: {
                                  ...f.stockBySize,
                                  [s]: String(
                                    Math.max(0, Number(f.stockBySize[s] ?? 0) - 1),
                                  ),
                                },
                              }))
                            }
                            className="flex h-full w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <Minus className="h-3.5 w-3.5" aria-hidden />
                          </button>
                          <input
                            aria-label={`Units of size ${s}`}
                            type="number"
                            min="0"
                            step="1"
                            value={form.stockBySize[s] ?? ""}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                stockBySize: {
                                  ...f.stockBySize,
                                  [s]: e.target.value,
                                },
                              }))
                            }
                            className="h-full w-16 border-x border-border bg-transparent text-center text-sm tabular-nums outline-none"
                          />
                          <button
                            type="button"
                            aria-label={`Add one unit of size ${s}`}
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                stockBySize: {
                                  ...f.stockBySize,
                                  [s]: String(
                                    (Number(f.stockBySize[s] ?? 0) || 0) + 1,
                                  ),
                                },
                              }))
                            }
                            className="flex h-full w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </div>
                      </div>
                    ),
                  )}
                  <p className="text-xs text-muted-foreground">
                    Each sale reduces the size the customer picked. A size at 0
                    shows as sold out on the storefront. Blank counts as 0.
                  </p>
                </div>
              )}

              {form.stockMode === "untracked" && (
                <p className="text-xs text-muted-foreground">
                  Customers can buy any quantity — nothing is counted down.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.featured}
                  onCheckedChange={(checked) =>
                    setForm((f) => ({ ...f, featured: checked }))
                  }
                />
                Featured on homepage
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.inStock}
                  onCheckedChange={(checked) =>
                    setForm((f) => ({ ...f, inStock: checked }))
                  }
                />
                In stock
              </label>
            </div>

            {formError && (
              <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">
                {formError}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : editing ? "Save changes" : "Add product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the product from the storefront. Orders already
              placed keep their purchase details.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => deleting && remove.mutate(deleting.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
