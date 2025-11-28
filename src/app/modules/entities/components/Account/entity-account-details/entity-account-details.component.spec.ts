import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntityAccountDetailsComponent } from './entity-account-details.component';

describe('EntityAccountDetailsComponent', () => {
  let component: EntityAccountDetailsComponent;
  let fixture: ComponentFixture<EntityAccountDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntityAccountDetailsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EntityAccountDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
