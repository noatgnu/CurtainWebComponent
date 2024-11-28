import { TestBed } from '@angular/core/testing';

import { ProteomicsWorkService } from './proteomics-work.service';

describe('ProteomicsWorkService', () => {
  let service: ProteomicsWorkService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProteomicsWorkService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
