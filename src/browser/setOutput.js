import { isObject } from '../utils/typeUtils.js';
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
  // Assume env.get is always a function
  const getData = env.get('getData');
  const setData = env.get('setData');
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
