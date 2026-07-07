#!/usr/bin/env node
import fs from 'node:fs';
import { parse } from '@babel/parser';

const PARSER_PLUGINS = [
  'jsx',
  'classProperties',
  'classPrivateProperties',
  'classPrivateMethods',
  'decorators-legacy',
  'dynamicImport',
  'exportDefaultFrom',
  'exportNamespaceFrom',
  'nullishCoalescingOperator',
  'optionalChaining',
  'topLevelAwait',
];
const FUNCTION_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);
const SIGNAL_ORDER = ['parser', 'validator'];
const BUILTIN_CONSTRUCTORS = new Set(['Date', 'URL', 'URLSearchParams', 'Error']);

export function classifyFunctionsFromSource(source, filePath = '') {
  const ast = parse(source, {
    sourceType: 'module',
    plugins: PARSER_PLUGINS,
    ranges: true,
    allowAwaitOutsideFunction: true,
    allowReturnOutsideFunction: true,
    allowSuperOutsideMethod: true,
  });

  attachParentLinks(ast.program, null);
  const functions = [];
  collectFunctions(ast.program, functions, filePath);
  return functions;
}

function main(argv) {
  const filePath = argv[2];
  if (!filePath) {
    emitErrorAndExit({ kind: 'file_read_error', message: 'Could not read file', filePath: '' });
  }
  let source;
  try {
    source = fs.readFileSync(filePath, 'utf8');
  } catch {
    emitErrorAndExit({ kind: 'file_read_error', message: 'Could not read file', filePath });
  }
  try {
    const functions = classifyFunctionsFromSource(source, filePath);
    process.stdout.write(`${JSON.stringify({ filePath, functions }, null, 2)}\n`);
  } catch (error) {
    emitErrorAndExit({
      kind: 'parse_error',
      message: error?.message || 'Unexpected token',
      filePath,
      line: error?.loc?.line ?? 1,
      column: error?.loc?.column ?? 0,
    });
  }
}

function emitErrorAndExit(error) {
  process.stderr.write(`${JSON.stringify({ error }, null, 2)}\n`);
  process.exit(1);
}

function attachParentLinks(node, parent) {
  if (!node || typeof node.type !== 'string') return;
  Object.defineProperty(node, '__parent', {
    value: parent,
    enumerable: false,
    configurable: true,
    writable: true,
  });
  for (const child of getChildNodes(node)) attachParentLinks(child, node);
}

function collectFunctions(node, functions, filePath) {
  for (const child of getChildNodes(node)) {
    if (!child || typeof child.type !== 'string') continue;
    if (FUNCTION_TYPES.has(child.type)) {
      if (!shouldCollectFunctionNode(child)) continue;
      functions.push(classifyFunction(child, filePath));
      collectFunctions(getFunctionBody(child), functions, filePath);
      continue;
    }
    if (child.type === 'ObjectMethod' || child.type === 'ClassMethod') {
      functions.push(classifyFunction(child, filePath));
      collectFunctions(getFunctionBody(child), functions, filePath);
      continue;
    }
    collectFunctions(child, functions, filePath);
  }
}

function classifyFunction(node, filePath) {
  const body = getFunctionBody(node);
  const signals = [];
  const seenLabels = new Set();
  const startLocation = getStartLocation(node);
  walkNode(body, current => {
    const signal = classifySignal(current);
    if (!signal || seenLabels.has(signal.label)) return;
    seenLabels.add(signal.label);
    signals.push(signal);
  });
  const labels = SIGNAL_ORDER.filter(label => seenLabels.has(label));
  return {
    id: `${filePath}:${startLocation.line}:${startLocation.column}:${getFunctionName(node)}`,
    name: getFunctionName(node),
    kind: getFunctionKind(node),
    startLine: startLocation.line,
    startColumn: startLocation.column,
    endLine: node.loc.end.line,
    endColumn: node.loc.end.column,
    labels,
    signals,
    jsdoc: null,
  };
}

function shouldCollectFunctionNode(node) {
  if (node.type === 'FunctionDeclaration') return true;
  if (node.type === 'ObjectMethod' || node.type === 'ClassMethod') return true;
  return Boolean(inferAssignedName(node));
}

function getStartLocation(node) {
  return node.loc.start;
}

function getFunctionName(node) {
  if (node.type === 'FunctionDeclaration' && node.id?.name) return node.id.name;
  if ((node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') && node.id?.name) return node.id.name;
  if ((node.type === 'ObjectMethod' || node.type === 'ClassMethod') && node.key) return getPropertyName(node.key);
  if (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
    const inferred = inferAssignedName(node);
    if (inferred) return inferred;
  }
  return `<anonymous@${node.loc.start.line}:${node.loc.start.column}>`;
}

function inferAssignedName(node) {
  const parent = node.__parent;
  if (!parent) return null;
  if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') return parent.id.name;
  if (parent.type === 'AssignmentExpression' && parent.left.type === 'Identifier') return parent.left.name;
  if (parent.type === 'ObjectProperty' && parent.key && parent.value === node) return getPropertyName(parent.key);
  return null;
}

function getPropertyName(node) {
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'StringLiteral' || node.type === 'NumericLiteral') return String(node.value);
  return `<anonymous@${node.loc.start.line}:${node.loc.start.column}>`;
}

function getFunctionKind(node) {
  if (node.type === 'FunctionDeclaration') return 'function_declaration';
  if (node.type === 'ArrowFunctionExpression') return 'arrow_function';
  if (node.type === 'ObjectMethod') return 'object_method';
  if (node.type === 'ClassMethod') return 'class_method';
  if (node.type === 'FunctionExpression') return 'function_expression';
  return 'anonymous_function';
}

function getFunctionBody(node) {
  if (node.type === 'ArrowFunctionExpression' && node.body.type !== 'BlockStatement') return node.body;
  return node.body;
}

function walkNode(node, visitor) {
  if (!node || typeof node.type !== 'string') return;
  visitor(node);
  if (isNestedFunctionLike(node)) return;
  for (const child of getChildNodes(node)) walkNode(child, visitor);
}

function isNestedFunctionLike(node) {
  return FUNCTION_TYPES.has(node.type) || node.type === 'ObjectMethod' || node.type === 'ClassMethod' || node.type === 'ClassPrivateMethod';
}

function classifySignal(node) {
  if (isParserSignal(node)) return toSignal(node, 'parser', parserSignalKind(node), describeNode(node));
  if (isValidatorSignal(node)) return toSignal(node, 'validator', validatorSignalKind(node), describeNode(node));
  return null;
}

function toSignal(node, label, kind, detail) {
  return { kind, label, line: node.loc.start.line, column: node.loc.start.column, detail };
}

function parserSignalKind(node) {
  if (node.type === 'ReturnStatement' && node.argument?.type === 'ObjectExpression') return 'return_object';
  if (node.type === 'ReturnStatement' && node.argument?.type === 'ArrayExpression') return 'return_array';
  if (node.type === 'ReturnStatement' && node.argument?.type === 'ConditionalExpression') return 'return_conditional';
  if (node.type === 'CallExpression' && isMapCall(node)) return 'map_transform';
  if (node.type === 'CallExpression' && isPrimitiveParserCall(node)) return 'primitive_parse';
  if (node.type === 'NewExpression' && isNonBuiltinConstructor(node)) return 'domain_constructor_from_input';
  if (node.type === 'CallExpression' && isDateParse(node)) return 'date_parse';
  if (node.type === 'CallExpression' && getCalleeName(node) === 'JSON.parse') return 'schema_parse';
  return 'parser';
}

function validatorSignalKind(node) {
  if (node.type === 'BinaryExpression' && node.operator === 'in') return 'property_presence';
  if (node.type === 'BinaryExpression' && isNullishComparison(node)) return 'nullish_guard';
  if (node.type === 'CallExpression' && isHasOwnPropertyCall(node)) return 'property_presence';
  if (node.type === 'CallExpression' && isValidationRegexCall(node)) return 'regex_validation';
  if (node.type === 'CallExpression' && isIncludesCheck(node)) return 'membership_validation';
  if (node.type === 'CallExpression' && isBooleanCall(node)) return 'truthiness_guard';
  if (node.type === 'BinaryExpression' && isComparison(node) && !isWithinConditionalTest(node)) return 'comparison_guard';
  return 'validator';
}

function isParserSignal(node) {
  if (node.type === 'ReturnStatement' && node.argument?.type === 'ObjectExpression') return true;
  if (node.type === 'ReturnStatement' && node.argument?.type === 'ArrayExpression') return true;
  if (node.type === 'ReturnStatement' && node.argument?.type === 'ConditionalExpression') return true;
  if (node.type === 'CallExpression' && isMapCall(node)) return true;
  if (node.type === 'CallExpression' && isPrimitiveParserCall(node)) return true;
  if (node.type === 'NewExpression' && isNonBuiltinConstructor(node)) return true;
  if (node.type === 'CallExpression' && isDateParse(node)) return true;
  if (node.type === 'CallExpression' && getCalleeName(node) === 'JSON.parse') return true;
  return false;
}

function isValidatorSignal(node) {
  if (node.type === 'BinaryExpression' && node.operator === 'in') return true;
  if (node.type === 'BinaryExpression' && isNullishComparison(node)) return true;
  if (node.type === 'CallExpression' && isHasOwnPropertyCall(node)) return true;
  if (node.type === 'CallExpression' && isValidationRegexCall(node)) return true;
  if (node.type === 'CallExpression' && isIncludesCheck(node)) return true;
  if (node.type === 'CallExpression' && isArrayIsArrayCall(node)) return true;
  if (node.type === 'CallExpression' && isBooleanCall(node)) return true;
  if (node.type === 'BinaryExpression' && isComparison(node) && !isWithinConditionalTest(node)) return true;
  if (node.type === 'ThrowStatement') return true;
  return false;
}

function isMapCall(node) {
  return node.callee?.type === 'MemberExpression' && !node.callee.computed && node.callee.property.type === 'Identifier' && node.callee.property.name === 'map';
}

function isPrimitiveParserCall(node) {
  return ['Number', 'String', 'parseInt', 'parseFloat'].includes(getCalleeName(node));
}

function isDateParse(node) {
  return node.callee?.type === 'MemberExpression' && !node.callee.computed && node.callee.object.type === 'Identifier' && node.callee.object.name === 'Date' && node.callee.property.type === 'Identifier' && node.callee.property.name === 'parse';
}

function isNonBuiltinConstructor(node) {
  if (node.callee.type !== 'Identifier' || !node.callee.name) return false;
  return !BUILTIN_CONSTRUCTORS.has(node.callee.name);
}

function isHasOwnPropertyCall(node) {
  const callee = getCalleeName(node);
  return callee.endsWith('.hasOwnProperty.call') || callee === 'hasOwnProperty.call' || callee === 'Object.prototype.hasOwnProperty.call';
}

function isValidationRegexCall(node) {
  return getCalleeName(node).endsWith('.test');
}

function isIncludesCheck(node) {
  return getCalleeName(node).endsWith('.includes');
}

function isArrayIsArrayCall(node) {
  return getCalleeName(node) === 'Array.isArray';
}

function isBooleanCall(node) {
  return getCalleeName(node) === 'Boolean';
}

function isComparison(node) {
  return ['==', '===', '!=', '!==', '>', '>=', '<', '<='].includes(node.operator);
}

function isNullishComparison(node) {
  const nullishOnLeft = isNullish(node.left);
  const nullishOnRight = isNullish(node.right);
  return (nullishOnLeft || nullishOnRight) && ['==', '===', '!=', '!=='].includes(node.operator);
}

function isNullish(node) {
  return node?.type === 'NullLiteral' || (node?.type === 'Identifier' && node.name === 'undefined');
}

function isWithinConditionalTest(node) {
  let current = node.__parent;
  while (current) {
    if (current.type === 'ConditionalExpression' && current.test === node) return true;
    node = current;
    current = current.__parent;
  }
  return false;
}

function getCalleeName(node) {
  return describeNode(node.callee);
}

function describeNode(node) {
  if (!node) return '<unknown>';
  switch (node.type) {
    case 'Identifier':
      return node.name;
    case 'StringLiteral':
      return JSON.stringify(node.value);
    case 'NumericLiteral':
      return String(node.value);
    case 'MemberExpression':
      return `${describeNode(node.object)}.${describeNode(node.property)}`;
    case 'CallExpression':
      return `${describeNode(node.callee)}(...)`;
    case 'NewExpression':
      return `new ${describeNode(node.callee)}(...)`;
    default:
      return node.type;
  }
}

function getChildNodes(node) {
  return Object.values(node).flatMap(value => {
    if (Array.isArray(value)) return value.filter(child => child && typeof child.type === 'string');
    if (value && typeof value.type === 'string') return [value];
    return [];
  });
}

if (process.argv[1] && process.argv[1].endsWith('classify-functions.js')) {
  main(process.argv);
}
