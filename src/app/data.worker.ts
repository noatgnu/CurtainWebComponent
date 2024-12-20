/// <reference lib="webworker" />

import {fromCSV, IDataFrame, Series} from "data-forge";

addEventListener('message', (data: MessageEvent<any>) => {
  console.log(data.data)
  switch (data.data.task) {
    case "processDifferentialFile":
      postMessage({type: "progress", value: 100, text: "Processing differential data..."})
      let df: IDataFrame = fromCSV(data.data.differential)

      if (!data.data.differentialForm._comparison || data.data.differentialForm._comparison === "" || data.data.differentialForm._comparison === "CurtainSetComparison") {
        data.data.differentialForm._comparison = "CurtainSetComparison"
        data.data.differentialForm._comparisonSelect = ["1"]

        df = df.withSeries("CurtainSetComparison", new Series(Array(df.count()).fill("1"))).bake()
      }

      if (!data.data.differentialForm._comparisonSelect) {
        data.data.differentialForm._comparisonSelect = [df.first()[data.data.differentialForm._comparison]]
      } else if (data.data.differentialForm._comparisonSelect.length === 0) {
        data.data.differentialForm._comparisonSelect = [df.first()[data.data.differentialForm._comparison]]
      }

      if (data.data.differentialForm._comparisonSelect === "" || data.data.differentialForm._comparisonSelect === undefined) {
        data.data.differentialForm._comparisonSelect = data.data.differential.df.first()[data.data.differentialForm._comparison]
      }

      const store: any[] = df.toArray().map((r: any) => {
        r[data.data.differentialForm._foldChange] = Number(r[data.data.differentialForm._foldChange])
        r[data.data.differentialForm._significant] = Number(r[data.data.differentialForm._significant])
        if (data.data.differentialForm._transformFC) {
          if (r[data.data.differentialForm._foldChange] > 0) {
            r[data.data.differentialForm._foldChange] = Math.log2(r[data.data.differentialForm._foldChange])
          } else if (r[data.data.differentialForm._foldChange] < 0) {
            r[data.data.differentialForm._foldChange] = -Math.log2(Math.abs(r[data.data.differentialForm._foldChange]))
          } else {
            r[data.data.differentialForm._foldChange] = 0
          }
        }
        if (data.data.differentialForm._reverseFoldChange) {
          r[data.data.differentialForm._foldChange] = -r[data.data.differentialForm._foldChange]
        }
        if (data.data.differentialForm._significant) {
          r[data.data.differentialForm._significant] = Number(r[data.data.differentialForm._significant])
        }
        if (data.data.differentialForm._transformSignificant) {
          r[data.data.differentialForm._significant] = -Math.log10(r[data.data.differentialForm._significant])
        }
        return r
      })

      postMessage({type: "progress", value: 100, text: "Finished processing differential data"})
      // @ts-ignore
      const result = {type: "resultDifferential", differential: JSON.stringify(store), differentialForm: data.data.differentialForm}
      postMessage(result)

      break
    case "processRawFile":
      postMessage({type: "progress", value: 100, text: "Processing primary data"})
      console.log(data.data.settings.currentID)
      let rawDF: IDataFrame = fromCSV(data.data.raw)
      const totalSampleNumber = data.data.rawForm._samples.length
      let sampleNumber = 0
      const conditions: string[] = []
      let colorPosition = 0
      const colorMap: any = {}

      const conditionOrder = data.data.settings.conditionOrder.slice()
      console.log(conditionOrder)
      let samples: string[] = data.data.rawForm._samples.slice()
      /*if (conditionOrder.length > 0) {
        // re order samples based on condition order but check if condition exists
        for (const c of conditionOrder) {
          for (const s of data.data.settings.sampleOrder[c]) {
            samples.push(s)
          }
        }
      } else {
        samples = data.data.rawForm._samples.slice()
      }*/
      const sampleMap: any = {}
      //console.log(data.data.settings.sampleMap)
      for (const s of samples) {
        //console.log(s)
        const condition_replicate = s.split(".")
        //console.log(data.data.settings.sampleMap[s])
        const replicate = condition_replicate[condition_replicate.length-1]
        let condition = condition_replicate.slice(0, condition_replicate.length-1).join(".")
        if (data.data.settings.sampleMap[s]){
          if (data.data.settings.sampleMap[s]["condition"]) {
            condition = data.data.settings.sampleMap[s]["condition"]
          }
        }

        if (!conditions.includes(condition)) {
          conditions.push(condition)

          if (colorPosition >= data.data.settings.defaultColorList.length) {
            colorPosition = 0
          }
          colorMap[condition] = data.data.settings.defaultColorList[colorPosition]
          colorPosition ++
        }
        if (!data.data.settings.sampleOrder[condition]) {
          data.data.settings.sampleOrder[condition] = []
        }
        if (!data.data.settings.sampleOrder[condition].includes(s)) {
          data.data.settings.sampleOrder[condition].push(s)
        }

        if (!(s in data.data.settings.sampleVisible)) {
          data.data.settings.sampleVisible[s] = true
        }
        sampleMap[s] = {replicate: replicate, condition: condition, name: s}
      }
      //console.log(conditions)
      if (Object.keys(data.data.settings.sampleMap).length === 0) {
        data.data.settings.sampleMap = sampleMap
      }

      for (const s in data.data.settings.sampleVisible) {
        if (!(s in sampleMap)) {
          delete data.data.settings.sampleVisible[s]
        }
      }

      for (const s in sampleMap) {
        if (!(s in data.data.settings.sampleMap)) {
          data.data.settings.sampleMap[s] = sampleMap[s]
        }
      }

      for (const s in data.data.settings.sampleMap) {
        if (!(s in sampleMap)) {
          delete data.data.settings.sampleMap[s]
        }
      }


      for (const s in colorMap) {
        if (!(s in data.data.settings.colorMap)) {
          data.data.settings.colorMap[s] = colorMap[s]
        }
      }
      if (data.data.settings.conditionOrder.length === 0) {
        console.log("condition order is empty")
        data.data.settings.conditionOrder = conditions.slice()
      } else {
        console.log("condition order is not empty")
        //let conditionOrder = conditions.slice()
        /*for (const c of data.data.settings.conditionOrder) {
          if (!conditionOrder.includes(c)) {
            data.data.settings.conditionOrder = data.data.settings.conditionOrder.filter((cc: string) => cc !== c)
          }
        }
        console.log(conditionOrder)
        for (const c of conditionOrder) {
          if (!data.data.settings.conditionOrder.includes(c)) {
            data.data.settings.conditionOrder.push(c)
          }
        }
        console.log(data.data.settings.conditionOrder)
      }*/
        const conditionO: string[] = []
        for (const c of conditionOrder) {

          if (!conditions.includes(c)) {

          } else {
            conditionO.push(c)
          }
        }
        for (const c of conditions) {
          if (!conditionO.includes(c)) {
            conditionO.push(c)
          }
        }
        data.data.settings.conditionOrder = conditionO
      }

      for (const c in data.data.settings.sampleOrder) {
        if (!conditions.includes(c)) {
          delete data.data.settings.sampleOrder[c]
        }
      }

      const storeRaw = rawDF.toArray().map((r: any) => {
        for (const s of samples) {
          r[s] = Number(r[s])
        }
        return r
      })
      // @ts-ignore
      postMessage({type: "resultRaw", raw: JSON.stringify(storeRaw), settings: data.data.settings, conditions: conditions})
  }
});
