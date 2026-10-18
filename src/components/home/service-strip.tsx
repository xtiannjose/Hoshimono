import {
  SealCheckIcon,
  TruckIcon,
  WalletIcon,
} from "@phosphor-icons/react/ssr";

const ITEMS = [
  { Icon: TruckIcon, title: "Same-day delivery", text: "Pick a 2-hour window" },
  {
    Icon: SealCheckIcon,
    title: "Freshness checked",
    text: "Every order inspected at pick",
  },
  {
    Icon: WalletIcon,
    title: "Pay your way",
    text: "GCash, card or cash on delivery",
  },
];

/** Lime band under the hero (docs/05 section 6, ServiceStrip). */
export function ServiceStrip() {
  return (
    <ul className="rounded-card bg-accent text-on-accent mt-8 grid gap-4 px-6 py-[18px] sm:grid-cols-3 sm:px-7">
      {ITEMS.map(({ Icon, title, text }) => (
        <li key={title} className="flex items-center gap-3">
          <Icon size={26} className="shrink-0" aria-hidden />
          <div>
            <b className="block font-bold">{title}</b>
            <span className="text-sm leading-5">{text}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
