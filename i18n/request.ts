import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  // Only 'en' and 'hi' exist; any other cookie value falls back to English.
  const locale = cookieStore.get('NEXT_LOCALE')?.value === 'hi' ? 'hi' : 'en';

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
