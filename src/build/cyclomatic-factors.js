import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import escomplex from "typhonjs-escomplex";

const PARSER_OPTIONS = {
  allowAwaitOutsideFunction: true,
  allowReturnOutsideFunction: true,
  allowSuperOutsideMethod: true,
  plugins: [
    "jsx",
    "classProperties",
    "classPrivateProperties",
    "classPrivateMethods",
    "decorators-legacy",
    "dynamicImport",
    "exportDefaultFrom",
    "exportNamespaceFrom",
    "nullishCoalescingOperator",
    "optionalChaining",
    "topLevelAwait"
  ],
  sourceType: "unambiguous"
};

const FUNCTION_NODES = new Set([
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
  "ObjectMethod",
  "ClassMethod",
  "ClassPrivateMethod"
]);

const FACTOR_DEFINITIONS = [
  {
    match: (node) => node.type === "IfStatement",
    describe: () => "if statement"
  },
  {
    match: (node) => node.type === "SwitchCase" && !!node.test,
    describe: () => "switch case"
  },
  {
    match: (node) => node.type === "ForStatement",
    describe: () => "for loop"
  },
  {
    match: (node) => node.type === "ForInStatement",
    describe: () => "for-in loop"
  },
  {
    match: (node) => node.type === "ForOfStatement",
    describe: () => "for-of loop"
  },
  {
    match: (node) => node.type === "WhileStatement",
    describe: () => "while loop"
  },
  {
    match: (node) => node.type === "DoWhileStatement",
    describe: () => "do-while loop"
  },
  {
    match: (node) => node.type === "CatchClause",
    describe: () => "catch clause"
  },
  {
    match: (node) => node.type === "ConditionalExpression",
    describe: () => "ternary expression"
  },
  {
    match: (node) =>
      node.type === "LogicalExpression" &&
      ["&&", "||"].includes(node.operator),
    describe: (node, snippet) =>
      `logical ${node.operator}${formatSnippetForDescription(snippet)}`
  }
];

function isFunctionNode(node) {
  return node && FUNCTION_NODES.has(node.type);
}

function getIdentifierName(node) {
  if (!node) {
    return null;
  }

  if (node.type === "Identifier") {
    return node.name;
  }

  if (node.type === "PrivateName" && node.id?.type === "Identifier") {
    return `#${node.id.name}`;
  }

  if (
    node.type === "StringLiteral" ||
    node.type === "Literal" ||
    node.type === "NumericLiteral"
  ) {
    return String(node.value);
  }

  if (node.type === "MemberExpression") {
    const objectName = getIdentifierName(node.object);
    const propertyName =
      node.computed && node.property
        ? `[${getIdentifierName(node.property) ?? "expr"}]`
        : getIdentifierName(node.property);
    if (objectName && propertyName) {
      return `${objectName}.${propertyName}`;
    }
  }

  if (node.type === "TSQualifiedName") {
    return `${getIdentifierName(node.left)}.${getIdentifierName(node.right)}`;
  }

  return null;
}

function getFunctionName(node, parent) {
  if (node.id && node.id.type === "Identifier") {
    return node.id.name;
  }

  if (node.type === "ObjectMethod" || node.type === "ClassMethod") {
    return getIdentifierName(node.key) ?? "<anonymous>";
  }

  if (node.type === "ClassPrivateMethod") {
    return getIdentifierName(node.key) ?? "<anonymous>";
  }

  if (parent) {
    if (parent.type === "VariableDeclarator") {
      return getIdentifierName(parent.id) ?? "<anonymous>";
    }

    if (parent.type === "AssignmentExpression") {
      return getIdentifierName(parent.left) ?? "<anonymous>";
    }

    if (parent.type === "Property" || parent.type === "ObjectProperty") {
      return getIdentifierName(parent.key) ?? "<anonymous>";
    }

    if (parent.type === "ExportDefaultDeclaration") {
      return "default export function";
    }
  }

  return "<anonymous>";
}

function formatFunctionLabel(name, loc) {
  const nameSegment =
    name === "<anonymous>" ? "Anonymous function" : `Function ${name}`;
  const lineSegment =
    loc?.start?.line != null ? `line ${loc.start.line}` : "unknown line";
  return `${nameSegment} (${lineSegment})`;
}

function getNodeLine(node) {
  return node?.loc?.start?.line ?? null;
}

function collapseSnippet(snippet) {
  if (!snippet) {
    return null;
  }

  const normalized = snippet.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  return normalized.length > 120
    ? `${normalized.slice(0, 120)}…`
    : normalized;
}

function formatSnippetForDescription(snippet) {
  const collapsed = collapseSnippet(snippet);
  return collapsed ? ` (${collapsed})` : "";
}

function traverseNode(node, parent, state) {
  if (!node || typeof node.type !== "string") {
    return;
  }

  const enteringFunction = isFunctionNode(node);
  if (enteringFunction) {
    const name = getFunctionName(node, parent);
    const label = formatFunctionLabel(name, node.loc);
    state.functionStack.push({ name, label, loc: node.loc });
  }

  const currentFunction = state.functionStack[state.functionStack.length - 1];
  const nodeSnippet =
    state.source &&
    typeof node.start === "number" &&
    typeof node.end === "number"
      ? state.source.slice(node.start, node.end)
      : null;

  if (currentFunction) {
    const factor = FACTOR_DEFINITIONS.find((definition) =>
      definition.match(node)
    );

    if (factor) {
      const line = getNodeLine(node);
      state.factors.push({
        index: node.start ?? Number.MAX_SAFE_INTEGER,
        description: `${currentFunction.label}: ${factor.describe(
          node,
          nodeSnippet
        )}${line ? ` at line ${line}` : ""}`
      });
    }
  }

  for (const key of Object.keys(node)) {
    if (["loc", "start", "end"].includes(key)) {
      continue;
    }
    const child = node[key];
    if (Array.isArray(child)) {
      child.forEach((item) => traverseNode(item, node, state));
    } else if (child && typeof child.type === "string") {
      traverseNode(child, node, state);
    }
  }

  if (enteringFunction) {
    state.functionStack.pop();
  }
}

/**
 * Returns the cyclomatic complexity factors found inside the supplied code.
 *
 * @param {string} code JavaScript source that may contain one or more functions.
 * @returns {string[]} Ordered descriptions of each complexity factor.
 */
export function describeCyclomaticFactors(code) {
  if (typeof code !== "string") {
    throw new TypeError("code must be a string");
  }

  const ast = escomplex.parse(code, PARSER_OPTIONS);

  const state = {
    functionStack: [],
    factors: [],
    source: code
  };

  traverseNode(ast, null, state);

  return state.factors
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.description);
}

const __filename = fileURLToPath(import.meta.url);

async function readStdIn() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(chunks.join("")));
    process.stdin.on("error", reject);
  });
}

async function runFromCli() {
  const [fileArg] = process.argv.slice(2);

  let source = "";

  if (fileArg) {
    source = fs.readFileSync(path.resolve(fileArg), "utf8");
  } else if (!process.stdin.isTTY) {
    source = await readStdIn();
  } else {
    process.stderr.write(
      "Provide JavaScript code via a file argument or pipe it through stdin.\n"
    );
    process.exit(1);
  }

  const output = describeCyclomaticFactors(source);
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

if (process.argv[1] === __filename) {
  runFromCli().catch((error) => {
    process.stderr.write(`Failed to analyze code: ${error.message}\n`);
    process.exit(1);
  });
}
