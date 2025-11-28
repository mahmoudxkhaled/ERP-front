import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntityAccountUpdateDetailsComponent } from './entity-account-update-details.component';

describe('EntityAccountUpdateDetailsComponent', () => {
  let component: EntityAccountUpdateDetailsComponent;
  let fixture: ComponentFixture<EntityAccountUpdateDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntityAccountUpdateDetailsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EntityAccountUpdateDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
