import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DrumRoll } from './drum-roll';

describe('DrumRoll', () => {
  let component: DrumRoll;
  let fixture: ComponentFixture<DrumRoll>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DrumRoll]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DrumRoll);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
