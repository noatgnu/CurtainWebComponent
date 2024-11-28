import { TestBed } from '@angular/core/testing';

import { DataPtmService } from './data-ptm.service';

describe('DataPtmService', () => {
  let service: DataPtmService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataPtmService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
