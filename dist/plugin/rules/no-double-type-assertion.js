import { toNode } from "../utils.js";
const ASSERTION_NODE_TYPES = new Set(["TSAsExpression", "TSTypeAssertion"]);
export const noDoubleTypeAssertionRule = {
    meta: {
        type: "problem",
        docs: {
            description: "Disallow chained type assertions like 'value as unknown as T'.",
        },
        messages: {
            forbidden: "Double type assertion is forbidden. Encode the boundary with explicit types or schema validation.",
        },
    },
    create(context) {
        const checkAssertion = (node) => {
            const innerExpression = toNode(node.expression);
            if (!innerExpression)
                return;
            if (!ASSERTION_NODE_TYPES.has(innerExpression.type))
                return;
            context.report({ node, messageId: "forbidden" });
        };
        return {
            TSAsExpression(node) {
                checkAssertion(node);
            },
            TSTypeAssertion(node) {
                checkAssertion(node);
            },
        };
    },
};
//# sourceMappingURL=no-double-type-assertion.js.map