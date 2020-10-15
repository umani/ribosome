const { compilerOptions } = require("../tsconfig.json")

module.exports = {
    rootDir: "..",
    transform: {
        ".(ts|tsx)": "ts-jest",
    },
    globals: {
        "ts-jest": {
            diagnostics: true,
            tsConfig: compilerOptions,
        },
    },
    moduleFileExtensions: ["ts", "js"],
    testPathIgnorePatterns: ["/node_modules/", "/dist/"],
    modulePathIgnorePatterns: ["/dist/"],
}
