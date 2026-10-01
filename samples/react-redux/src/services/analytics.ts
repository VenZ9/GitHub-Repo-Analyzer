export function trackPageView(pageName: string) {
  console.log(`[Analytics] Page viewed: ${pageName}`);
}

export function trackEvent(name: string, properties?: Record<string, any>) {
  console.log(`[Analytics] Event: ${name}`, properties);
}
