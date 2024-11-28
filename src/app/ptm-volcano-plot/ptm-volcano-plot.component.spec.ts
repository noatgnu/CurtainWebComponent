import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PtmVolcanoPlotComponent } from './ptm-volcano-plot.component';

describe('PtmVolcanoPlotComponent', () => {
  let component: PtmVolcanoPlotComponent;
  let fixture: ComponentFixture<PtmVolcanoPlotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PtmVolcanoPlotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PtmVolcanoPlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
