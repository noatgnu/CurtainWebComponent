import { Injectable } from '@angular/core';
import {WebWorkerService} from './web-worker.service';
import {DataService} from './data.service';
import {SettingsService} from './settings.service';
import {DataFrame, fromCSV, fromJSON, Series} from 'data-forge';
import {UniprotService} from './uniprot.service';
import {Project} from './project';
import {Differential} from './differential';
import {Raw} from './raw';
import {InputFile} from './input-file';
import {Settings} from './settings';

@Injectable({
  providedIn: 'root'
})
export class ProteomicsWorkService {
  worker!: Worker;
  finished: boolean = false;

  constructor(
    private webWorker: WebWorkerService,
    private data: DataService,
    private settings: SettingsService,
    private uniprot: UniprotService
  ) {}

  startWork() {
    if (typeof Worker !== 'undefined') {
      const blob = new Blob([this.webWorker.workerCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      this.worker = new Worker(url);

      this.worker.onmessage = (data: MessageEvent<any>) => {
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
            });
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
    }
  }

  terminateWorker() {
    if (this.worker) {
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
            this.uniprot.uniprotParseStatus.next(false)
            this.finished = true
            //this.updateProgressBar(100, "Finished")
          });
        } else {
          //this.finished.emit(true)
          this.finished = true
          //this.updateProgressBar(100, "Finished")
        }
      } else {
        //this.finished.emit(true)
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

  async restoreSettings(object: any) {

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

  }

  reviver (key: any, value: any) {
    if(typeof value === 'object' && value !== null) {
      if (value.dataType === 'Map') {
        return new Map(value.value);
      }
    }
    return value;
  }
}
