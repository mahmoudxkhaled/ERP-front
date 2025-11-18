import { Injectable } from '@angular/core';
import { IAccountStatusResponse } from 'src/app/core/models/IAccountStatusResponse';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {

  constructor() { }

  getCurrentUserData(): any {
    let userData: any = localStorage.getItem('userData');
    if (userData !== null) {
      const data = JSON.parse(userData);
      return data
    }
    return null;
  }

  setItem(key: string, data: any) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  removeItem(key: string) {
    localStorage.removeItem(key);
  }

  getItem(key: string) {
    let data = localStorage.getItem(key);
    if (data !== null && data !== 'undefined') {
      return JSON.parse(data);
    }
    return null;
  }

  getAccessToken() {
    const userData = this.getCurrentUserData();
    return userData?.token;
  }

  setLoginDataPackage(accountData: IAccountStatusResponse): void {
    if (accountData.User_Details) {
      this.setItem('User_Details', accountData.User_Details);
    }

    if (accountData.Account_Details) {
      this.setItem('Account_Details', accountData.Account_Details);
    }

    if (accountData.Entity_Details) {
      this.setItem('Entity_Details', accountData.Entity_Details);
    }

    if (accountData.Functions_Details) {
      this.setItem('Functions_Details', accountData.Functions_Details);
    }

    if (accountData.Modules_Details) {
      this.setItem('Modules_Details', accountData.Modules_Details);
    }

    if (accountData.Account_Settings) {
      this.setItem('Account_Settings', accountData.Account_Settings);
    }
  }


  clearLoginDataPackage(): void {
    this.removeItem('User_Details');
    this.removeItem('Account_Details');
    this.removeItem('Entity_Details');
    this.removeItem('Functions_Details');
    this.removeItem('Modules_Details');
    this.removeItem('Account_Settings');
    this.removeItem('userData');
  }
}