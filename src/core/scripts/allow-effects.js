/** @typedef {import('typescript').Node} TypeNode */
/** @typedef {typeof import('typescript')} TypeScript */
/** @typedef {import('typescript').TypeChecker} TypeChecker */

/**
 * Identify the private nominal brand, including inferred aliases and unions.
 * @param {import('typescript').Type} type Checked value type.
 * @param {import('typescript').__String | undefined} brand Nominal private symbol identity.
 * @returns {boolean} Whether the value carries command permission.
 */
function isCapability(type, brand) {
  if (type.isUnionOrIntersection())
    return type.types.some(member => isCapability(member, brand));
  return type.getProperties().some(property => property.escapedName === brand);
}

/**
 * Resolve the actual private symbol, also retained by inferred mapped types.
 * @param {TypeScript} ts Compiler API.
 * @param {import('typescript').Program} program Current checked source graph.
 * @param {TypeChecker} checker Current symbols.
 * @returns {import('typescript').__String | undefined} Opaque brand when this graph uses permissions.
 */
function permissionBrand(ts, program, checker) {
  const source = program
    .getSourceFiles()
    .find(file => file.fileName.endsWith('/types/allow-effects.d.ts'));
  if (!source) return undefined;
  const declaration = /** @type {import('typescript').InterfaceDeclaration} */ (
    source.statements.find(ts.isInterfaceDeclaration)
  );
  return checker.getTypeAtLocation(declaration).getProperties()[0].escapedName;
}

/**
 * Map an ESTree range to the corresponding compiler node.
 * @param {TypeScript} ts Compiler API.
 * @param {TypeNode} root Parsed source.
 * @param {number[]} range ESTree start and end offsets.
 * @returns {TypeNode | undefined} Exact compiler node when present.
 */
function nodeAtRange(ts, root, range) {
  let found;
  /**
   * Inspect only nodes enclosing the requested range.
   * @param {TypeNode} node Candidate syntax node.
   */
  function visit(node) {
    if (node.getStart() > range[0] || node.end < range[1]) return;
    if (node.getStart() === range[0] && node.end === range[1]) found = node;
    ts.forEachChild(node, visit);
  }
  visit(root);
  return found;
}

/**
 * Locate the innermost lexical invocation frame, not its enclosing closure.
 * @param {TypeScript} ts Compiler API.
 * @param {TypeNode} node Value reference.
 * @returns {TypeNode | undefined} Current function.
 */
function frameOf(ts, node) {
  let current = node.parent;
  while (current) {
    if (ts.isFunctionLike(current)) return current;
    current = current.parent;
  }
  return current;
}

/**
 * Require the referenced binding to be a direct parameter of this invocation.
 * @param {TypeScript} ts Compiler API.
 * @param {TypeChecker} checker Current symbols.
 * @param {TypeNode} node Value reference.
 * @returns {boolean} Whether the token belongs to this stack frame.
 */
function ownParameter(ts, checker, node) {
  const symbol = ts.isShorthandPropertyAssignment(node.parent)
    ? checker.getShorthandAssignmentValueSymbol(node.parent)
    : checker.getSymbolAtLocation(node);
  const frame = frameOf(ts, node);
  return Boolean(
    symbol?.declarations?.some(
      declaration => ts.isParameter(declaration) && declaration.parent === frame
    )
  );
}

/**
 * Detect persistence and re-assignment rather than explicit call forwarding.
 * @param {TypeScript} ts Compiler API.
 * @param {TypeNode} node Permission reference.
 * @returns {boolean} Whether the reference exports or stores permission.
 */
function storesCapability(ts, node) {
  let value = node;
  while (ts.isParenthesizedExpression(value.parent)) value = value.parent;
  const parent = value.parent;
  if (
    ts.isReturnStatement(parent) ||
    ts.isShorthandPropertyAssignment(parent) ||
    ts.isArrayLiteralExpression(parent)
  )
    return true;
  if (ts.isPropertyAssignment(parent)) return parent.initializer === value;
  if (ts.isVariableDeclaration(parent)) return parent.initializer === value;
  return (
    ts.isBinaryExpression(parent) &&
    parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
    parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment
  );
}

/**
 * Recognize a call whose signature requires explicit command permission.
 * @param {TypeChecker} checker Current symbols.
 * @param {import('typescript').__String | undefined} brand Nominal symbol identity.
 * @param {import('typescript').CallExpression} node Call to inspect.
 * @returns {boolean} Whether its first parameter is AllowEffects.
 */
function effectCall(checker, brand, node) {
  const parameter = checker.getResolvedSignature(node)?.parameters[0];
  return Boolean(
    parameter &&
      isCapability(checker.getTypeOfSymbolAtLocation(parameter, node), brand)
  );
}

/**
 * Verify explicit own-frame forwarding even when an unsafe any could compile.
 * @param {TypeScript} ts Compiler API.
 * @param {TypeChecker} checker Current symbols.
 * @param {import('typescript').__String | undefined} brand Nominal symbol identity.
 * @param {import('typescript').CallExpression} node Classified command.
 * @returns {boolean} Whether the first argument is the owning permission parameter.
 */
function forwardsPermission(ts, checker, brand, node) {
  let argument = node.arguments[0];
  while (argument && ts.isParenthesizedExpression(argument))
    argument = argument.expression;
  return Boolean(
    argument &&
      ts.isIdentifier(argument) &&
      isCapability(checker.getTypeAtLocation(argument), brand) &&
      ownParameter(ts, checker, argument)
  );
}

/**
 * Build a type-aware lint rule without creating compiler programs inside core.
 * @param {TypeScript} ts Compiler API supplied by the lint boundary.
 * @param {(filename: string, text: string) => import('typescript').Program} programFor Environment-owned compiler provider.
 * @returns {import('eslint').Rule.RuleModule} Explicit stack-frame capability enforcement.
 */
export function createAllowEffectsRule(ts, programFor) {
  return {
    meta: {
      type: 'problem',
      schema: [],
      messages: {
        unowned:
          'AllowEffects must be a direct parameter of this same function, never a captured or stored value.',
        stored:
          'Do not return, store, or reassign AllowEffects; forward the owning parameter explicitly.',
        mint: 'Only external runtime boundaries may obtain a new AllowEffects value.',
        call: "An effectful call must forward this function's explicit AllowEffects parameter as its first argument.",
        compiler:
          'AllowEffects lint could not map this expression to its compiler source.',
      },
    },
    create(context) {
      const filename = context.filename;
      const program = programFor(filename, context.sourceCode.text);
      const source = program.getSourceFile(filename);
      if (!source)
        throw new Error(
          'AllowEffects lint requires the current compiler source.'
        );
      const checker = program.getTypeChecker();
      const brand = permissionBrand(ts, program, checker);
      return {
        /**
         * Check actual nominal value types rather than spelling of identifiers.
         * @param {any} node ESTree identifier.
         */
        Identifier(node) {
          const typed = nodeAtRange(ts, source, node.range);
          if (!typed) {
            if (node.parent?.type === 'MetaProperty') return;
            context.report({ node, messageId: 'compiler' });
            return;
          }
          if (!isCapability(checker.getTypeAtLocation(typed), brand)) return;
          if (!ownParameter(ts, checker, typed)) {
            context.report({ node, messageId: 'unowned' });
          } else if (storesCapability(ts, typed)) {
            context.report({ node, messageId: 'stored' });
          }
        },
        /**
         * Reject minting and forged first arguments even through inferred aliases.
         * @param {any} node ESTree call.
         */
        CallExpression(node) {
          const typed = nodeAtRange(ts, source, node.range);
          if (!typed || !ts.isCallExpression(typed)) {
            context.report({ node, messageId: 'compiler' });
            return;
          }
          const signature = checker.getResolvedSignature(typed);
          if (
            signature &&
            isCapability(checker.getReturnTypeOfSignature(signature), brand)
          )
            context.report({ node, messageId: 'mint' });
          if (
            effectCall(checker, brand, typed) &&
            !forwardsPermission(ts, checker, brand, typed)
          )
            context.report({ node, messageId: 'call' });
        },
      };
    },
  };
}
