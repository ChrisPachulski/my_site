import { StrictMode } from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import './styles.css';
import App from './App.jsx';
import { getPost, loadPostBody } from './lib/blog.js';

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
// skeletons, and dev's empty root) is client-rendered. An article page first
// waits for its markdown chunk, so the prerendered text stays on screen until
// React can replace it with the full article, never with "Loading…".
if (root.dataset.hydrate === 'home') {
  hydrateRoot(root, tree);
} else {
  const slug = window.location.pathname.match(/^\/writing\/([^/]+)/)?.[1];
  const post = slug ? getPost(slug) : null;
  const render = () => createRoot(root).render(tree);
  (post ? loadPostBody(post) : Promise.resolve()).then(render, render);
}
