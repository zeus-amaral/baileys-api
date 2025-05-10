import app from "@/app";
import config from "@/config";
import { file, spawnSync } from "bun";

async function getGitIndexContent(filePath: string): Promise<string | null> {
  const proc = spawnSync(["git", "show", `:${filePath}`]);
  if (proc.exitCode === 0) {
    return proc.stdout.toString();
  }
  return null;
}

async function checkOrUpdateSwagger(): Promise<number> {
  const swaggerFilePath = "./swagger.json";

  try {
    const res = await fetch(`http://localhost:${config.port}/swagger/json`);
    if (res.status !== 200) {
      console.error(
        `Error: Failed to fetch swagger JSON. Status: ${res.status}`,
      );
      return 1;
    }

    const newSwaggerJsonObject = await res.json();
    const expectedSwaggerContent = JSON.stringify(
      newSwaggerJsonObject,
      null,
      2,
    );
    const swaggerFile = file(swaggerFilePath);

    const contentToCommit = (await getGitIndexContent(swaggerFilePath)) ?? "";

    if (expectedSwaggerContent !== contentToCommit) {
      await swaggerFile.write(expectedSwaggerContent);
      console.error(
        `Error: ${swaggerFilePath} has been updated. Please stage it before committing.`,
      );
      return 1;
    }

    return 0;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error during swagger check: ${error.message}`);
    } else {
      console.error(`An unknown error occurred during swagger check.`);
    }
    return 1;
  }
}

app.listen(config.port, async (server) => {
  const exitCode = await checkOrUpdateSwagger();
  server.stop(true);
  process.exit(exitCode);
});
