export type UploadRequest = { key: string; contentType: string; size: number };
export type SignedUpload = { provider: string; key: string; uploadUrl: string; publicUrl: string; expiresIn: number };

export interface StorageProvider {
  createSignedUpload(input: UploadRequest): Promise<SignedUpload>;
  delete(key: string): Promise<void>;
}
