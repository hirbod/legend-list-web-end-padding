# LegendList web: end padding is not scrollable, so the initial scroll retries for ~2.5 s

Minimal repro for `@legendapp/list` 3.7.1 on web (react-native-web, Expo SDK 58).

```sh
bun install   # or npm install
bunx expo start --web
```

Open the page and compare the four rows (each is a horizontal list of 20 × 100 px items in a 400 px viewport). "Remount all" runs it again.

## Result (Chrome 152, macOS)

| Case | `contentContainerStyle` | `initialScrollOffset` | `onReady` after | Browser `scrollWidth` | Browser max | LegendList max |
| --- | --- | --- | --- | --- | --- | --- |
| A | `paddingLeft: 16, paddingRight: 16` | past the end | **~2550 ms** | 2016 | 1616 | 1632 |
| B | `paddingLeft: 16` + 16 px `ListFooterComponent` | past the end | ~20 ms | 2032 | 1632 | 1632 |
| C | `paddingLeft: 16, paddingRight: 16` | 500 | ~20 ms | 2016 | 1616 | — |
| D | `paddingHorizontal: 16` | 0 | ~6 ms | 2000 | 1600 | — (item 0 at x 0, not 16) |

## What happens

**A: the end padding is not in the browser's scroll range.**
The content container keeps the viewport width (`min-width: 100%`) and the items overflow it. The browser does not add the container's `padding-right` to the scrollable overflow, so `scrollWidth` is 16 + 2000 = 2016, not 2032.
LegendList counts the padding (`extractPadding`), so its end is 1632. The browser stops at 1616.
`getResolvedScrollCompletionState` never sees `isAtResolvedTarget` (|1616 − 1632| > 1). `checkFinishedScroll` then retries up to `INITIAL_SCROLL_MAX_FALLBACK_CHECKS` (20) times, and the items stay hidden until it gives up: about 2.5 s.

**B: the workaround.** A `ListFooterComponent` of the same width is real content, so the browser scrolls to it, and both ends agree.

**C:** the same padding with a target that is not near the end has no delay. Only targets that clamp to the end are affected (`initialScrollOffset` past the end, or `initialScrollIndex` near the end).

**D: `paddingHorizontal` is not applied on web at all.**
`ListComponentScrollView` spreads the flattened style into a DOM `style`. `paddingHorizontal` is not a CSS property, so the browser drops it: item 0 is at x 0 and `scrollWidth` is 2000.
`extractPadding` (`src/utils/helpers.ts`) still reads `paddingHorizontal`, so LegendList's content size is 32 px larger than the browser's.
