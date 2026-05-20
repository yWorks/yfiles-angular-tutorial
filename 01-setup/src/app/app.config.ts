import {
  type ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core'

export const appConfig: ApplicationConfig = {
  providers: [
    // Angular 21 uses zoneless change detection by default.
    // This is more efficient and works well with yFiles' imperative API.
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
  ],
}
