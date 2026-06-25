import { useLayoutEffect, useRef, useState } from 'react'

// Renders text that automatically shrinks its font-size so it always fits
// inside its (fixed-size) box. Used for variable-length content like venue
// addresses or custom messages, where the admin's sample text is short but the
// client's real text may be much longer.
//
// The element it renders must have a constrained box (width/height: 100% of a
// fixed parent, or explicit width/height) and overflow hidden — it measures
// its own scroll size against its client size and steps the font down until it
// fits. A ResizeObserver re-fits whenever the box changes (canvas resize,
// responsive preview scaling, etc.).
export default function AutoFitText({ text, fontSize = 16, minFontSize = 6, className, style }) {
  const ref = useRef(null)
  const [size, setSize] = useState(fontSize)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const fit = () => {
      let s = fontSize
      el.style.fontSize = `${s}px`
      let guard = 0
      while (
        (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) &&
        s > minFontSize && guard < 400
      ) {
        s -= 0.5
        el.style.fontSize = `${s}px`
        guard++
      }
      setSize(s)
    }

    fit()
    // Re-fit when the box (not the font) changes size.
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [text, fontSize, minFontSize])

  return (
    <span ref={ref} className={className} style={{ ...style, fontSize: `${size}px` }}>
      {text}
    </span>
  )
}
