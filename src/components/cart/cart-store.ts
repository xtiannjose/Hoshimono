"use client";

import { useSyncExternalStore } from "react";

import { setQuantity } from "@/app/[lang]/cart/actions";
import { sendStep } from "@/components/count-step";
import { announce } from "@/components/live-region";
import type { Messages } from "@/i18n/messages";
import type { CartView } from "@/modules/cart";

// One Cart per tab, shared by the header button, the drawer, the Cart page
// and every Add button. The server's CartView is the truth; `pending` holds
// optimistic quantities until the server answers (CRT-2).

type Notice = { productId: string; text: string };

type State = {
  view: CartView | null;
  pending: Record<string, number>;
  open: boolean;
  /** True once the drawer has opened, so its code loads only when needed. */
  drawerLoaded: boolean;
  notice: Notice | null;
};

const EMPTY: State = {
  view: null,
  pending: {},
  open: false,
  drawerLoaded: false,
  notice: null,
};
let state = EMPTY;
const listeners = new Set<() => void>();

function update(patch: Partial<State>) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Read one value from the Cart. Selectors must return stable values. */
export function useCart<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => select(state),
    () => select(EMPTY)
  );
}

export function quantityIn(s: State, productId: string): number {
  return (
    s.pending[productId] ??
    s.view?.lines.find((l) => l.product.id === productId)?.quantity ??
    0
  );
}

/** Keep the newest view: an older one can arrive after a newer answer. */
export function setCartView(view: CartView) {
  if (state.view && view.readAt < state.view.readAt) return;
  update({ view });
}

export function setCartOpen(open: boolean) {
  update({ open, drawerLoaded: state.drawerLoaded || open });
}

let noticeTimer: ReturnType<typeof setTimeout> | undefined;

export function showNotice(productId: string, text: string) {
  announce(text);
  update({ notice: { productId, text } });
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => update({ notice: null }), 5000);
}

function withoutPending(productId: string) {
  const rest = { ...state.pending };
  delete rest[productId];
  return rest;
}

let sequence = 0;
const latest: Record<string, number> = {};

/** Show the new quantity at once, then reconcile with the server. */
export async function changeQuantity(
  productId: string,
  name: string,
  next: number,
  t: Messages["cart"]
) {
  if (next > 0 && quantityIn(state, productId) === 0) sendStep("added_to_cart");
  const mine = ++sequence;
  latest[productId] = mine;
  update({ pending: { ...state.pending, [productId]: next } });
  announce(next === 0 ? t.removed(name) : t.inCart(name, next));
  try {
    const result = await setQuantity(productId, next);
    // A newer tap on the same Product keeps its own optimistic value.
    const settled = latest[productId] === mine;
    const newer = !state.view || result.cart.readAt >= state.view.readAt;
    update({
      view: newer ? result.cart : state.view,
      pending: settled ? withoutPending(productId) : state.pending,
    });
    if (settled && result.notice) {
      showNotice(productId, t.notices[result.notice]);
    }
  } catch {
    if (latest[productId] !== mine) return;
    update({ pending: withoutPending(productId) });
    showNotice(productId, t.failed.update);
  }
}
