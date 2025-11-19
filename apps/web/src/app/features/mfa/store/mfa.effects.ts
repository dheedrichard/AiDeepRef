import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { MfaService } from '../services/mfa.service';
import * as MfaActions from './mfa.actions';

@Injectable()
export class MfaEffects {
  setupMfa$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MfaActions.setupMfa),
      switchMap(({ method }) =>
        this.mfaService.setupTotp({ method }).pipe(
          map((setup) => MfaActions.setupMfaSuccess({ setup })),
          catchError((error) => of(MfaActions.setupMfaFailure({ error })))
        )
      )
    )
  );

  verifyMfa$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MfaActions.verifyMfa),
      switchMap(({ code }) =>
        this.mfaService.verifyTotp(code).pipe(
          map(({ backupCodes }) => MfaActions.verifyMfaSuccess({ backupCodes })),
          catchError((error) => of(MfaActions.verifyMfaFailure({ error })))
        )
      )
    )
  );

  verifyMfaSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MfaActions.verifyMfaSuccess),
      map(() => MfaActions.loadMfaStatus())
    )
  );

  loadMfaStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MfaActions.loadMfaStatus),
      switchMap(() =>
        this.mfaService.getMfaStatus().pipe(
          map((status) => MfaActions.loadMfaStatusSuccess({ status })),
          catchError((error) => of(MfaActions.loadMfaStatusFailure({ error })))
        )
      )
    )
  );

  disableMfa$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MfaActions.disableMfa),
      switchMap(({ password }) =>
        this.mfaService.disableMfa({ password }).pipe(
          map(() => MfaActions.disableMfaSuccess()),
          catchError((error) => of(MfaActions.disableMfaFailure({ error })))
        )
      )
    )
  );

  regenerateBackupCodes$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MfaActions.regenerateBackupCodes),
      switchMap(() =>
        this.mfaService.regenerateBackupCodes().pipe(
          map(({ backupCodes }) => MfaActions.regenerateBackupCodesSuccess({ backupCodes })),
          catchError((error) => of(MfaActions.regenerateBackupCodesFailure({ error })))
        )
      )
    )
  );

  loadTrustedDevices$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MfaActions.loadTrustedDevices),
      switchMap(() =>
        this.mfaService.getTrustedDevices().pipe(
          map((devices) => MfaActions.loadTrustedDevicesSuccess({ devices })),
          catchError((error) => of(MfaActions.loadTrustedDevicesFailure({ error })))
        )
      )
    )
  );

  trustDevice$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MfaActions.trustDevice),
      switchMap(({ deviceName }) =>
        this.mfaService.trustDevice(deviceName).pipe(
          map((device) => MfaActions.trustDeviceSuccess({ device })),
          catchError((error) => of(MfaActions.trustDeviceFailure({ error })))
        )
      )
    )
  );

  revokeTrustedDevice$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MfaActions.revokeTrustedDevice),
      switchMap(({ deviceId }) =>
        this.mfaService.revokeTrustedDevice(deviceId).pipe(
          map(() => MfaActions.revokeTrustedDeviceSuccess({ deviceId })),
          catchError((error) => of(MfaActions.revokeTrustedDeviceFailure({ error })))
        )
      )
    )
  );

  constructor(private actions$: Actions, private mfaService: MfaService) {}
}
