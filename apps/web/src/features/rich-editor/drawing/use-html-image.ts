'use client';

import { useEffect, useState } from 'react';

/** Loads a data-URL/HTTP image for use as a Konva `<Image image={...} />` source. */
export function useHtmlImage(src: string): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      return;
    }
    const element = new window.Image();
    element.onload = () => setImage(element);
    element.src = src;
    return () => setImage(null);
  }, [src]);

  return image;
}
