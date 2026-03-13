"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Product } from "@/lib/products";
import { getProductImageUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  onDelete: (id: string) => void;
  deleting?: boolean;
}

export function ProductCard({ product, onDelete, deleting }: ProductCardProps) {
  const [confirming, setConfirming] = useState(false);

  const date = new Date(product.$createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all",
        deleting && "opacity-50 pointer-events-none"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {product.image_id && (
            <img
              src={getProductImageUrl(product.image_id)}
              alt={product.name}
              width={30}
              height={30}
              className="rounded-md object-cover shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-card-foreground truncate">{product.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-lg bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary">
          ${product.price.toFixed(2)}
        </span>
      </div>

      {confirming ? (
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-muted-foreground">Delete this product?</span>
          <button
            onClick={() => setConfirming(false)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onDelete(product.$id)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            Delete
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="flex items-center gap-1.5 self-end rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <Trash2 className="size-3.5" />
          Remove
        </button>
      )}
    </div>
  );
}
