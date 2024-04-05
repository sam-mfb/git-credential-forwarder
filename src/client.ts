import { writeFile } from 'fs/promises';
//const args = process.argv.slice(2)
const args = process.argv
writeToFile({filePath:"/tmp/gcm.tx", content:JSON.stringify(args)})

interface WriteToFileArgs {
  filePath: string;
  content: string;
}

async function writeToFile({ filePath, content }: WriteToFileArgs): Promise<void> {
  try {
    await writeFile(filePath, content);
    console.log(`Content written to ${filePath}`);
  } catch (error) {
    console.error(`Failed to write to ${filePath}:`, error);
  }
}
