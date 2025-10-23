import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';
const ENCRYPT_KEY = 'Ya)RH*qy6~7d-v&}mwr24G';
const IV = CryptoJS.enc.Hex.parse('1234567890ABCDEF');


@Injectable({
  providedIn: 'root'
})
export class EcncryptionService {

  constructor() { }

  encryptText(text: string): string {
    const keyBytes = CryptoJS.enc.Utf8.parse(ENCRYPT_KEY.substring(0, 8));
    const encrypted = CryptoJS.DES.encrypt(CryptoJS.enc.Utf8.parse(text), keyBytes, {
      iv: IV,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    // Convert to Base64 and make it URL-safe
    let base64 = encrypted.ciphertext.toString(CryptoJS.enc.Base64);
    base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return base64;
  }

  decryptText(strText: string): string {
    // Convert from URL-safe Base64 to standard Base64
    strText = strText.replace(/-/g, '+').replace(/_/g, '/');
    switch (strText.length % 4) {
      case 2: strText += '=='; break;
      case 3: strText += '='; break;
    }

    const keyBytes = CryptoJS.enc.Utf8.parse(ENCRYPT_KEY.substring(0, 8));
    const decodedStrText = CryptoJS.enc.Base64.parse(strText);

    // Create a CipherParams object manually
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: decodedStrText
    });

    const decrypted = CryptoJS.DES.decrypt(
      cipherParams,
      keyBytes,
      {
        iv: IV,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    );

    return CryptoJS.enc.Utf8.stringify(decrypted);
  }

}