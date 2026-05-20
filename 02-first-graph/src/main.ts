import { bootstrapApplication } from '@angular/platform-browser'
import { appConfig } from './app/app.config'
import { AppComponent } from './app/app.component'
import { License } from '@yfiles/yfiles'
import licenseData from './license.json'

// The yFiles license must be set before any yFiles API is used.
// We do this here in main.ts so it runs once before bootstrapping.
License.value = licenseData

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err))
