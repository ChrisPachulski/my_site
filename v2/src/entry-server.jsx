import { renderToString } from 'react-dom/server';
import App from './App.jsx';

// Server render of the home route. With no `window`, the router resolves to
// 'home' and the display-mode resolves to 'after-hours' (see lib/router.js and
// App.jsx), so this output is exactly what the client renders on first mount —
// which is what lets the browser hydrate the prerendered #root in place instead
// of wiping it and re-animating the hero from scratch.
export function render() {
  return renderToString(<App />);
}
