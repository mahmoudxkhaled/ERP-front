import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {

  constructor() { }

  getCurrentUserData() : any{
    let userData: any = localStorage.getItem('userData');
    if(userData !== null){
      const data = JSON.parse(userData);
      return data
    }
    return null;
  }

  setItem(key :string, data : any){
    localStorage.setItem(key, JSON.stringify(data));
  }

  removeItem(key :string){
    localStorage.removeItem(key);
  }

  getItem(key :string){
    let data = localStorage.getItem(key);
    if(data !== null && data !== 'undefined'){
      return JSON.parse(data);
    }
    return null;
  }
}