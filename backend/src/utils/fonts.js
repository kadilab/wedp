// Backend mirror of frontend/src/utils/fonts.js — keeps the generated PDF/PNG
// (puppeteer) font set in sync with the editor and the public page.

const GOOGLE_FONTS = [
  { family: 'Playfair Display', weights: '400;600;700' },
  { family: 'Cormorant Garamond', weights: '400;500;600;700' },
  { family: 'Cormorant', weights: '400;500;600;700' },
  { family: 'EB Garamond', weights: '400;500;600;700' },
  { family: 'Cinzel', weights: '400;600;700' },
  { family: 'Cinzel Decorative', weights: '400;700' },
  { family: 'Marcellus' },
  { family: 'Marcellus SC' },
  { family: 'Italiana' },
  { family: 'Forum' },
  { family: 'Prata' },
  { family: 'Bodoni Moda', weights: '400;500;600;700' },
  { family: 'Libre Baskerville', weights: '400;700' },
  { family: 'Lora', weights: '400;500;600;700' },
  { family: 'Crimson Text', weights: '400;600;700' },
  { family: 'Merriweather', weights: '300;400;700;900' },
  { family: 'Frank Ruhl Libre', weights: '400;500;700;900' },
  { family: 'Tenor Sans' },
  { family: 'Montserrat', weights: '300;400;500;600;700' },
  { family: 'Poppins', weights: '300;400;500;600;700' },
  { family: 'Raleway', weights: '300;400;500;600;700' },
  { family: 'Roboto', weights: '300;400;500;700' },
  { family: 'Open Sans', weights: '300;400;500;600;700' },
  { family: 'Inter', weights: '300;400;500;600' },
  { family: 'Josefin Sans', weights: '300;400;500;600;700' },
  { family: 'Nunito', weights: '300;400;600;700' },
  { family: 'Quicksand', weights: '400;500;600;700' },
  { family: 'Work Sans', weights: '300;400;500;600;700' },
  { family: 'Jost', weights: '300;400;500;600;700' },
  { family: 'Outfit', weights: '300;400;500;600;700' },
  { family: 'Mulish', weights: '300;400;600;700' },
  { family: 'Manrope', weights: '400;500;600;700' },
  { family: 'Great Vibes' },
  { family: 'Dancing Script', weights: '400;500;600;700' },
  { family: 'Tangerine', weights: '400;700' },
  { family: 'Satisfy' },
  { family: 'Pacifico' },
  { family: 'Alex Brush' },
  { family: 'Sacramento' },
  { family: 'Allura' },
  { family: 'Parisienne' },
  { family: 'Pinyon Script' },
  { family: 'Yellowtail' },
  { family: 'Cookie' },
  { family: 'Niconne' },
  { family: 'Petit Formal Script' },
  { family: 'Style Script' },
  { family: 'Mr De Haviland' },
  { family: 'Mrs Saint Delafield' },
  { family: 'Carattere' },
  { family: 'Birthstone' },
  { family: 'Engagement' },
  { family: 'Marck Script' }
];

function buildGoogleFontsHref(fonts = GOOGLE_FONTS) {
  const params = fonts
    .map((f) => {
      const name = f.family.trim().replace(/\s+/g, '+');
      return f.weights ? `family=${name}:wght@${f.weights}` : `family=${name}`;
    })
    .join('&');
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

// @font-face CSS for admin-uploaded custom fonts, using absolute URLs that
// puppeteer can fetch (PUBLIC base = FRONTEND_URL).
function customFontFaceCss(customFonts = []) {
  const base = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
  return customFonts
    .map((f) => {
      const url = /^https?:|^data:/.test(f.url) ? f.url : `${base}${f.url}`;
      return `@font-face{font-family:'${f.family}';src:url('${url}') format('${f.format || 'truetype'}');font-display:swap;}`;
    })
    .join('\n');
}

module.exports = { GOOGLE_FONTS, buildGoogleFontsHref, customFontFaceCss };
