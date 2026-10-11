import { isPrimitiveLiteralNode, toNode } from "../utils.js";
const isConstTypeAnnotation = (node) => {
    const typeNode = toNode(node);
    if (!typeNode)
        return false;
    if (typeNode.type === "TSTypeReference") {
        return toNode(typeNode.typeName)?.type === "Identifier" &&
            typeNode.typeName.name === "const";
    }
    return typeNode.type === "TSLiteralType" &&
        toNode(typeNode.literal)?.type === "Identifier" &&
        typeNode.literal.name === "const";
};
export const noRedundantConstAssertionRule = {
    meta: {
        type: "problem",
        docs: {
            description: "Disallow redundant const assertions on primitive literals and other syntax-only cases.",
        },
        messages: {
            redundant: "Redundant 'as const' assertion adds no useful information here. Remove it.",
        },
    },
    create(context) {
        return {
            TSAsExpression(node) {
                if (!isConstTypeAnnotation(node.typeAnnotation))
                    return;
                if (!isPrimitiveLiteralNode(node.expression))
                    return;
                context.report({ node, messageId: "redundant" });
            },
        };
    },
};
//# sourceMappingURL=no-redundant-const-assertion.js.map