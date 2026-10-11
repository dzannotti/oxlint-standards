import { getIdentifierName, getNodeArray, isMigrationFile, serializeAstForComparison, toNode, walkAst, } from "../utils.js";
import { isDrizzleFile, isDrizzleIgnoredFile } from "./drizzle-utils.js";
const CRUD_SQL_PATTERN = /\b(select|insert|update|delete)\b/i;
const getTemplateLiteralText = (node) => {
    if (node.type !== "TemplateLiteral")
        return "";
    return getNodeArray(node, "quasis")
        .map((quasi) => {
        const value = quasi.value;
        if (!value || typeof value !== "object")
            return "";
        const raw = Reflect.get(value, "raw");
        if (typeof raw === "string")
            return raw;
        const cooked = Reflect.get(value, "cooked");
        return typeof cooked === "string" ? cooked : "";
    })
        .join(" ");
};
const isSqlTag = (tag) => {
    if (!tag)
        return false;
    if (tag.type === "Identifier")
        return getIdentifierName(tag) === "sql";
    return false;
};
export const drizzleNoRawSqlCrudRule = {
    meta: {
        type: "problem",
        docs: {
            description: "Disallow raw sql`...` CRUD statements in Drizzle application code.",
        },
        messages: {
            rawCrud: "Prefer Drizzle's query builder or relational API over raw sql`...` CRUD statements.",
        },
    },
    create(context) {
        if (isDrizzleIgnoredFile(context.filename) || isMigrationFile(context.filename))
            return {};
        return {
            Program(node) {
                if (!isDrizzleFile(node, context.filename))
                    return;
                const reported = new Set();
                walkAst(node, (candidate) => {
                    if (candidate.type !== "TaggedTemplateExpression")
                        return;
                    if (!isSqlTag(toNode(candidate.tag)))
                        return;
                    const templateText = getTemplateLiteralText(toNode(candidate.quasi) ?? candidate);
                    if (!CRUD_SQL_PATTERN.test(templateText))
                        return;
                    const serialization = serializeAstForComparison(candidate);
                    if (reported.has(serialization))
                        return;
                    reported.add(serialization);
                    context.report({ node: candidate, messageId: "rawCrud" });
                });
            },
        };
    },
};
//# sourceMappingURL=drizzle-no-raw-sql-crud.js.map