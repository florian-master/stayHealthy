import {Component, OnInit, ChangeDetectionStrategy, TemplateRef, ViewChild} from '@angular/core';
import { InteractionsService } from '../../services/interactions.service';
import { Router } from '@angular/router';
import {Subject} from 'rxjs';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {DoctorService } from 'src/app/services/doctor.service';
import {PatientService} from '../../services/patient.service';
import {AppointmentService} from '../../services/appointment.service';
import {SlotService} from '../../services/slot.service';
import {DialogComponent} from '../../components/dialog/dialog.component';
import {MatDialog} from '@angular/material/dialog';
import {colors, Doctor, Patient, Slot} from '../../services/models.service';
import {addMinutes, isSameDay, isSameMonth, isValid, isAfter, isSameHour, isSameMinute} from 'date-fns';
import {CustomEventTitleFormatter, DateFormatterService} from '../../services/date-formatter.service';
import {
  CalendarEvent,
  CalendarDateFormatter,
  DAYS_OF_WEEK,
  CalendarView,
  CalendarEventTitleFormatter,
  CalendarEventAction
} from 'angular-calendar';
import {NgbModal} from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-doctor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './doctor.component.html',
  styleUrls: ['./doctor.component.css'],
  providers: [
    {
      provide: CalendarDateFormatter,
      useClass: DateFormatterService,
    },
    {
      provide: CalendarEventTitleFormatter,
      useClass: CustomEventTitleFormatter,
    },
  ],
})

export class DoctorComponent implements OnInit {
  @ViewChild('modalContent', { static: true }) modalContent!: TemplateRef<any>;

  private profile = 'undefined';
  private userId = 'undefined';
  doctor!: Doctor;
  slotForm!: FormGroup;
  slotFormError = '';
  modalData!: Patient;

  hours: number[] = [];
  minutes: number[] = [];

  locale = 'fr-FR';

  weekStartsOn: number = DAYS_OF_WEEK.MONDAY;
  weekendDays: number[] = [DAYS_OF_WEEK.SATURDAY, DAYS_OF_WEEK.SUNDAY];

  CalendarView = CalendarView;
  view: CalendarView = CalendarView.Month;
  viewDate = new Date();
  activeDayIsOpen = false;

  refresh: Subject<any> = new Subject();

  events: CalendarEvent[] = [];

  slots: Slot[] = [];

  constructor(private doctorService: DoctorService, private patientService: PatientService,
              private slotService: SlotService, private tools: InteractionsService,
              private router: Router, private fb: FormBuilder, private modal: NgbModal,
              private appointment: AppointmentService, private dialog: MatDialog) {
    // Init hours and minutes values for the form
    for (let h = 8; h < 20; h++) {
      this.hours.push(h);
    }

    for (let m = 0; m < 2; m++) {
      this.minutes.push(m * 30);
    }

    // Init Form Group controller
    this.slotForm =  this.fb.group({
      date: ['', [Validators.required]],
      hour: ['', [Validators.required]],
      minute: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Check the user profile to grant access
    this.tools.profile.subscribe(profile => this.profile = profile);
    this.tools.userId.subscribe(userId => this.userId = userId);

    if (this.profile === 'doctor') {
      this.doctorService.get(this.userId).subscribe(
        response => this.doctor = response);

      // Get all slots and put them in the calendar
      this.slotService.getAllFromDoc(this.userId).subscribe(
        results => {
          for (const result of results) {
            this.slots.push(result);
            this.addSlotInCalendar(result);
          }
          this.refresh.next();
        }
      );
    } else {
      this.router.navigate(['/']);
    }
  }

  addSlotInCalendar(slot: Slot): void {
    // Extract and setup the date
    const date = new Date();
    date.setFullYear(slot.date.yy, slot.date.mm, slot.date.jj);
    date.setHours(slot.startHour.hh, slot.startHour.mn, 0);
    // Ignore dates in paste
    if (!isValid(date) || !isAfter(date, this.viewDate)) {
      return;
    }

    let customTitle = 'libre';
    let customColor = colors.green;
    let customActions: CalendarEventAction[] = [
        {
          label: '<i class="fas fa-fw fa-trash-alt"></i>',
          a11yLabel: 'Delete',
          onClick: ({ event }: { event: CalendarEvent }): void => {
            this.onDelete(event);
          }
        }
      ];
    const customMeta = {id: slot._id, patientId: ''};


    // customize appointment event
    if (slot.patientId !== undefined) {
      customTitle = 'réservé';
      customColor = colors.red;
      customActions = [
        {
          label: '<i class="fas fa-fw fa-pencil-alt"></i>',
          a11yLabel: 'Cancel',
          onClick: ({ event }: { event: CalendarEvent }): void => {
            this.onCancel(event);
          },
        }
      ];
      customMeta.patientId = slot.patientId;
    }

    // Create the event and add it to the list
    const customEvent =
        {
          title: customTitle,
          color: customColor,
          start: date,
          end: addMinutes(date, 30),
          actions: customActions,
          meta: customMeta
        };
    this.events.push(customEvent);
  }

  onSubmit(): void {
    this.slotFormError = '';
    const dataSubmitted = this.slotForm.value;

    // Date validation
    const date: Date = dataSubmitted.date;
    date.setHours(parseInt(dataSubmitted.hour, 10), parseInt(dataSubmitted.minute, 10), 0);
    if (!isValid(date) || !isAfter(date, this.viewDate)) {
      this.slotFormError = 'créneau situé dans le passé ou date invalide';
      return;
    }
    // Check for event duplication
    for (const event of this.events) {
      if (isSameDay(event.start, date) && isSameHour(event.start, date) && isSameMinute(event.start, date)) {
        this.slotFormError = 'créneau déjà existant';
        return;
      }
    }

    // remove unwanted fields
    const data = {
      date: {
        jj: dataSubmitted.date.getDate(),
        mm: dataSubmitted.date.getMonth(),
        yy: dataSubmitted.date.getFullYear()
      },
      startHour: {
        hh: dataSubmitted.hour,
        mn: dataSubmitted.minute
      }
    };

    // Now persist it in data base and display it on calendar
    this.slotService.create(data).subscribe(
      response => {
        if (response.slot) {
          this.tools.openSnackBar('Le créneau a été crée!');
          this.addSlotInCalendar(response.slot);
          this.refresh.next();
        } else {
          this.tools.openSnackBar('Une erreur est survenu lors de la création');
          this.slotFormError = 'Créneau existant!';
        }
      },
      () => {
        this.tools.openSnackBar('Une erreur est survenu lors de la création!');
        this.slotFormError = 'Impossible de créer le créneau!';
      }
    );
  }

  onCancel(event: CalendarEvent): void {
    const dialogRef = this.dialog.open(DialogComponent,
      {width: '270px', data: 'Annulez ce Rendez-vous? Avez-vous contacter le patient?'});
    dialogRef.afterClosed().subscribe(
      confirm => {
        if (confirm) {
          this.appointment.update(event.meta.id).subscribe(
            () => {
              this.tools.openSnackBar('Rendez-vous annulé!');
              this.slots = [];
              this.events = [];
              this.ngOnInit();
            },
            () => this.tools.openSnackBar('Erreur lors de l\'annulation!')
          );
        }
      });
  }

  eventClicked({ event }: { event: CalendarEvent }): void {
    if (event.meta.patientId !== ''){
      this.patientService.get(event.meta.patientId).subscribe(
        user => {
          this.modalData = user;
          this.modal.open(this.modalContent, {size: 'sm'});
        });
    }
  }

  onDelete(event: CalendarEvent): void {
    const dialogRef = this.dialog.open(DialogComponent,
      {width: '270px', data: 'Supprimer ce Créneau?'});
    dialogRef.afterClosed().subscribe(
      confirm => {
        if (confirm) {
          // Remove the event from the calendar
          this.events = this.events.filter((iEvent) => iEvent !== event);
          // Remove the slot from database
          this.slotService.delete(event.meta.id).subscribe(
            () => {
              this.tools.openSnackBar('Créneau supprimé!');
              this.refresh.next();
            },
            () => this.tools.openSnackBar('Erreur lors de la suppression!')
          );
        }
      });
  }

  sundayFilter = (d: Date | null): boolean => {
    const day = (d || new Date()).getDay();
    // Prevent Sunday from being selected.
    return day !== 0;
  }

  setView(view: CalendarView): void {
    this.view = view;
  }

  dayClicked({ date, events }: { date: Date; events: CalendarEvent[] }): void {
    if (isSameMonth(date, this.viewDate)) {
      if ((isSameDay(this.viewDate, date) && this.activeDayIsOpen) || events.length === 0) {
        this.activeDayIsOpen = false;
      } else {
        this.activeDayIsOpen = true;
      }
      this.viewDate = date;
    }
  }

  closeOpenMonthViewDay(): void {
    this.activeDayIsOpen = false;
  }

  getFieldErrMessage(type: string): string {
    return this.slotForm.hasError('required', [type]) ? 'Champ Obligatoire' : '';
  }
}
