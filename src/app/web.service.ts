import { Injectable } from '@angular/core';
import {HttpClient, HttpEventType, HttpResponse} from '@angular/common/http';
import {filter, map, of, Subject, switchMap, tap} from 'rxjs';
import {DataCiteMetadata} from './data-cite-metadata';
import {environment} from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebService {
  dataciteURL: string = environment.datacite
  curtainBackendURL: string = environment.curtainBackend
  downloadProgress = new Subject<number>();

  constructor(private http: HttpClient) { }

  getData(curtainIDOrLink: string, curtainBackend: string = this.curtainBackendURL, curtain: boolean = true) {
    let url = "";
    if (curtain) {
      url = `${curtainBackend}curtain/${curtainIDOrLink}/download/token=/`;
    } else {
      url = curtainIDOrLink;
    }

    return this.http.get<any>(url, { responseType: 'json', observe: 'events', reportProgress: true }).pipe(
      tap((value) => {
        console.log('HTTP event:', value);
      }),
      filter(event => event.type === HttpEventType.DownloadProgress || event.type === HttpEventType.Response),
      switchMap((event: any): any => {
        if (event.type === HttpEventType.DownloadProgress) {
          if (event.total) {
            const progress = Math.round((100 * event.loaded) / event.total);
            this.downloadProgress.next(progress);
            console.log('Download progress:', progress);
          }
          return of(null);
        } else if (event.type === HttpEventType.Response) {
          console.log('Download complete event:', event);
          if (event instanceof HttpResponse) {
            if (event.body) {
              if ("url" in event.body) {
                const urlData = event.body["url"] as string;
                return this.getData(urlData, curtainBackend, false);
              }
              return of(event.body); // Return an observable that emits the body
            } else {
              return of(null); // Return an observable that emits null
            }
          }
        } else {
          return of(null); // Return an observable that emits null for other event types
        }
      }),
    );
  }

  getDataCiteMetadata(doi: string) {
    return this.http.get<DataCiteMetadata>(`${this.dataciteURL}/`+doi, {responseType: "json", observe: "body"})
  }
}
