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

@Component({
  selector: 'app-root',
  imports: [MatLabel, VolcanoPlotComponent, ProgressBarComponent, TypeaheadComponent, MatFormField, MatButton, MatInput, FormsModule, MatCard, MatCardContent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy{
  title = 'curtainWebComponent';
  private _curtainid: string = "";
  clicked = false
  private worker!: Worker;
  downloadProgressSubscription!: Subscription;
  progress: number = 0;
  downloading = false;
  finished = false;
  @Input("search") search: boolean = false;
  @Input("switchid") switchid: boolean = false;
  switchID: string = "";

  @Input("curtainid") set curtainid(value: string) {
    this.finished = false;
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
            this.restoreSettings(data)
          }
        }, (error) => {
          this.downloading = false;
          this.finished = true;
        })
      })
    } else {
      this.downloading = true;
      this.web.getData(urlData).subscribe((data) => {

        if (data) {
          this.restoreSettings(data).then(() => {
            this.downloading = false;
          })
        }
      }, (error) => {
        this.downloading = false;
        this.finished = true;
      })
    }
  }

  get curtainid(): string {
    return this._curtainid;
  }

  reviver (key: any, value: any) {
    if(typeof value === 'object' && value !== null) {
      if (value.dataType === 'Map') {
        return new Map(value.value);
      }
    }
    return value;
  }


  constructor(private webWorker: WebWorkerService, private web: WebService, public data: DataService, private settings: SettingsService, private uniprot: UniprotService) {

  }

  async restoreSettings(object: any) {
    console.log(object)
    if (typeof object === "string") {
      object = JSON.parse(object, this.reviver)
    }
    if (typeof object.settings === "string") {
      object.settings = JSON.parse(object.settings, this.reviver)
    }
    if (object.fetchUniprot) {
      if (object.extraData) {
        if (typeof object.extraData === "string") {
          object.extraData = JSON.parse(object.extraData, this.reviver)
        }
        if (object.extraData.uniprot) {
          this.uniprot.results = object.extraData.uniprot.results
          if (object.extraData.uniprot.dataMap instanceof Map) {
            this.uniprot.dataMap = object.extraData.uniprot.dataMap
          } else {
            this.uniprot.dataMap = new Map(object.extraData.uniprot.dataMap.value)
          }
          if (object.extraData.uniprot.accMap instanceof Map) {
            this.uniprot.accMap = object.extraData.uniprot.accMap
          } else {
            this.uniprot.accMap = new Map(object.extraData.uniprot.accMap.value)
          }
          if (object.extraData.uniprot.db instanceof Map) {
            this.uniprot.db = object.extraData.uniprot.db
          } else {
            this.uniprot.db = new Map(object.extraData.uniprot.db.value)
          }

          this.uniprot.organism = object.extraData.uniprot.organism
          if (object.extraData.uniprot.accMap instanceof Map) {
            this.uniprot.accMap = object.extraData.uniprot.accMap
          } else {
            this.uniprot.accMap = new Map(object.extraData.uniprot.accMap.value)
          }
          this.uniprot.geneNameToAcc = object.extraData.uniprot.geneNameToAcc
        }
        if (object.extraData.data) {
          if (object.extraData.data.dataMap instanceof Map) {
            this.data.dataMap = object.extraData.data.dataMap
          } else {
            this.data.dataMap = new Map(object.extraData.data.dataMap.value)
          }
          this.data.genesMap = object.extraData.data.genesMap
          this.data.primaryIDsMap = object.extraData.data.primaryIDsmap
          this.data.allGenes = object.extraData.data.allGenes
        }
        this.data.bypassUniProt = true
        console.log(this.data.dataMap)
      }
    }

    if (!object.settings.project) {
      object.settings.project = new Project()
    } else {
      const p = new Project()
      for (const key in object.settings.project) {
        if (object.settings.project.hasOwnProperty(key)) {
          // @ts-ignore
          p[key] = object.settings.project[key]
        }
      }
      object.settings.project = p
    }

    if (!object.settings.plotFontFamily) {
      object.settings.plotFontFamily = "Arial"
    }
    if (!object.settings.scatterPlotMarkerSize) {
      object.settings.scatterPlotMarkerSize = 10
    }
    if (!object.settings.defaultColorList) {
      object.settings.defaultColorList = this.data.palette["pastel"]
    }
    if (!object.settings.prideAccession) {
      object.settings.prideAccession = ""
    }

    if (!object.settings.volcanoPlotTitle) {
      object.settings.volcanoPlotTitle = ""
    }

    if (!object.settings.textAnnotation) {
      object.settings.textAnnotation = {}
    }
    if (!object.settings.barchartColorMap) {
      object.settings.barchartColorMap = {}
    }
    if (!object.settings.volcanoAxis) {
      object.settings.volcanoAxis = {minX: null, maxX: null, minY: null, maxY: null}
    }
    if (!object.settings.sampleOrder) {
      object.settings.sampleOrder = {}
    }
    if (!object.settings.sampleVisible) {
      object.settings.sampleVisible = {}
    }
    if (!object.settings.conditionOrder) {
      object.settings.conditionOrder = []
    }
    if (object.settings.version) {
      if (object.settings.version === 2) {
        this.data.selected = object.selections
        this.data.selectedMap = object.selectionsMap
        this.data.selectOperationNames = object.selectionsName
        this.data.differentialForm = new Differential()
        if (typeof object.differentialForm._comparisonSelect === "string") {
          object.differentialForm._comparisonSelect = [object.differentialForm._comparisonSelect]
        }
        this.data.differentialForm.restore(object.differentialForm)

        this.data.rawForm = new Raw()
        this.data.rawForm.restore(object.rawForm)
        this.data.fetchUniprot = object.fetchUniprot
        if (object.annotatedData) {
          this.data.annotatedData = object.annotatedData
        }
      }
    } else {
      this.data.fetchUniprot = object.settings.uniprot
      if (!object.settings.colormap) {
        object.settings["colormap"] = {}
      }
      if (!object.settings.pCutoff){
        object.settings["pCutoff"] = 0.05
      }
      if (!object.settings.logFCCutoff){
        object.settings["log2FCCutoff"] = 0.6
      }
      if (object.settings.dataColumns) {
        this.data.rawForm = new Raw()
        this.data.rawForm.samples = object.settings.dataColumns["rawSamplesCol"]
        this.data.rawForm.primaryIDs = object.settings.dataColumns["rawIdentifierCol"]
        this.data.differentialForm = new Differential()
        this.data.differentialForm.primaryIDs = object.settings.dataColumns["processedIdentifierCol"]
        this.data.differentialForm.significant = object.settings.dataColumns["processedPValue"]
        this.data.differentialForm.foldChange = object.settings.dataColumns["processedLog2FC"]
        this.data.differentialForm.comparison = object.settings.dataColumns["processedCompLabel"]
        if (typeof object.settings.dataColumns["comparison"] === "string") {
          object.settings.dataColumns["comparison"] = [object.settings.dataColumns["comparison"]]
        }
        this.data.differentialForm.comparisonSelect = object.settings.dataColumns["comparison"]

        if (object.settings.antilogP) {
          this.data.differentialForm.transformSignificant = false
        } else {
          this.data.differentialForm.transformSignificant = true
        }
      }
      if (object.selections) {

        for (const s in object.selections) {
          if (!this.data.selectOperationNames.includes(s)) {
            this.data.selectOperationNames.push(s)
          }
          for (const i of object.selections[s]) {
            this.data.selected.push(i)
            if (!this.data.selectedMap[i]) {
              this.data.selectedMap[i] = {}
            }
            this.data.selectedMap[i][s] = true
          }
        }
      }
    }
    if (/\t/.test(object.raw)) {
      // @ts-ignore
      this.data.raw = new InputFile(fromCSV(object.raw, {delimiter: "\t"}), "rawFile.txt", object.raw)
    } else {
      // @ts-ignore
      this.data.raw = new InputFile(fromCSV(object.raw), "rawFile.txt", object.raw)
    }
    if (/\t/.test(object.processed)) {
      // @ts-ignore
      this.data.differential = new InputFile(fromCSV(object.processed, {delimiter: "\t"}), "processedFile.txt", object.processed)
    } else {
      this.data.differential = new InputFile(fromCSV(object.processed), "processedFile.txt", object.processed)
    }
    this.settings.settings = new Settings()
    for (const i in object.settings) {
      if (i !== "currentID") {
        // @ts-ignore
        this.settings.settings[i] = object.settings[i]
      }
    }
    this.startWork()
  }

  startWork() {
    console.log("Starting work")
    console.log(typeof Worker)
    if (typeof Worker !== 'undefined') {
      // Create a new worker instance
      const blob = new Blob([this.webWorker.workerCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      this.worker = new Worker(url);
      console.log(this.worker)
      this.worker.onmessage = (data: MessageEvent<any>) => {
        console.log(data)
        if (data.data) {
          if (data.data.type === "progress") {

            // Handle progress updates
          } else if (data.data.type === "resultDifferential") {
            this.handleDifferentialResult(data.data);
            this.worker.postMessage({
              task: 'processRawFile',
              rawForm: this.data.rawForm,
              raw: this.data.raw.originalFile,
              settings: Object.assign({}, this.settings.settings)
            })
          } else if (data.data.type === "resultRaw") {
            this.handleRawResult(data.data);
          }
        } else {
          this.worker.terminate();
        }
      };
      this.worker.postMessage({
        task: 'processDifferentialFile',
        differential: this.data.differential.originalFile,
        differentialForm: this.data.differentialForm
      });
      this.data.differential.df = new DataFrame();
    } else {
      // Fallback to processing in the main thread
      const differentialResult = this.webWorker.processDifferentialFile({
        differential: this.data.differential.originalFile,
        differentialForm: this.data.differentialForm
      });
      this.handleDifferentialResult(differentialResult);

      const rawResult = this.webWorker.processRawFile({
        rawForm: this.data.rawForm,
        raw: this.data.raw.originalFile,
        settings: Object.assign({}, this.settings.settings)
      });
      this.handleRawResult(rawResult);
      this.worker.terminate();
    }
  }

  handleDifferentialResult(data: any) {
    this.data.differential.df = fromJSON(data.differential);
    for (const i in this.data.differentialForm) {
      if (this.data.differentialForm.hasOwnProperty(i)) {
        if (i in data.differentialForm) {
          // @ts-ignore
          this.data.differentialForm[i] = data.differentialForm[i];
        }
      }
    }
    let currentDF = this.data.differential.df.where(r => this.data.differentialForm.comparisonSelect.includes(r[this.data.differentialForm.comparison])).bake();

    const d: string[] = [];
    for (const r of currentDF) {
      d.push(r[this.data.differentialForm.primaryIDs] + "(" + r[this.data.differentialForm.comparison] + ")");
    }

    currentDF = currentDF.withSeries("UniquePrimaryIDs", new Series(d)).bake();
    const fc = currentDF.getSeries(this.data.differentialForm.foldChange).where(i => !isNaN(i)).bake();
    const sign = currentDF.getSeries(this.data.differentialForm.significant).where(i => !isNaN(i)).bake();

    this.data.minMax = {
      fcMin: fc.min(),
      fcMax: fc.max(),
      pMin: sign.min(),
      pMax: sign.max()
    };
    this.data.currentDF = currentDF;
    this.data.primaryIDsList = this.data.currentDF.getSeries(this.data.differentialForm.primaryIDs).bake().distinct().toArray();
    for (const p of this.data.primaryIDsList) {
      if (!this.data.primaryIDsMap[p]) {
        this.data.primaryIDsMap[p] = {};
        this.data.primaryIDsMap[p][p] = true;
      }
      for (const n of p.split(";")) {
        if (!this.data.primaryIDsMap[n]) {
          this.data.primaryIDsMap[n] = {};
        }
        this.data.primaryIDsMap[n][p] = true;
      }
    }
  }

  handleRawResult(data: any) {
    this.data.raw.df = fromJSON(data.raw);
    for (const s in this.settings.settings) {
      if (this.settings.settings.hasOwnProperty(s)) {
        // @ts-ignore
        this.settings.settings[s] = data.settings[s];
      }
    }
    this.data.conditions = data.conditions;
    this.processUniProt();
  }

  async processFiles(e: any = null) {
    if (e) {
      e.preventDefault()
    }
    if (!this.clicked) {
      //this.clicked = true
      //this.finished.emit(false)
      if (!this.data.differentialForm.comparison || this.data.differentialForm.comparison === "" || this.data.differentialForm.comparison === "CurtainSetComparison") {
        this.data.differentialForm.comparison = "CurtainSetComparison"
        this.data.differentialForm.comparisonSelect = ["1"]

        this.data.differential.df = this.data.differential.df.withSeries("CurtainSetComparison", new Series(Array(this.data.differential.df.count()).fill("1"))).bake()
      }
      if (!this.data.differentialForm.comparisonSelect) {
        this.data.differentialForm.comparisonSelect = [this.data.differential.df.first()[this.data.differentialForm.comparison]]
      } else if (this.data.differentialForm.comparisonSelect.length === 0) {
        this.data.differentialForm.comparisonSelect = [this.data.differential.df.first()[this.data.differentialForm.comparison]]
      }
      const totalSampleNumber = this.data.rawForm.samples.length
      let sampleNumber = 0
      let samples: string[] = []
      const conditionOrder = this.settings.settings.conditionOrder.slice()
      if (conditionOrder.length > 0) {
        for (const c of conditionOrder) {
          for (const s of this.settings.settings.sampleOrder[c]) {
            samples.push(s)
          }
        }
      } else {
        samples = this.data.rawForm.samples.slice()
      }
      const conditions: string[] = []
      for (const s of samples) {
        const condition_replicate = s.split(".")
        const replicate = condition_replicate[condition_replicate.length-1]
        const condition = condition_replicate.slice(0, condition_replicate.length-1).join(".")
        if (!conditions.includes(condition)) {
          conditions.push(condition)
        }
        this.settings.settings.sampleMap[s] = {replicate: replicate, condition: condition, name: s}
        if (!this.settings.settings.sampleOrder[condition]) {
          this.settings.settings.sampleOrder[condition] = []
        }
        if (!this.settings.settings.sampleOrder[condition].includes(s)) {
          this.settings.settings.sampleOrder[condition].push(s)
        }

        if (!(s in this.settings.settings.sampleVisible)) {
          this.settings.settings.sampleVisible[s] = true
        }
        this.data.raw.df = this.data.raw.df.withSeries(s, new Series(this.convertToNumber(this.data.raw.df.getSeries(s).toArray()))).bake()
        sampleNumber ++
        //this.updateProgressBar(sampleNumber*100/totalSampleNumber, "Processed "+s+" sample data")
      }
      if (this.settings.settings.conditionOrder.length === 0) {
        this.settings.settings.conditionOrder = conditions
      }
      let colorPosition = 0
      const colorMap: any = {}
      for (const c of conditions) {
        if (colorPosition >= this.settings.settings.defaultColorList.length) {
          colorPosition = 0
        }
        colorMap[c] = this.settings.settings.defaultColorList[colorPosition]
        //this.settings.settings.barchartColorMap[c] = null
        colorPosition++
      }
      this.settings.settings.colorMap = colorMap
      this.data.conditions = conditions
      this.data.differential.df = this.toUpperCaseColumn(this.data.differentialForm.primaryIDs, this.data.differential.df)
      this.data.raw.df = this.toUpperCaseColumn(this.data.rawForm.primaryIDs, this.data.raw.df)
      this.data.differential.df = this.data.differential.df.withSeries(this.data.differentialForm.foldChange, new Series(this.convertToNumber(this.data.differential.df.getSeries(this.data.differentialForm.foldChange).toArray()))).bake()
      if (this.data.differentialForm.transformFC) {
        this.data.differential.df = this.data.differential.df.withSeries(this.data.differentialForm.foldChange, new Series(this.log2Convert(this.data.differential.df.getSeries(this.data.differentialForm.foldChange).toArray()))).bake()
      }

      //this.updateProgressBar(50, "Processed fold change")
      this.data.differential.df = this.data.differential.df.withSeries(this.data.differentialForm.significant, new Series(this.convertToNumber(this.data.differential.df.getSeries(this.data.differentialForm.significant).toArray()))).bake()
      if (this.data.differentialForm.transformSignificant) {
        this.data.differential.df = this.data.differential.df.withSeries(this.data.differentialForm.significant, new Series(this.log10Convert(this.data.differential.df.getSeries(this.data.differentialForm.significant).toArray()))).bake()

      }
      //this.updateProgressBar(100, "Processed significant")
      const currentDF = this.data.differential.df.where(r => this.data.differentialForm.comparisonSelect.includes(r[this.data.differentialForm.comparison]))
      const fc = currentDF.getSeries(this.data.differentialForm.foldChange).where(i => !isNaN(i)).bake()
      const sign = currentDF.getSeries(this.data.differentialForm.significant).where(i => !isNaN(i)).bake()
      this.data.minMax = {
        fcMin: fc.min(),
        fcMax: fc.max(),
        pMin: sign.min(),
        pMax: sign.max()
      }

      this.data.currentDF = this.data.differential.df.where(r => this.data.differentialForm.comparisonSelect.includes(r[this.data.differentialForm.comparison]))
      const d: string[] = []
      for (const r of this.data.currentDF) {
        d.push(r[this.data.differentialForm.primaryIDs] + "("+r[this.data.differentialForm.comparison]+")")
      }

      this.data.currentDF = this.data.currentDF.withSeries("UniquePrimaryIDs", new Series(d)).bake()
      this.data.primaryIDsList = this.data.currentDF.getSeries(this.data.differentialForm.primaryIDs).distinct().toArray()
      for (const p of this.data.primaryIDsList) {
        if (!this.data.primaryIDsMap[p])  {
          this.data.primaryIDsMap[p] = {}
          this.data.primaryIDsMap[p][p] = true
        }
        for (const n of p.split(";")) {
          if (!this.data.primaryIDsMap[n]) {
            this.data.primaryIDsMap[n] = {}
          }
          this.data.primaryIDsMap[n][p] = true
        }
      }

      this.processUniProt()
    }

  }

  toUpperCaseColumn(col: string, df: IDataFrame) {
    const d = df.getSeries(col).bake().toArray()
    return df.withSeries(col, new Series(d.map(v => v.toUpperCase()))).bake()
  }

  convertToNumber(arr: string[]) {
    const newCol = arr.map(Number)
    return newCol
  }

  log2Convert(arr: number[]) {
    const newCol = arr.map(a => this.log2Stuff(a))
    return newCol
  }

  log2Stuff(data: number) {
    if (data > 0) {
      return Math.log2(data)
    } else if (data < 0) {
      return Math.log2(Math.abs(data))
    } else {
      return 0
    }
  }

  log10Convert(arr: number[]) {
    const newCol = arr.map(a => -Math.log10(a))
    return newCol
  }

  processUniProt(){
    if (this.data.fetchUniprot) {

      if (!this.data.bypassUniProt) {
        this.uniprot.geneNameToAcc = {}
        this.uniprot.uniprotParseStatus.next(false)
        const accList: string[] = []
        this.data.dataMap = new Map<string, string>()
        this.data.genesMap = {}
        this.uniprot.accMap = new Map<string, string[]>()
        this.uniprot.dataMap = new Map<string, any>()
        for (const r of this.data.raw.df) {
          const a = r[this.data.rawForm.primaryIDs]

          this.data.dataMap.set(a, r[this.data.rawForm.primaryIDs])
          this.data.dataMap.set(r[this.data.rawForm.primaryIDs], a)
          const d = a.split(";")
          const accession = this.uniprot.Re.exec(d[0])
          if (accession) {
            if (this.uniprot.accMap.has(a)) {
              const al = this.uniprot.accMap.get(a)
              if (al) {
                if (!al.includes(accession[1])) {
                  al.push(accession[1])
                  this.uniprot.accMap.set(a, al)
                }
              }
            } else {
              this.uniprot.accMap.set(a, [accession[1]])
            }
            if (this.uniprot.accMap.has(accession[1])) {
              const al = this.uniprot.accMap.get(accession[1])
              if (al) {
                if (!al.includes(a)) {
                  al.push(a)
                  this.uniprot.accMap.set(accession[1], al)
                }
              }
            } else {
              this.uniprot.accMap.set(accession[1], [a])
            }

            if (!this.uniprot.dataMap.has(accession[1])) {
              accList.push(accession[1])
            }
          }
        }
        if (accList.length > 0) {
          this.uniprot.db = new Map<string, any>()
          this.createUniprotDatabase(accList).then((allGenes) => {
            //this.toast.show("UniProt", "Finished building local UniProt database. " + allGenes.length + " genes found.")
            this.data.allGenes = allGenes
            //this.finished.emit(true)
            this.clicked = false
            this.uniprot.uniprotParseStatus.next(false)
            this.finished = true
            //this.updateProgressBar(100, "Finished")
          });
        } else {
          //this.finished.emit(true)
          this.clicked = false
          this.finished = true
          //this.updateProgressBar(100, "Finished")
        }
      } else {
        //this.finished.emit(true)
        this.clicked = false
        this.data.bypassUniProt = false
        this.finished = true
        //this.updateProgressBar(100, "Finished")
      }

    } else {
      this.uniprot.geneNameToAcc = {}
      if (this.data.differentialForm.geneNames !== "") {
        for (const r of this.data.currentDF) {
          if (r[this.data.differentialForm.geneNames]) {
            const g = r[this.data.differentialForm.geneNames]
            if (!this.data.genesMap[g])  {
              this.data.genesMap[g] = {}
              this.data.genesMap[g][g] = true
            }
            for (const n of g.split(";")) {
              if (!this.data.genesMap[n]) {
                this.data.genesMap[n] = {}
              }
              this.data.genesMap[n][g] = true
            }
            if (!this.data.allGenes.includes(g)) {
              this.data.allGenes.push(g)
            }
            if (!this.uniprot.geneNameToAcc[g]) {
              this.uniprot.geneNameToAcc[g] = {}
            }
            this.uniprot.geneNameToAcc[g][r[this.data.differentialForm.primaryIDs]] = true
          }
        }
        this.data.allGenes = this.data.currentDF.getSeries(this.data.differentialForm.geneNames).distinct().toArray().filter(v => v !== "")
      }
      //this.finished.emit(true)
      //this.clicked = false
      //this.updateProgressBar(100, "Finished")
      this.finished=true
    }
  }

  private async createUniprotDatabase(accList: string[]) {
    await this.uniprot.UniprotParserJS(accList)
    const allGenes: string[] = []
    for (const p of this.data.primaryIDsList) {
      try {
        const uni: any = this.uniprot.getUniprotFromPrimary(p)
        if (uni) {
          if (uni["Gene Names"]) {
            if (uni["Gene Names"] !== "") {
              if (!allGenes.includes(uni["Gene Names"])) {
                allGenes.push(uni["Gene Names"])
                if (!this.data.genesMap[uni["Gene Names"]]) {
                  this.data.genesMap[uni["Gene Names"]] = {}
                  this.data.genesMap[uni["Gene Names"]][uni["Gene Names"]] = true
                }
                for (const n of uni["Gene Names"].split(";")) {
                  if (!this.data.genesMap[n]) {
                    this.data.genesMap[n] = {}
                  }
                  this.data.genesMap[n][uni["Gene Names"]] = true
                }
              }
            }
          }
        }
      } catch (e) {
        console.log(e)
      }
    }
    return allGenes
  }

  ngOnDestroy() {
    if (this.worker) {
      this.worker.terminate()
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
