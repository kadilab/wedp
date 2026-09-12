import { useEffect } from 'react';

// Lightweight per-page <title>/<meta description> updater for public SPA
// routes that should be indexable (marketplace listing/detail, etc.) —
// avoids pulling in react-helmet-async for what is otherwise two DOM writes.
export function useDocumentMeta(title, description) {
  useEffect(() => {
    if (!title) return undefined;

    const previousTitle = document.title;
    document.title = title;

    let descriptionTag = document.querySelector('meta[name="description"]');
    let createdTag = false;
    const previousContent = descriptionTag?.getAttribute('content') ?? null;

    if (description) {
      if (!descriptionTag) {
        descriptionTag = document.createElement('meta');
        descriptionTag.setAttribute('name', 'description');
        document.head.appendChild(descriptionTag);
        createdTag = true;
      }
      descriptionTag.setAttribute('content', description);
    }

    return () => {
      document.title = previousTitle;
      if (!descriptionTag) return;
      if (createdTag) descriptionTag.remove();
      else if (previousContent != null) descriptionTag.setAttribute('content', previousContent);
    };
  }, [title, description]);
}
