import { Injectable } from '@angular/core';
import {Settings} from './settings';
import {PtmSettings} from './ptm-settings';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  settings = new Settings()
  ptmSettings = new PtmSettings()
  constructor() { }
}
