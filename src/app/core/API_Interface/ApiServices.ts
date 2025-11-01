import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { throwError, Observable } from 'rxjs';
import { ApiResult } from './ApiResult';

@Injectable({ providedIn: 'root' })
export class ApiServices {
  //private baseUrl = 'https://localhost:32769/SystemAPIs';
  private baseUrl = 'https://erpswa.quantum-pmc.com/SystemAPIs';

  constructor(private http: HttpClient) { }

  //Pack the request data to bytes array
  packRequest(requestCode: number, accessToken: string, parameters: string[]): Uint8Array {
    const encoder = new TextEncoder();
    const delimiter = new Uint8Array([0x1E]); // Record Separator

    // Start with the Request Code conversion to bytes array
    const bytes = [
      requestCode & 0xFF,
      (requestCode >> 8) & 0xFF,
      (requestCode >> 16) & 0xFF,
      (requestCode >> 24) & 0xFF
    ];
    let bytesArray = new Uint8Array(bytes);

    // Add Access Token bytes and Clear access token in case of Log_In request
    if (accessToken == "") accessToken = "-";
    const strBytes = encoder.encode(accessToken);
    const newCombined = new Uint8Array(strBytes.length + 4);
    newCombined.set(bytesArray, 0);
    newCombined.set(strBytes, 4);
    bytesArray = newCombined;

    // Loop through all parameters and append each with a separator before it
    for (const str of parameters)
      if (str != "") {
        const strBytes = encoder.encode(str);

        // Create new array = existing + delimiter + parameter
        const newCombined = new Uint8Array(
          bytesArray.length + delimiter.length + strBytes.length
        );

        newCombined.set(bytesArray, 0);
        newCombined.set(delimiter, bytesArray.length);
        newCombined.set(strBytes, bytesArray.length + delimiter.length);

        bytesArray = newCombined;
      }

    return bytesArray;
  }

  // Call API function with bytes array in a JSON object
  callAPI(requestCode: number, accessToken: string, parameters: string[]): Observable<ApiResult> {
    return this.callAPI_Array(this.packRequest(requestCode, accessToken, parameters));
  }
  callAPI_Array(bytes: Uint8Array): Observable<ApiResult> {
    const body = { Contents: Array.from(bytes) };

    return this.http.post(`${this.baseUrl}/Call`, body).pipe(
      map((response: any) => {
        // Ensure return is a string
        response = (typeof response === 'string' ? response : JSON.stringify(response));
        const result: ApiResult = {
          ReturnStatus: 200,
          Body: response
        };
        return result;
      }),

      // Handle and modify errors before returning
      catchError((error) => {
        const status = error.status;
        error = (typeof error === 'string' ? error : JSON.stringify(error));
        if (status == 0 || error == '' || error == '{}')
          error = "Server is currently unavailable. Please try again later.";
        else {
          var length = error.length;
          var index = error.indexOf("{\"success\":");
          error = error.substring(index, length - 1);
        }
        console.error('❌ API detailed error:', error);

        const result: ApiResult = {
          ReturnStatus: status,
          Body: error
        };
        return throwError(() => result);
      })
    );
  }

  // Call API function with a raw binary (if API expects raw body)
  callAPI_Blob(bytes: Uint8Array): Observable<ApiResult> {
    const blob = new Blob([bytes.buffer as ArrayBuffer], {
      type: 'application/octet-stream'
    });
    return this.http.post(`${this.baseUrl}/Call`, blob, {
      headers: { 'Content-Type': 'application/octet-stream' }
    }).pipe(
      map((response: any) => {
        // Ensure return is a string
        response = (typeof response === 'string' ? response : JSON.stringify(response));
        const result: ApiResult = {
          ReturnStatus: 200,
          Body: response
        };
        return result;
      }),

      // Handle and modify errors before returning
      catchError((error) => {
        const status = error.status;
        error = (typeof error === 'string' ? error : JSON.stringify(error));
        if (status == 0 || error == '' || error == '{}')
          error = "Server is currently unavailable. Please try again later.";
        else {
          var length = error.length;
          var index = error.indexOf("{\"success\":");
          error = error.substring(index, length - 1);
        }
        console.error('❌ API detailed error:', error);

        const result: ApiResult = {
          ReturnStatus: status,
          Body: error
        };
        return throwError(() => result);
      })
    );
  }
}
