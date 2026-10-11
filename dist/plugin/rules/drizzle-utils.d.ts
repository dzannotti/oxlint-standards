import type { AstNode } from "../types.js";
export declare const DRIZZLE_WRITE_METHODS: Set<string>;
export declare const DRIZZLE_QUERY_METHODS: Set<string>;
export declare const isDrizzleFile: (program: AstNode, filename: string | undefined) => boolean;
export declare const isDrizzleIgnoredFile: (filename: string | undefined) => boolean;
export declare const getMethodCalleeName: (node: AstNode) => string | null;
export declare const isMethodCall: (node: AstNode, methodNames: ReadonlySet<string>) => boolean;
export declare const collectNestedStarterCallSerializations: (value: unknown, methodNames: ReadonlySet<string>) => ReadonlySet<string>;
export declare const hasMethodInChain: (value: unknown, methodNames: ReadonlySet<string>) => boolean;
export declare const countWriteCalls: (node: AstNode) => number;
export declare const collectTransactionScopedWriteSerializations: (node: AstNode) => ReadonlySet<string>;
export declare const isDrizzleQueryCall: (node: AstNode) => boolean;
//# sourceMappingURL=drizzle-utils.d.ts.map