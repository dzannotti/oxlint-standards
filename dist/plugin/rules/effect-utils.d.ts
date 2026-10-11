import type { AstNode } from "../types.js";
export declare const EFFECT_TRY_METHODS: Set<string>;
export declare const isEffectFile: (program: AstNode, filename: string | undefined) => boolean;
export declare const collectSafeEffectBoundarySerializations: (program: AstNode) => ReadonlySet<string>;
//# sourceMappingURL=effect-utils.d.ts.map