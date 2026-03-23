import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/services/interceptors/auth.interceptor';
import { LanguageService } from './core/services/api/language.api';

export function initApp(langService: LanguageService) {
  return () => langService.initialize();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: initApp,
      deps: [LanguageService],
      multi: true
    }
  ]
};