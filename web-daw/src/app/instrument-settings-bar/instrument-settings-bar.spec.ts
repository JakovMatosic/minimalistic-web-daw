import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstrumentSettingsBar } from './instrument-settings-bar';

describe('InstrumentSettingsBar', () => {
  let component: InstrumentSettingsBar;
  let fixture: ComponentFixture<InstrumentSettingsBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstrumentSettingsBar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InstrumentSettingsBar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
