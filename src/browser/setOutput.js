function isObject(obj) {
  return obj && typeof obj === 'object' && !Array.isArray(obj);
}
import { deepMerge } from './data.js';

export function setOutput(input, env) {
  let inputJson;
  try {
    inputJson = JSON.parse(input);
  } catch (parseError) {
    return `Error: Invalid JSON input. ${parseError.message}`;
  }
  return processSetOutput(inputJson, env);
}

function processSetOutput(inputJson, env) {
  if (!isObject(inputJson)) {
    return "Error: Input JSON must be a plain object.";
  }
  return handleValidOutputInput(inputJson, env);
}

function handleValidOutputInput(inputJson, env) {
  // Support both env.get (function/Map) and plain object
  const getData = typeof env.get === 'function' ? env.get('getData') : env.getData;
  const setData = typeof env.get === 'function' ? env.get('setData') : env.setData;
  try {
    return mergeOutputData(getData, setData, inputJson);
  } catch (error) {
    return `Error updating output data: ${error.message}`;
  }
}

function mergeOutputData(getData, setData, inputJson) {
  const currentData = getData();
  const newData = JSON.parse(JSON.stringify(currentData));
  if (!isObject(newData.output)) {
    newData.output = {};
  }
  newData.output = deepMerge(newData.output, inputJson);
  setData(newData);
  return `Success: Output data deep merged.`;
}
