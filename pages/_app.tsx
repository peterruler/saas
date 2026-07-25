import type { AppProps } from 'next/app';
import '../styles/globals.css';  // This imports Tailwind styles

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}