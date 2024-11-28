/// <reference lib="webworker" />

import { DataFrame, fromCSV, Series, IDataFrame } from "data-forge";

function processDifferentialFile(data: any): any {
  let df: IDataFrame = fromCSV(data.differential);
  if (!data.differentialForm._comparison || data.differentialForm._comparison === "" || data.differentialForm._comparison === "CurtainSetComparison") {
    data.differentialForm._comparison = "CurtainSetComparison";
    data.differentialForm._comparisonSelect = "1";
    df = df.withSeries("CurtainSetComparison", new Series(Array(df.count()).fill("1"))).bake();
  }

  if (data.differentialForm._comparisonSelect === "" || data.differentialForm._comparisonSelect === undefined) {
    if (df.getColumnNames().includes(data.differentialForm._comparison)) {
      data.differentialForm._comparisonSelect = data.differential.df.first()[data.differentialForm._comparison];
    } else {
      data.differentialForm._comparison = "CurtainSetComparison";
      data.differentialForm._comparisonSelect = "1";
      df = df.withSeries("CurtainSetComparison", new Series(Array(df.count()).fill("1"))).bake();
    }
  }

  const store: any[] = df.toArray().map((r: any) => {
    r[data.differentialForm._position] = Number(r[data.differentialForm._position]);
    r[data.differentialForm._positionPeptide] = Number(r[data.differentialForm._positionPeptide]);
    r[data.differentialForm._foldChange] = Number(r[data.differentialForm._foldChange]);
    r[data.differentialForm._score] = Number(r[data.differentialForm._score]);
    r[data.differentialForm._significant] = Number(r[data.differentialForm._significant]);
    if (data.differentialForm._transformFC) {
      r[data.differentialForm._foldChange] = r[data.differentialForm._foldChange] > 0 ? Math.log2(r[data.differentialForm._foldChange]) : -Math.log2(Math.abs(r[data.differentialForm._foldChange]));
    }
    if (data.differentialForm._reverseFoldChange) {
      r[data.differentialForm._foldChange] = -r[data.differentialForm._foldChange];
    }
    if (data.differentialForm._transformSignificant) {
      r[data.differentialForm._significant] = -Math.log10(r[data.differentialForm._significant]);
    }
    r[data.differentialForm._peptideSequence] = parseSequenceSingle(r[data.differentialForm._peptideSequence]);
    return r;
  });

  return { differential: JSON.stringify(store), differentialForm: data.differentialForm };
}

function processRawFile(data: any): any {
  let rawDF: IDataFrame = fromCSV(data.raw);
  const conditions: string[] = [];
  let colorPosition = 0;
  const colorMap: any = {};
  const conditionOrder = data.settings.conditionOrder.slice();
  const samples: string[] = data.rawForm._samples.slice();
  const sampleMap: any = {};

  for (const s of samples) {
    const condition_replicate = s.split(".");
    const replicate = condition_replicate[condition_replicate.length - 1];
    const condition = condition_replicate.slice(0, condition_replicate.length - 1).join(".");
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
  for (const s in colorMap) {
    if (!(s in data.settings.colorMap)) {
      data.settings.colorMap[s] = colorMap[s];
    }
  }
  for (const s in data.settings.sampleMap) {
    if (!(s in sampleMap)) {
      delete data.settings.sampleMap[s];
    }
  }

  if (data.settings.conditionOrder.length === 0) {
    data.settings.conditionOrder = conditions.slice();
  } else {
    const conditionO: string[] = [];
    for (const c of conditionOrder) {
      if (conditions.includes(c)) {
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

  const storeRaw = rawDF.toArray().map((r: any) => {
    for (const s of samples) {
      r[s] = Number(r[s]);
    }
    return r;
  });

  return { raw: JSON.stringify(storeRaw), settings: data.settings, conditions: conditions };
}

addEventListener('message', (data: MessageEvent<any>) => {
  console.log(data.data);
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

function parseSequenceSingle(v: string): string {
  let count = 0;
  let seq = "";
  for (const a of v) {
    if (["(", "[", "{"].includes(a)) {
      count++;
    }
    if (count === 0) {
      seq += a;
    }
    if ([")", "]", "}"].includes(a)) {
      count--;
    }
  }
  return seq;
}
