import { StrictMode } from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import './styles.css';
import App from './App.jsx';

const root = document.getElementById('root');
const tree = (
  <StrictMode>
    <App />
  </StrictMode>
);

// The home page ships server-rendered markup inside #root (tagged
// data-hydrate="home" by the prerender step), so we hydrate in place — no #root
// wipe, no flash: the prerendered hero is the first paint and the CSS load
// choreography runs on it directly. Every other entry (the article/404 SEO
// skeletons, and dev's empty root) is client-rendered as before.
if (root.dataset.hydrate === 'home') {
  hydrateRoot(root, tree);
} else {
  createRoot(root).render(tree);
}
