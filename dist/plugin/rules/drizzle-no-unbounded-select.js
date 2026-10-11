import { serializeAstForComparison, walkAst } from "../utils.js";
import { collectNestedStarterCallSerializations, isDrizzleFile, isDrizzleIgnoredFile, isMethodCall, } from "./drizzle-utils.js";
const SELECT_METHODS = new Set(["select"]);
const FROM_METHODS = new Set(["from"]);
const WHERE_METHODS = new Set(["where"]);
export const drizzleNoUnboundedSelectRule = {
    meta: {
        type: "problem",
        docs: {
            description: "Disallow bare Drizzle select().from(...) queries without explicit columns or a where clause.",
        },
        messages: {
            unboundedSelect: "Use explicit selected columns or add .where() instead of bare select().from(...).",
        },
    },
    create(context) {
        if (isDrizzleIgnoredFile(context.filename))
            return {};
        return {
            Program(node) {
                if (!isDrizzleFile(node, context.filename))
                    return;
                const candidateSelects = new Map();
                const selectsUsedWithFrom = new Set();
                const safeSelects = new Set();
                walkAst(node, (candidate) => {
                    if (candidate.type !== "CallExpression")
                        return;
                    if (isMethodCall(candidate, SELECT_METHODS)) {
                        const args = Array.isArray(candidate.arguments) ? candidate.arguments : [];
                        if (args.length === 0) {
                            candidateSelects.set(serializeAstForComparison(candidate), candidate);
                        }
                    }
                    if (isMethodCall(candidate, FROM_METHODS)) {
                        for (const serialization of collectNestedStarterCallSerializations(candidate, SELECT_METHODS)) {
                            selectsUsedWithFrom.add(serialization);
                        }
                    }
                    if (isMethodCall(candidate, WHERE_METHODS)) {
                        for (const serialization of collectNestedStarterCallSerializations(candidate, SELECT_METHODS)) {
                            safeSelects.add(serialization);
                        }
                    }
                });
                for (const [serialization, selectNode] of candidateSelects) {
                    if (!selectsUsedWithFrom.has(serialization))
                        continue;
                    if (safeSelects.has(serialization))
                        continue;
                    context.report({ node: selectNode, messageId: "unboundedSelect" });
                }
            },
        };
    },
};
//# sourceMappingURL=drizzle-no-unbounded-select.js.map