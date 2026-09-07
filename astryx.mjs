// Progressive enhancement: all essential documentation exists in static HTML.
try {
  const [React, {createRoot}, {Card, Stack, Heading, Text}] = await Promise.all([
    import('react'), import('react-dom/client'), import('@astryxdesign/core'),
  ]);
  const e = React.createElement;
  createRoot(document.getElementById('astryx-status')).render(
    e(Card, {elevation:'low'}, e(Stack, {gap:3, padding:4},
      e(Heading, {level:3}, 'Experimental by design'),
      e(Text, null, 'Explicit intent. Bounded execution. Evidence you can inspect.'),
      e('a', {href:'evidence.html'}, 'Read the status and boundaries'),
    )),
  );
} catch (error) {
  console.warn('Astryx enhancement unavailable; static content retained.', error);
}
