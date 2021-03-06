import { Component, OnInit } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { InteractionsService } from '../../services/interactions.service';
import {DoctorService} from '../../services/doctor.service';
import {PatientService} from '../../services/patient.service';
import {Doctor, Patient} from '../../services/models.service';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.css']
})
export class NavComponent {
  private profile = 'undefined';
  private userId = 'undefined';

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  constructor(private doctor: DoctorService, private patient: PatientService,
              private breakpointObserver: BreakpointObserver, private tools: InteractionsService) {

    this.tools.profile.subscribe(profile => this.profile = profile);
    this.tools.userId.subscribe(userId => this.userId = userId);
  }

  disconnect(): void {
    if (this.tools.isPatientConnected()) {
      // Reset the view
      this.tools.showSearchForm();
      this.patient.removeMarkers();
    }
    // clear authorization and profile
    this.tools.reset();
    this.tools.openSnackBar('Déconnecté');
  }

  isLogin(): boolean {
    return this.tools.isDoctorConnected() || this.tools.isPatientConnected();
  }

  isPatientConnected(): boolean {
    return this.tools.isPatientConnected();
  }

  getHomePage(): string {
    if (this.tools.isDoctorConnected()) {
      return '/doctor';
    } else if (this.tools.isPatientConnected()) {
      return '/patient';
    } else {
      return '/';
    }
  }
}
