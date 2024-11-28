import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {VolcanoPlotComponent} from './volcano-plot/volcano-plot.component';
import {WebService} from './web.service';
import {Project} from './project';
import {DataService} from './data.service';
import {SettingsService} from './settings.service';
import {UniprotService} from './uniprot.service';
import {Differential} from './differential';
import {Raw} from './raw';
import {DataFrame, fromCSV, fromJSON, IDataFrame, Series} from 'data-forge';
import {InputFile} from './input-file';
import {Settings} from './settings';
import {Subscription} from 'rxjs';
import {ProgressBarComponent} from './progress-bar/progress-bar.component';
import {WebWorkerService} from './web-worker.service';
import {TypeaheadComponent} from './typeahead/typeahead.component';
import {MatFormField, MatLabel} from '@angular/material/form-field';
import {MatButton} from '@angular/material/button';
import {MatInput} from '@angular/material/input';
import {FormsModule} from '@angular/forms';
import {MatCard, MatCardContent} from '@angular/material/card';
import {ProteomicsWorkService} from './proteomics-work.service';
import {PtmWorkService} from './ptm-work.service';
import {PtmVolcanoPlotComponent} from './ptm-volcano-plot/ptm-volcano-plot.component';
import {environment} from '../environments/environment';
import {DataPtmService} from './data-ptm.service';

@Component({
  selector: 'app-root',
  imports: [MatLabel, VolcanoPlotComponent, ProgressBarComponent, TypeaheadComponent, MatFormField, MatButton, MatInput, FormsModule, MatCard, MatCardContent, PtmVolcanoPlotComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy{
  title = 'curtainWebComponent';
  private _curtainid: string = "";
  downloadProgressSubscription!: Subscription;
  progress: number = 0;
  downloading = false;
  @Input("search") search: boolean = environment.search;
  @Input("switchid") switchid: boolean = environment.switch;
  switchID: string = "";
  mode = "proteomics";
  @Input("curtainid") set curtainid(value: string) {
    this.proteomicsWorker.finished = false;
    this.ptmWorker.finished = false;
    this.downloading = false;
    this.progress = 0;
    this._curtainid = value;
    console.log("Curtain ID: " + this.curtainid);

    let urlData = this.curtainid.slice();
    if (this.curtainid.includes("doi.org")) {
      const url = this.curtainid.replace("https://", "").replace("doi.org/", "")
      this.downloading = true;
      this.web.getDataCiteMetadata(url).subscribe((data) => {
        urlData = data.data.attributes.alternateIdentifiers[0].alternateIdentifier
        this.web.getData(urlData, "", false).subscribe((data) => {
          this.downloading = false;
          if (data) {
            const object = this.preHandleObject(data)
            if (this.mode === "proteomics") {
              this.proteomicsWorker.restoreSettings(object).then(() => {
                this.downloading = false;
                this.proteomicsWorker.startWork()
              })
            } else if (this.mode === "ptm") {
              this.ptmWorker.restoreSettings(object).then(() => {
                this.downloading = false;
                this.ptmWorker.startWork()
              })
            }

          }
        }, (error) => {
          this.downloading = false;
          this.proteomicsWorker.finished = true;
        })
      })
    } else {
      this.downloading = true;
      this.web.getData(urlData).subscribe((data) => {

        if (data) {
          const object = this.preHandleObject(data)
          if (this.mode === "proteomics") {
            this.proteomicsWorker.restoreSettings(object).then(() => {
              this.downloading = false;
              this.proteomicsWorker.startWork();
            })
          } else if (this.mode === "ptm") {
            this.ptmWorker.restoreSettings(object).then(() => {
              this.downloading = false;
              this.ptmWorker.startWork();
            })
          }

        }
      }, (error) => {
        this.downloading = false;
        this.proteomicsWorker.finished = true;
        this.ptmWorker.finished = true;
      })
    }
  }

  get curtainid(): string {
    return this._curtainid;
  }




  constructor(public ptmWorker: PtmWorkService, public proteomicsWorker: ProteomicsWorkService, private webWorker: WebWorkerService, private web: WebService, public data: DataService, public ptmData: DataPtmService, private settings: SettingsService, private uniprot: UniprotService) {

  }

  preHandleObject(object: any) {
    if (typeof object === "string") {
      object = JSON.parse(object, this.proteomicsWorker.reviver)
    }
    if (typeof object.settings === "string") {
      object.settings = JSON.parse(object.settings, this.proteomicsWorker.reviver)
    }
    if (object.extraData) {
      if (typeof object.extraData === "string") {
        object.extraData = JSON.parse(object.extraData, this.proteomicsWorker.reviver)
      }
    }
    if ("_position" in object.differentialForm) {
      this.mode = "ptm"
    }
    console.log(object)

    return object
  }




  ngOnDestroy() {
    if (this.proteomicsWorker.worker) {
      this.proteomicsWorker.worker.terminate()
    }
    if (this.ptmWorker.work) {
      this.ptmWorker.work.terminate()
    }
    if (this.downloadProgressSubscription) {
      this.downloadProgressSubscription.unsubscribe();
    }
  }

  ngOnInit() {
    this.downloadProgressSubscription = this.web.downloadProgress.subscribe(progress => {
      this.progress = progress;
    });
  }

  handleSearch(data: any) {
    let pids: string[] = []
    if (data["filterType"] === "Genes") {
      pids = this.data.getPrimaryIDsFromGeneNames(data["search"])
    } else {
      pids = [data["search"]]
    }
    this.data.annotationService.next({id: pids, remove: false})
  }
}
