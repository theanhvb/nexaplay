import type { SignedUpload, StorageProvider, UploadRequest } from "./storage.interface.js";

// Development provider. S3 can implement the same contract without changing content routes.
export class LocalStorageProvider implements StorageProvider {
  async createSignedUpload(input: UploadRequest): Promise<SignedUpload> {
    const baseUrl = (process.env.PUBLIC_MEDIA_URL ?? "http://localhost:4102/uploads").replace(/\/$/, "");
    return { provider: "local", key: input.key, uploadUrl: `${baseUrl}/${input.key}`, publicUrl: `${baseUrl}/${input.key}`, expiresIn: 900 };
  }
  async delete(_key: string) { return Promise.resolve(); }
}
