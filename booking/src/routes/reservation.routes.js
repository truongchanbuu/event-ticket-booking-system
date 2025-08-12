import { Router } from "express";
import { ReservationValidator } from "../middlewares/reservation.validator.js";

export class ReservationRoutes {
    constructor({ reservationController }) {
        this.router = Router();
        this.reservationController = reservationController;

        this.router.post(
            "/checkout/reservations",
            ReservationValidator.validateReservation,
            this.reservationController.createReservation,
        );

        this.router.post(
            "/checkout/reservations/:id/cancel",
            ReservationValidator.validateCancelReservation,
            this.reservationController.cancelReservation,
        );

        this.router.post(
            "/checkout/confirm",
            reservationController.confirmReservation,
        );
    }
}
