import { readdirSync, readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, isAbsolute, resolve } from "node:path";
import { getLiteralString } from "../utils.js";
const BUILTIN_MODULES = new Set([
    ...builtinModules,
    ...builtinModules.map((value) => value.replace(/^node:/, "")),
]);
const packageJsonByDirectory = new Map();
const allowedDependenciesByPackageJsonPath = new Map();
const allowedDependenciesByWorkspaceRootPath = new Map();
const loadAllowedDependenciesFromPackageJson = (packageJsonPath) => {
    const cached = allowedDependenciesByPackageJsonPath.get(packageJsonPath);
    if (cached)
        return cached;
    const packageJsonRaw = readFileSync(packageJsonPath, "utf8");
    const packageJson = JSON.parse(packageJsonRaw);
    const allowed = new Set();
    for (const dependencyMap of [
        packageJson.dependencies,
        packageJson.devDependencies,
        packageJson.peerDependencies,
        packageJson.optionalDependencies,
    ]) {
        if (!dependencyMap)
            continue;
        for (const name of Object.keys(dependencyMap)) {
            allowed.add(name);
        }
    }
    allowedDependenciesByPackageJsonPath.set(packageJsonPath, allowed);
    return allowed;
};
const getWorkspacePatterns = (packageJson) => {
    const workspaces = packageJson.workspaces;
    if (Array.isArray(workspaces))
        return workspaces;
    if (workspaces !== undefined && typeof workspaces === "object" && !Array.isArray(workspaces)) {
        const workspaceObject = workspaces;
        if (Array.isArray(workspaceObject.packages)) {
            return workspaceObject.packages;
        }
    }
    return [];
};
const collectWorkspaceDirectories = (rootDirectory, pattern) => {
    const segments = pattern.split("/").filter((segment) => segment.length > 0);
    if (segments.length === 0)
        return [];
    let currentDirectories = [rootDirectory];
    for (const segment of segments) {
        const nextDirectories = [];
        for (const currentDirectory of currentDirectories) {
            const entries = readdirSync(currentDirectory, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory())
                    continue;
                if (entry.name === "node_modules" || entry.name === ".git")
                    continue;
                if (segment !== "*" && entry.name !== segment)
                    continue;
                nextDirectories.push(resolve(currentDirectory, entry.name));
            }
        }
        currentDirectories = nextDirectories;
        if (currentDirectories.length === 0)
            return [];
    }
    return currentDirectories;
};
const loadAllowedDependenciesFromWorkspace = (rootPackageJsonPath) => {
    const rootAllowed = new Set(loadAllowedDependenciesFromPackageJson(rootPackageJsonPath));
    const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, "utf8"));
    const rootDirectory = dirname(rootPackageJsonPath);
    for (const pattern of getWorkspacePatterns(rootPackageJson)) {
        for (const workspaceDirectory of collectWorkspaceDirectories(rootDirectory, pattern)) {
            const workspacePackageJsonPath = resolve(workspaceDirectory, "package.json");
            try {
                const workspaceAllowed = loadAllowedDependenciesFromPackageJson(workspacePackageJsonPath);
                for (const dependency of workspaceAllowed) {
                    rootAllowed.add(dependency);
                }
            }
            catch {
                continue;
            }
        }
    }
    return rootAllowed;
};
const loadAllowedDependencies = (filename) => {
    if (filename) {
        const filenamePath = isAbsolute(filename) ? filename : resolve(process.cwd(), filename);
        let currentDirectory = dirname(filenamePath);
        while (true) {
            const cachedPath = packageJsonByDirectory.get(currentDirectory);
            if (cachedPath !== undefined) {
                if (cachedPath)
                    return loadAllowedDependenciesFromPackageJson(cachedPath);
                break;
            }
            const packageJsonPath = resolve(currentDirectory, "package.json");
            try {
                readFileSync(packageJsonPath, "utf8");
                packageJsonByDirectory.set(currentDirectory, packageJsonPath);
                return loadAllowedDependenciesFromPackageJson(packageJsonPath);
            }
            catch {
                packageJsonByDirectory.set(currentDirectory, null);
            }
            const parentDirectory = dirname(currentDirectory);
            if (parentDirectory === currentDirectory)
                break;
            currentDirectory = parentDirectory;
        }
    }
    const packageJsonPath = resolve(process.cwd(), "package.json");
    const cached = allowedDependenciesByWorkspaceRootPath.get(packageJsonPath);
    if (cached)
        return cached;
    const allowed = loadAllowedDependenciesFromWorkspace(packageJsonPath);
    allowedDependenciesByWorkspaceRootPath.set(packageJsonPath, allowed);
    return allowed;
};
const isInternalSpecifier = (specifier) => {
    if (specifier.startsWith(".") || specifier.startsWith("/") || specifier.startsWith("#"))
        return true;
    if (specifier.startsWith("@/") || specifier.startsWith("~/"))
        return true;
    if (/^[a-z]+:/.test(specifier) && !specifier.startsWith("node:"))
        return true;
    return false;
};
const toPackageName = (specifier) => {
    if (specifier.startsWith("@")) {
        const parts = specifier.split("/");
        return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
    }
    const [packageName] = specifier.split("/");
    return packageName ?? specifier;
};
const maybeReportImport = (context, source, node) => {
    if (!source || !node)
        return;
    if (isInternalSpecifier(source))
        return;
    const packageName = source.startsWith("node:") ? source.replace(/^node:/, "") : toPackageName(source);
    if (BUILTIN_MODULES.has(source) || BUILTIN_MODULES.has(packageName))
        return;
    const allowedDependencies = loadAllowedDependencies(context.filename);
    if (allowedDependencies.has(packageName))
        return;
    context.report({
        node,
        messageId: "forbidden",
        data: {
            source,
            packageName,
        },
    });
};
export const noUnlistedExternalImportsRule = {
    meta: {
        type: "problem",
        docs: {
            description: "Disallow importing external packages that are not listed in package.json dependencies.",
        },
        messages: {
            forbidden: "Import '{{source}}' resolves to '{{packageName}}', which is not declared in package.json dependencies.",
        },
    },
    create(context) {
        return {
            ImportDeclaration(node) {
                maybeReportImport(context, getLiteralString(node.source), node);
            },
            ExportNamedDeclaration(node) {
                maybeReportImport(context, getLiteralString(node.source), node);
            },
            ExportAllDeclaration(node) {
                maybeReportImport(context, getLiteralString(node.source), node);
            },
        };
    },
};
//# sourceMappingURL=no-unlisted-external-imports.js.map