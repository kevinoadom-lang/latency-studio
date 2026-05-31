# Hero interaction brief — "the deck flip"

A spec for building the homepage hero. Hand this to Claude Code (or any dev) as the
starting point — the design is locked; this is a build task, not a design task.

---

## The concept in one line

The hero is a single full-bleed character. Each time the cursor sweeps in over the
figure, it hard-cuts to the next character in the roster — a "deck flip" through the
cast. A portal flourish marks each swap. It loops. The interaction *is* the pitch:
one brief, many faces, instant.

---

## Exact behaviour

**Trigger — enter-to-advance**
- Advance to the next character only when the cursor *enters* the figure after having
  left it. Not on continuous movement while already inside.
- So the rhythm is: sweep in (flip) → sweep out (re-arm) → sweep in (flip) → …
- This gives the user deliberate control and stops it cycling chaotically.

**The swap — whole-figure hard cut**
- On each flip, the ENTIRE figure swaps to the next character at once. Instant. No
  dissolve, no fade, no crossfade.
- The hard cut is intentional: speed is the message ("seamless, adaptable, fast").
  Do not soften this into a smooth transition.

**The portal — accent only**
- A circular ring blooms outward from the CENTRE of the figure on each swap (not from
  the cursor entry point — centre reads cleaner with real faces).
- The portal is the ONLY thing that animates. ~0.28s expand-and-fade. It marks the
  moment; it does not mask or reveal.

**The loop**
- Order cycles and wraps: e.g. Yuna → Mina → Rika → [next] → … → back to Yuna.
- No dead end. Infinite sweeps.

---

## Mobile / touch fallback

- No hover on touch devices. Replace with tap-to-flip: each tap on the figure advances
  to the next character, same hard cut + portal.
- Consider an initial subtle hint (e.g. a small "tap" affordance that fades after first
  interaction) since the interaction isn't discoverable without hover.

---

## Image requirements — THE critical part

The entire effect lives or dies on the images. Get these right before building:

1. **Consistent framing across every character.** Same crop, same zoom, same headroom,
   same vertical position of the face/body. If crops differ, the hard cut feels like a
   jump, not a flip. This matters more than anything else.
2. **Full-bleed vertical.** Each image fills the hero frame (suggest 3:4 or taller for
   a hero). Same aspect ratio for all.
3. **Same or deliberately-paired backgrounds.** If backgrounds differ wildly, the swap
   reads as chaotic. Either a consistent void/studio background across all, or a
   deliberate palette that's meant to shift.
4. **Same pose family.** Front-facing, similar stance. The face should land in roughly
   the same screen position each time so the eye doesn't have to jump.
5. High resolution — this is the hero, it'll be displayed large.

If existing characters were shot at different crops, re-crop them to match before
building. Consistency of framing > everything.

---

## Build notes

- This is a custom interaction — not achievable cleanly in Framer/Webflow. Build in
  code (React or vanilla JS + CSS).
- Preload all character images so the hard cut is genuinely instant (no flash of
  loading on first flip of each face).
- Keep the figure layer simple: stacked full-bleed images, only the active one
  visible, instant display swap on flip.
- Respect `prefers-reduced-motion`: if set, keep the character swap but drop the portal
  animation.
- Accessibility: provide a non-hover way to cycle (the tap fallback covers touch; also
  ensure keyboard users can advance, e.g. arrow keys or a visible control).

---

## Open tuning decisions (decide against REAL images, not placeholders)

- Exact portal size, ring thickness, colour, and timing.
- Whether the portal blooms from centre (recommended) or entry point.
- Whether there's a faint idle hint animation before first interaction.
- Deck order.

---

## What this hero is NOT

- Not a "reveal what's behind" peel — that's a different, slower interaction that
  fights the snappy cut. This is a deck flip: replace, don't peel.
- Not zone-based (upper/lower). The flip is driven by sweep count, not cursor position.
