import { Injectable } from '@angular/core';
import {fromCSV, IDataFrame, Series} from 'data-forge';

@Injectable({
  providedIn: 'root'
})
export class WebWorkerService {
  workerCode = `
  /// <reference lib="webworker" />

  // Load data-forge from CDN
  importScripts('https://cdn.jsdelivr.net/npm/data-forge@1.10.2/dist/web/index.js');

  function processDifferentialFile(data) {
    let df = dataForge.fromCSV(data.differential);

    if (!data.differentialForm._comparison || data.differentialForm._comparison === "" || data.differentialForm._comparison === "CurtainSetComparison") {
      data.differentialForm._comparison = "CurtainSetComparison";
      data.differentialForm._comparisonSelect = ["1"];

      df = df.withSeries("CurtainSetComparison", new dataForge.Series(Array(df.count()).fill("1"))).bake();
    }

    if (!data.differentialForm._comparisonSelect) {
      data.differentialForm._comparisonSelect = [df.first()[data.differentialForm._comparison]];
    } else if (data.differentialForm._comparisonSelect.length === 0) {
      data.differentialForm._comparisonSelect = [df.first()[data.differentialForm._comparison]];
    }

    if (data.differentialForm._comparisonSelect === "" || data.differentialForm._comparisonSelect === undefined) {
      data.differentialForm._comparisonSelect = data.differential.df.first()[data.differentialForm._comparison];
    }

    const store = df.toArray().map(r => {
      r[data.differentialForm._foldChange] = Number(r[data.differentialForm._foldChange]);
      r[data.differentialForm._significant] = Number(r[data.differentialForm._significant]);
      if (data.differentialForm._transformFC) {
        if (r[data.differentialForm._foldChange] > 0) {
          r[data.differentialForm._foldChange] = Math.log2(r[data.differentialForm._foldChange]);
        } else if (r[data.differentialForm._foldChange] < 0) {
          r[data.differentialForm._foldChange] = -Math.log2(Math.abs(r[data.differentialForm._foldChange]));
        } else {
          r[data.differentialForm._foldChange] = 0;
        }
      }
      if (data.differentialForm._reverseFoldChange) {
        r[data.differentialForm._foldChange] = -r[data.differentialForm._foldChange];
      }
      if (data.differentialForm._significant) {
        r[data.differentialForm._significant] = Number(r[data.differentialForm._significant]);
      }
      if (data.differentialForm._transformSignificant) {
        r[data.differentialForm._significant] = -Math.log10(r[data.differentialForm._significant]);
      }
      return r;
    });

    return { differential: JSON.stringify(store), differentialForm: data.differentialForm };
  }

  function processRawFile(data) {
    let rawDF = dataForge.fromCSV(data.raw);
    const totalSampleNumber = data.rawForm._samples.length;
    let sampleNumber = 0;
    const conditions = [];
    let colorPosition = 0;
    const colorMap = {};

    const conditionOrder = data.settings.conditionOrder.slice();
    let samples = data.rawForm._samples.slice();
    const sampleMap = {};

    for (const s of samples) {
      const condition_replicate = s.split(".");
      const replicate = condition_replicate[condition_replicate.length - 1];
      let condition = condition_replicate.slice(0, condition_replicate.length - 1).join(".");
      if (data.settings.sampleMap[s]) {
        if (data.settings.sampleMap[s]["condition"]) {
          condition = data.settings.sampleMap[s]["condition"];
        }
      }

      if (!conditions.includes(condition)) {
        conditions.push(condition);

        if (colorPosition >= data.settings.defaultColorList.length) {
          colorPosition = 0;
        }
        colorMap[condition] = data.settings.defaultColorList[colorPosition];
        colorPosition++;
      }
      if (!data.settings.sampleOrder[condition]) {
        data.settings.sampleOrder[condition] = [];
      }
      if (!data.settings.sampleOrder[condition].includes(s)) {
        data.settings.sampleOrder[condition].push(s);
      }

      if (!(s in data.settings.sampleVisible)) {
        data.settings.sampleVisible[s] = true;
      }
      sampleMap[s] = { replicate: replicate, condition: condition, name: s };
    }

    if (Object.keys(data.settings.sampleMap).length === 0) {
      data.settings.sampleMap = sampleMap;
    }

    for (const s in data.settings.sampleVisible) {
      if (!(s in sampleMap)) {
        delete data.settings.sampleVisible[s];
      }
    }

    for (const s in sampleMap) {
      if (!(s in data.settings.sampleMap)) {
        data.settings.sampleMap[s] = sampleMap[s];
      }
    }

    for (const s in data.settings.sampleMap) {
      if (!(s in sampleMap)) {
        delete data.settings.sampleMap[s];
      }
    }

    for (const s in colorMap) {
      if (!(s in data.settings.colorMap)) {
        data.settings.colorMap[s] = colorMap[s];
      }
    }
    if (data.settings.conditionOrder.length === 0) {
      data.settings.conditionOrder = conditions.slice();
    } else {
      const conditionO = [];
      for (const c of conditionOrder) {
        if (!conditions.includes(c)) {
        } else {
          conditionO.push(c);
        }
      }
      for (const c of conditions) {
        if (!conditionO.includes(c)) {
          conditionO.push(c);
        }
      }
      data.settings.conditionOrder = conditionO;
    }

    for (const c in data.settings.sampleOrder) {
      if (!conditions.includes(c)) {
        delete data.settings.sampleOrder[c];
      }
    }

    const storeRaw = rawDF.toArray().map(r => {
      for (const s of samples) {
        r[s] = Number(r[s]);
      }
      return r;
    });

    return { raw: JSON.stringify(storeRaw), settings: data.settings, conditions: conditions };
  }

  addEventListener('message', (data) => {
    console.log(data);
    switch (data.data.task) {
      case "processDifferentialFile":
        postMessage({ type: "progress", value: 100, text: "Processing differential data..." });
        const differentialResult = processDifferentialFile(data.data);
        postMessage({ type: "progress", value: 100, text: "Finished processing differential data" });
        postMessage({ type: "resultDifferential", ...differentialResult });
        break;
      case "processRawFile":
        postMessage({ type: "progress", value: 100, text: "Processing primary data" });
        const rawResult = processRawFile(data.data);
        postMessage({ type: "resultRaw", ...rawResult });
        break;
    }
  });
`;

  constructor() { }

  processDifferentialFile(data: any) {
    let df: IDataFrame = fromCSV(data.differential);

    if (!data.differentialForm._comparison || data.differentialForm._comparison === "" || data.differentialForm._comparison === "CurtainSetComparison") {
      data.differentialForm._comparison = "CurtainSetComparison";
      data.differentialForm._comparisonSelect = ["1"];

      df = df.withSeries("CurtainSetComparison", new Series(Array(df.count()).fill("1"))).bake();
    }

    if (!data.differentialForm._comparisonSelect) {
      data.differentialForm._comparisonSelect = [df.first()[data.differentialForm._comparison]];
    } else if (data.differentialForm._comparisonSelect.length === 0) {
      data.differentialForm._comparisonSelect = [df.first()[data.differentialForm._comparison]];
    }

    if (data.differentialForm._comparisonSelect === "" || data.differentialForm._comparisonSelect === undefined) {
      data.differentialForm._comparisonSelect = data.differential.df.first()[data.differentialForm._comparison];
    }

    const store: any[] = df.toArray().map((r: any) => {
      r[data.differentialForm._foldChange] = Number(r[data.differentialForm._foldChange]);
      r[data.differentialForm._significant] = Number(r[data.differentialForm._significant]);
      if (data.differentialForm._transformFC) {
        if (r[data.differentialForm._foldChange] > 0) {
          r[data.differentialForm._foldChange] = Math.log2(r[data.differentialForm._foldChange]);
        } else if (r[data.differentialForm._foldChange] < 0) {
          r[data.differentialForm._foldChange] = -Math.log2(Math.abs(r[data.differentialForm._foldChange]));
        } else {
          r[data.differentialForm._foldChange] = 0;
        }
      }
      if (data.differentialForm._reverseFoldChange) {
        r[data.differentialForm._foldChange] = -r[data.differentialForm._foldChange];
      }
      if (data.differentialForm._significant) {
        r[data.differentialForm._significant] = Number(r[data.differentialForm._significant]);
      }
      if (data.differentialForm._transformSignificant) {
        r[data.differentialForm._significant] = -Math.log10(r[data.differentialForm._significant]);
      }
      return r;
    });

    return { differential: JSON.stringify(store), differentialForm: data.differentialForm };
  }

  processRawFile(data: any) {
    let rawDF: IDataFrame = fromCSV(data.raw);
    const totalSampleNumber = data.rawForm._samples.length;
    let sampleNumber = 0;
    const conditions: string[] = [];
    let colorPosition = 0;
    const colorMap: any = {};

    const conditionOrder = data.settings.conditionOrder.slice();
    let samples: string[] = data.rawForm._samples.slice();
    const sampleMap: any = {};

    for (const s of samples) {
      const condition_replicate = s.split(".");
      const replicate = condition_replicate[condition_replicate.length - 1];
      let condition = condition_replicate.slice(0, condition_replicate.length - 1).join(".");
      if (data.settings.sampleMap[s]) {
        if (data.settings.sampleMap[s]["condition"]) {
          condition = data.settings.sampleMap[s]["condition"];
        }
      }

      if (!conditions.includes(condition)) {
        conditions.push(condition);

        if (colorPosition >= data.settings.defaultColorList.length) {
          colorPosition = 0;
        }
        colorMap[condition] = data.settings.defaultColorList[colorPosition];
        colorPosition++;
      }
      if (!data.settings.sampleOrder[condition]) {
        data.settings.sampleOrder[condition] = [];
      }
      if (!data.settings.sampleOrder[condition].includes(s)) {
        data.settings.sampleOrder[condition].push(s);
      }

      if (!(s in data.settings.sampleVisible)) {
        data.settings.sampleVisible[s] = true;
      }
      sampleMap[s] = { replicate: replicate, condition: condition, name: s };
    }

    if (Object.keys(data.settings.sampleMap).length === 0) {
      data.settings.sampleMap = sampleMap;
    }

    for (const s in data.settings.sampleVisible) {
      if (!(s in sampleMap)) {
        delete data.settings.sampleVisible[s];
      }
    }

    for (const s in sampleMap) {
      if (!(s in data.settings.sampleMap)) {
        data.settings.sampleMap[s] = sampleMap[s];
      }
    }

    for (const s in data.settings.sampleMap) {
      if (!(s in sampleMap)) {
        delete data.settings.sampleMap[s];
      }
    }

    for (const s in colorMap) {
      if (!(s in data.settings.colorMap)) {
        data.settings.colorMap[s] = colorMap[s];
      }
    }
    if (data.settings.conditionOrder.length === 0) {
      data.settings.conditionOrder = conditions.slice();
    } else {
      const conditionO: string[] = [];
      for (const c of conditionOrder) {
        if (!conditions.includes(c)) {
        } else {
          conditionO.push(c);
        }
      }
      for (const c of conditions) {
        if (!conditionO.includes(c)) {
          conditionO.push(c);
        }
      }
      data.settings.conditionOrder = conditionO;
    }

    for (const c in data.settings.sampleOrder) {
      if (!conditions.includes(c)) {
        delete data.settings.sampleOrder[c];
      }
    }

    const storeRaw = rawDF.toArray().map((r: any) => {
      for (const s of samples) {
        r[s] = Number(r[s]);
      }
      return r;
    });

    return { raw: JSON.stringify(storeRaw), settings: data.settings, conditions: conditions };
  }
}
