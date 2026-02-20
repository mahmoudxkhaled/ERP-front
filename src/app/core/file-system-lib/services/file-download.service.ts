import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { ApiService } from '../../api/api.service';

/** Request code for Download_Request (Files Basic). */
const DOWNLOAD_REQUEST_CODE = 1102;

@Injectable({
  providedIn: 'root',
})
export class FileDownloadService {
  private readonly apiService = inject(ApiService);
  private readonly http = inject(HttpClient);

  async downloadFile(
    accessToken: string,
    fileId: bigint,
    folderId: bigint,
    fileSystemId: number,
    onProgress?: (percent: number) => void
  ): Promise<Blob> {
    const downloadInfo = await this.requestDownloadToken(
      accessToken,
      fileId,
      folderId,
      fileSystemId
    );

    const chunks = await this.downloadChunks(
      downloadInfo.downloadToken,
      downloadInfo.chunksCount,
      onProgress
    );

    return new Blob(chunks, { type: 'application/octet-stream' });
  }

  private async requestDownloadToken(
    accessToken: string,
    fileId: bigint,
    folderId: bigint,
    fileSystemId: number
  ): Promise<{
    downloadToken: string;
    fileName: string;
    chunksCount: number;
  }> {
    const parameters: string[] = [
      fileId.toString(),
      folderId.toString(),
      fileSystemId.toString(),
    ];

    const response = await firstValueFrom(
      this.apiService.callAPI(DOWNLOAD_REQUEST_CODE, accessToken, parameters)
    ) as unknown as {
      success: boolean;
      message: {
        download_Token: string;
        file_Name: string;
        chunks_Count: number;
      };
    };

    if (!response?.success || !response?.message) {
      throw new Error('Download request failed.');
    }

    const { download_Token, file_Name, chunks_Count } = response.message;

    if (!download_Token || !file_Name || !chunks_Count) {
      throw new Error('Download request returned invalid data.');
    }

    return {
      downloadToken: download_Token,
      fileName: file_Name,
      chunksCount: chunks_Count,
    };
  }

  private async downloadChunks(
    downloadToken: string,
    chunksCount: number,
    onProgress?: (percent: number) => void
  ): Promise<BlobPart[]> {
    const allChunks: BlobPart[] = [];

    for (let currentChunk = 1; currentChunk <= chunksCount; currentChunk++) {
      const formData = new FormData();
      formData.append('download_token', downloadToken);
      formData.append('chunk_id', currentChunk.toString());

      const arrayBuffer = await firstValueFrom(
        this.http.post(
          `${this.apiService.getBaseUrl()}/Download`,
          formData,
          { responseType: 'arraybuffer' as 'json' }
        )
      );

      allChunks.push(arrayBuffer as ArrayBuffer);

      if (onProgress) {
        const percent = (100 * currentChunk) / chunksCount;
        onProgress(percent);
      }
    }

    return allChunks;
  }
}

