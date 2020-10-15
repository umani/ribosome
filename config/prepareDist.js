// This script will:
//
// - Copy the current root package.json into "dist" after adjusting it for
//   publishing.
// - Copy the supporting files from the root into "dist" (e.g. `README.MD`,
//   `LICENSE`, etc.).

const fs = require("fs")

const distRoot = `${__dirname}/../dist`

const packageJson = require("../package.json")

// The root package.json is marked as private to prevent publishing
// from happening in the root of the project. This sets the package back to
// public so it can be published from the "dist" directory.
packageJson.private = false

// Remove package.json items that we don't need to publish
delete packageJson.scripts
delete packageJson.devDependencies

// The root package.json points to the CJS/ESM source in "dist", to support
// running tests. When publishing from "dist" however, we need to update the
// package.json to point to the files within the same directory.
const distPackageJson =
    JSON.stringify(
        packageJson,
        (_key, value) => {
            if (typeof value === "string" && value.startsWith("./dist/")) {
                const parts = value.split("/")
                parts.splice(1, 1) // remove dist
                return parts.join("/")
            }
            return value
        },
        2,
    ) + "\n"

// Save the modified package.json to "dist"
fs.writeFileSync(`${distRoot}/package.json`, distPackageJson)

// Copy supporting files into "dist"
const srcDir = `${__dirname}/..`
const destDir = `${srcDir}/dist`
fs.copyFileSync(`${srcDir}/README.md`, `${destDir}/README.md`)
fs.copyFileSync(`${srcDir}/LICENSE`, `${destDir}/LICENSE`)
