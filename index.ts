#!/usr/bin/env node

import fs from "fs";
import { execSync } from "child_process";
import prompts from "prompts";
import Commander from "commander";
import { PackageManager } from "./helpers/get-pkg-manager.js";
import {
  downloadAndExtractRepo,
  validateProjectName,
  getPkgManager,
} from "./helpers/helpers.js";
import { install } from "./helpers/install.js";
import { getOnline } from "./helpers/is-online.js";
import path from "path";

const repoInfo = {
  username: "ramyeb-hackathon",
  name: "PoC-template-liveApp",
  branch: "main",
};

function processRecursivlyFilesInDeepFirstSearchPostOrder(
  _depth: number,
  _fileOrDir: string,
  projectName: string
) {
  if (fs.lstatSync(_fileOrDir).isFile()) {
    const fileContent = fs.readFileSync(_fileOrDir, "utf8");
    const modifiedContent = fileContent.replace(/ReplaceAppName/g, projectName);
    fs.writeFileSync(_fileOrDir, modifiedContent, "utf8");
  } else {
    const depth = _depth + 1;
    fs.readdir(_fileOrDir, (_err, filesOrDirs) => {
      filesOrDirs.forEach((element) => {
        processRecursivlyFilesInDeepFirstSearchPostOrder(
          depth,
          path.join(_fileOrDir, element),
          projectName
        );
      });
    });
  }
}

async function main() {
  const PkgManager: PackageManager = getPkgManager();
  const useYarn = PkgManager === "yarn";
  const isOnline = !useYarn || (await getOnline());
  const { projectName } = await prompts({
    type: "text",
    name: "projectName",
    message: "What is your project named?",
  });
  if (!fs.existsSync(projectName)) 
  fs.mkdirSync(projectName);
  await validateProjectName(projectName);
  console.log({
    projectName,
    PkgManager,
  });
  await downloadAndExtractRepo(`./${projectName}`, repoInfo);
  process.chdir(projectName);
  await processRecursivlyFilesInDeepFirstSearchPostOrder(
    0,
    process.cwd(),
    projectName
  );
  await install(projectName, null, {
    packageManager: PkgManager,
    isOnline,
  });

  console.log("build");
  await execSync(PkgManager + " run build", { stdio: "inherit" });
  console.log("serve start");
  execSync(PkgManager + " run start", { stdio: "inherit" });
  console.log("You can now try your live app on Ledger Live");
}

const programn = new Commander.Command("create-web3app")
  .description("Create a new web3app")
  .action(main)
  .parse(process.argv);
