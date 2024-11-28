import { TestBed } from '@angular/core/testing';

import { UniprotPtmService } from './uniprot-ptm.service';

describe('UniprotPtmService', () => {
  let service: UniprotPtmService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UniprotPtmService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
