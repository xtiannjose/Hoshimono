// React resets a form after its action runs. Inputs refill from their new
// defaultValue, but a <select> keeps the option it had when it mounted, so
// a failed or repeated save could quietly send old values. Keying the form
// on each action result remounts it, and every field takes the values the
// form passes in.
const keys = new WeakMap<object, number>();
let next = 0;

/** A key that changes with every useActionState result. */
export function formKey(state: object): number {
  let key = keys.get(state);
  if (key === undefined) {
    key = ++next;
    keys.set(state, key);
  }
  return key;
}
