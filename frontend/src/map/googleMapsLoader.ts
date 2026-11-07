import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

let loading: Promise<void> | null = null;

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (loading) return loading;
  setOptions({ key: apiKey, v: 'weekly', language: 'de', region: 'DE' });
  const attempt = Promise.all([importLibrary('maps'), importLibrary('core')]).then(() => undefined);
  loading = attempt;
  attempt.catch(() => {
    loading = null;
  });
  return attempt;
}
