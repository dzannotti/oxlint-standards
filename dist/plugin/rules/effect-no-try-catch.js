import { serializeAstForComparison, walkAst } from "../utils.js";
import { collectSafeEffectBoundarySerializations, isEffectFile } from "./effect-utils.js";
export const effectNoTryCatchRule = {
    meta: {
        type: "problem",
        docs: {
            description: "Disallow raw try/catch in Effect modules. Prefer typed Effect error channels.",
        },
        messages: {
            tryCatch: "Do not use raw try/catch in Effect modules. Prefer Effect.try, Effect.tryPromise, or typed catchTag/catchAll flows.",
        },
    },
    create(context) {
        return {
            Program(node) {
                if (!isEffectFile(node, context.filename))
                    return;
                const safeBoundaries = collectSafeEffectBoundarySerializations(node);
                walkAst(node, (candidate) => {
                    if (candidate.type !== "TryStatement")
                        return;
                    if (safeBoundaries.has(serializeAstForComparison(candidate)))
                        return;
                    context.report({ node: candidate, messageId: "tryCatch" });
                });
            },
        };
    },
};
//# sourceMappingURL=effect-no-try-catch.js.map