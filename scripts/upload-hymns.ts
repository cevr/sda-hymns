import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import dotenv from "dotenv";
import { Do, Task } from "ftld";

// Load environment variables from .env file
dotenv.config();

// Environment variable schema
const env_schema = z.object({
  AWS_REGION: z.string(),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  S3_BUCKET_NAME: z.string(),
});

// Parse and validate environment variables
const env = env_schema.parse(process.env);

// Configuration
const s3_client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

const bucket_name = env.S3_BUCKET_NAME;
const hymns_directory = path.join(process.cwd(), "mp3");

// Types
type Hymn = {
  number: string;
  title: string;
  file_path: string;
};

// Function to parse hymn filename
function parse_hymn_filename(filename: string): Hymn | null {
  const match = filename.match(/^(\d+)\s+–\s+(.+)\.mp3$/);
  if (!match) return null;

  const [, number_with_zeros, title] = match;
  const number = parseInt(number_with_zeros, 10).toString(); // Remove leading zeros

  return {
    number,
    title,
    file_path: path.join(hymns_directory, filename),
  };
}

// Function to upload a single hymn
async function upload_hymn(hymn: Hymn): Promise<void> {
  const file_stream = fs.createReadStream(hymn.file_path);

  const upload_params = {
    Bucket: bucket_name,
    Key: `${hymn.number}.mp3`,
    Body: file_stream,
    ContentType: "audio/mpeg",
    Metadata: {
      Title: hymn.title,
    },
  };

  try {
    const upload = new Upload({
      client: s3_client,
      params: upload_params,
    });

    await upload.done();
    console.log(`Successfully uploaded hymn ${hymn.number} to S3`);
  } catch (error) {
    console.error(`Error uploading hymn ${hymn.number}:`, error);
  }
}

const main = Do(function* () {
  const files = yield* Task.from(() => fs.promises.readdir(hymns_directory));
  const hymns = files
    .map(parse_hymn_filename)
    .filter((hymn): hymn is Hymn => hymn !== null);

  let count = 0;

  yield* Task.parallel(
    hymns.map((hymn) =>
      Task.from(() => upload_hymn(hymn)).tap(() => {
        count++;
        console.log(`Uploaded ${count}/${hymns.length}`);
      })
    ),
    50
  );

  console.log("Finished uploading all hymns");
});

main.unwrap();
