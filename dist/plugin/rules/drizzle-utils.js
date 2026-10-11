import { getCallChain, getImportSources, getMemberPropertyName, isFixtureOrDocsFile, isMigrationFile, isTestFilename, serializeAstForComparison, toNode, walkAst, } from "../utils.js";
const DRIZZLE_IMPORT_PATTERN = /^drizzle-orm(?:\/|$)/;
const DRIZZLE_FILENAME_PATTERN = /(?:^|\/)(?:db|database|schema|repositories?|repos?|services?|drizzle)(?:\/|$)/;
export const DRIZZLE_WRITE_METHODS = new Set(["insert", "update", "delete"]);
export const DRIZZLE_QUERY_METHODS = new Set(["select", "insert", "update", "delete", "query", "execute"]);
export const isDrizzleFile = (program, filename) => {
    for (const source of getImportSources(program)) {
        if (DRIZZLE_IMPORT_PATTERN.test(source))
            return true;
    }
    return typeof filename === "string" && DRIZZLE_FILENAME_PATTERN.test(filename);
};
export const isDrizzleIgnoredFile = (filename) => isTestFilename(filename) || isFixtureOrDocsFile(filename) || isMigrationFile(filename);
export const getMethodCalleeName = (node) => {
    if (node.type !== "CallExpression")
        return null;
    const callee = toNode(node.callee);
    if (!callee || callee.type !== "MemberExpression")
        return null;
    return getMemberPropertyName(callee);
};
export const isMethodCall = (node, methodNames) => {
    const methodName = getMethodCalleeName(node);
    return methodName !== null && methodNames.has(methodName);
};
export const collectNestedStarterCallSerializations = (value, methodNames) => {
    const serializations = new Set();
    const visit = (candidateValue) => {
        const candidate = toNode(candidateValue);
        if (!candidate)
            return;
        if (candidate.type === "CallExpression") {
            if (isMethodCall(candidate, methodNames)) {
                serializations.add(serializeAstForComparison(candidate));
            }
            const callee = toNode(candidate.callee);
            if (callee && callee.type === "MemberExpression") {
                visit(callee.object);
            }
            return;
        }
        if (candidate.type === "MemberExpression") {
            visit(candidate.object);
        }
    };
    visit(value);
    return serializations;
};
export const hasMethodInChain = (value, methodNames) => {
    const callChain = getCallChain(value);
    if (!callChain)
        return false;
    return callChain.members.some((member) => methodNames.has(member));
};
export const countWriteCalls = (node) => {
    let count = 0;
    walkAst(node, (candidate) => {
        if (candidate.type !== "CallExpression")
            return;
        if (isMethodCall(candidate, DRIZZLE_WRITE_METHODS)) {
            count += 1;
        }
    });
    return count;
};
const TRANSACTION_METHODS = new Set(["transaction", "withTransaction"]);
export const collectTransactionScopedWriteSerializations = (node) => {
    const safeWrites = new Set();
    walkAst(node, (candidate) => {
        if (candidate.type !== "CallExpression")
            return;
        const methodName = getMethodCalleeName(candidate);
        if (!methodName || !TRANSACTION_METHODS.has(methodName))
            return;
        const args = Array.isArray(candidate.arguments) ? candidate.arguments : [];
        for (const arg of args) {
            walkAst(arg, (inner) => {
                if (inner.type !== "CallExpression")
                    return;
                if (!isMethodCall(inner, DRIZZLE_WRITE_METHODS))
                    return;
                safeWrites.add(serializeAstForComparison(inner));
            });
        }
    });
    return safeWrites;
};
const QUERY_LOOP_METHODS = new Set(["select", "insert", "update", "delete", "execute", "findMany", "findFirst"]);
export const isDrizzleQueryCall = (node) => {
    if (node.type !== "CallExpression")
        return false;
    if (isMethodCall(node, QUERY_LOOP_METHODS))
        return true;
    const callChain = getCallChain(node);
    if (!callChain)
        return false;
    return callChain.members.includes("query");
};
//# sourceMappingURL=drizzle-utils.js.map