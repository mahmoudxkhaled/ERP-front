import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class SharedDataService {
    private data: any;

    setData<T>(data: T) {
        this.data = data;
    }

    getData() {
        return this.data;
    }
}