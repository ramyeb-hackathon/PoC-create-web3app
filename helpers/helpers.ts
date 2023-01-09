import validateNpmName from "validate-npm-package-name";
import tar from "tar";
import { join } from "path";
import { tmpdir } from "os";
import { promisify } from "util";
import { Stream } from "stream";
import got from "got";
import fs, { createWriteStream } from "fs";
import { install } from "./install.js";
import { PackageManager } from "./get-pkg-manager.js";

const pipeline = promisify(Stream.pipeline);

export function validateProjectName(projectName: string) {
  const validationResult = validateNpmName(projectName);
  if (!validationResult.validForNewPackages && validationResult.errors) {
    console.error(`Invalid project name: ${validationResult.errors[0]}`);
    process.exit(1);
  }
}

async function downloadTar(url: string) {
  console.log("downloadTar function called");
  const tempFile = join(tmpdir(), `ledger-exemple-liveApp.temp-${Date.now()}`);
  console.log(`tempFile: ${tempFile}`);
  await pipeline(
    got.stream(url) as unknown as NodeJS.ReadableStream,
    createWriteStream(tempFile)
  );
  const stats = fs.statSync(tempFile);
  const fileSizeInBytes = stats.size;
  console.log(`Size of the file: ${fileSizeInBytes} bytes`);
  return tempFile;
}

export async function downloadAndExtractRepo(
  root: string,
  {
    username,
    name,
    branch,
  }: {
    username: string;
    name: string;
    branch: string;
  }
) {
  const tempFile = await downloadTar(
    `https://codeload.github.com/${username}/${name}/tar.gz/${branch}`
  );

  tar.list({
    file: tempFile,
    onentry: (entry) => console.log(entry.path),
  });

  try {
    await tar.x({
      file: tempFile,
      cwd: root,
      strip: 1,
    });
  } catch (error) {
    console.log((error as Error).message);
  }

  fs.unlink(tempFile, (error) => {
    if (error) {
      console.error(error);
    }
  });
}

export function getPkgManager() {
  if (process.env.npm_execpath && process.env.npm_execpath.includes("pnpm")) {
    return "pnpm";
  }
  if (process.env.npm_execpath && process.env.npm_execpath.includes("yarn")) {
    return "yarn";
  }
  return "npm";
}

export async function installPackageJson(
  root: string,
  packageManager: PackageManager,
  isOnline: boolean
) {
  console.log("Installing packages. This might take a couple of minutes.");
  console.log();
  await install(root, null, { packageManager, isOnline });
  console.log();
}
