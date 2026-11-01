import { LegendList } from '@legendapp/list/react-native';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const ITEM = 100;
const COUNT = 20;
const LIST_WIDTH = 400;
const PADDING = 16;
const data = Array.from({ length: COUNT }, (_, i) => ({ id: String(i) }));

// LegendList's own end: content + both paddings - viewport = 2000 + 32 - 400 = 1632.
// The browser's end: the right padding overflows and is not scrollable = 1616.
const PAST_END = 5000;

type Case = {
  title: string;
  initialScrollOffset: number;
  contentContainerStyle: object;
  footer?: boolean;
};

const CASES: Case[] = [
  {
    title: 'A. paddingLeft + paddingRight 16, initialScrollOffset past the end (bug)',
    initialScrollOffset: PAST_END,
    contentContainerStyle: { paddingLeft: PADDING, paddingRight: PADDING },
  },
  {
    title: 'B. Same, but the end padding is a 16 px ListFooterComponent (workaround)',
    initialScrollOffset: PAST_END,
    contentContainerStyle: { paddingLeft: PADDING },
    footer: true,
  },
  {
    title: 'C. paddingLeft + paddingRight 16, initialScrollOffset 500 (not near the end)',
    initialScrollOffset: 500,
    contentContainerStyle: { paddingLeft: PADDING, paddingRight: PADDING },
  },
  {
    title: 'D. paddingHorizontal 16, initialScrollOffset 0 (shorthand not applied on web)',
    initialScrollOffset: 0,
    contentContainerStyle: { paddingHorizontal: PADDING },
  },
];

function Row({ title, initialScrollOffset, contentContainerStyle, footer }: Case) {
  const mountedAt = useRef(performance.now());
  const wrapper = useRef<unknown>(null);
  const [result, setResult] = useState('waiting for onReady…');

  const onReady = () => {
    const ms = Math.round(performance.now() - mountedAt.current);
    // onReady can run before the wrapper's ref is set: measure on the next frame.
    requestAnimationFrame(() => measure(ms));
  };

  const measure = (ms: number) => {
    // The DOM scroller inside the list.
    const root = wrapper.current as unknown as HTMLElement;
    const scroller = [root, ...root.querySelectorAll<HTMLElement>('*')].find(
      (node) => node.scrollWidth > node.clientWidth && getComputedStyle(node).overflowX !== 'visible',
    );
    const browserMax = scroller ? scroller.scrollWidth - scroller.clientWidth : NaN;
    // Where item 0 sits in the content (expected: 16, the start padding).
    const first = root.querySelector<HTMLElement>('[id="item-0"]');
    const firstX =
      first && scroller
        ? first.getBoundingClientRect().left - scroller.getBoundingClientRect().left + scroller.scrollLeft
        : undefined;
    setResult(
      `onReady after ${ms} ms · scrollLeft ${scroller?.scrollLeft} · browser max ${browserMax} (scrollWidth ${scroller?.scrollWidth})` +
        (firstX === undefined ? '' : ` · item 0 at x ${firstX}`),
    );
    console.log(title, { ms, scrollLeft: scroller?.scrollLeft, browserMax, scrollWidth: scroller?.scrollWidth, firstX });
  };

  return (
    <View style={styles.case}>
      <Text style={styles.title}>{title}</Text>
      <View ref={wrapper as never} style={styles.frame}>
        <LegendList
          horizontal
          recycleItems
          data={data}
          keyExtractor={(item) => item.id}
          estimatedItemSize={ITEM}
          getFixedItemSize={() => ITEM}
          initialScrollOffset={initialScrollOffset}
          contentContainerStyle={contentContainerStyle}
          ListFooterComponent={footer ? <View style={{ width: PADDING }} /> : undefined}
          onReady={onReady}
          renderItem={({ item }) => (
            <View style={styles.item} nativeID={`item-${item.id}`}>
              <Text style={styles.label}>{item.id}</Text>
            </View>
          )}
        />
      </View>
      <Text style={styles.result}>{result}</Text>
    </View>
  );
}

export default function App() {
  const [run, setRun] = useState(0);
  return (
    <View style={styles.screen}>
      <Text style={styles.heading}>LegendList 3.7.1 · web · horizontal · {COUNT} × {ITEM} px items in a {LIST_WIDTH} px list</Text>
      <Pressable style={styles.button} onPress={() => setRun((n) => n + 1)}>
        <Text style={styles.buttonText}>Remount all</Text>
      </Pressable>
      {CASES.map((c) => (
        <Row key={`${c.title}-${run}`} {...c} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, gap: 24, backgroundColor: '#fff' },
  heading: { fontSize: 16, fontWeight: '600' },
  button: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: '#222' },
  buttonText: { color: '#fff' },
  case: { gap: 6 },
  title: { fontSize: 14 },
  frame: { width: LIST_WIDTH, height: 80, backgroundColor: '#f4f4f4' },
  item: {
    width: ITEM,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#e8f0ff',
  },
  label: { fontSize: 18 },
  result: { fontFamily: 'monospace', fontSize: 12, color: '#555' },
});
