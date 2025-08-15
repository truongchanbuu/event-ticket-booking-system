import { Router } from "express";
import { ReservationValidator } from "../middlewares/reservation.validator.js";
import { rlOnce } from "../middlewares/rate-limit.middleware.js";

export class ReservationRoutes {
    constructor({ reservationController, redisService }) {
        this.router = Router();
        this.reservationController = reservationController;

        this.router.get(
            "/reservations/:rid",
            this.reservationController.getReservationByID,
        );

        this.router.post(
            "/checkout/reservations",
            rlOnce({
                redis: redisService,
                routeKey: "checkout:reservations",
                windowSec: 60,
            }),
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
