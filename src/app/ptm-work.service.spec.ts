import { TestBed } from '@angular/core/testing';

import { PtmWorkService } from './ptm-work.service';

describe('PtmWorkService', () => {
  let service: PtmWorkService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PtmWorkService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
