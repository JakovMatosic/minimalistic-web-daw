import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Oscillator } from './oscillator';

describe('Oscillator', () => {
  let component: Oscillator;
  let fixture: ComponentFixture<Oscillator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Oscillator]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Oscillator);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
