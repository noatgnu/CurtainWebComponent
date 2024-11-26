import {createApplication} from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import {createCustomElement} from '@angular/elements';
import {AppComponent} from './app/app.component';


createApplication(appConfig)
  .then((app) => {
    const VolcanoPlot= createCustomElement(AppComponent, { injector: app.injector });
    customElements.define('volcano-plot', VolcanoPlot);
  })
  .catch((err) => console.error(err));

