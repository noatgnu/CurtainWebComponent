import {Component, Input} from '@angular/core';
import {DataFrame, fromCSV, IDataFrame} from 'data-forge';
import {DataPtmService} from '../data-ptm.service';
import {UniprotPtmService} from '../uniprot-ptm.service';
import {SettingsService} from '../settings.service';
import {PlotlyViaCDNModule} from 'angular-plotly.js';

PlotlyViaCDNModule.setPlotlyBundle('basic');
PlotlyViaCDNModule.setPlotlyVersion('latest');

@Component({
  selector: 'app-ptm-volcano-plot',
  imports: [PlotlyViaCDNModule],
  templateUrl: './ptm-volcano-plot.component.html',
  styleUrl: './ptm-volcano-plot.component.scss'
})
export class PtmVolcanoPlotComponent {
  settingsNav = "parameters"
  editMode: boolean = false
  revision: number = 0
  isVolcanoParameterCollapsed: boolean = false
  _data: any;
  //nameToID: any = {}
  graphData: any[] = []
  graphLayout: any = {
    height: 700, width: 700,
    margin: {r: null, l: null, b: null, t: null},
    xaxis: {
      title: "<b>Log2FC</b>",
      tickmode: "linear",
      ticklen: 5,
      showgrid: false,
      visible: true,
    },
    yaxis: {
      title: "<b>-log10(p-value)</b>",
      tickmode: "linear",
      ticklen: 5,
      showgrid: false,
      visible: true,
      showticklabels: true,
      zeroline: true,
    },
    annotations: [],
    showlegend: true, legend: {
      orientation: 'h'
    },
    title: {
      text: "",
      font: {
        size: 24
      },
    }
  }
  config: any = {
    editable: this.editMode,
    //modeBarButtonsToRemove: ["toImage"]
    toImageButtonOptions: {
      format: 'svg',
      filename: this.graphLayout.title.text,
      height: this.graphLayout.height,
      width: this.graphLayout.width,
      scale: 1
    }
  }
  layoutMaxMin: any = {
    xMin: 0, xMax: 0, yMin: 0, yMax: 0
  }

  annotated: any = {}



  @Input() set data(value: IDataFrame) {
    this._data = value
    if (this._data.count()) {
      this.drawVolcano();
    }
  }

  breakColor: boolean = false
  markerSize: number = 10

  specialColorMap: any = {}
  repeat: boolean = false
  drawVolcano() {
    if (!this.settings.ptmSettings.visible) {
      this.settings.ptmSettings.visible = {}
    }
    this.settings.ptmSettings.scatterPlotMarkerSize = this.markerSize
    this.graphLayout.title.text = this.settings.ptmSettings.volcanoPlotTitle
    let currentColors: string[] = []
    if (this.settings.ptmSettings.colorMap) {
      for (const s in this.settings.ptmSettings.colorMap) {
        console.log(s, this.settings.ptmSettings.colorMap[s])
        if (!this.dataService.conditions.includes(s)) {
          if (this.settings.ptmSettings.colorMap[s]) {
            if (this.settings.ptmSettings.defaultColorList.includes(this.settings.ptmSettings.colorMap[s])) {
              currentColors.push(this.settings.ptmSettings.colorMap[s])
            }
          }
        }
      }
    } else {
      this.settings.ptmSettings.colorMap = {}
    }
    let currentPosition = 0
    let fdrCurve: IDataFrame = new DataFrame()
    if (this.settings.ptmSettings.fdrCurveTextEnable) {
      if (this.settings.ptmSettings.fdrCurveText !== "") {
        fdrCurve = fromCSV(this.settings.ptmSettings.fdrCurveText)
      }
    }
    const temp: any = {}
    if (currentColors.length !== this.settings.ptmSettings.defaultColorList.length) {
      currentPosition = currentColors.length
    }
    for (const s of this.dataService.selectOperationNames) {
      if (!this.settings.ptmSettings.colorMap[s]) {
        while (true) {
          if (this.breakColor) {
            this.settings.ptmSettings.colorMap[s] = this.settings.ptmSettings.defaultColorList[currentPosition]
            break
          }
          if (currentColors.indexOf(this.settings.ptmSettings.defaultColorList[currentPosition]) !== -1) {
            currentPosition++
            if (this.repeat) {
              this.settings.ptmSettings.colorMap[s] = this.settings.ptmSettings.defaultColorList[currentPosition]
              break
            }
          } else if (currentPosition >= this.settings.ptmSettings.defaultColorList.length) {
            currentPosition = 0
            this.settings.ptmSettings.colorMap[s] = this.settings.ptmSettings.defaultColorList[currentPosition]
            this.repeat = true
            break
          } else if (currentPosition !== this.settings.ptmSettings.defaultColorList.length) {
            this.settings.ptmSettings.colorMap[s] = this.settings.ptmSettings.defaultColorList[currentPosition]
            break
          } else {
            this.breakColor = true
            currentPosition = 0
          }
        }

        currentPosition ++
        if (currentPosition === this.settings.ptmSettings.defaultColorList.length) {
          currentPosition = 0
        }
      }

      temp[s] = {
        x: [],
        y: [],
        text: [],
        primaryIDs: [],
        //type: "scattergl",
        type: "scatter",
        mode: "markers",
        name: s,
        marker: {
          color: this.settings.ptmSettings.colorMap[s],
          size: this.settings.ptmSettings.scatterPlotMarkerSize
        }
      }

    }
    console.log(this.settings.ptmSettings.colorMap)
    this.layoutMaxMin = {
      xMin: 0, xMax: 0, yMin: 0, yMax: 0
    }

    this.layoutMaxMin.xMin = this.dataService.minMax.fcMin
    this.layoutMaxMin.xMax = this.dataService.minMax.fcMax
    this.layoutMaxMin.yMin = this.dataService.minMax.pMin
    this.layoutMaxMin.yMax = this.dataService.minMax.pMax
    this.graphLayout.xaxis.range = [this.layoutMaxMin.xMin - 0.5, this.layoutMaxMin.xMax + 0.5]
    if (this.settings.ptmSettings.volcanoAxis.minX) {
      this.graphLayout.xaxis.range[0] = this.settings.ptmSettings.volcanoAxis.minX
    }
    if (this.settings.ptmSettings.volcanoAxis.maxX) {
      this.graphLayout.xaxis.range[1] = this.settings.ptmSettings.volcanoAxis.maxX
    }
    this.graphLayout.yaxis.range = [0, this.layoutMaxMin.yMax + this.layoutMaxMin.yMin / 10]
    if (this.settings.ptmSettings.volcanoAxis.minY) {
      this.graphLayout.yaxis.range[0] = this.settings.ptmSettings.volcanoAxis.minY
    }
    if (this.settings.ptmSettings.volcanoAxis.maxY) {
      this.graphLayout.yaxis.range[1] = this.settings.ptmSettings.volcanoAxis.maxY
    }
    if (this.settings.ptmSettings.volcanoAxis.x) {
      this.graphLayout.xaxis.title = `<b>${this.settings.ptmSettings.volcanoAxis.x}</b>`
    }
    if (this.settings.ptmSettings.volcanoAxis.y) {
      this.graphLayout.yaxis.title = `<b>${this.settings.ptmSettings.volcanoAxis.y}</b>`
    }
    temp["Background"] = {
      x:[],
      y:[],
      text: [],
      primaryIDs: [],
      //type: "scattergl",
      type: "scatter",
      mode: "markers",
      name: "Background"
    }
    if (this.settings.ptmSettings.backGroundColorGrey) {
      temp["Background"]["marker"] = {
        color: "#a4a2a2",
        opacity: 0.3,
        size: this.settings.ptmSettings.scatterPlotMarkerSize
      }
    }
    for (const r of this._data) {
      let geneNames = ""
      const x = r[this.dataService.differentialForm.foldChange]
      const y = r[this.dataService.differentialForm.significant]
      const primaryID = r[this.dataService.differentialForm.primaryIDs]
      const accID = r[this.dataService.differentialForm.accession]

      let text = primaryID
      if (this.dataService.fetchUniProt) {
        const r: any = this.uniprot.getUniprotFromAcc(accID)
        if (r) {
          geneNames = r["Gene Names"]
        }
      } else {
        if (this.dataService.differentialForm.geneNames !== "") {
          geneNames = r[this.dataService.differentialForm.geneNames]
        }
      }

      if (
        this.dataService.differentialForm.peptideSequence !== "" &&
        this.dataService.differentialForm.positionPeptide !== "" &&
        this.dataService.differentialForm.peptideSequence !== ""
      ) {
        const position = r[this.dataService.differentialForm.position]
        const positionInPeptide = r[this.dataService.differentialForm.positionPeptide]
        const peptide = r[this.dataService.differentialForm.peptideSequence]
        text = `${geneNames}(${peptide[positionInPeptide-1]}${position})(${primaryID})`
      } else if (geneNames !== "") {
        text = geneNames + "(" + primaryID + ")"
      }
      //this.nameToID[text] = primaryID
      if (this.dataService.selectedMap[primaryID]) {
        for (const o in this.dataService.selectedMap[primaryID]) {
          temp[o].x.push(x)
          temp[o].y.push(y)
          temp[o].text.push(text)
          temp[o].primaryIDs.push(primaryID)
        }
      } else if (this.settings.ptmSettings.backGroundColorGrey) {
        temp["Background"].x.push(x)
        temp["Background"].y.push(y)
        temp["Background"].text.push(text)
        temp["Background"].primaryIDs.push(primaryID)
      } else {
        const gr = this.dataService.significantGroup(x, y)
        const group = gr[0]
        if (!temp[group]) {
          if (!this.settings.ptmSettings.colorMap[group]) {
            if (!this.specialColorMap[gr[1]]) {
              if (this.settings.ptmSettings.defaultColorList[currentPosition]) {
                this.specialColorMap[gr[1]] = this.settings.ptmSettings.defaultColorList[currentPosition].slice()
                this.settings.ptmSettings.colorMap[group] = this.settings.ptmSettings.defaultColorList[currentPosition].slice()
              }
            } else {
              this.settings.ptmSettings.colorMap[group] = this.specialColorMap[gr[1]].slice()
            }
            currentPosition ++
            if (currentPosition === this.settings.ptmSettings.defaultColorList.length) {
              currentPosition = 0
            }
          } else {
            this.specialColorMap[gr[1]] = this.settings.ptmSettings.colorMap[group].slice()
          }

          temp[group] = {
            x: [],
            y: [],
            text: [],
            primaryIDs: [],
            //type: "scattergl",
            type: "scatter",
            mode: "markers",
            marker: {
              color: this.settings.ptmSettings.colorMap[group],
              size: this.settings.ptmSettings.scatterPlotMarkerSize
            },
            name: group
          }
        }
        temp[group].x.push(x)
        temp[group].y.push(y)
        temp[group].text.push(text)
        temp[group].primaryIDs.push(primaryID)
      }
    }
    const graphData: any[] = []
    for (const t in temp) {
      if (temp[t].x.length > 0) {
        if (temp[t].x.length > 0) {
          if (this.settings.ptmSettings.visible[t]) {
            temp[t].visible = this.settings.ptmSettings.visible[t]
          } else {
            temp[t].visible = true
          }
          graphData.push(temp[t])
        }
      }
    }
    if (fdrCurve.count() > 0) {
      if (this.graphLayout.xaxis.range === undefined) {
        this.graphLayout.xaxis.range = [this.layoutMaxMin.xMin - 0.5, this.layoutMaxMin.xMax + 0.5]
        this.graphLayout.xaxis.autoscale = true
        this.graphLayout.yaxis.range = [0, -Math.log10(this.layoutMaxMin.yMin - this.layoutMaxMin.yMin/2)]
        this.graphLayout.yaxis.autoscale = true
      }
      const left: IDataFrame = fdrCurve.where(row => row.x < 0).bake()
      const right: IDataFrame = fdrCurve.where(row => row.x >= 0).bake()
      const fdrLeft: any = {
        x: [],
        y: [],
        hoverinfo: 'skip',
        showlegend: false,
        mode: 'lines',
        line:{
          color: 'rgb(103,102,102)',
          width: 0.5,
          dash:'dot'
        },
        name: "Left Curve"
      }
      const fdrRight: any = {
        x: [],
        y: [],
        hoverinfo: 'skip',
        showlegend: false,
        mode: 'lines',
        line:{
          color: 'rgb(103,102,102)',
          width: 0.5,
          dash:'dot'
        },
        name: "Right Curve"
      }
      for (const l of left) {
        if (l.x < this.graphLayout.xaxis.range[0]) {
          this.graphLayout.xaxis.range[0] = l.x
        }
        if (l.y > this.graphLayout.yaxis.range[1]) {
          this.graphLayout.yaxis.range[1] = l.y
        }
        fdrLeft.x.push(l.x)
        fdrLeft.y.push(l.y)
      }
      for (const l of right) {
        if (l.x < this.graphLayout.xaxis.range[0]) {
          this.graphLayout.xaxis.range[0] = l.x
        }
        if (l.y > this.graphLayout.yaxis.range[1]) {
          this.graphLayout.yaxis.range[1] = l.y
        }
        fdrRight.x.push(l.x)
        fdrRight.y.push(l.y)
      }
      graphData.push(fdrLeft)
      graphData.push(fdrRight)
      this.graphLayout.xaxis.autorange = true
      this.graphLayout.yaxis.autorange = true
    } else {
      const cutOff: any[] = []
      cutOff.push({
        type: "line",
        x0: -this.settings.ptmSettings.log2FCCutoff,
        x1: -this.settings.ptmSettings.log2FCCutoff,
        y0: 0,
        y1: this.graphLayout.yaxis.range[1],
        line: {
          color: 'rgb(21,4,4)',
          width: 1,
          dash: 'dot'
        }
      })
      cutOff.push({
        type: "line",
        x0: this.settings.ptmSettings.log2FCCutoff,
        x1: this.settings.ptmSettings.log2FCCutoff,
        y0: 0,
        y1: this.graphLayout.yaxis.range[1],
        line: {
          color: 'rgb(21,4,4)',
          width: 1,
          dash: 'dot'
        }
      })

      let x0 = this.layoutMaxMin.xMin - 1
      if (this.settings.ptmSettings.volcanoAxis.minX) {
        x0 = this.settings.ptmSettings.volcanoAxis.minX - 1
      }
      let x1 = this.layoutMaxMin.xMax + 1
      if (this.settings.ptmSettings.volcanoAxis.maxX) {
        x1 = this.settings.ptmSettings.volcanoAxis.maxX + 1
      }
      cutOff.push({
        type: "line",
        x0: x0,
        x1: x1,
        y0: -Math.log10(this.settings.ptmSettings.pCutoff),
        y1: -Math.log10(this.settings.ptmSettings.pCutoff),
        line: {
          color: 'rgb(21,4,4)',
          width: 1,
          dash: 'dot'
        }
      })

      this.graphLayout.shapes = cutOff
    }
    this.graphData = graphData.reverse()
    this.graphLayout.annotations = []
    if (this.settings.ptmSettings.volcanoPlotYaxisPosition.includes("left")) {
      //this.graphLayout.shapes = []
      // draw y axis line at min x
      this.graphLayout.shapes.push({
        type: "line",
        x0: this.graphLayout.xaxis.range[0],
        x1: this.graphLayout.xaxis.range[0],
        y0: this.graphLayout.yaxis.range[0],
        y1: this.graphLayout.yaxis.range[1],
        line: {
          color: 'rgb(21,4,4)',
          width: 1,
        }
      })
    } else {
      //this.graphLayout.shapes = []
    }
    if (this.settings.ptmSettings.volcanoPlotDimension.height) {
      this.graphLayout.height = this.settings.ptmSettings.volcanoPlotDimension.height
    }
    if (this.settings.ptmSettings.volcanoPlotDimension.width) {
      this.graphLayout.width = this.settings.ptmSettings.volcanoPlotDimension.width
    }
    if (this.settings.ptmSettings.volcanoPlotDimension.margin) {
      this.graphLayout.margin = this.settings.ptmSettings.volcanoPlotDimension.margin
    }
    if (this.settings.ptmSettings.volcanoPlotYaxisPosition.includes("middle")) {
      this.graphLayout.xaxis.zerolinecolor = "#000000"
    } else {
      this.graphLayout.xaxis.zerolinecolor = "#ffffff"
    }
    for (const i in this.settings.ptmSettings.textAnnotation) {
      if (this.settings.ptmSettings.textAnnotation[i].showannotation === true) {
        this.annotated[this.settings.ptmSettings.textAnnotation[i].title] = this.settings.ptmSettings.textAnnotation[i].data
        this.graphLayout.annotations.push(this.settings.ptmSettings.textAnnotation[i].data)
      }

    }
    console.log(this.settings.ptmSettings.textAnnotation)
    console.log(this.graphLayout.annotations)
    this.config = {
      editable: this.editMode,
      toImageButtonOptions: {
        format: 'svg',
        filename: this.graphLayout.title.text,
        height: this.graphLayout.height,
        width: this.graphLayout.width,
        scale: 1,
        margin: this.graphLayout.margin,
      },
      modeBarButtonsToAdd: ["drawline", "drawcircle", "drawrect", "eraseshape"]
    }
    if (this.settings.ptmSettings.volcanoAdditionalShapes) {
      for (const s of this.settings.ptmSettings.volcanoAdditionalShapes) {
        this.graphLayout.shapes.push(s)
      }
    }
    if (this.settings.ptmSettings.volcanoPlotLegendX) {
      this.graphLayout.legend.x = this.settings.ptmSettings.volcanoPlotLegendX
    }
    if (this.settings.ptmSettings.volcanoPlotLegendY) {
      this.graphLayout.legend.y = this.settings.ptmSettings.volcanoPlotLegendY
    }
    if (this.settings.ptmSettings.volcanoAxis.dtickX) {
      this.graphLayout.xaxis.dtick = this.settings.ptmSettings.volcanoAxis.dtickX
    } else {
      this.graphLayout.xaxis.dtick = undefined
    }
    if (this.settings.ptmSettings.volcanoAxis.dtickY) {
      this.graphLayout.yaxis.dtick = this.settings.ptmSettings.volcanoAxis.dtickY
    } else {
      this.graphLayout.yaxis.dtick = undefined
    }
    if (this.settings.ptmSettings.volcanoAxis.ticklenX) {
      this.graphLayout.xaxis.ticklen = this.settings.ptmSettings.volcanoAxis.ticklenX
    } else {
      this.graphLayout.xaxis.ticklen = 5
    }
    if (this.settings.ptmSettings.volcanoAxis.ticklenY) {
      this.graphLayout.yaxis.ticklen = this.settings.ptmSettings.volcanoAxis.ticklenY
    } else {
      this.graphLayout.yaxis.ticklen = 5
    }
    this.revision ++
    console.log(this.graphLayout.annotations)
  }

  constructor(public dataService: DataPtmService, private uniprot: UniprotPtmService, public settings: SettingsService) {
    this.annotated = {}
    for (const i in this.settings.ptmSettings.textAnnotation) {
      if (this.settings.ptmSettings.textAnnotation[i].showannotation === undefined || this.settings.ptmSettings.textAnnotation[i].showannotation === null) {
        this.settings.ptmSettings.textAnnotation[i].showannotation = true
      }
      this.annotated[i] = this.settings.ptmSettings.textAnnotation[i]
    }

    this.dataService.resetVolcanoColor.asObservable().subscribe(data => {
      if (data) {
        this.specialColorMap = {}
      }
    })
    this.dataService.selectionUpdateTrigger.asObservable().subscribe(data => {
      if (data) {
        this.drawVolcano()
      }
    })
    this.dataService.annotationService.asObservable().subscribe(data => {
      if (data) {
        if (data.remove) {
          if (typeof data.id === "string") {
            this.removeAnnotatedDataPoints([data.id]).then(() => {
              this.dataService.annotatedData = this.annotated
            })
          } else {
            this.removeAnnotatedDataPoints(data.id).then(() => {
              this.dataService.annotatedData = this.annotated
            })
          }

        } else {
          if (typeof data.id === "string") {
            this.annotateDataPoints([data.id]).then(() => {
              this.dataService.annotatedData = this.annotated
            })
          } else {
            this.annotateDataPoints(data.id).then(() => {
              this.dataService.annotatedData = this.annotated
            })
          }

        }
      }
    })
  }

  ngOnInit(): void {
  }

  /*selectData(e: any) {
    if ("points" in e) {
      const selected: string[] = []
      for (const p of e["points"]) {
        selected.push(p.data.primaryIDs[p.pointNumber])
      }
      if (selected.length === 1) {
        this.selected.emit(
          {
            data: selected,
            title: e["points"][0].text
          }
        )
      } else {
        this.selected.emit(
          {
            data: selected,
            title: "Selected " + selected.length + " data points."
          }
        )
      }

    }
  }*/

  async annotateDataPoints(data: string[]) {
    const annotations: any[] = []
    const annotatedData = this.dataService.currentDF.where(r => data.includes(r[this.dataService.differentialForm.primaryIDs])).bake()
    for (const a of annotatedData) {
      let title = a[this.dataService.differentialForm.primaryIDs]
      const uni: any = this.uniprot.getUniprotFromAcc(a[this.dataService.differentialForm.primaryIDs])
      if (uni) {
        title = uni["Gene Names"] + "(" + title + ")"
      }
      let text = title.slice()
      if (
        this.dataService.differentialForm.peptideSequence !== "" &&
        this.dataService.differentialForm.positionPeptide !== "" &&
        this.dataService.differentialForm.peptideSequence !== ""
      ) {
        const position = a[this.dataService.differentialForm.position]
        const positionInPeptide = a[this.dataService.differentialForm.positionPeptide]
        const peptide = a[this.dataService.differentialForm.peptideSequence]
        text = `${ uni["Gene Names"]}(${peptide[positionInPeptide-1]}${position})`
      }

      if (!this.annotated[title]) {
        const ann: any = {
          xref: 'x',
          yref: 'y',
          x: a[this.dataService.differentialForm.foldChange],
          y: a[this.dataService.differentialForm.significant],
          text: "<b>"+text+"</b>",
          showarrow: true,
          arrowhead: 1,
          arrowsize: 1,
          arrowwidth: 1,
          ax: -20,
          ay: -20,
          font: {
            size: 15,
            color: "#000000"
          },
          annotationID: title,
        }
        if (this.settings.ptmSettings.customVolcanoTextCol !== "") {
          ann.text = "<b>"+a[this.settings.ptmSettings.customVolcanoTextCol]+"</b>"
        }
        if (title in this.settings.ptmSettings.textAnnotation) {

        } else {
          this.settings.ptmSettings.textAnnotation[title] = {
            primary_id: a[this.dataService.differentialForm.primaryIDs],
            data: ann,
            title: title,
            showannotation: true
          }
        }
        annotations.push(ann)
        this.annotated[title] = ann
      }
    }

    if (annotations.length > 0) {
      this.graphLayout.annotations = annotations.concat(this.graphLayout.annotations)
      console.log(this.graphLayout.annotations)
    }
  }

  async removeAnnotatedDataPoints(data: string[]) {
    const annotatedData = this.dataService.currentDF.where(r => data.includes(r[this.dataService.differentialForm.primaryIDs])).bake()
    for (const d of annotatedData) {
      let title = d[this.dataService.differentialForm.primaryIDs]
      const uni:any = this.uniprot.getUniprotFromAcc(d[this.dataService.differentialForm.primaryIDs])
      if (uni) {
        if (uni["Gene Names"] !== "") {
          title = uni["Gene Names"] + "(" + title + ")"
        }
      }
      if (this.annotated[title]) {
        delete this.annotated[title]
        delete this.settings.ptmSettings.textAnnotation[title]
      }
    }
    this.graphLayout.annotations = Object.values(this.annotated)
  }


  legendClickHandler(event: any) {
    if (event.event.srcElement.__data__[0].trace.visible === "legendonly") {
      this.settings.ptmSettings.visible[event.event.srcElement.__data__[0].trace.name] = true
    } else {
      this.settings.ptmSettings.visible[event.event.srcElement.__data__[0].trace.name] = "legendonly"
    }
  }



  handleLayoutChange(data: any) {
    const keys = Object.keys(data)
    if (data.shapes) {
      this.settings.ptmSettings.volcanoAdditionalShapes = data.shapes

      for (let i=0; i<this.settings.ptmSettings.volcanoAdditionalShapes.length; i++) {
        if (this.settings.ptmSettings.volcanoAdditionalShapes[i].editable) {
          this.settings.ptmSettings.volcanoAdditionalShapes[i].label = {
            text: "",
            texttemplate: "",
            font: {
              size: null,
              family: "Arial, sans-serif",
              color: "#000000"
            }
          }
        }
      }
      console.log(this.settings.ptmSettings.volcanoAdditionalShapes)
      this.dataService.volcanoAdditionalShapesSubject.next(true)
    }
    if (data["legend.x"]) {
      this.settings.ptmSettings.volcanoPlotLegendX = data["legend.x"]
    }
    if (data["legend.y"]) {
      this.settings.ptmSettings.volcanoPlotLegendY = data["legend.y"]
    }
    if (data["title.text"]) {
      this.settings.ptmSettings.volcanoPlotTitle = data["title.text"]
    }
    if (data["yaxis.title.text"]) {
      this.settings.ptmSettings.volcanoAxis.y = data["yaxis.title.text"]
    }
    if (data["xaxis.title.text"]) {
      this.settings.ptmSettings.volcanoAxis.x = data["xaxis.title.text"]
    }
    if (keys[0].startsWith("annotations")) {
      for (const k of keys) {
        const index = parseInt(keys[0].split("[")[1].split("]")[0])
        const annotationID = this.graphLayout.annotations[index].annotationID

        if (`annotations[${index}].ax` === k) {
          this.settings.ptmSettings.textAnnotation[annotationID].ax = data[k]
        } else if (`annotations[${index}].ay` === k) {
          this.settings.ptmSettings.textAnnotation[annotationID].ay = data[k]
        } else if (`annotations[${index}].text` === k) {
          this.settings.ptmSettings.textAnnotation[annotationID].text = data[k]
        }

      }
    } else if (keys[0].startsWith("shapes")) {
      for (const k of keys) {
        const index = parseInt(keys[0].split("[")[1].split("]")[0])
        const shape = this.settings.ptmSettings.volcanoAdditionalShapes[index]
        if (`shapes[${index}].x0` === k) {
          shape.x0 = data[k]
        } else if (`shapes[${index}].x1` === k) {
          shape.x1 = data[k]
        } else if (`shapes[${index}].y0` === k) {
          shape.y0 = data[k]
        } else if (`shapes[${index}].y1` === k) {
          shape.y1 = data[k]
        }
      }
      this.dataService.volcanoAdditionalShapesSubject.next(true)
    }
    console.log(data)
  }

  updateShapes(data: any[]) {
    for (const i of data) {
      this.settings.ptmSettings.volcanoAdditionalShapes[i.index].label = i.label
      this.settings.ptmSettings.volcanoAdditionalShapes[i.index].fillcolor = i.fillcolor
      this.settings.ptmSettings.volcanoAdditionalShapes[i.index].line.color = i.line.color
      this.settings.ptmSettings.volcanoAdditionalShapes[i.index].line.width = i.line.width
    }
    this.drawVolcano()
    console.log(this.graphLayout.shapes)
  }
}
