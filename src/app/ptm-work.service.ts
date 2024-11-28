import { Injectable } from '@angular/core';
import {UniprotPtmService} from './uniprot-ptm.service';
import {DataPtmService} from './data-ptm.service';
import {ProteomicsWorkService} from './proteomics-work.service';
import {InputFile} from './input-file';
import {DataFrame, fromCSV, fromJSON, Series} from 'data-forge';
import {Project} from './project';
import {Differential} from './differential-ptm';
import {Raw} from './raw';
import {SettingsService} from './settings.service';
import {WebWorkerService} from './web-worker.service';

@Injectable({
  providedIn: 'root'
})
export class PtmWorkService {
  work!: Worker
  finished: boolean = false

  constructor(private worker: WebWorkerService, private uniprot: UniprotPtmService, private data: DataPtmService, private settings: SettingsService) { }

  async restoreSettings(object: any) {

    console.log(object)
    if (object.fetchUniProt) {
      if (object.extraData) {
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

          this.uniprot.geneNameToPrimary = object.extraData.uniprot.geneNameToPrimary
        }
        if (object.extraData.data) {
          this.data.accessionToPrimaryIDs = object.extraData.data.accessionToPrimaryIDs
          this.data.primaryIDsList = object.extraData.data.primaryIDsList
          this.data.accessionList = object.extraData.data.accessionList
          this.data.accessionMap = object.extraData.data.accessionMap
          this.data.genesMap = object.extraData.data.genesMap
          this.data.allGenes = object.extraData.data.allGenes
          if (object.extraData.data.dataMap instanceof Map) {
            this.data.dataMap = object.extraData.data.dataMap
          } else {
            this.data.dataMap = new Map(object.extraData.data.dataMap.value)
          }
        }
        this.data.bypassUniProt = true
        console.log(this.data.dataMap)
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

    if (!object.settings.defaultColorList) {
      object.settings.defaultColorList = this.data.palette["pastel"].slice()
    }

    if (!object.settings.scatterPlotMarkerSize) {
      object.settings.scatterPlotMarkerSize = 10
    }
    if (!object.settings.variantCorrection) {
      object.settings.variantCorrection = {}
    }
    if (!object.settings.customSequences) {
      object.settings.customSequences = {}
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
        this.data.differentialForm.restore(object.differentialForm)
        this.data.rawForm = new Raw()
        this.data.rawForm.restore(object.rawForm)
        this.data.fetchUniProt = object.fetchUniProt
        if (object.annotatedData) {
          this.data.annotatedData = object.annotatedData
        }
        if (object.annotatedMap) {
          this.data.annotatedMap = object.annotatedMap
        }
        if (object.dbIDMap) {
          this.data.dbIDMap = object.dbIDMap
        }
      }
    } else {
      console.log(object)
      if (object.selections) {
        this.data.differentialForm.accession = object.cols.accessionCol
        this.data.differentialForm.comparison = object.cols.comparisonCol
        this.data.differentialForm.foldChange = object.cols.foldChangeCol
        this.data.differentialForm.transformFC = object.cols.log2transform
        this.data.differentialForm.transformSignificant = object.cols.log10transform
        this.data.differentialForm.peptideSequence = object.cols.peptideSequenceCol
        this.data.differentialForm.position = object.cols.positionCol
        this.data.differentialForm.positionPeptide = object.cols.positionPeptideCol
        this.data.differentialForm.primaryIDs = object.cols.primaryIDComparisonCol
        this.data.rawForm.primaryIDs = object.cols.primaryIDRawCol
        this.data.rawForm.samples = object.cols.rawValueCols
        this.data.differentialForm.score = object.cols.score
        this.data.differentialForm.sequence = object.cols.sequenceCol
        this.data.differentialForm.significant = object.cols.significantCol
        const selections = Object.keys(object.highlights)
        const df = this.data.differential.df.where(r => selections.includes(r[this.data.differentialForm.primaryIDs])).bake()
        for (const r of df) {
          this.data.selected.push(r[this.data.differentialForm.primaryIDs])
          if (!this.data.selectOperationNames.includes(r[this.data.differentialForm.accession])) {
            this.data.selectOperationNames.push(r[this.data.differentialForm.accession])
          }
          if (!this.data.selectedMap[r[this.data.differentialForm.primaryIDs]]) {
            this.data.selectedMap[r[this.data.differentialForm.primaryIDs]] = {}
          }
          this.data.selectedMap[r[this.data.differentialForm.primaryIDs]][r[this.data.differentialForm.accession]] = true
        }
      }
    }
    for (const i in object.settings) {
      if (i !== "currentID") {
        // @ts-ignore
        this.settings.ptmSettings[i] = object.settings[i]
      }
    }

    /*for (const i in this.settings.ptmSettings.customPTMData) {
      if (this.ptm.databases.filter(r => r.name === i).length === 0) {
        this.ptm.databases.push({name: i, value: i, academic: true, custom: true})
        this.ptm.databaseNameMap[i] = i
      }
    }*/
    //this.data.restoreTrigger.next(true)
  }

  startWork() {
    this.finished = false
    if (typeof Worker !== 'undefined') {
      console.log("start worker")
      const blob = new Blob([this.worker.workerCodePtm], { type: 'application/javascript' });
      this.work = new Worker(URL.createObjectURL(blob));
      this.work.onmessage = (data: MessageEvent<any>) => {
        console.log(data)
        if (data.data) {
          if (data.data.type === "progress") {
            // Handle progress updates
          } else if (data.data.type === "resultDifferential") {
            this.handleDifferentialResult(data.data);
            this.work.postMessage({
              task: 'processRawFile',
              rawForm: this.data.rawForm,
              raw: this.data.raw.originalFile,
              settings: this.settings.ptmSettings
            });
          } else if (data.data.type === "resultRaw") {
            this.handleRawResult(data.data);
            this.work.terminate();
          }
        } else {
          this.work.terminate();
        }
      };
      this.work.postMessage({
        task: 'processDifferentialFile',
        differential: this.data.differential.originalFile,
        differentialForm: this.data.differentialForm
      });
      this.data.differential.df = new DataFrame();
    } else {
      const differentialResult = this.worker.processDifferentialFilePtm({
        differential: this.data.differential.originalFile,
        differentialForm: this.data.differentialForm
      });
      this.handleDifferentialResult(differentialResult);

      const rawResult = this.worker.processRawFilePtm({
        rawForm: this.data.rawForm,
        raw: this.data.raw.originalFile,
        settings: this.settings.ptmSettings
      });
      this.handleRawResult(rawResult);
    }
  }

  private handleDifferentialResult(data: any) {
    this.data.differential.df = fromJSON(data.differential);
    for (const i in this.data.differentialForm) {
      if (this.data.differentialForm.hasOwnProperty(i)) {
        if (i in data.differentialForm) {
          // @ts-ignore
          this.data.differentialForm[i] = data.differentialForm[i];
        }
      }
    }

    const currentDF = this.data.differential.df.where(r => r[this.data.differentialForm.comparison] === this.data.differentialForm.comparisonSelect).resetIndex().bake();

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
    this.data.accessionList = this.data.currentDF.getSeries(this.data.differentialForm.accession).bake().distinct().toArray();
    for (const p of this.data.accessionList) {
      if (!this.data.accessionMap[p]) {
        this.data.accessionMap[p] = {};
        this.data.accessionMap[p][p] = true;
      }
      for (const n of p.split(";")) {
        if (!this.data.accessionMap[n]) {
          this.data.accessionMap[n] = {};
        }
        this.data.accessionMap[n][p] = true;
      }
    }
  }

  private handleRawResult(data: any) {
    this.data.raw.df = fromJSON(data.raw);
    for (const s in this.settings.ptmSettings) {
      if (this.settings.ptmSettings.hasOwnProperty(s)) {
        // @ts-ignore
        this.settings.ptmSettings[s] = data.settings[s];
      }
    }
    this.data.conditions = data.conditions;
    this.processUniProt();
  }

  processUniProt() {
    if (this.data.fetchUniProt) {
      if (!this.data.bypassUniProt) {
        this.uniprot.geneNameToPrimary = {}
        const accList: string[] = []
        this.data.dataMap = new Map<string, string>()
        this.data.genesMap = {}
        this.uniprot.accMap = new Map<string, string>()
        this.uniprot.dataMap = new Map<string, string>()
        for (const r of this.data.currentDF) {
          const a = r[this.data.differentialForm.accession]
          this.data.dataMap.set(a, r[this.data.differentialForm.accession])
          this.data.dataMap.set(r[this.data.differentialForm.primaryIDs], a)
          this.data.dataMap.set(r[this.data.differentialForm.accession], a)

          const d = a.split(";")
          const accession = this.uniprot.Re.exec(d[0])
          if (accession) {
            this.uniprot.accMap.set(a, accession[1])
            if (!this.data.accessionToPrimaryIDs[accession[1]]) {
              this.data.accessionToPrimaryIDs[accession[1]] = {}
            }
            this.data.accessionToPrimaryIDs[accession[1]][r[this.data.differentialForm.primaryIDs]] = true
            this.uniprot.accMap.set(r[this.data.differentialForm.primaryIDs], accession[1])

            if (!this.uniprot.dataMap.has(accession[1])) {
              if (!accList.includes(accession[1])) {
                accList.push(accession[1])
              }
            }
          }
        }
        if (accList.length > 0) {
          this.uniprot.UniprotParserJS(accList).then(r => {
            this.createUniprotDatabase().then((allGenes)=> {
              this.data.allGenes = allGenes

              this.finished = true
            });
          })
        } else {
          this.finished = true
        }
      } else {
        this.finished = true
        this.data.bypassUniProt = false
      }

    } else {
      this.uniprot.geneNameToPrimary = {}
      if (this.data.differentialForm.geneNames !== "") {
        for (const r of this.data.differential.df) {
          if (r[this.data.differentialForm.geneNames] !== "") {
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
            if (!this.uniprot.geneNameToPrimary[g]) {
              this.uniprot.geneNameToPrimary[g] = {}
            }
            this.uniprot.geneNameToPrimary[g][r[this.data.differentialForm.primaryIDs]] = true
          }
        }
        this.data.allGenes = this.data.differential.df.getSeries(this.data.differentialForm.geneNames).bake().toArray().filter(v => v !== "")
      }
      this.finished = true
    }
  }

  private async createUniprotDatabase() {
    const allGenes: string[] = []
    for (const p of this.data.accessionList) {
      const uni: any = this.uniprot.getUniprotFromAcc(p)
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
              if (!this.uniprot.geneNameToPrimary[uni["Gene Names"]]) {
                this.uniprot.geneNameToPrimary[uni["Gene Names"]] = {}
              }
              if (this.data.accessionToPrimaryIDs[uni["Entry"]]) {
                for (const e in this.data.accessionToPrimaryIDs[uni["Entry"]]) {
                  this.uniprot.geneNameToPrimary[uni["Gene Names"]][e] = true
                }
              }
            }
          }
        }
      }
    }
    return allGenes
  }
}
