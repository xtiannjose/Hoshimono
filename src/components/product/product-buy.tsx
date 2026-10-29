"use client";

import { ShoppingCartIcon } from "@phosphor-icons/react";
import { useState } from "react";

import {
  changeQuantity,
  quantityIn,
  setCartOpen,
  useCart,
} from "@/components/cart/cart-store";
import { SubstitutionSelect } from "@/components/cart/substitution-select";
import { buttonVariants } from "@/components/ui/button-classes";
import { useMessages } from "@/i18n/client";

import { QuantityStepper } from "./quantity-stepper";

/**
 * The Product page's buy box (mockup-v2 product, ADR 0018): choose how
 * many, then one big "Add to cart". Once it is in the Cart the stepper
 * changes the Cart itself, beside "View cart" and the Substitution choice.
 */
export function ProductBuy({
  productId,
  name,
}: {
  productId: string;
  name: string;
}) {
  const cartWords = useMessages().cart;
  const t = useMessages();
  const inCart = useCart((s) => quantityIn(s, productId));
  const line = useCart((s) =>
    s.view?.lines.find((l) => l.product.id === productId)
  );
  const notice = useCart((s) =>
    s.notice?.productId === productId ? s.notice.text : null
  );
  const [wanted, setWanted] = useState(1);

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-[9.5rem_1fr] gap-3">
        <QuantityStepper
          variant="ghost"
          value={inCart > 0 ? inCart : wanted}
          min={inCart > 0 ? 0 : 1}
          onChange={(next) =>
            inCart > 0
              ? changeQuantity(productId, name, next, cartWords)
              : setWanted(next)
          }
          label={t.product.quantityOf(name)}
        />
        {inCart > 0 ? (
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className={buttonVariants({ variant: "secondary" })}
          >
            {t.shell.viewCart}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => changeQuantity(productId, name, wanted, cartWords)}
            className={buttonVariants()}
          >
            <ShoppingCartIcon aria-hidden />
            {t.productPage.addToCart}
          </button>
        )}
      </div>
      {notice && <p className="text-warn text-fine font-semibold">{notice}</p>}
      {line && (
        <SubstitutionSelect
          productId={productId}
          name={name}
          value={line.substitution}
        />
      )}
    </div>
  );
}
