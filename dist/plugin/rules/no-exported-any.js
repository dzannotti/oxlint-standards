import { getNode, walkAst } from "../utils.js";
const GENERATED_PATTERN = /\.(generated|interop|d)\.[cm]?[jt]sx?$/;
export const noExportedAnyRule = {
    meta: {
        type: "problem",
        docs: {
            description: "Disallow 'any' type in exported declarations. Use a specific type, 'unknown', or a generic.",
        },
        messages: {
            exportedAny: "Exported API must not use 'any'. Use a specific type, 'unknown', or a generic.",
        },
    },
    create(context) {
        if (context.filename && GENERATED_PATTERN.test(context.filename))
            return {};
        return {
            ExportNamedDeclaration(node) {
                const declaration = getNode(node, "declaration");
                if (!declaration)
                    return;
                let found = false;
                walkAst(declaration, (candidate) => {
                    if (found)
                        return;
                    if (candidate.type === "TSAnyKeyword") {
                        found = true;
                    }
                });
                if (found) {
                    context.report({ node, messageId: "exportedAny" });
                }
            },
        };
    },
};
//# sourceMappingURL=no-exported-any.js.map