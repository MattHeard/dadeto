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

function main(argv) {
  const filePath = argv[2];
  if (!filePath) {
    emitErrorAndExit({
      kind: 'file_read_error',
      message: 'Could not read file',
      filePath: '',
    });
  }

  let source;
  try {
    source = fs.readFileSync(filePath, 'utf8');
  } catch {
    emitErrorAndExit({
      kind: 'file_read_error',
      message: 'Could not read file',
      filePath,
    });
  }

  let ast;
  try {
    ast = parse(source, {
      sourceType: 'module',
      plugins: PARSER_PLUGINS,
      ranges: true,
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
      allowSuperOutsideMethod: true,
    });
  } catch (error) {
    emitErrorAndExit({
      kind: 'parse_error',
      message: error?.message || 'Unexpected token',
      filePath,
      line: error?.loc?.line ?? 1,
      column: error?.loc?.column ?? 0,
    });
  }

  const functions = [];
  collectFunctions(ast.program, functions, filePath);
  process.stdout.write(
    `${JSON.stringify({ filePath, functions }, null, 2)}\n`
  );
}

function emitErrorAndExit(error) {
  process.stderr.write(`${JSON.stringify({ error }, null, 2)}\n`);
  process.exit(1);
}

function collectFunctions(node, functions, filePath) {
  for (const child of getChildNodes(node)) {
    if (!child || typeof child.type !== 'string') {
      continue;
    }

    if (FUNCTION_TYPES.has(child.type)) {
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
  walkNode(body, current => {
    const signal = classifySignal(current, node);
    if (!signal || seenLabels.has(signal.label)) {
      return;
    }

    seenLabels.add(signal.label);
    signals.push(signal);
  });

  const labels = SIGNAL_ORDER.filter(label => seenLabels.has(label));

  return {
    id: `${filePath}:${getStartLocation(node).line}:${getStartLocation(node).column}:${getFunctionName(node)}`,
    name: getFunctionName(node),
    kind: getFunctionKind(node),
    startLine: getStartLocation(node).line,
    startColumn: getStartLocation(node).column,
    endLine: node.loc.end.line,
    endColumn: node.loc.end.column,
    labels,
    signals,
    jsdoc: null,
  };
}

function getFunctionName(node) {
  if (node.type === 'FunctionDeclaration' && node.id?.name) {
    return node.id.name;
  }

  if ((node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') && node.id?.name) {
    return node.id.name;
  }

  if ((node.type === 'ObjectMethod' || node.type === 'ClassMethod') && node.key) {
    return getPropertyName(node.key);
  }

  if (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
    const inferred = inferAssignedName(node);
    if (inferred) {
      return inferred;
    }
  }

  return `<anonymous@${node.loc.start.line}:${node.loc.start.column}>`;
}

function inferAssignedName(node) {
  const parent = node.__parent;
  if (!parent) {
    return null;
  }

  if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
    return parent.id.name;
  }

  if (parent.type === 'AssignmentExpression' && parent.left.type === 'Identifier') {
    return parent.left.name;
  }

  if (
    parent.type === 'ObjectProperty' &&
    parent.key &&
    parent.value === node
  ) {
    return getPropertyName(parent.key);
  }

  return null;
}

function getPropertyName(node) {
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type === 'StringLiteral' || node.type === 'NumericLiteral') {
    return String(node.value);
  }
  return `<anonymous@${node.loc.start.line}:${node.loc.start.column}>`;
}

function getFunctionKind(node) {
  if (node.type === 'FunctionDeclaration') {
    return 'function_declaration';
  }
  if (node.type === 'ArrowFunctionExpression') {
    return 'arrow_function';
  }
  if (node.type === 'ObjectMethod') {
    return 'object_method';
  }
  if (node.type === 'ClassMethod') {
    return 'class_method';
  }
  if (node.type === 'FunctionExpression') {
    return 'function_expression';
  }
  return 'anonymous_function';
}

function getFunctionBody(node) {
  if (node.type === 'ArrowFunctionExpression' && node.body.type !== 'BlockStatement') {
    return node.body;
  }
  return node.body;
}

function walkNode(node, visitor) {
  if (!node || typeof node.type !== 'string') {
    return;
  }

  visitor(node);

  if (isNestedFunctionLike(node)) {
    return;
  }

  for (const child of getChildNodes(node)) {
    walkNode(child, visitor);
  }
}

function isNestedFunctionLike(node) {
  return (
    FUNCTION_TYPES.has(node.type) ||
    node.type === 'ObjectMethod' ||
    node.type === 'ClassMethod' ||
    node.type === 'ClassPrivateMethod'
  );
}

function classifySignal(node) {
  if (isParserSignal(node)) {
    return toSignal(node, 'parser', parserSignalKind(node), describeNode(node));
  }
  if (isValidatorSignal(node)) {
    return toSignal(node, 'validator', validatorSignalKind(node), describeNode(node));
  }
  return null;
}

function toSignal(node, label, kind, detail) {
  return {
    kind,
    label,
    line: node.loc.start.line,
    column: node.loc.start.column,
    detail,
  };
}

function parserSignalKind(node) {
  if (node.type === 'CallExpression') {
    const callee = getCalleeName(node.callee);
    if (callee === 'JSON.parse') {
      return 'json_parse';
    }
    if (
      ['Number', 'String', 'Boolean', 'parseInt', 'parseFloat', 'BigInt'].includes(callee)
    ) {
      return 'primitive_coercion';
    }
    if (callee === 'Date.parse') {
      return 'date_or_url_construction';
    }
    if (callee.endsWith('.parse') || callee.endsWith('.safeParse')) {
      return 'schema_parse_call';
    }
    if (callee === 'Boolean') {
      return 'primitive_coercion';
    }
  }
  if (node.type === 'NewExpression') {
    const callee = getCalleeName(node.callee);
    if (callee === 'Date' || callee === 'URL' || callee === 'URLSearchParams') {
      return 'date_or_url_construction';
    }
    if (node.callee.type === 'Identifier') {
      return 'domain_constructor_from_input';
    }
  }
  if (node.type === 'ReturnStatement' && node.argument?.type === 'ObjectExpression') {
    return 'returns_object_literal_from_input';
  }
  if (node.type === 'ReturnStatement' && node.argument?.type === 'ConditionalExpression') {
    return 'maps_external_value_to_internal_value';
  }
  if (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'map'
  ) {
    return 'returns_array_map_from_input';
  }
  return 'parser';
}

function validatorSignalKind(node) {
  if (isTypeofCheck(node)) {
    return 'typeof_check';
  }
  if (node.type === 'BinaryExpression') {
    if (node.operator === 'instanceof') {
      return 'instanceof_check';
    }
    if (node.operator === 'in') {
      return 'property_presence_check';
    }
    if (['>', '>=', '<', '<='].includes(node.operator)) {
      return 'range_or_comparison_check';
    }
    if (
      ['==', '===', '!=', '!=='].includes(node.operator) &&
      (isNullish(node.right) || isNullish(node.left))
    ) {
      return 'null_or_undefined_check';
    }
  }
  if (node.type === 'CallExpression') {
    const callee = getCalleeName(node.callee);
    if (callee === 'Array.isArray') {
      return 'array_is_array_check';
    }
    if (
      callee === 'Object.hasOwn' ||
      callee === 'Object.prototype.hasOwnProperty.call' ||
      callee.endsWith('.hasOwnProperty') ||
      callee === 'hasOwnProperty.call'
    ) {
      return 'property_presence_check';
    }
    if (callee === 'Boolean') {
      return 'returns_boolean_predicate';
    }
    if (callee.endsWith('.test')) {
      return 'regex_test';
    }
    if (callee.endsWith('.includes')) {
      return 'enum_membership_check';
    }
  }
  if (node.type === 'ThrowStatement') {
    return 'throws_error';
  }
  if (node.type === 'ReturnStatement' && node.argument && isBooleanishExpression(node.argument)) {
    return 'returns_boolean_predicate';
  }
  if (node.type === 'ReturnStatement' && node.argument?.type === 'BooleanLiteral') {
    return 'returns_boolean_literal';
  }
  if (node.type === 'CallExpression' && isErrorPush(node)) {
    return 'accumulates_validation_errors';
  }
  return 'validator';
}

function isParserSignal(node) {
  if (node.type === 'CallExpression') {
    const callee = getCalleeName(node.callee);
    if (
      callee === 'JSON.parse' ||
      ['Number', 'String', 'Boolean', 'parseInt', 'parseFloat', 'BigInt'].includes(callee) ||
      callee === 'Date.parse' ||
      callee.endsWith('.parse') ||
      callee.endsWith('.safeParse')
    ) {
      return true;
    }
  }
  if (node.type === 'NewExpression') {
    const callee = getCalleeName(node.callee);
    return ['Date', 'URL', 'URLSearchParams'].includes(callee);
  }
  if (node.type === 'ReturnStatement' && node.argument?.type === 'ObjectExpression') {
    return true;
  }
  if (node.type === 'ReturnStatement' && node.argument?.type === 'ConditionalExpression') {
    return true;
  }
  if (node.type === 'ReturnStatement' && node.argument?.type === 'ArrayExpression') {
    return true;
  }
  if (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'map'
  ) {
    return true;
  }
  return false;
}

function isValidatorSignal(node) {
  if (isTypeofCheck(node)) {
    return true;
  }
  if (node.type === 'BinaryExpression') {
    if (['instanceof', '>', '>=', '<', '<='].includes(node.operator)) {
      return true;
    }
    if (node.operator === 'in') {
      return true;
    }
    if (['==', '===', '!=', '!=='].includes(node.operator) && isNullish(node.right)) {
      return true;
    }
    if (['==', '===', '!=', '!=='].includes(node.operator) && isNullish(node.left)) {
      return true;
    }
  }
  if (node.type === 'CallExpression') {
    const callee = getCalleeName(node.callee);
    return (
      callee === 'Array.isArray' ||
      callee === 'Object.hasOwn' ||
      callee === 'Object.prototype.hasOwnProperty.call' ||
      callee.endsWith('.hasOwnProperty') ||
      callee === 'hasOwnProperty.call' ||
      callee.endsWith('.test') ||
      callee.endsWith('.includes') ||
      callee === 'Boolean' ||
      isErrorPush(node)
    );
  }
  if (node.type === 'ThrowStatement') {
    return true;
  }
  if (node.type === 'ReturnStatement' && node.argument && isBooleanishExpression(node.argument)) {
    return true;
  }
  if (node.type === 'ReturnStatement' && node.argument?.type === 'BooleanLiteral') {
    return true;
  }
  return false;
}

function isNullish(node) {
  return (
    node?.type === 'NullLiteral' ||
    (node?.type === 'Identifier' && node.name === 'undefined')
  );
}

function isBooleanishExpression(node) {
  return (
    (node.type === 'BinaryExpression' &&
      ['===', '!==', '==', '!=', '>', '>=', '<', '<=', 'instanceof'].includes(
        node.operator
      )) ||
    node.type === 'LogicalExpression' ||
    (node.type === 'UnaryExpression' && node.operator === '!') ||
    (node.type === 'CallExpression' && getCalleeName(node.callee) === 'Boolean')
  );
}

function isTypeofCheck(node) {
  return (
    node.type === 'BinaryExpression' &&
    ['===', '!==', '==', '!='].includes(node.operator) &&
    ((node.left.type === 'UnaryExpression' && node.left.operator === 'typeof') ||
      (node.right.type === 'UnaryExpression' && node.right.operator === 'typeof'))
  );
}

function isErrorPush(node) {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'push' &&
    node.callee.object.type === 'Identifier' &&
    /error|errors|validation|violations|failures/i.test(node.callee.object.name)
  );
}

function getCalleeName(node) {
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type === 'MemberExpression' && !node.computed) {
    const objectName = getCalleeName(node.object);
    const propertyName = getCalleeName(node.property);
    return `${objectName}.${propertyName}`;
  }
  if (node.type === 'PrivateName') {
    return node.id.name;
  }
  return '<unknown>';
}

function describeNode(node) {
  if (node.type === 'ReturnStatement') {
    return `return ${describeNode(node.argument)}`;
  }
  if (node.type === 'UnaryExpression') {
    return `${node.operator}${describeNode(node.argument)}`;
  }
  if (node.type === 'BinaryExpression' || node.type === 'LogicalExpression') {
    return `${describeNode(node.left)} ${node.operator} ${describeNode(node.right)}`;
  }
  if (node.type === 'CallExpression') {
    return `${getCalleeName(node.callee)}(${node.arguments.map(describeNode).join(', ')})`;
  }
  if (node.type === 'NewExpression') {
    return `new ${getCalleeName(node.callee)}(${node.arguments.map(describeNode).join(', ')})`;
  }
  if (node.type === 'StringLiteral') {
    return JSON.stringify(node.value);
  }
  if (node.type === 'NumericLiteral' || node.type === 'BooleanLiteral') {
    return String(node.value);
  }
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type === 'MemberExpression' && !node.computed) {
    return `${describeNode(node.object)}.${describeNode(node.property)}`;
  }
  return node.type;
}

function getChildNodes(node) {
  const nodes = [];
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item.type === 'string') {
          nodes.push(linkParent(item, node));
        }
      }
      continue;
    }
    if (value && typeof value.type === 'string') {
      nodes.push(linkParent(value, node));
    }
  }
  return nodes;
}

function getStartLocation(node) {
  const parent = node.__parent;
  if (
    parent &&
    parent.type === 'ExportNamedDeclaration' &&
    parent.declaration === node
  ) {
    return parent.loc.start;
  }
  if (
    parent &&
    parent.type === 'VariableDeclarator' &&
    parent.init === node
  ) {
    return parent.loc.start;
  }
  return node.loc.start;
}

function linkParent(node, parent) {
  if (!node.__parent) {
    Object.defineProperty(node, '__parent', {
      value: parent,
      enumerable: false,
      configurable: true,
    });
  }
  return node;
}

main(process.argv);
