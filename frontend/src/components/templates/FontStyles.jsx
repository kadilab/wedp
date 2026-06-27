import { useQuery } from 'react-query'
import { fontAPI } from '../../services/api'
import { buildGoogleFontsHref, customFontFaceCss } from '../../utils/fonts'

// Fetches the admin-uploaded custom fonts (cached app-wide by react-query).
export function useCustomFonts() {
  const { data } = useQuery('custom-fonts', () => fontAPI.list(), {
    staleTime: 5 * 60 * 1000,
    retry: false
  })
  return data?.data?.fonts || []
}

// Injects the Google Fonts <link> + @font-face rules for custom fonts.
// Drop it once near the top of any view that renders template text.
export default function FontStyles() {
  const customFonts = useCustomFonts()
  return (
    <>
      <link href={buildGoogleFontsHref()} rel="stylesheet" />
      {customFonts.length > 0 && (
        <style dangerouslySetInnerHTML={{ __html: customFontFaceCss(customFonts) }} />
      )}
    </>
  )
}
