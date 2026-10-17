import { articlePath } from '../../lib/router.js';

// Props that make a writing tile a real link: crawlable, and cmd/ctrl/middle
// click opens the article in a new tab. A plain click or Enter/Space opens the
// in-page reader instead.
export default function cardLinkProps(slug, onOpen) {
  return {
    href: articlePath(slug),
    'aria-haspopup': 'dialog',
    onClick: (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0) return;
      e.preventDefault();
      onOpen(slug);
    },
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(slug); }
    },
  };
}
